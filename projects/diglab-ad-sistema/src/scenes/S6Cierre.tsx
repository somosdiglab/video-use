import React from "react";
import { interpolate } from "remotion";
import { evolvePath, getLength, getPointAtLength } from "@remotion/paths";
import {
  ArrowDown,
  CalendarCheck,
  ChevronDown,
  Megaphone,
  MessageCircle,
  MousePointer2,
  Repeat,
  Stethoscope,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { COLORS } from "../config/brand";
import { COPY } from "../config/copy";
import { CLAMP, EASE_IN, EASE_IN_OUT, EASE_OUT, fall, lerp, pop, rise } from "../components/anim";
import { Logo } from "../components/Logo";
import { IconBadge } from "../components/Pieces";
import { SceneFrame, useScene } from "../components/SceneFrame";
import { cuesOf } from "../config/timeline";
import { breakWords, KineticWords, RedBarText } from "../components/Text";

const P: [number, number][] = [
  [150, 610],
  [320, 420],
  [490, 610],
  [650, 420],
  [815, 590],
];
const ROAD =
  "M 150 610 C 215 610 250 420 320 420 C 390 420 420 610 490 610 C 560 610 580 420 650 420 C 720 420 750 590 815 590";
const STAGES: LucideIcon[] = [MessageCircle, CalendarCheck, Stethoscope, Repeat];
const FRAME_RECT = { x: 24, y: 262, w: 912, h: 548, r: 44 };
const framePath = () => {
  const { x, y, w, h, r } = FRAME_RECT;
  return `M ${x + r} ${y} H ${x + w - r} A ${r} ${r} 0 0 1 ${x + w} ${y + r} V ${y + h - r} A ${r} ${r} 0 0 1 ${x + w - r} ${y + h} H ${x + r} A ${r} ${r} 0 0 1 ${x} ${y + h - r} V ${y + r} A ${r} ${r} 0 0 1 ${x + r} ${y} Z`;
};
const MEGA = { x: 480, y: 330, size: 240 };

/** Key beats (scene-local frames) — shared with the SFX cue sheet. */
export const S6_BEATS = (() => {
  const { c } = cuesOf("s6");
  return {
    megaAt: -6, // visible while the scene slides in
    xAt: c("diferencial"),
    zoomAt: c("chip"),
    stageAppearAt: [0, 1, 2, 3].map((k) => Math.round(c("chip") + 6 + 40 * ((k + 1) / 4) - 4)),
    frameAt: c("sistemaCompleto"),
    lightAt: [0, 1, 2, 3, 4].map((k) => c("etapas") + k * 7),
    endCardAt: c("siTeInteresa"),
    actionAt: c("clic") - 4,
    arrowAt: c("clic"),
    clickAt: c("anuncio"),
  };
})();

export const S6Cierre: React.FC = () => {
  const { f, c } = useScene("s6");

  // Beat A — a lone campaign is not enough.
  const { xAt, lightAt: lights, endCardAt: E, actionAt, stageAppearAt } = S6_BEATS;
  const lightAt = (k: number) => lights[k];
  const shake = f >= xAt ? Math.sin((f - xAt) * 1.6) * 5 * Math.max(0, 1 - (f - xAt) / 14) : 0;
  // Beat B — zoom out: the ad is only the entry point of the patient journey.
  const zoom = rise(f, c("chip"), 22, EASE_IN_OUT);
  const roadDraw = rise(f, c("chip") + 6, 40, EASE_IN_OUT);
  const frameDraw = rise(f, c("sistemaCompleto"), 30, EASE_IN_OUT);
  // Beat C — end card.
  const journeyOut = rise(f, E - 6, 10, EASE_IN);

  const megaX = lerp(MEGA.x, P[0][0], zoom);
  const megaY = lerp(MEGA.y, P[0][1], zoom);
  const megaS = lerp(1, 100 / MEGA.size, zoom);
  const megaLit = f >= lightAt(0);
  const roadLen = getLength(ROAD);
  const pulseP = interpolate(f, [c("recorrido"), c("recorrido") + 40], [0, 1], { ...CLAMP, easing: EASE_IN_OUT });
  const pulse = getPointAtLength(ROAD, roadLen * pulseP) ?? { x: P[0][0], y: P[0][1] };

  return (
    <SceneFrame id="s6" bg="dark">
      {/* ---------- Beat A + B: campaign alone -> full system ---------- */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 1 - journeyOut,
          scale: `${1 - 0.1 * journeyOut}`,
        }}
      >
        {/* Weak signal waves */}
        {zoom < 1
          ? [0, 1, 2].map((k) => {
              const cyc = ((f - 10 - k * 10) % 30) / 30;
              if (f < 10 + k * 10) return null;
              return (
                <div
                  key={k}
                  style={{
                    position: "absolute",
                    left: MEGA.x + 70,
                    top: MEGA.y - 90,
                    width: 180,
                    height: 180,
                    borderRadius: "50%",
                    border: "6px solid transparent",
                    borderRightColor: "#55555C",
                    opacity: (1 - cyc) * 0.8 * (1 - zoom) * fall(f, xAt + 4, 10),
                    scale: `${0.6 + cyc * 0.9}`,
                  }}
                />
              );
            })
          : null}

        {/* Road + stages */}
        <svg width={960} height={960} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          {roadDraw > 0 ? (
            <path
              d={ROAD}
              fill="none"
              stroke="#3A3A42"
              strokeWidth={14}
              strokeLinecap="round"
              {...evolvePath(roadDraw, ROAD)}
            />
          ) : null}
          {frameDraw > 0 ? (
            <path
              d={framePath()}
              fill="none"
              stroke={COLORS.red}
              strokeWidth={7}
              strokeLinecap="round"
              {...evolvePath(frameDraw, framePath())}
            />
          ) : null}
        </svg>
        {STAGES.map((Icon, k) => {
          const appearAt = stageAppearAt[k];
          const lit = f >= lightAt(k + 1);
          return (
            <IconBadge
              key={k}
              Icon={Icon}
              size={100}
              bg={lit ? COLORS.red : "#26262C"}
              fg={lit ? COLORS.white : COLORS.gray}
              ring={lit ? undefined : "#3A3A42"}
              ringWidth={4}
              style={{
                position: "absolute",
                left: P[k + 1][0] - 50,
                top: P[k + 1][1] - 50,
                scale: `${f >= appearAt ? pop(f, appearAt, 12) * (lit ? 1 + 0.15 * Math.sin(Math.PI * rise(f, lightAt(k + 1), 8)) : 1) : 0}`,
                boxShadow: lit ? `0 0 30px ${COLORS.red}88` : undefined,
              }}
            />
          );
        })}
        {pulseP > 0 && pulseP < 1 ? (
          <div
            style={{
              position: "absolute",
              left: pulse.x - 16,
              top: pulse.y - 16,
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: COLORS.white,
              boxShadow: `0 0 24px 8px ${COLORS.red}`,
            }}
          />
        ) : null}

        {/* The megaphone (the ad) */}
        <div
          style={{
            position: "absolute",
            left: megaX - MEGA.size / 2,
            top: megaY - MEGA.size / 2,
            width: MEGA.size,
            height: MEGA.size,
            scale: `${megaS * pop(f, S6_BEATS.megaAt, 12) * (megaLit ? 1 + 0.15 * Math.sin(Math.PI * rise(f, lightAt(0), 8)) : 1)}`,
            rotate: `${shake}deg`,
          }}
        >
          <IconBadge
            Icon={Megaphone}
            size={MEGA.size}
            bg={megaLit ? COLORS.red : "#26262C"}
            fg={megaLit ? COLORS.white : "#A0A0A6"}
            iconScale={0.46}
          />
          {/* small gray ✗: not enough on its own */}
          <IconBadge
            Icon={X}
            size={84}
            bg="#44444B"
            fg={COLORS.white}
            iconScale={0.55}
            style={{
              position: "absolute",
              right: -6,
              top: -6,
              scale: `${f >= xAt ? pop(f, xAt, 9) : 0}`,
              opacity: 1 - zoom,
            }}
          />
        </div>

        {/* "Lanzar campañas, por sí solo, ya no alcanza" */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 560,
            width: 960,
            opacity: fall(f, c("chip") - 2, 8),
          }}
        >
          <KineticWords
            text={COPY.s6.notEnough}
            f={f}
            at={c("campanas")}
            stagger={2}
            fontSize={58}
            weight={800}
            lineHeight={1.16}
            style={{ maxWidth: 820, margin: "0 auto" }}
          />
        </div>

        {/* SISTEMA COMPLETO tab on the frame */}
        {f >= c("sistemaCompleto") + 4 ? (
          <div style={{ position: "absolute", left: 60, top: FRAME_RECT.y - 36 }}>
            <RedBarText text={COPY.s6.fullSystem} f={f} at={c("sistemaCompleto") + 4} fontSize={52} />
          </div>
        ) : null}
        {/* RECORRIDO DEL PACIENTE */}
        <div style={{ position: "absolute", left: 0, top: 700, width: 960 }}>
          <KineticWords
            text={COPY.s6.journey}
            f={f}
            at={c("recorrido")}
            stagger={3}
            fontSize={46}
            weight={900}
            color={COLORS.grayLight}
            letterSpacing="0.06em"
          />
        </div>
      </div>

      {/* ---------- Beat C: end card (benefit -> action) ---------- */}
      {f >= E - 2 ? (
        <>
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 24,
              width: 960,
              display: "flex",
              justifyContent: "center",
              opacity: rise(f, E, 10),
              scale: `${0.9 + 0.1 * pop(f, E, 14)}`,
            }}
          >
            <Logo height={110} />
          </div>
          <div style={{ position: "absolute", left: 0, top: 210, width: 960, display: "flex", justifyContent: "center" }}>
            <RedBarText
              text={breakWords(COPY.s6.benefit, [3, 3])}
              f={f}
              at={E + 4}
              fontSize={70}
              align="center"
              style={{ whiteSpace: "pre-line" }}
            />
          </div>
          <div style={{ position: "absolute", left: 0, top: 432, width: 960 }}>
            <KineticWords
              text={breakWords(COPY.s6.action, [4, 3])}
              f={f}
              at={actionAt}
              stagger={2}
              fontSize={54}
              weight={800}
              lineHeight={1.14}
              style={{ maxWidth: 820, margin: "0 auto" }}
            />
          </div>
          {f >= c("clic") ? (
            <>
              {/* Click cue: arrow down toward Meta's CTA button below the video */}
              <div
                style={{
                  position: "absolute",
                  left: 480 - 64,
                  top: 640,
                  scale: `${pop(f, c("clic"), 10)}`,
                  translate: `0px ${Math.abs(Math.sin((f - c("clic")) / 6)) * 18}px`,
                }}
              >
                <IconBadge Icon={ArrowDown} size={128} iconScale={0.55} style={{ boxShadow: `0 0 40px ${COLORS.red}88` }} />
                {f >= c("anuncio") ? (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      borderRadius: "50%",
                      border: `5px solid ${COLORS.white}`,
                      scale: `${1 + rise(f, c("anuncio"), 16, EASE_OUT) * 0.9}`,
                      opacity: 1 - rise(f, c("anuncio"), 16),
                    }}
                  />
                ) : null}
              </div>
              {[0, 1].map((k) => (
                <div
                  key={k}
                  style={{
                    position: "absolute",
                    left: 480 - 32,
                    top: 790 + k * 46,
                    opacity: 0.35 + 0.65 * Math.max(0, Math.sin((f - c("clic")) / 5 - k * 0.9)),
                  }}
                >
                  <ChevronDown size={64} color={COLORS.white} strokeWidth={3} />
                </div>
              ))}
              {/* Cursor glides in and clicks */}
              <div
                style={{
                  position: "absolute",
                  left: interpolate(f, [c("clic"), c("clic") + 16], [780, 548], { ...CLAMP, easing: EASE_OUT }),
                  top: interpolate(f, [c("clic"), c("clic") + 16], [560, 712], { ...CLAMP, easing: EASE_OUT }),
                  opacity: rise(f, c("clic"), 6),
                  scale: `${f >= c("anuncio") ? 1 - 0.18 * Math.sin(Math.PI * rise(f, c("anuncio"), 6)) : 1}`,
                }}
              >
                <MousePointer2 size={78} color={COLORS.ink} fill={COLORS.white} strokeWidth={1.6} />
              </div>
            </>
          ) : null}
        </>
      ) : null}
    </SceneFrame>
  );
};
