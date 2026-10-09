import React from "react";
import { interpolate, spring } from "remotion";
import { Award, ShieldCheck, Sparkles, UserRound, Users } from "lucide-react";
import { COLORS } from "../config/brand";
import { COPY } from "../config/copy";
import { FPS } from "../config/timeline";
import { CLAMP, EASE_IN_OUT, lerp, pop, rise } from "../components/anim";
import { FONT_STACK } from "../components/fonts";
import { Avatar, IconBadge, PriceTag } from "../components/Pieces";
import { SceneFrame, useScene } from "../components/SceneFrame";
import { cuesOf } from "../config/timeline";
import { breakWords, RedBarText } from "../components/Text";
import { MATCH_ANGLE, MATCH_LINE } from "./shared";

const PIVOT = { x: 480, y: MATCH_LINE.y };
const HALF = 380;
const HANG = 128;
const PAN_W = 236;

const Pan: React.FC<{ x: number; y: number; children?: React.ReactNode; fade: number }> = ({
  x,
  y,
  children,
  fade,
}) => (
  <div style={{ position: "absolute", left: x - PAN_W / 2, top: y, width: PAN_W, height: HANG + 60, opacity: fade }}>
    <svg width={PAN_W} height={HANG + 60} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
      <line x1={PAN_W / 2} y1={0} x2={14} y2={HANG} stroke={COLORS.ink} strokeWidth={4} />
      <line x1={PAN_W / 2} y1={0} x2={PAN_W - 14} y2={HANG} stroke={COLORS.ink} strokeWidth={4} />
      <path
        d={`M4 ${HANG} Q ${PAN_W / 2} ${HANG + 74} ${PAN_W - 4} ${HANG} Z`}
        fill={COLORS.ink}
      />
    </svg>
    <div
      style={{
        position: "absolute",
        left: 0,
        width: PAN_W,
        bottom: 60,
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-end",
      }}
    >
      {children}
    </div>
  </div>
);

/** Key beats (scene-local frames) — shared with the SFX cue sheet. */
export const S3_BEATS = (() => {
  const { c, dur } = cuesOf("s3");
  const dropAt = c("compara");
  // "VALE LO QUE COBRA" lands on "por qué tu clínica" so it holds ~2s.
  return { dropAt, landAt: [0, 1, 2].map((k) => dropAt + k * 5 + 7), tipAt: dropAt + 10, valeAt: c("tuClinica"), exitAt: dur - 12 };
})();

