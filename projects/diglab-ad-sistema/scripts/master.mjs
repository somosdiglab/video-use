// Social-ready audio master: two-pass loudnorm to -14 LUFS, -1 dBTP, LRA 11
// (YouTube / Instagram / Facebook / TikTok normalization targets).
// Video is stream-copied (no re-encode); only the audio is re-rendered.
//
//   node scripts/master.mjs <input.mp4> <output.mp4>
//
// Needs ffmpeg on PATH (or set FFMPEG=/path/to/ffmpeg).
import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const [, , input, output] = process.argv;
if (!input || !output) {
  console.error("usage: node scripts/master.mjs <input.mp4> <output.mp4>");
  process.exit(1);
}
const ff = process.env.FFMPEG || "ffmpeg";
const TARGET = "I=-14:TP=-1:LRA=11";

const p1 = spawnSync(
  ff,
  ["-hide_banner", "-nostats", "-i", input, "-af", `loudnorm=${TARGET}:print_format=json`, "-vn", "-f", "null", "-"],
  { encoding: "utf8" },
);
const err = p1.stderr || "";
const json = err.slice(err.lastIndexOf("{"), err.lastIndexOf("}") + 1);
let m;
try {
  m = JSON.parse(json);
} catch {
  console.error("loudnorm measurement failed:\n" + err.slice(-800));
  process.exit(1);
}
console.log(`measured: I=${m.input_i} LUFS  TP=${m.input_tp} dBTP  LRA=${m.input_lra}`);

const filter =
  `loudnorm=${TARGET}:measured_I=${m.input_i}:measured_TP=${m.input_tp}` +
  `:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;
mkdirSync(dirname(output), { recursive: true });
const p2 = spawnSync(
  ff,
  ["-y", "-hide_banner", "-loglevel", "error", "-i", input, "-c:v", "copy", "-af", filter,
    "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart", output],
  { stdio: "inherit" },
);
if (p2.status !== 0) process.exit(p2.status ?? 1);
console.log(`mastered -> ${output}`);
