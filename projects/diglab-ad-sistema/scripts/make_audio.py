"""Synthesize the ad's SFX and a placeholder music bed (license-free).

  public/audio/sfx/*.wav   whoosh, pops (rising pitch), click, switch, ding,
                           success, thud, riser, downsweep, strike, buzz, tick, type
  public/audio/music.mp3   tension -> resolution bed whose sections follow the
                           scene windows in src/config/vo-timing.json

The music is a PLACEHOLDER so the edit can be judged with sound. Swap in a
licensed track by replacing public/audio/music.mp3 (same name), or re-run this
after lock_timing.py so the sections follow the real VO.

Usage:
    python scripts/make_audio.py            # needs numpy + scipy; ffmpeg on PATH
    python scripts/make_audio.py --sfx-only
"""

from __future__ import annotations

import argparse
import json
import subprocess
import wave
from pathlib import Path

import numpy as np
from scipy import signal

ROOT = Path(__file__).resolve().parent.parent
SR = 48000
RNG = np.random.default_rng(42)
SFX_DIR = ROOT / "public" / "audio" / "sfx"
MUSIC = ROOT / "public" / "audio" / "music.mp3"

LEAD_IN_S = 0.3  # must match src/config/timeline.ts
END_HOLD_S = 2.3


# ---------------------------------------------------------------- utilities
def t_axis(dur: float) -> np.ndarray:
    return np.arange(int(dur * SR)) / SR


def env_ad(n: int, attack: float, decay: float) -> np.ndarray:
    t = np.arange(n) / SR
    a = np.clip(t / max(attack, 1e-4), 0, 1)
    d = np.exp(-np.maximum(t - attack, 0) / max(decay, 1e-4))
    return a * d


def bandpass(x: np.ndarray, lo: float, hi: float, order: int = 2) -> np.ndarray:
    sos = signal.butter(order, [lo, hi], btype="bandpass", fs=SR, output="sos")
    return signal.sosfilt(sos, x)


def lowpass(x: np.ndarray, fc: float, order: int = 2) -> np.ndarray:
    sos = signal.butter(order, fc, btype="lowpass", fs=SR, output="sos")
    return signal.sosfilt(sos, x)


def highpass(x: np.ndarray, fc: float, order: int = 2) -> np.ndarray:
    sos = signal.butter(order, fc, btype="highpass", fs=SR, output="sos")
    return signal.sosfilt(sos, x)


def sweep_filter(x: np.ndarray, f_start: float, f_peak: float, f_end: float, peak_at: float, q: float = 1.2) -> np.ndarray:
    """Time-varying band-pass, processed in short blocks (good enough for SFX)."""
    out = np.zeros_like(x)
    block = 256
    n = len(x)
    zi = None
    for i in range(0, n, block):
        u = i / n
        if u < peak_at:
            fc = f_start * (f_peak / f_start) ** (u / peak_at)
        else:
            fc = f_peak * (f_end / f_peak) ** ((u - peak_at) / (1 - peak_at))
        bw = fc / q
        lo, hi = max(30.0, fc - bw / 2), min(SR / 2 - 100, fc + bw / 2)
        sos = signal.butter(2, [lo, hi], btype="bandpass", fs=SR, output="sos")
        if zi is None:
            zi = np.zeros((sos.shape[0], 2))
        out[i : i + block], zi = signal.sosfilt(sos, x[i : i + block], zi=zi)
    return out


def norm(x: np.ndarray, peak_db: float = -1.0) -> np.ndarray:
    m = np.max(np.abs(x)) or 1.0
    return x / m * (10 ** (peak_db / 20))


def write_wav(path: Path, x: np.ndarray) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if x.ndim == 1:
        x = np.stack([x, x], -1)
    pcm = (np.clip(x, -1, 1) * 32767).astype(np.int16)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


def fade_edges(x: np.ndarray, ms: float = 4) -> np.ndarray:
    n = int(SR * ms / 1000)
    if n and len(x) > 2 * n:
        r = np.linspace(0, 1, n)
        x[:n] *= r
        x[-n:] *= r[::-1]
    return x


