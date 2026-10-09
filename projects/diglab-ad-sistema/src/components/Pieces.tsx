import React from "react";
import type { LucideIcon } from "lucide-react";
import { COLORS, RADIUS } from "../config/brand";
import { FONT_STACK } from "./fonts";

/** Round icon badge (lucide icon centered in a disc). */
export const IconBadge: React.FC<{
  Icon: LucideIcon;
  size: number;
  bg?: string;
  fg?: string;
  ring?: string;
  ringWidth?: number;
  iconScale?: number;
  style?: React.CSSProperties;
}> = ({ Icon, size, bg = COLORS.brand, fg = COLORS.white, ring, ringWidth = 6, iconScale = 0.5, style }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: "50%",
      background: bg,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: ring ? `0 0 0 ${ringWidth}px ${ring}` : undefined,
      flexShrink: 0,
      ...style,
    }}
  >
    <Icon size={size * iconScale} color={fg} strokeWidth={2.4} />
  </div>
);

/** Three bouncing dots ("typing..."). `t` = frames since start. */
export const TypingDots: React.FC<{ t: number; color: string; size?: number }> = ({
  t,
  color,
  size = 14,
}) => (
  <div style={{ display: "flex", gap: size * 0.6, alignItems: "center", height: size * 2.4 }}>
    {[0, 1, 2].map((i) => {
      const phase = (t * 0.32 - i * 0.9) % (Math.PI * 2);
      const up = Math.max(0, Math.sin(phase));
      return (
        <div
          key={i}
          style={{
            width: size,
            height: size,
            borderRadius: "50%",
            background: color,
            opacity: 0.45 + 0.55 * up,
            translate: `0px ${-up * size * 0.6}px`,
          }}
        />
      );
    })}
  </div>
);

/**
 * Chat bubble. Shows typing dots for `typingFrames`, then types `text`.
 * The full string reserves its width from the start so the bubble never jumps.
 */
export const ChatBubble: React.FC<{
  text: string;
  t: number; // frames since the bubble appeared
  typingFrames?: number;
  charsPerFrame?: number;
  bg: string;
  color: string;
  fontSize?: number;
  side?: "left" | "right";
  style?: React.CSSProperties;
}> = ({
  text,
  t,
  typingFrames = 12,
  charsPerFrame = 1.2,
  bg,
  color,
  fontSize = 46,
  side = "left",
  style,
}) => {
  const typed = Math.max(0, Math.floor((t - typingFrames) * charsPerFrame));
  const typing = t < typingFrames;
  const shown = text.slice(0, typed);
  const rest = text.slice(typed);
  return (
    <div
      style={{
        position: "relative",
        display: "inline-block",
        background: bg,
        color,
        borderRadius: RADIUS.bubble,
        borderBottomLeftRadius: side === "left" ? 8 : RADIUS.bubble,
        borderBottomRightRadius: side === "right" ? 8 : RADIUS.bubble,
        padding: `${fontSize * 0.42}px ${fontSize * 0.62}px`,
        fontFamily: FONT_STACK,
        fontWeight: 700,
        fontSize,
        lineHeight: 1.1,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {/* Width reservation: always lay out the whole string. */}
      <span style={{ visibility: typing ? "hidden" : "visible" }}>
        {shown}
        <span style={{ opacity: 0 }}>{rest}</span>
      </span>
      {typing ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            paddingLeft: fontSize * 0.62,
          }}
        >
          <TypingDots t={t} color={color} size={fontSize * 0.3} />
        </div>
      ) : null}
    </div>
  );
};

/** Price tag. `muted` turns it into the de-emphasized gray state. */
export const PriceTag: React.FC<{
  width: number;
  color?: string;
  locked?: boolean;
  holeColor?: string;
  style?: React.CSSProperties;
}> = ({ width, color = COLORS.alert, holeColor = COLORS.bg, style }) => {
  const h = width * (130 / 240);
  return (
    <svg width={width} height={h} viewBox="0 0 240 130" style={{ overflow: "visible", ...style }}>
      <path
        d="M62 4 H226 a10 10 0 0 1 10 10 V116 a10 10 0 0 1 -10 10 H62 L4 65 Z"
        fill={color}
        stroke={color}
        strokeWidth={6}
        strokeLinejoin="round"
      />
      <circle cx={46} cy={65} r={12} fill={holeColor} />
      <text
        x={150}
        y={92}
        textAnchor="middle"
        fontFamily={FONT_STACK}
        fontWeight={900}
        fontSize={78}
        fill={COLORS.white}
      >
        $
      </text>
    </svg>
  );
};

/** Small patient avatar disc. */
export const Avatar: React.FC<{
  size: number;
  Icon: LucideIcon;
  bg: string;
  fg: string;
  style?: React.CSSProperties;
}> = ({ size, Icon, bg, fg, style }) => (
  <IconBadge Icon={Icon} size={size} bg={bg} fg={fg} iconScale={0.56} style={style} />
);
