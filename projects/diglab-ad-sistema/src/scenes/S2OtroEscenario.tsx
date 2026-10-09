import React from "react";
import { interpolate } from "remotion";
import { Award, Check, Lock, ShieldCheck, Sparkles, UserRound, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { COLORS } from "../config/brand";
import { COPY } from "../config/copy";
import { CLAMP, EASE_IN, fall, lerp, pop, rise, settle } from "../components/anim";
import { FONT_STACK } from "../components/fonts";
import { Avatar, ChatBubble, IconBadge, PriceTag } from "../components/Pieces";
import { SceneFrame, useScene } from "../components/SceneFrame";
import { cuesOf } from "../config/timeline";
import { breakWords, KineticWords, RedBarText } from "../components/Text";

const CARD_Y = [268, 446, 624];
const CARD_H = 150;
const PATH_X = 96;
const TOKEN_STOPS = [236, CARD_Y[0] + CARD_H / 2, CARD_Y[1] + CARD_H / 2, CARD_Y[2] + CARD_H / 2, 862];
const TOUCHPOINTS: { label: string; Icon: LucideIcon }[] = [
  { label: COPY.s2.team, Icon: Users },
  { label: COPY.s2.trackRecord, Icon: Award },
  { label: COPY.s2.different, Icon: Sparkles },
];

const Toggle: React.FC<{ on: number; scale?: number }> = ({ on, scale = 1 }) => {
  const w = 220 * scale;
  const h = 116 * scale;
  const knob = h - 18 * scale;
  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: h / 2,
        background: on > 0.5 ? COLORS.red : "#C9C8C2",
        position: "relative",
        boxShadow: "inset 0 2px 6px rgba(0,0,0,0.12)",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 9 * scale,
          left: lerp(9 * scale, w - knob - 9 * scale, on),
          width: knob,
          height: knob,
          borderRadius: "50%",
          background: COLORS.white,
          boxShadow: "0 4px 10px rgba(0,0,0,0.18)",
        }}
      />
    </div>
  );
};

/** Key beats (scene-local frames) — shared with the SFX cue sheet. */
export const S2_BEATS = (() => {
  const { c, ce, dur } = cuesOf("s2");
  const layoutAt = c("antesPrecio") - 4;
  const unlockAt = Math.min(c("diferente") + 18, dur - 22);
  return {
    flipAt: c("otroEscenario") - 6,
    layoutAt,
    slotsAt: Math.min(c("aseguraste"), layoutAt + 16),
    cardAt: [c("equipo"), c("trayectoria"), c("queHace")],
    priceAt: ce("antesPrecio") - 4,
    unlockAt,
    qAt: c("queHace") + 10,
    qOut: unlockAt - 6,
  };
})();

