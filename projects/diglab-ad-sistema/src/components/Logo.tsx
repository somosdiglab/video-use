import React from "react";
import { getStaticFiles, Img, staticFile } from "remotion";
import { COLORS } from "../config/brand";
import { FONT_STACK } from "./fonts";

/**
 * Real DigLab logo, picked up from public/brand/. Never recreated in code.
 *   logo.svg / logo.png            -> for dark backgrounds (white/negative version)
 *   logo-dark.svg / logo-dark.png  -> for light backgrounds (optional)
 * Until a file exists, a clearly marked placeholder renders instead.
 */
const files = getStaticFiles().map((f) => f.name);
const pick = (...names: string[]) => names.find((n) => files.includes(n)) ?? null;

const LOGO_ON_DARK = pick("brand/logo.svg", "brand/logo.png", "brand/logo.webp");
const LOGO_ON_LIGHT = pick("brand/logo-dark.svg", "brand/logo-dark.png", "brand/logo-dark.webp") ?? LOGO_ON_DARK;

export const HAS_LOGO = LOGO_ON_DARK !== null;

export const Logo: React.FC<{
  height: number;
  onLight?: boolean;
  style?: React.CSSProperties;
}> = ({ height, onLight = false, style }) => {
  const file = onLight ? LOGO_ON_LIGHT : LOGO_ON_DARK;
  if (file) {
    return (
      <Img
        src={staticFile(file)}
        style={{ height, width: "auto", display: "block", ...style }}
      />
    );
  }
  const c = onLight ? COLORS.ink : COLORS.white;
  return (
    <div
      style={{
        height,
        padding: `0 ${height * 0.35}px`,
        border: `3px dashed ${c}`,
        borderRadius: 12,
        color: c,
        opacity: 0.85,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: FONT_STACK,
        fontWeight: 700,
        fontSize: height * 0.3,
        letterSpacing: "0.12em",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      LOGO DIGLAB
    </div>
  );
};
