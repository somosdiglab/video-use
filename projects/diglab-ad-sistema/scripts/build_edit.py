"""Cut the talking-head edit from the raw recording, in one pass.

    python scripts/build_edit.py            # uses src/config/edl.json
    python scripts/build_edit.py --no-video # audio + timing only (fast)

Reads the EDL (kept takes, in VO.mp3 time) and produces:

  public/media/vo.wav       edited voice: the ONLY audible voice in the ad
  public/media/aroll.mp4    narrator picture cut with the SAME cuts, no audio
                            track (nothing can double the voice), HLG -> SDR
                            BT.709, rotation applied, 1080x1920 @ 30 fps
  src/config/vo-timing.json script words timed on the edited timeline
                            (drives scenes, overlays, cutaways, subtitles, SFX)
  vo-work/edit_report.md    what was kept/dropped and where every cut landed

Production rules (video-use): cuts snap to the quietest point between words,
30-200 ms padding, 30 ms audio fades at every cut, per-segment extract then
lossless concat, segment lengths quantized to whole frames so audio and
picture never drift. The transcript comes from Scribe (cached in vo-work/).
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
import wave
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
from lock_timing import align, asr_words, script_tokens  # noqa: E402

EDL = ROOT / "src" / "config" / "edl.json"
TIMING = ROOT / "src" / "config" / "vo-timing.json"
WORK = ROOT / "vo-work"
OUT_DIR = ROOT / "public" / "media"
TRANSCRIPT = WORK / "transcripts" / "VO.json"

PAD_MIN, PAD_MAX, PAD_PREF = 0.03, 0.20, 0.09
FADE = 0.03
SR = 48000
TONEMAP = (
    "zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,"
    "tonemap=tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,format=yuv420p"
)


def run(cmd: list[str]) -> None:
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)


def decode_mono(src: Path) -> np.ndarray:
    tmp = WORK / "_decode.wav"
    run(["ffmpeg", "-y", "-i", str(src), "-vn", "-ac", "1", "-ar", str(SR), "-c:a", "pcm_s16le", str(tmp)])
    with wave.open(str(tmp)) as w:
        x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
    tmp.unlink()
    return x


def rms_at(x: np.ndarray, t: float, win: float = 0.012) -> float:
    a, b = int((t - win) * SR), int((t + win) * SR)
    seg = x[max(0, a) : max(0, b)]
    return float(np.sqrt(np.mean(seg**2))) if len(seg) else 0.0


def snap(x: np.ndarray, lo: float, hi: float, pref: float) -> float:
    """Quietest point in [lo, hi]; ties go to the preferred padding."""
    if hi <= lo:
        return (lo + hi) / 2
    ts = np.arange(lo, hi + 1e-9, 0.005)
    scores = [rms_at(x, t) + 0.0005 * abs(t - pref) for t in ts]
    return float(ts[int(np.argmin(scores))])


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--no-video", action="store_true", help="skip the a-roll render")
    args = ap.parse_args()

    edl = json.loads(EDL.read_text(encoding="utf-8"))
    fps = edl["fps"]
    vo_src = ROOT / edl["sourceVo"]
    video_src = ROOT / edl["sourceVideo"]
    offset = float(edl["videoMinusVoSeconds"])
    if not TRANSCRIPT.exists():
        sys.exit(f"missing {TRANSCRIPT.relative_to(ROOT)} — transcribe VO.mp3 first (video-use helpers/transcribe.py --edit-dir vo-work)")
    asr = asr_words(json.loads(TRANSCRIPT.read_text(encoding="utf-8")))
    x = decode_mono(vo_src)

    # 1) Snap cuts to silence and quantize to frames ----------------------------------
    segs = []
    for s in edl["segments"]:
        first, last = float(s["firstWord"]), float(s["lastWord"])
        prev_end = max([w["end"] for w in asr if w["end"] <= first + 1e-3], default=0.0)
        next_start = min([w["start"] for w in asr if w["start"] >= last - 1e-3], default=len(x) / SR)
        # Starts keep >= 50 ms before the onset so the 30 ms fade-in never eats the attack.
        a = s.get("cutIn") or snap(x, max(prev_end, first - PAD_MAX), first - 0.05, first - PAD_PREF)
        b = s.get("cutOut") or snap(x, last + PAD_MIN, min(next_start, last + PAD_MAX), last + PAD_PREF + 0.04)
        fa, fb = round(a * fps), round(b * fps)
        segs.append({**s, "in": fa / fps, "out": fb / fps, "frames": fb - fa})
    out_t = 0.0
    for s in segs:
        s["outStart"] = out_t
        out_t += s["frames"] / fps
        s["outEnd"] = out_t
    total = out_t

    # 2) Edited voice (30 ms fades at every cut) ---------------------------------------
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    parts, labels = [], []
    for k, s in enumerate(segs):
        d = s["out"] - s["in"]
        parts.append(
            f"[0:a]atrim=start={s['in']:.6f}:end={s['out']:.6f},asetpts=PTS-STARTPTS,"
            f"afade=t=in:st=0:d={FADE},afade=t=out:st={d - FADE:.6f}:d={FADE}[a{k}]"
        )
        labels.append(f"[a{k}]")
    graph = ";".join(parts) + ";" + "".join(labels) + f"concat=n={len(segs)}:v=0:a=1[out]"
    vo_out = OUT_DIR / "vo.wav"
    run(["ffmpeg", "-y", "-i", str(vo_src), "-filter_complex", graph, "-map", "[out]",
         "-ac", "1", "-ar", str(SR), "-c:a", "pcm_s16le", str(vo_out)])

    # 3) Narrator a-roll: per-segment extract -> lossless concat ---------------------
    if not args.no_video:
        seg_dir = WORK / "aroll_segments"
        seg_dir.mkdir(parents=True, exist_ok=True)
        files = []
        for k, s in enumerate(segs):
            f = seg_dir / f"seg_{k:02d}_{s['id']}.mp4"
            start = max(0.0, s["in"] + offset)
            run([
                "ffmpeg", "-y", "-ss", f"{start:.6f}", "-i", str(video_src),
                "-frames:v", str(s["frames"]), "-an",
                "-vf", f"{TONEMAP},scale=1080:1920:flags=lanczos,fps={fps}",
                "-c:v", "libx264", "-preset", "medium", "-crf", "16", "-pix_fmt", "yuv420p",
                "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709",
                "-movflags", "+faststart", str(f),
            ])
            files.append(f)
            print(f"  a-roll {s['id']}: src {start:7.3f}s  {s['frames']:4d} frames")
        lst = WORK / "_concat.txt"
        lst.write_text("".join(f"file '{p.resolve()}'\n" for p in files))
        run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(lst), "-c", "copy",
             "-movflags", "+faststart", str(OUT_DIR / "aroll.mp4")])
        lst.unlink()

    # 4) Script words on the edited timeline --------------------------------------------
    edited = []
    for w in asr:
        for s in segs:
            if s["in"] <= w["start"] and w["end"] <= s["out"] + 0.02:
                shift = s["outStart"] - s["in"]
                edited.append({**w, "start": w["start"] + shift, "end": min(w["end"], s["out"]) + shift})
                break
    words, unmatched = align(script_tokens(), edited)
    TIMING.write_text(json.dumps({
        "_comment": "GENERATED by scripts/build_edit.py — script words timed on the edited talking-head timeline.",
        "source": "scribe",
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "voFile": "media/vo.wav",
        "aroll": None if args.no_video else "media/aroll.mp4",
        "durationSeconds": round(total, 3),
        "segments": [
            {"id": s["id"], "scene": s["scene"], "srcIn": round(s["in"], 3), "srcOut": round(s["out"], 3),
             "outStart": round(s["outStart"], 3), "outEnd": round(s["outEnd"], 3)}
            for s in segs
        ],
        "words": words,
    }, ensure_ascii=False, indent=1), encoding="utf-8")

    lines = [f"# Edit report — {datetime.now().strftime('%Y-%m-%d %H:%M')}", "",
             f"Edited length: {total:.2f}s (raw {len(x) / SR:.2f}s)", "",
             "| seg | scene | source in-out | out start-end | note |", "|---|---|---|---|---|"]
    for s in segs:
        lines.append(f"| {s['id']} | {s['scene']} | {s['in']:.3f}-{s['out']:.3f} | "
                     f"{s['outStart']:.3f}-{s['outEnd']:.3f} | {s['note']} |")
    lines += ["", "Script words not found in the kept speech (interpolated — listen): "
              + (", ".join(unmatched) if unmatched else "none")]
    (WORK / "edit_report.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("\n".join(lines))


if __name__ == "__main__":
    main()