export const S2OtroEscenario: React.FC = () => {
  const { f, c } = useScene("s2");
  const { flipAt, layoutAt, slotsAt, cardAt, priceAt, unlockAt, qAt, qOut } = S2_BEATS;

  // Beat A — the switch flips: another scenario.
  const on = settle(f, flipAt, 10);
  const headerOut = rise(f, layoutAt, 12, EASE_IN);

  // Beat B — trust touchpoints before the price.
  const q = rise(f, qAt, 10) * fall(f, qOut, 8);
  const qPulse = 1 + 0.05 * Math.sin(Math.PI * rise(f, c("diferente"), 10));

  const fill =
    (settle(f, cardAt[0] + 4, 14) + settle(f, cardAt[1] + 4, 14) + settle(f, cardAt[2] + 4, 14)) / 3;
  const full = rise(f, cardAt[2] + 14, 8);

  // Patient token walks the path: start -> each touchpoint -> price.
  const stopTimes = [layoutAt + 10, ...cardAt, unlockAt + 2];
  let tokenY = TOKEN_STOPS[0];
  for (let k = 1; k < TOKEN_STOPS.length; k++) {
    tokenY = lerp(tokenY, TOKEN_STOPS[k], settle(f, stopTimes[k], 14));
  }
  const unlocked = rise(f, unlockAt, 8);

  return (
    <SceneFrame id="s2" bg="paper">
      {/* Big header: toggle + OTRO ESCENARIO */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 220,
          width: 960,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 44,
          opacity: 1 - headerOut,
          scale: `${1 - 0.35 * headerOut}`,
          translate: `0px ${-headerOut * 220}px`,
        }}
      >
        <div style={{ scale: `${pop(f, 2, 12)}` }}>
          <Toggle on={on} />
        </div>
        <KineticWords
          text={COPY.s2.title}
          f={f}
          at={c("otroEscenario")}
          fontSize={118}
          color={COLORS.ink}
          stagger={5}
          style={{ maxWidth: 900 }}
        />
      </div>

      {/* Kicker that replaces the header */}
      <div
        style={{
          position: "absolute",
          left: 28,
          top: 14,
          display: "flex",
          alignItems: "center",
          gap: 16,
          opacity: rise(f, layoutAt + 6, 10),
        }}
      >
        <Toggle on={1} scale={0.36} />
        <span
          style={{
            fontFamily: FONT_STACK,
            fontWeight: 900,
            fontSize: 34,
            letterSpacing: "0.04em",
            color: COLORS.ink,
          }}
        >
          {COPY.s2.title}
        </span>
      </div>

      {f >= layoutAt ? (
        <div style={{ position: "absolute", inset: 0, opacity: 1 - 0.93 * q, filter: q > 0 ? `blur(${q * 6}px)` : undefined }}>
          {/* Patient + trust meter */}
          <Avatar
            size={112}
            Icon={UserRound}
            bg={COLORS.ink}
            fg={COLORS.white}
            style={{ position: "absolute", left: 40, top: 100, scale: `${pop(f, layoutAt + 4)}` }}
          />
          <div
            style={{
              position: "absolute",
              left: 180,
              top: 131,
              width: 660,
              height: 50,
              borderRadius: 25,
              background: "#E2E1DB",
              overflow: "hidden",
              opacity: rise(f, layoutAt + 8, 10),
            }}
          >
            <div
              style={{
                width: `${fill * 100}%`,
                height: "100%",
                borderRadius: 25,
                background: full > 0.5 ? COLORS.green : COLORS.red,
                boxShadow: `0 0 24px ${full > 0.5 ? COLORS.green : COLORS.red}66`,
              }}
            />
          </div>
          <IconBadge
            Icon={ShieldCheck}
            size={84}
            bg={full > 0.5 ? COLORS.green : "#C9C8C2"}
            style={{
              position: "absolute",
              left: 854,
              top: 114,
              scale: `${pop(f, layoutAt + 10) * (1 + 0.18 * Math.sin(Math.PI * full))}`,
            }}
          />

          {/* Dotted path from the patient down to the price */}
          <div
            style={{
              position: "absolute",
              left: PATH_X - 4,
              top: 236,
              width: 8,
              height: interpolate(rise(f, layoutAt + 10, 24), [0, 1], [0, 620], CLAMP),
              backgroundImage: "radial-gradient(circle, #B9B8B1 3.5px, transparent 4px)",
              backgroundSize: "8px 22px",
            }}
          />

          {/* Touchpoints: dashed slots first, then the cards pop in on their word */}
          {TOUCHPOINTS.map((tp, k) => {
            const p = pop(f, cardAt[k], 11);
            const shown = f >= cardAt[k];
            return (
              <React.Fragment key={tp.label}>
                <div
                  style={{
                    position: "absolute",
                    left: PATH_X - 13,
                    top: CARD_Y[k] + CARD_H / 2 - 13,
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    background: shown ? COLORS.red : "#CFCEC7",
                    opacity: rise(f, slotsAt + k * 4, 8),
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    left: 180,
                    top: CARD_Y[k],
                    width: 750,
                    height: CARD_H,
                    borderRadius: 28,
                    border: "4px dashed #CFCEC7",
                    opacity: rise(f, slotsAt + k * 4, 8) * (shown ? 0 : 1),
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    left: 180,
                    top: CARD_Y[k],
                    width: 750,
                    height: CARD_H,
                    borderRadius: 28,
                    background: COLORS.paperCard,
                    boxShadow: "0 14px 34px rgba(30,25,20,0.10)",
                    display: "flex",
                    alignItems: "center",
                    gap: 26,
                    padding: "0 26px",
                    opacity: shown ? Math.min(1, p * 1.4) : 0,
                    scale: `${0.7 + 0.3 * p}`,
                    transformOrigin: "0% 50%",
                  }}
                >
                  <IconBadge Icon={tp.Icon} size={96} />
                  <div
                    style={{
                      fontFamily: FONT_STACK,
                      fontWeight: 900,
                      fontSize: 52,
                      lineHeight: 1.02,
                      color: COLORS.ink,
                      whiteSpace: "pre-line",
                    }}
                  >
                    {k === 2 ? breakWords(tp.label, [3]) : tp.label}
                  </div>
                </div>
              </React.Fragment>
            );
          })}

          {/* The price waits at the end, locked until trust is built */}
          <div
            style={{
              position: "absolute",
              left: 168,
              top: 806,
              scale: `${pop(f, priceAt, 12)}`,
              opacity: f >= priceAt ? 1 : 0,
            }}
          >
            <div style={{ position: "relative" }}>
              <PriceTag width={190} color="#BDBCB5" holeColor={COLORS.paper} />
              <PriceTag
                width={190}
                holeColor={COLORS.paper}
                style={{ position: "absolute", left: 0, top: 0, opacity: unlocked }}
              />
              <IconBadge
                Icon={Lock}
                size={62}
                bg={COLORS.ink}
                style={{
                  position: "absolute",
                  left: 150,
                  top: -26,
                  opacity: 1 - unlocked,
                  scale: `${1 - 0.6 * unlocked}`,
                  rotate: `${unlocked * 40}deg`,
                }}
              />
            </div>
          </div>
          {/* Same question as scene 1 — now asked by a patient who already trusts */}
          <div
            style={{
              position: "absolute",
              left: 396,
              top: 810,
              display: "flex",
              alignItems: "center",
              gap: 16,
              scale: `${pop(f, unlockAt + 4, 13)}`,
              transformOrigin: "0% 100%",
              opacity: f >= unlockAt + 4 ? 1 : 0,
            }}
          >
            <ChatBubble
              text={COPY.s1.leadMessage}
              t={f - (unlockAt + 4)}
              typingFrames={0}
              charsPerFrame={4}
              bg={COLORS.paperCard}
              color={COLORS.ink}
              fontSize={46}
              style={{ boxShadow: "0 10px 26px rgba(30,25,20,0.12)" }}
            />
            <IconBadge
              Icon={Check}
              size={64}
              bg={COLORS.green}
              style={{ scale: `${pop(f, unlockAt + 10)}` }}
            />
          </div>

          {/* Patient token walking the path */}
          <Avatar
            size={72}
            Icon={UserRound}
            bg={COLORS.ink}
            fg={COLORS.white}
            style={{
              position: "absolute",
              left: PATH_X - 36,
              top: tokenY - 36,
              scale: `${pop(f, layoutAt + 12)}`,
              boxShadow: `0 0 0 ${6 + 10 * full}px ${full > 0.5 ? COLORS.green : COLORS.red}33`,
            }}
          />
        </div>
      ) : null}

      {/* Emphasis: ¿QUÉ TE HACE DIFERENTE? */}
      {q > 0 ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 300,
            width: 960,
            display: "flex",
            justifyContent: "center",
            opacity: Math.min(1, q * 1.3),
            scale: `${(0.85 + 0.15 * q) * qPulse}`,
          }}
        >
          <RedBarText
            text={breakWords(COPY.s2.differentQuestion, [3])}
            f={f}
            at={qAt}
            fontSize={100}
            align="center"
            style={{ whiteSpace: "pre-line" }}
          />
        </div>
      ) : null}
    </SceneFrame>
  );
};
