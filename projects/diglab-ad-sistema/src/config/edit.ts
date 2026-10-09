/**
 * Talking-head edit — the ONE place that decides what is on screen when.
 *
 *   NARRATOR  the face (a-roll), nothing on top
 *   OVERLAY   the face + graphics floating around it
 *   CUTAWAY   a full-screen graphic replaces the picture; the voice keeps going
 *
 * Every boundary is anchored to a word of the VO (via cues), so re-cutting the
 * VO (scripts/build_edit.py) moves the whole edit with it. Values are frames.
 */
import { cue, FPS, msToFrame, type SceneId, SCENES, TOTAL_FRAMES, VO_WORDS } from "./timeline";
import timing from "./vo-timing.json";

const sec = (s: number) => Math.round(s * FPS);

/** The narrator picture (cut with the same EDL as the voice). */
export const AROLL = {
  file: (timing as { aroll?: string | null }).aroll ?? null,
  end: sec((timing as { durationSeconds?: number }).durationSeconds ?? 0),
  /** a-roll segment starts (jump cuts between takes), output frames */
  cuts: ((timing as { segments?: { outStart: number }[] }).segments ?? []).map((s) => sec(s.outStart)),
};

const VO_END = msToFrame(VO_WORDS[VO_WORDS.length - 1].endMs);
/** Jump cut between the hook take and the "otro escenario" take. */
const TAKE_B = AROLL.cuts[1] ?? SCENES.s2.from;

/** Full-screen cutaways: an existing scene component, shown only in [from, to). */
export type CutawayId = "chat" | "scale" | "system" | "journey" | "endcard";
export const CUTAWAYS: { id: CutawayId; scene: SceneId; from: number; to: number }[] = [
  // S1 quick cutaway (~2s): the lead asks the price and vanishes
  { id: "chat", scene: "s1", from: cue("s1", "clinica").end + 3, to: cue("s1", "sinDecir").start + 8 },
  // S3 short cutaway: the scale tips from price to value
  { id: "scale", scene: "s3", from: cue("s3", "comparar").start - 4, to: cue("s3", "vale").start - 1 },
  // S4 the one long cutaway: bridge -> 5-node pipeline (face bookends it)
  { id: "system", scene: "s4", from: cue("s4", "puente").end + 6, to: cue("s4", "recurrentes").start - 6 },
  // S6 zoom out: the ad is only the entry point of the patient journey
  { id: "journey", scene: "s6", from: cue("s6", "chip").end + 4, to: cue("s6", "siTeInteresa").start - 6 },
  // End card after the narrator delivers the CTA
  { id: "endcard", scene: "s6", from: VO_END + 3, to: TOTAL_FRAMES },
];

/** Overlay beats on top of the narrator. */
export const OVERLAYS = {
  brandBlock: { from: 0, to: CUTAWAYS[0].from },
  // starts on the take change A->B (hidden under the S1 -> S2 wipe)
  trust: { from: TAKE_B, to: SCENES.s3.from },
  vale: { from: CUTAWAYS[1].to, to: cue("s4", "puente").start },
  bridgeWord: { from: cue("s4", "puente").start, to: CUTAWAYS[2].from },
  outcome: { from: CUTAWAYS[2].to, to: SCENES.s5.from },
  priceWar: { from: SCENES.s5.from, to: SCENES.s6.from },
  megaphone: { from: SCENES.s6.from, to: CUTAWAYS[3].from },
  cta: { from: CUTAWAYS[3].to, to: CUTAWAYS[4].from },
} as const;

/** Brand-bar wipes: into every cutaway, and S1 -> S2 (hides the take change). */
export const WIPES: { at: number; frames: number; vertical: boolean }[] = [
  { at: CUTAWAYS[0].from, frames: 10, vertical: false },
  { at: TAKE_B, frames: 12, vertical: false },
  { at: CUTAWAYS[1].from, frames: 10, vertical: true },
  { at: CUTAWAYS[2].from, frames: 12, vertical: false },
  { at: CUTAWAYS[3].from, frames: 10, vertical: true },
  { at: CUTAWAYS[4].from, frames: 12, vertical: false },
];

/**
 * Face framing: the zoom changes at every jump cut and every return from a
 * cutaway (classic talking-head punch-ins), drifting slowly in between.
 * Origin = the narrator's face in the 1080x1920 frame. Zoom stays <= 1.2 so
 * the chin stays above stage y ~580, where the lower overlays begin.
 */
export const FACE_ORIGIN = { x: 0.45, y: 0.35 };
const ZOOM_STEPS = [1.1, 1.04, 1.2, 1.07, 1.18, 1.05, 1.16, 1.2, 1.05, 1.08, 1.26];
export const ZOOM_CHANGES: number[] = Array.from(
  new Set([0, ...AROLL.cuts, ...CUTAWAYS.map((c) => c.to)].filter((f) => f < AROLL.end)),
).sort((a, b) => a - b);
export const zoomAt = (frame: number) => {
  let k = 0;
  for (let i = 0; i < ZOOM_CHANGES.length; i++) if (frame >= ZOOM_CHANGES[i]) k = i;
  const base = ZOOM_STEPS[k % ZOOM_STEPS.length];
  // Wide while the price-war panel sits under the face; tight for the CTA.
  const inWin = (w: { from: number; to: number }) => frame >= w.from && frame < w.to;
  const z = inWin(OVERLAYS.priceWar) ? 1.0 : frame >= OVERLAYS.cta.from ? 1.18 : base;
  return z + 0.0009 * (frame - ZOOM_CHANGES[k]); // slow drift
};

export const inCutaway = (frame: number) => CUTAWAYS.some((c) => frame >= c.from && frame < c.to);

/** Share of the runtime with the narrator's face on screen (brief: 55-70%). */
export const NARRATOR_SHARE =
  1 - CUTAWAYS.reduce((n, c) => n + Math.max(0, c.to - c.from), 0) / TOTAL_FRAMES;