export const S3NoComparaIgual: React.FC = () => {
  const { f, c } = useScene("s3");
  const { dropAt, tipAt, valeAt, exitAt } = S3_BEATS;
  const drops = [0, 1, 2].map((k) => spring({ frame: f - (dropAt + k * 5), fps: FPS, config: { damping: 13, stiffness: 160 } }));
  const tip = spring({ frame: f - tipAt, fps: FPS, config: { damping: 8, stiffness: 120, mass: 0.9 } });
  const wobbleEnv = interpolate(f, [c("comparar"), c("comparar") + 8, dropAt, dropAt + 6], [0, 1, 1, 0], CLAMP);
  const exit = rise(f, exitAt, 11, EASE_IN_OUT);

  let angle = lerp(-MATCH_ANGLE, MATCH_ANGLE, tip) + wobbleEnv * 3 * Math.sin((f - c("comparar")) / 4.5);
  angle = lerp(angle, MATCH_ANGLE, exit);
  const rad = (angle * Math.PI) / 180;
  const end = (side: -1 | 1) => ({
    x: PIVOT.x + side * HALF * Math.cos(rad),
    y: PIVOT.y + side * HALF * Math.sin(rad),
  });
  const L = end(-1);
  const R = end(1);
  const valueWins = rise(f, dropAt + 14, 14);
  const fade = 1 - exit;
  const beamHalf = lerp(HALF, 480, exit);

  return (
    <SceneFrame id="s3" bg="paper">
      {/* The patient from scene 2, trust full, unbothered by the comparison */}
      <div style={{ position: "absolute", left: 24, top: 0, display: "flex", alignItems: "center", gap: 18, opacity: rise(f, 2, 10) * fade }}>
        <Avatar size={92} Icon={UserRound} bg={COLORS.ink} fg={COLORS.white} style={{ boxShadow: `0 0 0 8px ${COLORS.green}33` }} />
        <div style={{ width: 210, height: 34, borderRadius: 17, background: COLORS.green }} />
        <IconBadge Icon={ShieldCheck} size={58} bg={COLORS.green} />
      </div>

      {/* Post + base */}
      <div style={{ position: "absolute", left: PIVOT.x - 9, top: PIVOT.y, width: 18, height: 330, background: COLORS.ink, borderRadius: 9, opacity: fade }} />
      <div style={{ position: "absolute", left: PIVOT.x - 130, top: PIVOT.y + 318, width: 260, height: 34, background: COLORS.ink, borderRadius: "14px 14px 6px 6px", opacity: fade }} />

      {/* Pans */}
      <Pan x={L.x} y={L.y} fade={fade}>
        <div
          style={{
            marginBottom: 6,
            filter: `grayscale(${valueWins})`,
            opacity: 1 - 0.45 * valueWins,
            scale: `${1 - 0.22 * valueWins}`,
            transformOrigin: "50% 100%",
          }}
        >
          <PriceTag width={170} holeColor={COLORS.paper} />
        </div>
      </Pan>
      <Pan x={R.x} y={R.y} fade={fade}>
        {[Users, Award, Sparkles].map((Icon, k) => (
          <IconBadge
            key={k}
            Icon={Icon}
            size={72}
            style={{
              margin: "0 2px 6px",
              opacity: f >= dropAt + k * 5 ? 1 : 0,
              translate: `0px ${(1 - drops[k]) * -320}px`,
            }}
          />
        ))}
      </Pan>

      {/* Pan labels */}
      {[
        { p: L, text: COPY.s3.price, bg: valueWins > 0.5 ? COLORS.paperMuted : COLORS.alert },
        { p: R, text: COPY.s3.value, bg: valueWins > 0.5 ? COLORS.green : COLORS.ink },
      ].map(({ p, text, bg }) => (
        <div
          key={text}
          style={{
            position: "absolute",
            left: p.x - 150,
            top: p.y + HANG + 54,
            width: 300,
            display: "flex",
            justifyContent: "center",
            opacity: rise(f, 4, 10) * fade,
          }}
        >
          <div
            style={{
              background: bg,
              color: COLORS.white,
              fontFamily: FONT_STACK,
              fontWeight: 900,
              fontSize: 44,
              letterSpacing: "0.03em",
              padding: "8px 24px",
              borderRadius: 14,
            }}
          >
            {text}
          </div>
        </div>
      ))}

      {/* Beam (match-cut element) */}
      <div
        style={{
          position: "absolute",
          left: PIVOT.x - beamHalf,
          top: PIVOT.y - MATCH_LINE.h / 2,
          width: beamHalf * 2,
          height: MATCH_LINE.h,
          borderRadius: lerp(9, 0, exit),
          background: exit > 0 ? COLORS.accent : COLORS.ink,
          rotate: `${angle}deg`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: PIVOT.x - 22,
          top: PIVOT.y - 22,
          width: 44,
          height: 44,
          borderRadius: "50%",
          background: COLORS.accent,
          opacity: fade,
        }}
      />

      {/* VALE LO QUE COBRA */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 716,
          width: 960,
          display: "flex",
          justifyContent: "center",
          opacity: fade,
          scale: `${0.9 + 0.1 * pop(f, valeAt, 12)}`,
        }}
      >
        <RedBarText
          text={breakWords(COPY.s3.worth, [2, 3])}
          f={f}
          at={valeAt}
          fontSize={92}
          align="center"
          style={{ whiteSpace: "pre-line" }}
        />
      </div>
    </SceneFrame>
  );
};
