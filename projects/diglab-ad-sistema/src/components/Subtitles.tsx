import React, { useMemo } from "react";
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { createTikTokStyleCaptions } from "@remotion/captions";
import type { Caption, TikTokPage } from "@remotion/captions";
import { COLORS, TYPE } from "../config/brand";
import { msToFrame, VO_WORDS } from "../config/timeline";
import { rise } from "./anim";
import { FONT_STACK } from "./fonts";
import { useLayout } from "./Layout";

/**
 * Subtitle layer — separate from the motion-graphics layer.
 * Bottom-center inside the safe band, high contrast (white on a near-black
 * pill), the spoken word marked with a red block. Text comes from the script
 * (verbatim), timing from vo-timing.json.
 */
const SWITCH_EVERY_MS = 1250;
const LINGER_MS = 350;

const buildPages = (): TikTokPage[] => {
  const captions: Caption[] = VO_WORDS.map((w, idx) => {
    const next = VO_WORDS[idx + 1];
    return {
      text: (idx === 0 ? "" : " ") + w.text,
      startMs: w.startMs,
      endMs: w.endMs,
      timestampMs: w.startMs,
      confidence: null,
      // New page after each sentence and at every scene change.
      pageBreakAfter: /[.?!…]$/.test(w.text) || !next || next.scene !== w.scene,
    };
  });
  return createTikTokStyleCaptions({
    captions,
    combineTokensWithinMilliseconds: SWITCH_EVERY_MS,
  }).pages;
};

const CaptionPage: React.FC<{ page: TikTokPage }> = ({ page }) => {
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
            background: "rgba(14,14,16,0.86)",
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
                  background: active ? COLORS.red : "transparent",
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
        const next = pages[i + 1];
        const lastTok = page.tokens[page.tokens.length - 1];
        const from = msToFrame(page.startMs);
        const endMs = Math.min(next ? next.startMs : Infinity, lastTok.toMs + LINGER_MS);
        const dur = msToFrame(endMs) - from;
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
