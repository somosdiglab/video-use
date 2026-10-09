"""Lock every timing in the ad to the real voice-over, in one pass.

    python scripts/lock_timing.py --vo path/to/vo_raw.mp3

1. Transcribes the VO with ElevenLabs Scribe (word-level, verbatim) using the
   video-use helper (cached — a re-run does not pay twice).
2. Finds the hook line. The source has TWO takes of it ("Toma 1" / "Toma 2"):
   only one is kept — the one that best matches the script with the fewest
   fillers (override with --hook-take 1|2).
3. Builds the edited VO: chosen hook take + the rest of the script, cut on word
   boundaries with padding and 30 ms fades (no pops) -> public/audio/vo.mp3
4. Aligns the SCRIPT words (verbatim spelling) to the ASR words and writes
   src/config/vo-timing.json -> scenes, cues, subtitles, SFX and music ducking
   all follow the real waveform.
5. Regenerates the music bed so its sections follow the new scene windows.

Options:
    --transcript scribe.json   reuse an existing Scribe JSON (no API call)
    --hook-take 1|2            force a take (default: auto)
    --no-music                 keep public/audio/music.mp3 as is (e.g. licensed track)
"""

from __future__ import annotations

import argparse
import difflib
import json
import re
import subprocess
import sys
import unicodedata
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCRIPT = ROOT / "src" / "config" / "script.json"
TIMING = ROOT / "src" / "config" / "vo-timing.json"
VO_OUT = ROOT / "public" / "audio" / "vo.mp3"
WORK = ROOT / "vo-work"

PAD_BEFORE = 0.08  # s, inside the 30-200 ms working window
PAD_AFTER = 0.14
FADE = 0.03  # 30 ms fades at every cut
FILLERS = {"eh", "em", "emm", "mm", "mmm", "este", "ehh", "ah", "o sea"}


def norm(s: str) -> str:
    s = unicodedata.normalize("NFD", s.lower())
    s = "".join(ch for ch in s if unicodedata.category(ch) != "Mn")
    return " ".join(re.sub(r"[^a-z0-9 ]", " ", s).split())


def script_tokens() -> list[dict]:
    out = []
    for sc in json.loads(SCRIPT.read_text(encoding="utf-8"))["scenes"]:
        for i, tok in enumerate(sc["vo"].strip().split()):
            out.append({"scene": sc["id"], "i": i, "text": tok, "n": norm(tok)})
    return out


# --------------------------------------------------------------- transcription
def find_helpers(explicit: str | None) -> Path:
    candidates = [Path(explicit)] if explicit else []
    candidates += [
        ROOT.parent.parent / "helpers",  # projects/<ad>/ inside the video-use repo
        Path.home() / ".claude" / "skills" / "video-use" / "helpers",
        Path.home() / "Developer" / "video-use" / "helpers",
    ]
    for c in candidates:
        if (c / "transcribe.py").exists():
            return c
    sys.exit("video-use helpers not found; pass --video-use-helpers <path to video-use/helpers>")


def transcribe(vo: Path, helpers: Path) -> dict:
    sys.path.insert(0, str(helpers))
    from transcribe import load_api_key, transcribe_one  # type: ignore

    out = transcribe_one(video=vo, edit_dir=WORK, api_key=load_api_key(), language="es")
    return json.loads(Path(out).read_text(encoding="utf-8"))


# --------------------------------------------------------------- hook takes
def asr_words(data: dict) -> list[dict]:
    words = []
    for w in data.get("words", []):
        if w.get("type", "word") != "word" or w.get("start") is None:
            continue
        n = norm(w.get("text", ""))
        if not n:
            continue
        words.append({"text": w["text"], "n": n, "start": float(w["start"]), "end": float(w["end"]),
                      "logprob": w.get("logprob")})
    return words


