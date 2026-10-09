import React from "react";
import { AbsoluteFill, Img, staticFile, useVideoConfig } from "remotion";
import { COLORS } from "../config/brand";
import { hash01 } from "./anim";

export type BgKind = "dark" | "cold" | "paper";

const BASES: Record<BgKind, { base: string; glow: string; vignette: string; grain: number }> = {
  // Dark premium
  dark: {
    base: COLORS.bg,
    glow: "rgba(41,171,226,0.08)",
    vignette: "rgba(2,8,16,0.55)",
    grain: 0.07,
  },
  // Scenario A: same dark, colder and flatter
  cold: {
    base: COLORS.coldBg,
    glow: "rgba(169,190,210,0.05)",
    vignette: "rgba(0,0,0,0.6)",
    grain: 0.07,
  },
  // Scenario B: bright, intentional frame
  paper: {
    base: COLORS.paper,
    glow: "rgba(255,255,255,0.85)",
    vignette: "rgba(14,41,69,0.10)",
    grain: 0.09,
  },
};

/** Full-bleed background with soft center glow, vignette and a static grain texture. */
export const Background: React.FC<{ kind: BgKind }> = ({ kind }) => {
  const b = BASES[kind];
  const { width, height } = useVideoConfig();
  // Static grain: animated noise looks filmic but wrecks compression on Meta's
  // re-encode (blocky artifacts). A fixed texture keeps the tactile feel.
  const gx = Math.floor(hash01(kind.length) * 512);
  const gy = Math.floor(hash01(kind.length + 991) * 512);
  return (
    <AbsoluteFill style={{ backgroundColor: b.base }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 70% 55% at 50% 42%, ${b.glow} 0%, rgba(0,0,0,0) 70%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 85% 75% at 50% 45%, rgba(0,0,0,0) 55%, ${b.vignette} 100%)`,
        }}
      />
      {/* Tiled with <Img> (not CSS background-image) so Remotion waits for it to load. */}
      <AbsoluteFill
        style={{
          overflow: "hidden",
          opacity: b.grain,
          mixBlendMode: kind === "paper" ? "multiply" : "overlay",
        }}
      >
        {Array.from({ length: Math.ceil(height / TILE) + 1 }).map((_, row) =>
          Array.from({ length: Math.ceil(width / TILE) + 1 }).map((__, col) => (
            <Img
              key={`${row}-${col}`}
              src={staticFile("textures/grain.png")}
              style={{
                position: "absolute",
                left: col * TILE - gx,
                top: row * TILE - gy,
                width: TILE,
                height: TILE,
              }}
            />
          )),
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const TILE = 512;
