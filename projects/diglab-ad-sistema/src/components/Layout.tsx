import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";

/** Scenes are designed on a fixed 960x960 logical stage, then scaled into the
 *  safe area of each format. Subtitles get their own band below the stage. */
export const STAGE = 960;

export type Format = "9x16" | "4x5" | "1x1";

export type LayoutInfo = {
  format: Format;
  width: number;
  height: number;
  /** Reels/Feed UI-free band. */
  safeTop: number;
  safeBottom: number; // y coordinate of the bottom limit
  stage: { x: number; y: number; scale: number; size: number };
  subtitles: { top: number; bottom: number; maxWidth: number; scale: number };
};

export const computeLayout = (width: number, height: number): LayoutInfo => {
  const ratio = height / width;
  const format: Format = ratio > 1.6 ? "9x16" : ratio > 1.1 ? "4x5" : "1x1";
  // 9:16 Reels: keep ~250px top and ~500px bottom free of key text + logo.
  const topMargin = format === "9x16" ? 250 : format === "4x5" ? 70 : 50;
  const bottomMargin = format === "9x16" ? 500 : format === "4x5" ? 70 : 50;
  const safeBottom = height - bottomMargin;

  const subScale = format === "1x1" ? 0.86 : 1;
  const subBottom = safeBottom - 12;
  const subTop = subBottom - Math.round(150 * subScale);

  const stageTop = topMargin + 6;
  const stageBottom = subTop - 12;
  const avail = Math.min(stageBottom - stageTop, width - 120);
  const scale = Math.min(1, avail / STAGE);
  const size = STAGE * scale;

  return {
    format,
    width,
    height,
    safeTop: topMargin,
    safeBottom,
    stage: {
      x: (width - size) / 2,
      y: stageTop + (stageBottom - stageTop - size) / 2,
      scale,
      size,
    },
    subtitles: {
      top: subTop,
      bottom: subBottom,
      maxWidth: Math.round(900 * subScale),
      scale: subScale,
    },
  };
};

export const useLayout = (): LayoutInfo => {
  const { width, height } = useVideoConfig();
  return computeLayout(width, height);
};

/** 960x960 logical canvas positioned in the safe area. */
export const Stage: React.FC<{
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ children, style }) => {
  const { stage } = useLayout();
  return (
    <div
      style={{
        position: "absolute",
        left: stage.x,
        top: stage.y,
        width: STAGE,
        height: STAGE,
        transformOrigin: "0 0",
        transform: `scale(${stage.scale})`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/** Debug overlay: Reels UI zones + stage + subtitle band. Never in delivery renders. */
export const SafeZoneOverlay: React.FC = () => {
  const L = useLayout();
  const band = (top: number, h: number, color: string) => (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top,
        height: h,
        background: color,
      }}
    />
  );
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {band(0, L.safeTop, "rgba(255,0,180,0.28)")}
      {band(L.safeBottom, L.height - L.safeBottom, "rgba(255,0,180,0.28)")}
      <div
        style={{
          position: "absolute",
          left: L.stage.x,
          top: L.stage.y,
          width: L.stage.size,
          height: L.stage.size,
          outline: "3px dashed rgba(0,220,255,0.9)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: (L.width - L.subtitles.maxWidth) / 2,
          top: L.subtitles.top,
          width: L.subtitles.maxWidth,
          height: L.subtitles.bottom - L.subtitles.top,
          outline: "3px dashed rgba(255,230,0,0.9)",
        }}
      />
    </AbsoluteFill>
  );
};