# ---------------------------------------------------------------- SFX
def whoosh(dur=0.7, peak_at=0.5, lo=250, hi=3200, end=500) -> np.ndarray:
    n = int(dur * SR)
    noise = RNG.standard_normal(n)
    x = sweep_filter(noise, lo, hi, end, peak_at, q=0.9)
    t = np.linspace(0, 1, n)
    e = np.where(t < peak_at, (t / peak_at) ** 2.2, np.exp(-(t - peak_at) / (1 - peak_at) * 4))
    return fade_edges(norm(x * e, -3))


def pop(freq=600.0, dur=0.16) -> np.ndarray:
    t = t_axis(dur)
    f = freq * (1 + 0.6 * np.exp(-t / 0.012))  # quick pitch drop
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * env_ad(len(t), 0.002, 0.045)
    click = highpass(RNG.standard_normal(len(t)), 2000) * env_ad(len(t), 0.0005, 0.004) * 0.25
    return fade_edges(norm(body + click, -2))


def click(dur=0.06) -> np.ndarray:
    t = t_axis(dur)
    x = bandpass(RNG.standard_normal(len(t)), 1800, 6000) * env_ad(len(t), 0.0004, 0.006)
    x += np.sin(2 * np.pi * 2400 * t) * env_ad(len(t), 0.0003, 0.008) * 0.5
    return fade_edges(norm(x, -2))


def switch() -> np.ndarray:
    a, b = click(0.05), click(0.05) * 0.7
    out = np.zeros(int(0.12 * SR))
    out[: len(a)] += a
    o = int(0.045 * SR)
    out[o : o + len(b)] += b
    return norm(out, -2)


def bell(freq: float, dur: float, decay: float) -> np.ndarray:
    t = t_axis(dur)
    x = np.zeros_like(t)
    for ratio, amp, dk in [(1, 1.0, 1.0), (2.0, 0.45, 0.6), (2.76, 0.35, 0.45), (5.4, 0.18, 0.25), (8.9, 0.08, 0.15)]:
        x += amp * np.sin(2 * np.pi * freq * ratio * t) * np.exp(-t / (decay * dk))
    return x * env_ad(len(t), 0.002, 10)


def ding() -> np.ndarray:
    return fade_edges(norm(bell(1318.5, 1.6, 0.55), -2))


def success() -> np.ndarray:
    out = np.zeros(int(1.6 * SR))
    for k, fr in enumerate([1046.5, 1318.5, 1568.0, 2093.0]):
        b = bell(fr, 1.2, 0.4) * (0.8 if k < 3 else 0.6)
        o = int(k * 0.075 * SR)
        out[o : o + len(b)] += b[: len(out) - o]
    shimmer = highpass(RNG.standard_normal(len(out)), 6000) * env_ad(len(out), 0.25, 0.4) * 0.05
    return fade_edges(norm(out + shimmer, -2))


def thud() -> np.ndarray:
    t = t_axis(0.4)
    f = 55 + 95 * np.exp(-t / 0.03)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * env_ad(len(t), 0.002, 0.11)
    x += lowpass(RNG.standard_normal(len(t)), 900) * env_ad(len(t), 0.001, 0.015) * 0.4
    return fade_edges(norm(np.tanh(x * 1.6), -2))


def riser(dur=1.0) -> np.ndarray:
    t = t_axis(dur)
    u = t / dur
    f = 180 * (1200 / 180) ** u
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.35
    noise = sweep_filter(RNG.standard_normal(len(t)), 400, 6000, 6000, 0.999, q=1.0)
    x = (tone + noise) * u**2.2
    x *= np.minimum(1, (1 - u) * 40)  # tight cut at the top
    return fade_edges(norm(x, -3))


def downsweep(dur=0.8) -> np.ndarray:
    t = t_axis(dur)
    u = t / dur
    f = 760 * (170 / 760) ** u
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * (1 - u) ** 1.4
    x += lowpass(RNG.standard_normal(len(t)), 1200) * 0.12 * (1 - u)
    return fade_edges(norm(x, -4))


