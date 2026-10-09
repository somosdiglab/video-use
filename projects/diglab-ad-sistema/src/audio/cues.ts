/**
 * SFX cue sheet. Every hit is anchored to the same beat tables the scenes
 * animate from, so sound and picture can't drift when timings are re-locked.
 * Attack-aware: whooshes start before the cut so their peak lands on it.
 */
import { CUTAWAYS, OVERLAYS, WIPES } from "../config/edit";
import { SCENES, type SceneId } from "../config/timeline";
import { PRICEWAR_BEATS } from "../edit/Overlays";
import { S1_BEATS } from "../scenes/S1Hook";
import { S2_BEATS } from "../scenes/S2OtroEscenario";
import { S3_BEATS } from "../scenes/S3NoComparaIgual";
import { S4_BEATS } from "../scenes/S4Sistema";
import { S6_BEATS } from "../scenes/S6Cierre";

export type SfxName =
  | "whoosh"
  | "whoosh-short"
  | "swish"
  | "click"
  | "switch"
  | "ding"
  | "success"
  | "thud"
  | "riser"
  | "riser-short"
  | "downsweep"
  | "strike"
  | "buzz"
  | "tick"
  | "type"
  | "pop1"
  | "pop2"
  | "pop3"
  | "pop4"
  | "pop5";

export type SfxHit = { name: SfxName; at: number; volume: number };

/** Frames from file start to the audible peak (so the peak lands on the beat). */
const PEAK: Partial<Record<SfxName, number>> = {
  whoosh: 10,
  "whoosh-short": 7,
  swish: 4,
  riser: 30,
  "riser-short": 18,
};

const POPS: SfxName[] = ["pop1", "pop2", "pop3", "pop4", "pop5"];

const hits: SfxHit[] = [];
/** Add a hit whose PEAK lands at scene-local frame `local`. */
const hit = (scene: SceneId, local: number, name: SfxName, volume: number) => {
  hits.push({ name, at: SCENES[scene].from + local - (PEAK[name] ?? 0), volume });
};

/** Add a hit whose PEAK lands at a global frame. */
const hitAt = (frame: number, name: SfxName, volume: number) => {
  hits.push({ name, at: frame - (PEAK[name] ?? 0), volume });
};

// --- Brand-bar wipes (into every cutaway + S1 -> S2) ---------------------------
WIPES.forEach((w, k) => hitAt(w.at, k % 2 ? "whoosh-short" : "whoosh", 0.42));
// Back to the face after a cutaway: a short swish on the punch-in.
CUTAWAYS.filter((c) => c.id !== "endcard").forEach((c) => hitAt(c.to, "swish", 0.2));

// --- S1 Hook ------------------------------------------------------------------
{
  const b = S1_BEATS;
  hit("s1", 0, "thud", 0.32); // impact on the open
  hit("s1", 4, "swish", 0.18); // question slides in
  hit("s1", b.chatIn, "pop1", 0.25);
  hit("s1", b.chatIn + 2, "pop2", 0.2);
  for (let t = b.typeStart; t < b.typedDone; t += 3) hit("s1", t, "type", 0.12);
  hit("s1", b.tagAt, "pop3", 0.36);
  hit("s1", b.gone + 2, "downsweep", 0.22);
  for (let k = 0; k < 3; k++) hit("s1", b.silentTypingAt + k * 3, "type", 0.07);
}

// --- S2 Otro escenario ----------------------------------------------------------
{
  const b = S2_BEATS;
  hit("s2", b.flipAt, "switch", 0.45);
  hit("s2", b.layoutAt, "whoosh-short", 0.2);
  hit("s2", b.priceAt, "pop1", 0.2);
  hit("s2", b.priceAt + 2, "click", 0.18);
  b.cardAt.forEach((t, k) => {
    hit("s2", t, POPS[k + 1], 0.36);
    hit("s2", t + 6, "tick", 0.14);
  });
  hit("s2", b.cardAt[2] + 14, "ding", 0.22);
  hit("s2", b.qAt, "whoosh-short", 0.25);
  hit("s2", b.qAt, "thud", 0.3);
  hit("s2", b.unlockAt, "click", 0.4);
  hit("s2", b.unlockAt + 10, "pop5", 0.25);
}

// --- S3 No compara igual ----------------------------------------------------------
{
  const b = S3_BEATS;
  b.landAt.forEach((t) => hit("s3", t, "thud", 0.28));
  hit("s3", b.tipAt, "swish", 0.25);
  hit("s3", b.valeAt, "whoosh-short", 0.22);
  hit("s3", b.valeAt + 4, "thud", 0.2);
}

// --- S4 El sistema ----------------------------------------------------------------
{
  const b = S4_BEATS;
  hit("s4", 26, "riser-short", 0.18); // arch completes
  hit("s4", b.sistemaAt + 4, "thud", 0.3);
  hit("s4", b.morphAt + 6, "whoosh-short", 0.3);
  b.litAt.forEach((t, k) => {
    hit("s4", t, POPS[k], 0.42);
    hit("s4", t, "click", 0.14);
  });
  hit("s4", b.litAt[4], "ding", 0.5);
  b.conversions.forEach((t) => hit("s4", t, "tick", 0.1));
}

// --- S5 Dejar de competir (overlay beside the narrator) ------------------------
{
  const b = PRICEWAR_BEATS;
  hitAt(OVERLAYS.priceWar.from + 6, "downsweep", 0.26);
  b.badgeAt.forEach((t) => hitAt(t, "pop1", 0.2));
  hitAt(b.strikeAt, "strike", 0.42);
  hitAt(b.swapAt, "whoosh-short", 0.3);
  hitAt(b.swapAt + 6, "thud", 0.25);
  hitAt(b.riseDone, "riser", 0.28);
  hitAt(b.tVale, "ding", 0.3);
}

// --- S6 Cierre / CTA --------------------------------------------------------------------
{
  const b = S6_BEATS;
  hit("s6", b.megaAt, "pop2", 0.3);
  hit("s6", b.xAt, "buzz", 0.3);
  hit("s6", b.zoomAt + 6, "whoosh", 0.35);
  b.stageAppearAt.forEach((t) => hit("s6", t, "pop1", 0.14));
  hit("s6", b.frameAt + 8, "swish", 0.25);
  hit("s6", b.frameAt + 4, "thud", 0.2);
  b.lightAt.forEach((t, k) => hit("s6", t, POPS[k], 0.3));
  hit("s6", b.endCardAt, "whoosh", 0.4);
  hit("s6", b.endCardAt + 4, "thud", 0.35);
  hit("s6", b.actionAt, "success", 0.5);
  // Taps only once the end card is on screen.
  const endFrom = CUTAWAYS.find((c) => c.id === "endcard")!.from - SCENES.s6.from;
  b.tapAt.filter((t) => t >= endFrom).forEach((t, k) => hit("s6", t, "click", k === 0 ? 0.45 : 0.22));
}

export const SFX_HITS: SfxHit[] = hits.sort((a, b) => a.at - b.at);
