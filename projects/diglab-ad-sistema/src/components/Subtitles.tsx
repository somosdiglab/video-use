import React, { useMemo } from "react";
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, TYPE } from "../config/brand";
import { FPS, msToFrame, SCENES, VO_WORDS } from "../config/timeline";
import { rise } from "./anim";
import { FONT_STACK } from "./fonts";
import { useLayout } from "./Layout";

/**
 * Subtitle layer — separate from the motion-graphics layer.
 * Bottom-center inside the safe band, high contrast (white on a near-black
 * pill), the spoken word marked with a red block. Text comes from the script
 * (verbatim), timing from vo-timing.json.
 */
const TARGET_MS = 1150; // aim for ~1.1s per page
const MAX_CHARS = 26;
const MAX_WORDS = 6;
const LINGER_MS = 350;

/** Words that should never be left dangling at the end of a page. */
const FUNCTION_WORDS = new Set([
  "a", "al", "de", "del", "el", "la", "las", "lo", "los", "un", "una", "en", "tu",
  "que", "qué", "y", "o", "por", "es", "no", "va", "se", "te", "ya", "sin", "con",
  "hacia", "hacé", "si", "cómo", "este", "ese", "sea", "las", "muchas", "solo",
]);

type Token = { text: string; fromMs: number; toMs: number };
type Page = { startMs: number; endMs: number; tokens: Token[] };

const bare = (t: string) => t.toLowerCase().replace(/[¿¡.,;:!?…"]/g, "");

const buildPages = (): Page[] => {
  const pages: Page[] = [];
  let cur: Token[] = [];
  VO_WORDS.forEach((w, idx) => {
    const next = VO_WORDS[idx + 1];
    cur.push({ text: w.text, fromMs: w.startMs, toMs: w.endMs });
    const sceneEnds = !next || next.scene !== w.scene;
    const sentenceEnds = /[.?!…]$/.test(w.text);
    const dur = w.endMs - cur[0].fromMs;
    const chars = cur.map((t) => t.text).join(" ").length;
    const comma = /[,;:]$/.test(w.text);
    const long = dur >= TARGET_MS || chars >= MAX_CHARS || cur.length >= MAX_WORDS;
    const dangling = !comma && FUNCTION_WORDS.has(bare(w.text)) && cur.length < MAX_WORDS;
    if (sceneEnds || sentenceEnds || (comma && dur >= 600) || (long && !dangling)) {
      // A scene's last page never lingers into the next scene.
      const sceneEndMs = (SCENES[w.scene].end / FPS) * 1000;
      pages.push({ startMs: cur[0].fromMs, endMs: sceneEndMs, tokens: cur });
      cur = [];
    }
  });
  return pages.map((pg, i) => {
    const nxt = pages[i + 1];
    const last = pg.tokens[pg.tokens.length - 1];
    return { ...pg, endMs: Math.min(pg.endMs, nxt ? nxt.startMs : Infinity, last.toMs + LINGER_MS) };
  });
};

const CaptionPage: React.FC<{ page: Page }> = ({ page }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const L = useLayout();
  const t = page.startMs + (frame / fps) * 1000;
  const p = rise(frame, 0, 4);
  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: L.height - L.subtitles.bottom,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            maxWidth: L.subtitles.maxWidth,
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            alignItems: "center",
            columnGap: 4,
            rowGap: 4,
            padding: "14px 18px",
            borderRadius: 22,
            background: "rgba(7,26,47,0.88)",
            boxShadow: "0 8px 30px rgba(0,0,0,0.35)",
            fontFamily: FONT_STACK,
            fontWeight: 800,
            fontSize: TYPE.subtitle * L.subtitles.scale,
            lineHeight: 1.12,
            color: COLORS.white,
            opacity: p,
            scale: `${0.94 + 0.06 * p}`,
          }}
        >
          {page.tokens.map((tok, i) => {
            const active = tok.fromMs <= t && t < tok.toMs;
            return (
              <span
                key={`${tok.fromMs}-${i}`}
                style={{
                  padding: "2px 9px 4px",
                  borderRadius: 10,
                  background: active ? COLORS.accent : "transparent",
                  color: active ? COLORS.bg : COLORS.white,
                }}
              >
                {tok.text.trim()}
              </span>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const Subtitles: React.FC = () => {
  const pages = useMemo(buildPages, []);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {pages.map((page, i) => {
        const from = msToFrame(page.startMs);
        const dur = msToFrame(page.endMs) - from;
        if (dur <= 0) return null;
        return (
          <Sequence key={i} from={from} durationInFrames={dur} name={`Sub ${i + 1}`}>
            <CaptionPage page={page} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
