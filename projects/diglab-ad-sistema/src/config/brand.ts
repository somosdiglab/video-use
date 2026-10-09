/**
 * DigLab design tokens — the ONLY place brand values live.
 *
 * Colors: DigLab palette tokens (provided by DigLab). Logo: public/brand/logo.png
 * (provided). Brand font: still pending — Montserrat is used until the files
 * from the Tipografia folder are dropped into public/fonts/brand/.
 *
 * Logo and brand font are picked up automatically from public/:
 *   public/brand/logo.svg | logo.png          -> logo for dark backgrounds
 *   public/brand/logo-dark.svg | logo-dark.png -> logo for light backgrounds (optional)
 *   public/fonts/brand/*.ttf|otf|woff|woff2     -> brand font (weight read from file name)
 * Until they exist, a clearly marked logo placeholder and Montserrat are used.
 */
export const BRAND_STATUS = "PALETTE+LOGO" as const; // brand font still pending

/** DigLab palette (tokens provided by DigLab). Derived values are marked. */
export const COLORS = {
  // Dark navy base
  bg: "#071A2F", // --diglab-navy
  bgRaised: "#102237", // --diglab-navy-elevated
  bgCard: "#0E2945", // --diglab-blue-dark
  surface: "#102237", // --diglab-navy-elevated
  stroke: "#24405C", // derived: between blue-dark and text-secondary (inactive strokes)
  coldBg: "#06131F", // derived: colder navy for "scenario A"
  // Bright frame
  paper: "#F5F8FA", // --diglab-background-light
  paperCard: "#FFFFFF",
  paperLine: "#E3EAF0", // --diglab-border-light
  paperMuted: "#C9D6E0", // derived: border-light / text-light-secondary
  // Brand
  brand: "#1E7FA8", // --diglab-blue-deep: brand bar + fills behind white text
  accent: "#29ABE2", // --diglab-cyan: energy, highlights, active states
  accentLight: "#6FD0F5", // --diglab-cyan-light
  accentPale: "#EAF4F8", // --diglab-cyan-pale
  // Alert (not brand): price, losses, cuts
  alert: "#E11D2A",
  // Text
  white: "#FFFFFF",
  ink: "#1B2A38", // --diglab-text-primary
  inkSecondary: "#4A6175", // --diglab-text-secondary
  gray: "#A9BED2", // --diglab-text-light-secondary (secondary / "dead" on dark)
  grayDark: "#4A6175",
  grayLight: "#A9BED2",
  // Positive signal — use sparingly
  green: "#2E9E6B",
} as const;

/** The logo file is an opaque square tile: show it with rounded corners. */
export const LOGO_CORNER = 0.22;

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