def find_hook_takes(asr: list[dict], hook: list[str]) -> list[dict]:
    """Every non-overlapping window of the ASR stream that reads as the hook line."""
    L = len(hook)
    takes = []
    p = 0
    while p < len(asr):
        best = None
        for q in range(p, min(len(asr), p + 3)):
            window = [w["n"] for w in asr[q : q + L + 4]]
            sm = difflib.SequenceMatcher(a=hook, b=window, autojunk=False)
            blocks = [b for b in sm.get_matching_blocks() if b.size]
            if not blocks:
                continue
            ratio = sum(b.size for b in blocks) / L
            if ratio >= 0.6 and (best is None or ratio > best["ratio"]):
                first = q + blocks[0].b
                last = q + blocks[-1].b + blocks[-1].size - 1
                best = {"first": first, "last": last, "ratio": ratio}
        if best:
            takes.append(best)
            p = best["last"] + 1
        else:
            p += 1
    return takes


def score_take(take: dict, asr: list[dict]) -> float:
    span = asr[take["first"] : take["last"] + 1]
    fillers = sum(1 for w in span if w["n"] in FILLERS)
    lps = [w["logprob"] for w in span if isinstance(w.get("logprob"), (int, float))]
    lp = sum(lps) / len(lps) if lps else 0.0
    return take["ratio"] * 10 - fillers * 2 + lp


# --------------------------------------------------------------- edit + render
def build_segments(asr: list[dict], takes: list[dict], choice: int, gap: float) -> list[tuple[float, float]]:
    """Source-time segments to keep, in order."""
    t_hook = takes[choice]
    after_hooks = max(t["last"] for t in takes) + 1
    if after_hooks >= len(asr):
        sys.exit("nothing after the hook takes — is the rest of the script in this file?")
    hook = (asr[t_hook["first"]]["start"] - PAD_BEFORE, asr[t_hook["last"]]["end"] + PAD_AFTER)
    rest = (asr[after_hooks]["start"] - PAD_BEFORE, asr[-1]["end"] + PAD_AFTER + 0.25)
    if choice == len(takes) - 1:
        # Last take is contiguous with the rest: keep the natural breath between them.
        return [(hook[0], rest[1])]
    return [hook, (rest[0] - gap / 2, rest[1])]


def render_vo(src: Path, segments: list[tuple[float, float]], out: Path) -> None:
    out.parent.mkdir(parents=True, exist_ok=True)
    parts, labels = [], []
    for k, (a, b) in enumerate(segments):
        a = max(0.0, a)
        d = b - a
        parts.append(
            f"[0:a]atrim=start={a:.3f}:end={b:.3f},asetpts=PTS-STARTPTS,"
            f"afade=t=in:st=0:d={FADE},afade=t=out:st={max(0.0, d - FADE):.3f}:d={FADE}[s{k}]"
        )
        labels.append(f"[s{k}]")
    graph = ";".join(parts) + ";" + "".join(labels) + f"concat=n={len(segments)}:v=0:a=1[out]"
    wav = WORK / "vo_edit.wav"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(src), "-filter_complex", graph,
                    "-map", "[out]", "-ar", "48000", "-ac", "1", str(wav)], check=True)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(wav), "-c:a", "libmp3lame",
                    "-b:a", "192k", str(out)], check=True)


def map_time(t: float, segments: list[tuple[float, float]]) -> float | None:
    """Source time -> edited-VO time (None if the moment was cut)."""
    offset = 0.0
    for a, b in segments:
        a = max(0.0, a)
        if a <= t <= b:
            return offset + (t - a)
        offset += b - a
    return None


