/**
 * DigLab design tokens — the ONLY place brand values live.
 *
 * STATUS: PROVISIONAL. The Identidad folder (Manual de Identidad, Colores,
 * Tipografia, Banner, Tarjetas) was not reachable when this was built, so the
 * colors below are the fallback palette from the brief, NOT values read from
 * the brand manual. Replace the hex codes with the manual's values.
 *
 * Logo and brand font are picked up automatically from public/:
 *   public/brand/logo.svg | logo.png          -> logo for dark backgrounds
 *   public/brand/logo-dark.svg | logo-dark.png -> logo for light backgrounds (optional)
 *   public/fonts/brand/*.ttf|otf|woff|woff2     -> brand font (weight read from file name)
 * Until they exist, a clearly marked logo placeholder and Montserrat are used.
 */
export const BRAND_STATUS = "PROVISIONAL" as const;

export const COLORS = {
  // Dark premium base
  bg: "#0E0E10",
  bgRaised: "#18181C",
  bgCard: "#1F1F24",
  line: "#2C2C33",
  // Bright "otro escenario" frame
  paper: "#F3F2EF",
  paperCard: "#FFFFFF",
  paperLine: "#DDDCD7",
  // Brand
  red: "#E11D2A",
  redDeep: "#A8141E",
  // Text
  white: "#FFFFFF",
  ink: "#0E0E10",
  // Secondary / "dead" states
  gray: "#8A8A8E",
  grayDark: "#45454B",
  grayLight: "#C8C8CC",
  // Positive signal — use sparingly
  green: "#2E9E6B",
} as const;

export const FONT_WEIGHTS = {
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
  black: 900,
} as const;

/** Family name used when brand font files are found in public/fonts/brand/. */
export const BRAND_FONT_FAMILY = "DigLabBrand";

/** Fallback when no brand font files are present (geometric bold sans). */
export const FALLBACK_FONT = {
  family: "Montserrat",
  files: [
    { weight: "500", file: "fonts/fallback/montserrat-latin-500-normal.woff2" },
    { weight: "600", file: "fonts/fallback/montserrat-latin-600-normal.woff2" },
    { weight: "700", file: "fonts/fallback/montserrat-latin-700-normal.woff2" },
    { weight: "800", file: "fonts/fallback/montserrat-latin-800-normal.woff2" },
    { weight: "900", file: "fonts/fallback/montserrat-latin-900-normal.woff2" },
  ],
} as const;

/** Type scale for the 960px-wide stage (see Layout.tsx). */
export const TYPE = {
  mega: 112,
  display: 92,
  headline: 76,
  title: 60,
  body: 46,
  label: 36,
  small: 28,
  subtitle: 50,
} as const;

export const RADIUS = {
  card: 28,
  bubble: 34,
  pill: 999,
} as const;
