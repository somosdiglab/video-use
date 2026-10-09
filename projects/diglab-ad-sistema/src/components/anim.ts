import { Easing, interpolate, spring } from "remotion";
import { FPS } from "../config/timeline";

export const CLAMP = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

/** Fast-out, slow landing. Default for entrances. */
export const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1);
/** Symmetric, for moves and continuous draws. */
export const EASE_IN_OUT = Easing.bezier(0.65, 0, 0.35, 1);
/** Accelerating, for exits. */
export const EASE_IN = Easing.bezier(0.7, 0, 0.84, 0);

/** 0 -> 1 over `dur` frames starting at `at`. */
export const rise = (f: number, at: number, dur = 10, easing = EASE_OUT) =>
  interpolate(f, [at, at + dur], [0, 1], { ...CLAMP, easing });

/** 1 -> 0 over `dur` frames starting at `at`. */
export const fall = (f: number, at: number, dur = 8, easing = EASE_IN) =>
  interpolate(f, [at, at + dur], [1, 0], { ...CLAMP, easing });

/** Visible window: fades in at `inAt`, out at `outAt`. */
export const windowed = (f: number, inAt: number, outAt: number, inDur = 8, outDur = 8) =>
  Math.min(rise(f, inAt, inDur), fall(f, outAt, outDur));

/** Springy pop (slight overshoot) — for icons and cards entering. */
export const pop = (f: number, at: number, damping = 11) =>
  spring({ frame: f - at, fps: FPS, config: { damping, stiffness: 170, mass: 0.7 } });

/** Critically damped settle — for layout moves. */
export const settle = (f: number, at: number, durationInFrames?: number) =>
  spring({
    frame: f - at,
    fps: FPS,
    config: { damping: 200 },
    durationInFrames,
  });

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Deterministic pseudo-random in [0,1) from an integer seed. */
export const hash01 = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/** Directional "motion blur" for fast moves: blur grows with speed. */
export const speedBlur = (progress: number, maxPx = 14) =>
  `blur(${(Math.sin(Math.PI * Math.min(1, Math.max(0, progress))) * maxPx).toFixed(2)}px)`;