def strike() -> np.ndarray:
    t = t_axis(0.28)
    x = sweep_filter(RNG.standard_normal(len(t)), 5000, 2200, 1200, 0.3, q=2.5) * env_ad(len(t), 0.004, 0.07)
    return fade_edges(norm(x, -3))


def buzz() -> np.ndarray:
    out = np.zeros(int(0.42 * SR))
    for k in range(2):
        t = t_axis(0.14)
        sq = signal.square(2 * np.pi * 150 * t) * env_ad(len(t), 0.004, 0.06)
        sq = lowpass(sq, 900)
        o = int(k * 0.16 * SR)
        out[o : o + len(sq)] += sq
    return fade_edges(norm(out, -6))


def tick() -> np.ndarray:
    t = t_axis(0.035)
    x = np.sin(2 * np.pi * 3200 * t) * env_ad(len(t), 0.0003, 0.006)
    return fade_edges(norm(x, -4))


def typekey() -> np.ndarray:
    t = t_axis(0.03)
    x = bandpass(RNG.standard_normal(len(t)), 2500, 7000) * env_ad(len(t), 0.0003, 0.004)
    return fade_edges(norm(x, -6))


def make_sfx() -> None:
    sfx = {
        "whoosh": whoosh(),
        "whoosh-short": whoosh(0.4, 0.55, 400, 4200, 900),
        "swish": whoosh(0.3, 0.4, 900, 6000, 2500),
        "click": click(),
        "switch": switch(),
        "ding": ding(),
        "success": success(),
        "thud": thud(),
        "riser": riser(1.0),
        "riser-short": riser(0.6),
        "downsweep": downsweep(),
        "strike": strike(),
        "buzz": buzz(),
        "tick": tick(),
        "type": typekey(),
    }
    for i, fr in enumerate([520, 620, 740, 880, 1040], start=1):
        sfx[f"pop{i}"] = pop(fr)
    for name, x in sfx.items():
        write_wav(SFX_DIR / f"{name}.wav", x)
    print(f"wrote {len(sfx)} SFX -> {SFX_DIR.relative_to(ROOT)}")


# ---------------------------------------------------------------- music
BPM = 100
BEAT = 60 / BPM


def midi(n: int) -> float:
    return 440.0 * 2 ** ((n - 69) / 12)


def saw_voice(freq: float, n: int, detune_cents: float, phase: float) -> np.ndarray:
    f = freq * 2 ** (detune_cents / 1200)
    t = np.arange(n) / SR
    return 2 * ((t * f + phase) % 1.0) - 1


def pad_chord(notes: list[int], dur: float, bright: float) -> np.ndarray:
    n = int(dur * SR)
    out = np.zeros((n, 2))
    for note in notes:
        for d, side in [(-9, 0), (0, None), (9, 1)]:
            v = saw_voice(midi(note), n, d, RNG.random())
            if side is None:
                out += v[:, None] * 0.5
            else:
                out[:, side] += v * 0.7
    fc = 600 + 2400 * bright
    out = np.stack([lowpass(out[:, 0], fc, 2), lowpass(out[:, 1], fc, 2)], -1)
    a = int(min(0.6, dur / 3) * SR)
    r = int(min(0.8, dur / 3) * SR)
    e = np.ones(n)
    e[:a] = np.linspace(0, 1, a)
    e[-r:] = np.linspace(1, 0, r)
    return out * e[:, None] / max(1, len(notes))


def pluck(freq: float, dur: float = 0.45, bright: float = 0.5) -> np.ndarray:
    t = t_axis(dur)
    x = (np.sign(np.sin(2 * np.pi * freq * t)) * 0.3 + np.sin(2 * np.pi * freq * t)) * env_ad(len(t), 0.003, 0.12)
    return lowpass(x, 1500 + 3500 * bright)


def kick() -> np.ndarray:
    t = t_axis(0.45)
    f = 45 + 110 * np.exp(-t / 0.035)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * env_ad(len(t), 0.001, 0.16)
    return np.tanh(x * 1.8) * 0.9


def hat(open_: bool = False) -> np.ndarray:
    t = t_axis(0.18 if open_ else 0.05)
    return highpass(RNG.standard_normal(len(t)), 7000) * env_ad(len(t), 0.0005, 0.06 if open_ else 0.012) * 0.35