# --------------------------------------------------------------- alignment
def align(script: list[dict], asr: list[dict]) -> tuple[list[dict], list[str]]:
    """Give every script token a [start, end] from the ASR (interpolating gaps)."""
    a = [t["n"] for t in script]
    b = [w["n"] for w in asr]
    times: list[tuple[float, float] | None] = [None] * len(script)
    sm = difflib.SequenceMatcher(a=a, b=b, autojunk=False)
    for op, i1, i2, j1, j2 in sm.get_opcodes():
        if op == "equal" or (op == "replace" and i2 - i1 == j2 - j1):
            for k in range(i2 - i1):
                times[i1 + k] = (asr[j1 + k]["start"], asr[j1 + k]["end"])
        elif op == "replace":
            s, e = asr[j1]["start"], asr[j2 - 1]["end"]
            n = i2 - i1
            for k in range(n):
                times[i1 + k] = (s + (e - s) * k / n, s + (e - s) * (k + 1) / n)
    unmatched = [script[i]["text"] for i, t in enumerate(times) if t is None]
    # Interpolate tokens the ASR missed between their known neighbours.
    for i, t in enumerate(times):
        if t is not None:
            continue
        j = i
        while j < len(times) and times[j] is None:
            j += 1
        prev_end = times[i - 1][1] if i > 0 and times[i - 1] else (times[j][0] if j < len(times) else 0.0)
        next_start = times[j][0] if j < len(times) else prev_end + 0.3 * (j - i)
        n = j - i
        for k in range(n):
            s = prev_end + (next_start - prev_end) * k / n
            times[i + k] = (s, prev_end + (next_start - prev_end) * (k + 1) / n)
    words = []
    for tok, (s, e) in zip(script, times):  # type: ignore[misc]
        words.append({"scene": tok["scene"], "i": tok["i"], "text": tok["text"],
                      "startMs": round(s * 1000), "endMs": round(max(e, s + 0.05) * 1000)})
    return words, unmatched


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--vo", type=Path, required=True, help="Raw VO recording (mp3/wav/m4a)")
    ap.add_argument("--transcript", type=Path, help="Existing Scribe JSON for this file (skips the API)")
    ap.add_argument("--hook-take", choices=["auto", "1", "2"], default="auto")
    ap.add_argument("--gap", type=float, default=0.45, help="Breath after the hook when take 1 is kept (s)")
    ap.add_argument("--video-use-helpers", default=None)
    ap.add_argument("--no-music", action="store_true")
    args = ap.parse_args()

    vo = args.vo.resolve()
    if not vo.exists():
        sys.exit(f"VO not found: {vo}")
    WORK.mkdir(exist_ok=True)

    data = (json.loads(args.transcript.read_text(encoding="utf-8")) if args.transcript
            else transcribe(vo, find_helpers(args.video_use_helpers)))
    asr = asr_words(data)
    if not asr:
        sys.exit("transcript has no words")

    script = script_tokens()
    hook = [t["n"] for t in script if t["scene"] == "s1"]
    takes = find_hook_takes(asr, hook)
    if not takes:
        sys.exit("could not find the hook line in the VO transcript")
    if args.hook_take != "auto":
        choice = min(int(args.hook_take), len(takes)) - 1
        why = "forced"
    else:
        scores = [score_take(t, asr) for t in takes]
        best = max(scores)
        # Tie (within 0.5) -> prefer the later take (usually the corrected one).
        choice = max(i for i, s in enumerate(scores) if s >= best - 0.5)
        why = "auto: " + ", ".join(f"take {i + 1}={s:.2f}" for i, s in enumerate(scores))

    segments = build_segments(asr, takes, choice, args.gap)
    render_vo(vo, segments, VO_OUT)

    # ASR words on the edited timeline (cut words dropped).
    edited = []
    for w in asr:
        s, e = map_time(w["start"], segments), map_time(w["end"], segments)
        if s is not None and e is not None:
            edited.append({**w, "start": s, "end": e})
    words, unmatched = align(script, edited)

    TIMING.write_text(json.dumps({
        "_comment": "GENERATED by scripts/lock_timing.py from the real VO (Scribe word timestamps).",
        "source": "scribe",
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "voFile": str(vo.name),
        "hookTakes": len(takes),
        "hookTakeUsed": choice + 1,
        "words": words,
    }, ensure_ascii=False, indent=1), encoding="utf-8")

    report = [
        f"# VO lock report — {vo.name}",
        "",
        f"- Hook takes found: {len(takes)}; kept take {choice + 1} ({why})",
        f"- Segments kept (source s): " + ", ".join(f"{a:.2f}-{b:.2f}" for a, b in segments),
        f"- Edited VO: {VO_OUT.relative_to(ROOT)} ({words[-1]['endMs'] / 1000:.2f}s of speech)",
        f"- Script words not heard by the ASR (interpolated — listen to these): "
        + (", ".join(unmatched) if unmatched else "none"),
    ]
    (WORK / "lock_report.md").write_text("\n".join(report) + "\n", encoding="utf-8")
    print("\n".join(report))

    if not args.no_music:
        subprocess.run([sys.executable, str(ROOT / "scripts" / "make_audio.py"), "--music-only"], check=True)


if __name__ == "__main__":
    main()
