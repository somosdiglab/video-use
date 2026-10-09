"""Estimate word-level VO timing from the script (no audio needed).

Writes src/config/vo-timing.json — the single timing source the whole video
reads (scene windows, animation cues, subtitles, SFX, music ducking).

This is a placeholder until the real vo.mp3 exists. Then run lock_timing.py,
which overwrites the same file with Scribe word timestamps.

Usage:
    python scripts/estimate_timing.py                 # default ~59.6s of VO
    python scripts/estimate_timing.py --vo-end 58.0   # squeeze/stretch
"""

from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCRIPT = ROOT / "src" / "config" / "script.json"
OUT = ROOT / "src" / "config" / "vo-timing.json"

STRONG = set("aeoáéóíú")  # accented i/u break diphthongs (hiatus)
VOWELS = "aeiouáéíóúü"


def syllables(word: str) -> int:
    w = word.lower()
    count = 0
    for group in re.findall(f"[{VOWELS}]+", w):
        n = 1
        for a, b in zip(group, group[1:]):
            if a in STRONG and b in STRONG:
                n += 1
        count += n
    return max(1, count)


def pause_after(token: str) -> float:
    t = token.rstrip("\"'")
    if t.endswith("..."):
        return 0.42
    if t.endswith((".", "?", "!")):
        return 0.38
    if t.endswith((",", ";", ":")):
        return 0.16
    return 0.0


def tokenize(vo: str) -> list[str]:
    # Must match src/config/timeline.ts: split on whitespace.
    return vo.strip().split()


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--start", type=float, default=0.30, help="First word start (s)")
    ap.add_argument("--vo-end", type=float, default=59.8, help="Last word end (s)")
    ap.add_argument("--scene-gap", type=float, default=0.55, help="Silence between scenes (s)")
    args = ap.parse_args()

    scenes = json.loads(SCRIPT.read_text(encoding="utf-8"))["scenes"]

    # Nominal pass: unit = one syllable; pauses in seconds kept fixed.
    plan: list[tuple[str, int, str, float, float]] = []  # scene, i, text, syl, pause
    for s_idx, scene in enumerate(scenes):
        toks = tokenize(scene["vo"])
        for i, tok in enumerate(toks):
            p = pause_after(tok)
            if i == len(toks) - 1:
                p = args.scene_gap if s_idx < len(scenes) - 1 else 0.0
            plan.append((scene["id"], i, tok, syllables(tok), p))

    total_syl = sum(p[3] for p in plan)
    total_pause = sum(p[4] for p in plan)
    onset = 0.03  # small per-word onset cost
    speak_time = (args.vo_end - args.start) - total_pause - onset * len(plan)
    sec_per_syl = speak_time / total_syl

    words = []
    t = args.start
    for scene_id, i, text, syl, pause in plan:
        dur = syl * sec_per_syl + onset
        words.append({
            "scene": scene_id,
            "i": i,
            "text": text,
            "startMs": round(t * 1000),
            "endMs": round((t + dur) * 1000),
        })
        t += dur + pause

    data = {
        "_comment": "GENERATED. Estimated timing — replace by running scripts/lock_timing.py once vo.mp3 exists.",
        "source": "estimate",
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "syllablesPerSecond": round(1 / sec_per_syl, 2),
        "words": words,
    }
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
    last = words[-1]["endMs"] / 1000
    print(f"wrote {OUT.relative_to(ROOT)}: {len(words)} words, VO ends {last:.2f}s, "
          f"{1 / sec_per_syl:.2f} syl/s")
    for sc in scenes:
        ws = [w for w in words if w["scene"] == sc["id"]]
        print(f"  {sc['id']}  {ws[0]['startMs'] / 1000:6.2f} -> {ws[-1]['endMs'] / 1000:6.2f}  {sc['name']}")


if __name__ == "__main__":
    main()