def clap() -> np.ndarray:
    out = np.zeros(int(0.25 * SR))
    for k in range(3):
        t = t_axis(0.2)
        b = bandpass(RNG.standard_normal(len(t)), 900, 3500) * env_ad(len(t), 0.001, 0.03 if k < 2 else 0.09)
        o = int(k * 0.011 * SR)
        out[o : o + len(b)] += b[: len(out) - o]
    return out * 0.5


def crash() -> np.ndarray:
    t = t_axis(2.5)
    return highpass(RNG.standard_normal(len(t)), 4000) * env_ad(len(t), 0.002, 0.7) * 0.4


def bass(freq: float, dur: float) -> np.ndarray:
    t = t_axis(dur)
    x = np.sin(2 * np.pi * freq * t) + 0.25 * np.sin(4 * np.pi * freq * t)
    return np.tanh(1.4 * x) * env_ad(len(t), 0.004, dur * 0.9) * 0.6


def add(buf: np.ndarray, x: np.ndarray, at: float, gain: float = 1.0, pan: float = 0.0) -> None:
    i = int(at * SR)
    if i >= len(buf):
        return
    if x.ndim == 1:
        x = np.stack([x * (1 - max(0, pan)), x * (1 + min(0, pan))], -1)
    j = min(len(buf), i + len(x))
    buf[i:j] += x[: j - i] * gain


def reverb(x: np.ndarray, secs: float = 1.8, wet: float = 0.22) -> np.ndarray:
    n = int(secs * SR)
    ir = RNG.standard_normal((n, 2)) * np.exp(-np.arange(n) / (secs * SR / 5))[:, None]
    ir = np.stack([lowpass(ir[:, 0], 5000), lowpass(ir[:, 1], 5000)], -1)
    ir /= np.sqrt(np.sum(ir**2, axis=0))
    wet_sig = np.stack([signal.fftconvolve(x[:, k], ir[:, k])[: len(x)] for k in range(2)], -1)
    return x * (1 - wet) + wet_sig * wet


# A minor world (tension) resolving to C major / A major lift at the close.
CHORDS = {
    "Am": [57, 60, 64, 71],
    "F": [53, 57, 60, 67],
    "C": [55, 60, 64, 67],
    "G": [55, 59, 62, 67],
    "Dm": [57, 62, 65, 69],
    "E": [56, 59, 64, 68],
    "Fmaj7": [53, 57, 60, 64],
    "Cadd9": [60, 64, 67, 74],
}
ROOTS = {"Am": 45, "F": 41, "C": 48, "G": 43, "Dm": 50, "E": 40, "Fmaj7": 41, "Cadd9": 48}


def scene_windows() -> tuple[list[float], float]:
    data = json.loads((ROOT / "src" / "config" / "vo-timing.json").read_text(encoding="utf-8"))
    words = data["words"]
    ids = ["s1", "s2", "s3", "s4", "s5", "s6"]
    starts = [0.0]
    for sid in ids[1:]:
        first = next(w for w in words if w["scene"] == sid)
        starts.append(first["startMs"] / 1000 - LEAD_IN_S)
    total = words[-1]["endMs"] / 1000 + END_HOLD_S
    # End-card start = "Si te interesa" (third sentence of s6)
    s6 = [w for w in words if w["scene"] == "s6"]
    endcard = next(w for w in s6 if w["text"].lower() == "si")["startMs"] / 1000
    return starts + [endcard], total


