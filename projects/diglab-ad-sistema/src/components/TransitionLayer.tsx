import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Trail } from "@remotion/motion-blur";
import { COLORS } from "../config/brand";
import { SCENE_IDS, SCENES, TRANSITIONS } from "../config/timeline";
import { CLAMP, EASE_IN_OUT } from "./anim";

/**
 * Red-bar wipes at scene boundaries. The bar is wider than the frame, so the
 * screen is fully red for ~2 frames around the cut — the cut hides under it.
 */
export const Bars: React.FC<{ boundary: number; frames: number; vertical: boolean }> = ({
  boundary,
  frames,
  vertical,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const half = frames / 2;
  const p = interpolate(frame, [boundary - half, boundary + half], [0, 1], {
    ...CLAMP,
    easing: EASE_IN_OUT,
  });
  const span = vertical ? height : width;
  const main = 1.4 * span;
  // Main bar travels from fully before the frame to fully past it.
  const mainPos = interpolate(p, [0, 1], [-main, span]);
  // Thin deep-red lead bar, slightly ahead, for depth.
  const leadPos = interpolate(p, [0, 1], [-main * 0.55, span + main * 0.25]);
  const lead = 0.09 * span;

  const bar = (pos: number, size: number, color: string): React.CSSProperties =>
    vertical
      ? { position: "absolute", left: 0, right: 0, bottom: pos, height: size, background: color }
      : { position: "absolute", top: 0, bottom: 0, left: pos, width: size, background: color };

  return (
    <AbsoluteFill>
      <div style={bar(leadPos, lead, COLORS.accent)} />
      <div style={bar(mainPos, main, COLORS.brand)} />
    </AbsoluteFill>
  );
};

export const TransitionLayer: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {TRANSITIONS.map((t) => {
        if (t.type !== "redWipeH" && t.type !== "redWipeV") return null;
        const nextId = SCENE_IDS[SCENE_IDS.indexOf(t.after) + 1];
        const boundary = SCENES[nextId].from;
        const half = t.frames / 2;
        if (frame < boundary - half - 2 || frame > boundary + half + 2) return null;
        return (
          <Trail key={t.after} layers={5} lagInFrames={0.22} trailOpacity={0.55}>
            <Bars boundary={boundary} frames={t.frames} vertical={t.type === "redWipeV"} />
          </Trail>
        );
      })}
    </AbsoluteFill>
  );
};
