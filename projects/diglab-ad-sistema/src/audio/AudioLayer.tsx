import React from "react";
import { getStaticFiles, Sequence, staticFile } from "remotion";
import { Audio } from "@remotion/media";
import { msToFrame, SCENES, TOTAL_FRAMES, VO_END_FRAME, VO_WORDS } from "../config/timeline";
import { S6_BEATS } from "../scenes/S6Cierre";
import { SFX_HITS } from "./cues";

/**
 * Audio, bottom to top:
 *   VO       public/audio/vo.mp3 (the immovable timing track; absent = silent preview)
 *   Music    public/audio/music.mp3, ducked ~-20 dB under the VO, rising at the close
 *   SFX      synthesized hits from cues.ts
 */
const files = getStaticFiles().map((f) => f.name);
export const HAS_VO = files.includes("audio/vo.mp3");
const HAS_MUSIC = files.includes("audio/music.mp3");

const DUCK = 0.1; // -20 dB under speech
const GAP = 0.16; // -16 dB between lines
const CLOSE_DUCK = 0.13; // swells a little under the CTA line
const CLOSE_PEAK = 0.5; // after the last word: music takes over
const FADE_OUT_FRAMES = 10;

/** Per-frame music gain, precomputed (volume callbacks must be pure). */
const MUSIC_GAIN: Float32Array = (() => {
  const target = new Float32Array(TOTAL_FRAMES).fill(GAP);
  for (const w of VO_WORDS) {
    const a = Math.max(0, msToFrame(w.startMs) - 4);
    const b = Math.min(TOTAL_FRAMES - 1, msToFrame(w.endMs) + 6);
    for (let i = a; i <= b; i++) target[i] = DUCK;
  }
  const closeFrom = SCENES.s6.from + S6_BEATS.endCardAt;
  for (let i = closeFrom; i < TOTAL_FRAMES; i++) {
    if (target[i] === DUCK) target[i] = CLOSE_DUCK;
  }
  for (let i = VO_END_FRAME + 4; i < TOTAL_FRAMES; i++) {
    target[i] = Math.min(CLOSE_PEAK, GAP + (CLOSE_PEAK - GAP) * ((i - VO_END_FRAME - 4) / 15));
  }
  // One-pole smoothing: fast duck (attack), slow recovery (release).
  const out = new Float32Array(TOTAL_FRAMES);
  let g = target[0];
  for (let i = 0; i < TOTAL_FRAMES; i++) {
    const k = target[i] < g ? 0.45 : 0.12;
    g += (target[i] - g) * k;
    out[i] = g;
  }
  for (let i = 0; i < FADE_OUT_FRAMES; i++) {
    out[TOTAL_FRAMES - 1 - i] *= i / FADE_OUT_FRAMES;
  }
  return out;
})();

export const AudioLayer: React.FC<{ withMusic: boolean }> = ({ withMusic }) => {
  return (
    <>
      {HAS_VO ? <Audio src={staticFile("audio/vo.mp3")} volume={1} /> : null}
      {withMusic && HAS_MUSIC ? (
        <Audio
          src={staticFile("audio/music.mp3")}
          volume={(f) => MUSIC_GAIN[Math.min(TOTAL_FRAMES - 1, Math.max(0, f))]}
        />
      ) : null}
      {SFX_HITS.map((h, i) => (
        <Sequence key={i} from={Math.max(0, h.at)} durationInFrames={60} layout="none" name={`SFX ${h.name}`}>
          <Audio src={staticFile(`audio/sfx/${h.name}.wav`)} volume={h.volume} />
        </Sequence>
      ))}
    </>
  );
};