def make_music() -> None:
    (s1, s2, s3, s4, s5, s6, endcard), total = scene_windows()
    dur = total + 1.5
    n = int(dur * SR)
    pad = np.zeros((n, 2))
    lead = np.zeros((n, 2))
    drums = np.zeros((n, 2))
    low = np.zeros((n, 2))

    # sections: (start, end, progression, energy 0..1, brightness)
    sections = [
        (s1, s2, ["Am", "Am"], 0.15, 0.15),
        (s2, s4, ["F", "C", "G", "Am"], 0.4, 0.45),
        (s4, s5, ["F", "C", "G", "Am"], 0.8, 0.65),
        (s5, s6, ["Dm", "F", "E", "E"], 0.9, 0.7),
        (s6, endcard, ["Fmaj7", "C", "G", "G"], 0.45, 0.5),
        (endcard, dur, ["F", "G", "Cadd9", "Cadd9"], 1.0, 0.95),
    ]
    bar = 4 * BEAT
    for a, b, prog, energy, bright in sections:
        t = a
        k = 0
        while t < b - 0.05:
            chord_end = min(b, t + bar)
            name = prog[k % len(prog)]
            if name == "Cadd9" and a == endcard:
                chord_end = dur  # final chord rings out
            notes = CHORDS[name]
            add(pad, pad_chord(notes, chord_end - t + 0.6, bright), t, 0.5)
            root = midi(ROOTS[name])
            beats = int(round((chord_end - t) / BEAT))
            for bi in range(beats * 2):  # 8ths
                bt = t + bi * BEAT / 2
                if bt >= b:
                    break
                if energy >= 0.4:
                    note = notes[(bi * 2 + k) % len(notes)] + 12
                    add(lead, pluck(midi(note), 0.4, bright), bt, 0.18 * energy, pan=0.3 if bi % 2 else -0.3)
                if energy >= 0.75 and bi % 2 == 0:
                    add(low, bass(root, BEAT / 2 * 0.95), bt, 0.55)
                elif energy >= 0.4 and bi % 4 == 0:
                    add(low, bass(root, BEAT * 1.9), bt, 0.45)
            for bi in range(beats):
                bt = t + bi * BEAT
                if bt >= b:
                    break
                if energy >= 0.75:
                    add(drums, kick(), bt, 0.8)
                    if bi % 2 == 1:
                        add(drums, clap(), bt, 0.5)
                elif energy >= 0.4 and bi % 2 == 0:
                    add(drums, kick(), bt, 0.55)
                elif energy < 0.4 and bi % 2 == 0:
                    add(drums, kick(), bt, 0.32)  # heartbeat
                for h in range(4 if energy >= 0.75 else 2):
                    add(drums, hat(open_=(h == 2 and energy >= 0.75)), bt + h * BEAT / (4 if energy >= 0.75 else 2), 0.22 * (0.4 + energy), pan=0.2)
            t = chord_end
            k += 1
            if name == "Cadd9" and a == endcard:
                break
    # Drop the drums out for the last beat before the end card -> impact.
    i0, i1 = int((endcard - BEAT) * SR), int(endcard * SR)
    drums[i0:i1] *= np.linspace(1, 0, i1 - i0)[:, None]
    add(drums, crash(), endcard, 0.8)
    add(drums, kick(), endcard, 1.0)
    # Riser into the close.
    add(lead, np.stack([riser(1.6)] * 2, -1) * 0.25, s6 - 1.6)
    add(lead, np.stack([riser(1.2)] * 2, -1) * 0.2, endcard - 1.2)

    mix = reverb(pad * 0.9 + lead, 2.0, 0.25) + drums * 0.8 + low * 0.9
    # Overall arc: build from s1 to the close, ring out at the end.
    tt = np.arange(n) / SR
    arc = np.interp(tt, [0, s2, s4, endcard, total - 0.6, dur], [0.55, 0.7, 0.85, 1.0, 1.0, 0.0])
    mix *= arc[:, None]
    mix = np.tanh(mix * 1.3) / np.tanh(1.3)
    mix = norm(mix, -1.0)

    wav = MUSIC.with_suffix(".wav")
    write_wav(wav, mix)
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-i", str(wav), "-c:a", "libmp3lame", "-b:a", "192k", str(MUSIC)],
        check=True,
    )
    wav.unlink()
    print(f"wrote {MUSIC.relative_to(ROOT)} ({dur:.1f}s) sections at "
          + ", ".join(f"{x:.2f}" for x in (s1, s2, s3, s4, s5, s6, endcard)))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--sfx-only", action="store_true")
    ap.add_argument("--music-only", action="store_true")
    args = ap.parse_args()
    if not args.music_only:
        make_sfx()
    if not args.sfx_only:
        make_music()


if __name__ == "__main__":
    main()
