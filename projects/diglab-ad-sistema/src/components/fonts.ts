import { loadFont } from "@remotion/fonts";
import { cancelRender, continueRender, delayRender, getStaticFiles, staticFile } from "remotion";
import { BRAND_FONT_FAMILY, FALLBACK_FONT } from "../config/brand";

/**
 * Brand font: any .ttf/.otf/.woff/.woff2 dropped into public/fonts/brand/ is
 * loaded automatically; the weight is read from the file name
 * (e.g. "Gotham-Bold.otf" -> 700). Montserrat is always loaded too, as the
 * glyph fallback (¿ ¡ ñ á...) and as the face used when no brand files exist.
 */
const WEIGHT_RULES: [RegExp, string][] = [
  [/thin|hairline/i, "100"],
  [/extra-?light|ultra-?light/i, "200"],
  [/semi-?bold|demi-?bold/i, "600"],
  [/extra-?bold|ultra-?bold/i, "800"],
  [/heavy|black/i, "900"],
  [/light/i, "300"],
  [/bold/i, "700"],
  [/medium/i, "500"],
];

const weightFromName = (name: string) =>
  WEIGHT_RULES.find(([re]) => re.test(name))?.[1] ?? "400";

const brandFiles = getStaticFiles().filter(
  (f) => f.name.startsWith("fonts/brand/") && /\.(ttf|otf|woff2?)$/i.test(f.name),
);

export const USING_BRAND_FONT = brandFiles.length > 0;

export const FONT_STACK = USING_BRAND_FONT
  ? `"${BRAND_FONT_FAMILY}", "${FALLBACK_FONT.family}", sans-serif`
  : `"${FALLBACK_FONT.family}", sans-serif`;

const handle = delayRender("Loading fonts");

Promise.all([
  ...FALLBACK_FONT.files.map((f) =>
    loadFont({ family: FALLBACK_FONT.family, url: staticFile(f.file), weight: f.weight }),
  ),
  ...brandFiles.map((f) =>
    loadFont({
      family: BRAND_FONT_FAMILY,
      url: staticFile(f.name),
      weight: weightFromName(f.name.split("/").pop() ?? ""),
      style: /italic|oblique/i.test(f.name) ? "italic" : "normal",
    }),
  ),
])
  .then(() => {
    // Fonts fail silently in browsers — assert the faces really loaded.
    const family = USING_BRAND_FONT ? BRAND_FONT_FAMILY : FALLBACK_FONT.family;
    if (!document.fonts.check(`800 60px "${FALLBACK_FONT.family}"`)) {
      throw new Error(`Font "${FALLBACK_FONT.family}" did not load`);
    }
    if (!document.fonts.check(`60px "${family}"`)) {
      throw new Error(`Font "${family}" did not load`);
    }
    continueRender(handle);
  })
  .catch((err) => cancelRender(err));
