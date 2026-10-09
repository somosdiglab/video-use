import React from "react";
import { interpolate } from "remotion";
import { COLORS } from "../config/brand";
import { CLAMP, EASE_OUT, fall, rise } from "./anim";
import { FONT_STACK } from "./fonts";

/**
 * Kinetic headline: words rise out of a mask one after another.
 * Optional exit: the whole line lifts and fades.
 */
export const KineticWords: React.FC<{
  text: string;
  f: number;
  at: number;
  stagger?: number;
  dur?: number;
  fontSize: number;
  color?: string;
  weight?: number;
  exitAt?: number;
  exitDur?: number;
  align?: "center" | "left";
  lineHeight?: number;
  letterSpacing?: string;
  wordStyle?: (word: string, idx: number) => React.CSSProperties;
  style?: React.CSSProperties;
}> = ({
  text,
  f,
  at,
  stagger = 3,
  dur = 11,
  fontSize,
  color = COLORS.white,
  weight = 900,
  exitAt,
  exitDur = 8,
  align = "center",
  lineHeight = 1.04,
  letterSpacing = "-0.01em",
  wordStyle,
  style,
}) => {
  const lines = text.split("\n").map((l) => l.split(" "));
  const out = exitAt === undefined ? 0 : 1 - fall(f, exitAt, exitDur);
  let idx = 0;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: align === "center" ? "center" : "flex-start",
        fontFamily: FONT_STACK,
        fontWeight: weight,
        fontSize,
        lineHeight,
        letterSpacing,
        color,
        opacity: 1 - out,
        translate: `0px ${-out * fontSize * 0.5}px`,
        ...style,
      }}
    >
      {lines.map((words, li) => (
        <div
          key={li}
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: align === "center" ? "center" : "flex-start",
            columnGap: fontSize * 0.26,
          }}
        >
          {words.map((w) => {
            const i = idx++;
            const p = rise(f, at + i * stagger, dur);
            return (
              <span
                key={i}
                style={{
                  display: "inline-block",
                  overflow: "hidden",
                  paddingBottom: fontSize * 0.08,
                  marginBottom: -fontSize * 0.08,
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    translate: `0px ${(1 - p) * 105}%`,
                    ...wordStyle?.(w, i),
                  }}
                >
                  {w}
                </span>
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

/**
 * DigLab red-bar text: each wrapped line sits on its own red bar
 * (box-decoration-break: clone). Bar wipes in left -> right, then text rises.
 */
export const RedBarText: React.FC<{
  text: string;
  f: number;
  at: number;
  fontSize: number;
  weight?: number;
  uppercase?: boolean;
  align?: "left" | "center";
  maxWidth?: number;
  lineHeight?: number;
  barColor?: string;
  textColor?: string;
  style?: React.CSSProperties;
}> = ({
  text,
  f,
  at,
  fontSize,
  weight = 900,
  uppercase = false,
  align = "left",
  maxWidth = 900,
  lineHeight = 1.24,
  barColor = COLORS.red,
  textColor = COLORS.white,
  style,
}) => {
  const bar = rise(f, at, 9);
  const txt = rise(f, at + 4, 10);
  return (
    <div
      style={{
        maxWidth,
        textAlign: align,
        clipPath: `inset(-20px ${((1 - bar) * 100).toFixed(2)}% -20px -20px)`,
        fontFamily: FONT_STACK,
        fontWeight: weight,
        fontSize,
        lineHeight,
        textTransform: uppercase ? "uppercase" : "none",
        letterSpacing: "-0.01em",
        ...style,
      }}
    >
      <span
        style={{
          background: barColor,
          color: textColor,
          padding: `0.04em ${fontSize * 0.28}px 0.06em`,
          boxDecorationBreak: "clone",
          WebkitBoxDecorationBreak: "clone",
        }}
      >
        <span
          style={{
            opacity: txt,
            display: "inline",
            position: "relative",
            top: interpolate(txt, [0, 1], [fontSize * 0.25, 0], CLAMP),
          }}
        >
          {text}
        </span>
      </span>
    </div>
  );
};

/** Marker-style highlight that sweeps behind a word or phrase. */
export const Highlight: React.FC<{
  children: React.ReactNode;
  f: number;
  at: number;
  color?: string;
  dur?: number;
}> = ({ children, f, at, color = COLORS.red, dur = 10 }) => {
  const p = rise(f, at, dur, EASE_OUT);
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      <span
        style={{
          position: "absolute",
          left: "-0.12em",
          right: "-0.12em",
          top: "0.08em",
          bottom: "0.02em",
          background: color,
          transformOrigin: "0% 50%",
          scale: `${p} 1`,
        }}
      />
      <span style={{ position: "relative" }}>{children}</span>
    </span>
  );
};

/** Split verbatim copy into lines by word counts: ("A B C D", [2, 2]) -> "A B\nC D". */
export const breakWords = (text: string, counts: number[]) => {
  const words = text.split(" ");
  const lines: string[] = [];
  let i = 0;
  for (const n of counts) {
    lines.push(words.slice(i, i + n).join(" "));
    i += n;
  }
  if (i < words.length) lines.push(words.slice(i).join(" "));
  return lines.filter(Boolean).join("\n");
};
