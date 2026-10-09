import React from "react";
import { interpolate } from "remotion";
import { evolvePath } from "@remotion/paths";
import {
  CheckCheck,
  Clock,
  Columns3,
  Funnel,
  Ghost,
  Magnet,
  Send,
  UserCheck,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { COLORS } from "../config/brand";
import { COPY } from "../config/copy";
import {
  CLAMP,
  EASE_IN,
  EASE_IN_OUT,
  EASE_OUT,
  fall,
  hash01,
  lerp,
  pop,
  rise,
  settle,
} from "../components/anim";
import { FONT_STACK } from "../components/fonts";
import { Avatar, IconBadge } from "../components/Pieces";
import { SceneFrame, useScene } from "../components/SceneFrame";
import { cuesOf } from "../config/timeline";
import { breakWords, KineticWords, RedBarText } from "../components/Text";
import { MATCH_ANGLE, MATCH_LINE } from "./shared";

const NODE_X = [96, 288, 480, 672, 864];
const PIPE_Y = 612;
const TRACK = { l: 30, r: 930 }; // side margins: nothing touches the frame edge
const NODE_D = 116;
const BRIDGE_Y = 470;
const DECK = { l: 210, r: 750 };
const ARCH_RISE = 230;
const NODE_ICONS: LucideIcon[] = [Magnet, Funnel, Columns3, Clock, UserCheck];
const DARK_LINE = COLORS.stroke;

// ---------- Lead-bubble flow along the pipeline ------------------------------
const SPAWN_EVERY = 5;
const SPEED = 11; // px per frame
const START_X = 24;

type Flow = {
  x: number;
  y: number;
  opacity: number;
  scale: number;
  rotate: number;
  good: boolean;
  passed: number; // nodes passed (lit)
  patient: boolean;
};

const flowState = (i: number, spawn0: number, litAt: number[], f: number): Flow | null => {
  const s = spawn0 + i * SPAWN_EVERY;
  if (f < s) return null;
  const good = hash01(i * 7 + 1) > 0.36;
  const jitter = (hash01(i * 13 + 5) - 0.5) * 44;
  const xAt = (t: number) => START_X + SPEED * (t - s);
  const reach = NODE_X.map((nx) => s + (nx - START_X) / SPEED);

  let passed = 0;
  for (let k = 0; k < NODE_X.length; k++) {
    if (f < reach[k]) break;
    // Node not lit yet when the bubble arrives: it is held (absorbed) there.
    if (litAt[k] > reach[k]) {
      const p = (f - reach[k]) / 7;
      if (p >= 1) return null;
      return { x: NODE_X[k], y: PIPE_Y + jitter * (1 - p), opacity: 1 - p, scale: 1 - 0.6 * p, rotate: 0, good, passed, patient: false };
    }
    passed = k + 1;
    // PRECALIFICA discards low-quality leads.
    if (k === 1 && !good) {
      const d = f - reach[k];
      if (d > 10) return null;
      return {
        x: NODE_X[1] + d * 3,
        y: PIPE_Y + jitter + 1.4 * d * d,
        opacity: 1 - d / 10,
        scale: 1,
        rotate: d * 9,
        good,
        passed,
        patient: false,
      };
    }
  }
  const x = xAt(f);
  if (x > TRACK.r + 10) return null;
  const ordered = passed >= 3 ? 1 : 0;
  return {
    x,
    y: PIPE_Y + jitter * (1 - ordered),
    opacity: interpolate(x, [START_X, START_X + 24, TRACK.r - 40, TRACK.r], [0, 1, 1, 0], CLAMP),
    scale: 1,
    rotate: 0,
    good,
    passed,
    patient: passed >= 5,
  };
};

/** A lead becomes a patient: good, and every node was lit when it arrived. */
const isConverted = (i: number, spawn0: number, litAt: number[], f: number) => {
  const s = spawn0 + i * SPAWN_EVERY;
  if (hash01(i * 7 + 1) <= 0.36) return false;
  const reach = NODE_X.map((nx) => s + (nx - START_X) / SPEED);
  return f >= reach[4] && reach.every((r, k) => litAt[k] <= r);
};

const windowFade = (t: number, a: number, b: number) => Math.min(rise(t, a, 6), fall(t, b, 6));

// ---------- Spotlight mini-animations ----------------------------------------
const LeadChip: React.FC<{ x: number; y: number; s?: number; color?: string; o?: number; r?: number }> = ({
  x,
  y,
  s = 1,
  color = COLORS.accentPale,
  o = 1,
  r = 0,
}) => (
  <div
    style={{
      position: "absolute",
      left: x - 46 * s,
      top: y - 31 * s,
      width: 92 * s,
      height: 62 * s,
      borderRadius: 20 * s,
      borderBottomLeftRadius: 6 * s,
      background: color,
      opacity: o,
      rotate: `${r}deg`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8 * s,
    }}
  >
    {[0, 1, 2].map((d) => (
      <div key={d} style={{ width: 10 * s, height: 10 * s, borderRadius: "50%", background: "rgba(0,0,0,0.28)" }} />
    ))}
  </div>
);

const Capta: React.FC<{ t: number; labelT: number }> = ({ t, labelT }) => {
  const magnet = { x: 720, y: 300 };
  return (
    <>
      <IconBadge
        Icon={Magnet}
        size={190}
        style={{ position: "absolute", left: magnet.x - 95, top: magnet.y - 95, scale: `${pop(t, 0)}`, rotate: "-90deg" }}
      />
      {Array.from({ length: 9 }).map((_, i) => {
        const p = interpolate(t, [i * 3.5, i * 3.5 + 20], [0, 1], { ...CLAMP, easing: EASE_IN });
        if (p <= 0 || p >= 1) return null;
        const sy = 180 + hash01(i + 40) * 260;
        return (
          <LeadChip
            key={i}
            x={lerp(70, magnet.x - 70, p)}
            y={lerp(sy, magnet.y, p * p)}
            s={1 - 0.45 * p}
            o={interpolate(p, [0, 0.15, 0.85, 1], [0, 1, 1, 0])}
          />
        );
      })}
      <div
        style={{
          position: "absolute",
          left: 40,
          top: 440,
          fontFamily: FONT_STACK,
          fontWeight: 800,
          fontSize: 42,
          color: COLORS.grayLight,
          opacity: rise(labelT, 0, 8),
          translate: `0px ${(1 - rise(labelT, 0, 10)) * 16}px`,
        }}
      >
        {COPY.s4.betterLeads}
      </div>
    </>
  );
};

const Precalifica: React.FC<{ t: number }> = ({ t }) => {
  const fx = 480;
  return (
    <>
      <div style={{ position: "absolute", left: fx - 110, top: 200, scale: `${pop(t, 0)}` }}>
        <Funnel size={220} color={COLORS.white} strokeWidth={1.6} />
      </div>
      {Array.from({ length: 8 }).map((_, i) => {
        const good = hash01(i * 3 + 11) > 0.4;
        const lt = t - i * 3;
        if (lt < 0) return null;
        const inP = interpolate(lt, [0, 9], [0, 1], { ...CLAMP, easing: EASE_IN });
        if (good) {
          const outP = interpolate(lt, [9, 18], [0, 1], CLAMP);
          if (outP >= 1) return null;
          return (
            <LeadChip
              key={i}
              x={fx + (hash01(i) - 0.5) * 140 * (1 - inP)}
              y={lerp(185, 300, inP) + outP * 140}
              s={0.8 - 0.25 * inP}
              color={inP >= 1 ? COLORS.green : COLORS.accentPale}
              o={1 - outP}
            />
          );
        }
        const side = hash01(i + 9) > 0.5 ? 1 : -1;
        const bounce = interpolate(lt, [9, 22], [0, 1], CLAMP);
        if (bounce >= 1) return null;
        return (
          <LeadChip
            key={i}
            x={fx + side * (60 + bounce * 260)}
            y={lerp(185, 240, inP) + bounce * bounce * 200 - Math.sin(bounce * Math.PI) * 60}
            s={0.8}
            color={COLORS.grayDark}
            o={1 - bounce}
            r={side * bounce * 120}
          />
        );
      })}
    </>
  );
};

const Ordena: React.FC<{ t: number }> = ({ t }) => {
  const cols = [250, 480, 710];
  return (
    <>
      {cols.map((cx, j) => (
        <div
          key={j}
          style={{
            position: "absolute",
            left: cx - 100,
            top: 170,
            width: 200,
            height: 270,
            borderRadius: 20,
            border: `4px solid ${COLORS.grayDark}`,
            opacity: rise(t, j * 1.5, 5),
            scale: `${0.85 + 0.15 * rise(t, j * 1.5, 6)}`,
          }}
        >
          <div style={{ margin: "14px auto 0", width: 70, height: 10, borderRadius: 5, background: j === 2 ? COLORS.accent : COLORS.grayDark }} />
        </div>
      ))}
      {Array.from({ length: 7 }).map((_, i) => {
        const col = i % 3;
        const slot = Math.floor(i / 3);
        const p = interpolate(t, [2 + i * 1.6, 9 + i * 1.6], [0, 1], { ...CLAMP, easing: EASE_OUT });
        if (p <= 0) return null;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: lerp(cols[(col + 1) % 3] - 80, cols[col] - 80, p),
              top: lerp(470, 214 + slot * 66, p),
              width: 160,
              height: 52,
              borderRadius: 12,
              background: col === 2 ? COLORS.accent : COLORS.accentPale,
              opacity: p,
              rotate: `${(1 - p) * (i % 2 ? 12 : -12)}deg`,
            }}
          />
        );
      })}
    </>
  );
};

const Automatiza: React.FC<{ t: number }> = ({ t }) => {
  const clock = { x: 200, y: 350 };
  return (
    <>
      <div style={{ position: "absolute", left: clock.x - 90, top: clock.y - 90, scale: `${pop(t, 0)}` }}>
        <IconBadge Icon={Clock} size={180} />
        {/* Fast-moving hand: time passing, follow-up on autopilot */}
        <div
          style={{
            position: "absolute",
            left: 88,
            top: 44,
            width: 6,
            height: 48,
            borderRadius: 3,
            background: COLORS.white,
            transformOrigin: "50% 100%",
            rotate: `${t * 14}deg`,
          }}
        />
      </div>
      {[0, 1, 2].map((k) => {
        const at = 6 + k * 15;
        const p = pop(t, at, 13);
        const sent = rise(t, at + 6, 6);
        return (
          <div
            key={k}
            style={{
              position: "absolute",
              left: 360,
              top: 226 + k * 80,
              width: 520 - k * 40,
              height: 66,
              borderRadius: 22,
              borderBottomRightRadius: 6,
              background: "#DDF3E4",
              opacity: t >= at ? 1 : 0,
              scale: `${p}`,
              transformOrigin: "100% 100%",
              display: "flex",
              alignItems: "center",
              padding: "0 22px",
              gap: 14,
            }}
          >
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ height: 11, borderRadius: 6, background: "rgba(14,14,16,0.28)", width: "88%" }} />
              <div style={{ height: 11, borderRadius: 6, background: "rgba(14,14,16,0.18)", width: "56%" }} />
            </div>
            <div style={{ opacity: sent }}>
              <CheckCheck size={34} color={COLORS.green} strokeWidth={2.8} />
            </div>
          </div>
        );
      })}
      <div
        style={{
          position: "absolute",
          left: 880,
          top: 170,
          opacity: windowFade(t, 4, 40),
          translate: `${(t % 15) * 3}px ${-(t % 15) * 2}px`,
        }}
      >
        <Send size={44} color={COLORS.green} strokeWidth={2.4} />
      </div>
    </>
  );
};

const Convierte: React.FC<{ t: number; outcomeT: number }> = ({ t, outcomeT }) => {
  const c = { x: 480, y: 236 };
  const ringR = 104;
  return (
    <>
      <svg width={960} height={520} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        <g
          transform={`rotate(${t * 6} ${c.x} ${c.y})`}
          opacity={rise(t, 4, 8)}
        >
          <path
            d={`M ${c.x + ringR} ${c.y} A ${ringR} ${ringR} 0 1 1 ${c.x + ringR * Math.cos(-0.7)} ${c.y + ringR * Math.sin(-0.7)}`}
            fill="none"
            stroke={COLORS.green}
            strokeWidth={10}
            strokeLinecap="round"
          />
          <path
            d={`M ${c.x + ringR * Math.cos(-0.7) - 4} ${c.y + ringR * Math.sin(-0.7) - 26} l 30 22 l -34 14 z`}
            fill={COLORS.green}
          />
        </g>
      </svg>
      <IconBadge
        Icon={UserCheck}
        size={150}
        bg={COLORS.green}
        style={{ position: "absolute", left: c.x - 75, top: c.y - 75, scale: `${pop(t, 0, 10)}` }}
      />
      <div style={{ position: "absolute", left: 0, top: 362, width: 960 }}>
        <KineticWords
          text={breakWords(COPY.s4.outcome, [2, 2])}
          f={outcomeT}
          at={0}
          fontSize={56}
          stagger={2}
          style={{ maxWidth: 760, margin: "0 auto" }}
        />
      </div>
    </>
  );
};

// ---------- Scene ------------------------------------------------------------
/** Key beats (scene-local frames) — shared with the SFX cue sheet. */
export const S4_BEATS = (() => {
  const { c, dur } = cuesOf("s4");
  const litAt = [c("capta"), c("precalifica"), c("ordena"), c("automatiza"), c("convierte")];
  const spawn0 = litAt[0] - 12;
  const conversions: number[] = [];
  for (let i = 0; spawn0 + i * SPAWN_EVERY < dur; i++) {
    const reach4 = Math.ceil(spawn0 + i * SPAWN_EVERY + (NODE_X[4] - START_X) / SPEED);
    if (reach4 < dur && isConverted(i, spawn0, litAt, reach4)) conversions.push(reach4);
  }
  return { litAt, morphAt: litAt[0] - 16, spawn0, sistemaAt: c("sistema"), conversions };
})();

export const S4Sistema: React.FC = () => {
  const { f, dur, c } = useScene("s4");
  const { litAt, morphAt, spawn0 } = S4_BEATS;

  // Bridge build
  const contract = rise(f, 0, 16, EASE_IN_OUT);
  const morph = rise(f, morphAt, 16, EASE_IN_OUT);
  const deckY = lerp(lerp(MATCH_LINE.y, BRIDGE_Y, contract), PIPE_Y, morph);
  const deckL = lerp(lerp(0, DECK.l, contract), TRACK.l, morph);
  const deckR = lerp(lerp(960, DECK.r, contract), TRACK.r, morph);
  const deckH = lerp(lerp(MATCH_LINE.h, 12, contract), 10, morph);
  const archRise = ARCH_RISE * (1 - morph);
  const archDraw = rise(f, 10, 20, EASE_IN_OUT);
  // Match cut: the line arrives tipped like the S3 beam, then levels into the deck.
  const deckRot = MATCH_ANGLE * (1 - rise(f, 0, 10, EASE_IN_OUT));
  const islandsIn = rise(f, 4, 14);
  const islandsOut = morph;
  const archPath = `M ${deckL} ${deckY} Q ${(deckL + deckR) / 2} ${deckY - 2 * archRise} ${deckR} ${deckY}`;
  const archY = (x: number) => {
    const u = (x - deckL) / (deckR - deckL);
    return deckY - 2 * archRise * 2 * u * (1 - u);
  };
  const deckRed = 1 - rise(f, morphAt + 6, 12);

  // Pipeline
  let energyX = 0;
  for (let k = 0; k < NODE_X.length; k++) {
    const prev = k === 0 ? TRACK.l : NODE_X[k - 1];
    energyX += (NODE_X[k] - prev) * settle(f, litAt[k] - 5, 10);
  }
  const flows = Array.from({ length: Math.max(0, Math.ceil((f - spawn0) / SPAWN_EVERY) + 1) })
    .map((_, i) => flowState(i, spawn0, litAt, f))
    .filter((x): x is Flow => x !== null);
  let converted = 0;
  for (let i = 0; spawn0 + i * SPAWN_EVERY <= f; i++) {
    if (isConverted(i, spawn0, litAt, f)) converted++;
  }

  const spot = (k: number) => {
    const a = litAt[k];
    const b = k < 4 ? litAt[k + 1] : dur + 20;
    return { t: f - a, o: Math.min(rise(f, a, 6), fall(f, b - 4, 5)), on: f >= a - 1 && f < b + 2 };
  };

  return (
    <SceneFrame id="s4" bg="dark">
      {/* EL PUENTE -> UN SISTEMA */}
      <div style={{ position: "absolute", left: 0, top: 70, width: 960 }}>
        <KineticWords text={COPY.s4.bridge} f={f} at={c("puente")} fontSize={100} exitAt={c("sistema") - 2} />
      </div>
      {f >= c("sistema") ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 70,
            width: 960,
            display: "flex",
            justifyContent: "center",
            opacity: fall(f, morphAt + 6, 8),
            translate: `0px ${-rise(f, morphAt + 6, 8) * 40}px`,
          }}
        >
          <RedBarText text={COPY.s4.system} f={f} at={c("sistema") + 3} fontSize={100} align="center" />
        </div>
      ) : null}

      {/* Scenario islands */}
      {islandsOut < 1 ? (
        <>
          <div
            style={{
              position: "absolute",
              left: lerp(-340, 20, islandsIn) - islandsOut * 200,
              top: BRIDGE_Y - 80,
              width: 190,
              height: 170,
              borderRadius: 26,
              background: COLORS.surface,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              opacity: 1 - islandsOut,
            }}
          >
            <Ghost size={78} color="#6F879E" strokeWidth={2.2} />
            <div style={{ width: 110, height: 30, borderRadius: 15, border: "3px dashed #6F879E" }} />
          </div>
          <div
            style={{
              position: "absolute",
              left: lerp(1100, 750, islandsIn) + islandsOut * 200,
              top: BRIDGE_Y - 80,
              width: 190,
              height: 170,
              borderRadius: 26,
              background: COLORS.paper,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              opacity: 1 - islandsOut,
            }}
          >
            <Avatar size={78} Icon={UserRound} bg={COLORS.ink} fg={COLORS.white} />
            <div style={{ width: 110, height: 30, borderRadius: 15, background: COLORS.green }} />
          </div>
        </>
      ) : null}

      {/* Bridge: arch + cables, flattening into the pipeline */}
      <svg width={960} height={960} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        {archRise > 1 ? (
          <>
            {Array.from({ length: 9 }).map((_, k) => {
              const x = lerp(deckL, deckR, (k + 1) / 10);
              const p = pop(f, 16 + k * 2, 14) * archDraw;
              return (
                <line
                  key={k}
                  x1={x}
                  x2={x}
                  y1={deckY}
                  y2={lerp(deckY, archY(x), Math.min(1, p))}
                  stroke={COLORS.accent}
                  strokeWidth={5}
                  opacity={0.85}
                />
              );
            })}
            <path
              d={archPath}
              fill="none"
              stroke={COLORS.accent}
              strokeWidth={10}
              strokeLinecap="round"
              {...evolvePath(archDraw, archPath)}
            />
          </>
        ) : null}
      </svg>
      {/* Deck: red bridge -> gray pipeline base */}
      <div
        style={{
          position: "absolute",
          left: deckL,
          top: deckY - deckH / 2,
          width: deckR - deckL,
          height: deckH,
          borderRadius: deckH / 2,
          background: DARK_LINE,
          rotate: `${deckRot}deg`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: deckL,
          top: deckY - deckH / 2,
          width: deckR - deckL,
          height: deckH,
          borderRadius: deckH / 2,
          background: COLORS.accent,
          opacity: deckRed,
          rotate: `${deckRot}deg`,
        }}
      />

      {/* Energy along the line, up to the furthest lit node */}
      {f >= litAt[0] - 6 ? (
        <>
          <div
            style={{
              position: "absolute",
              left: TRACK.l,
              top: PIPE_Y - 5,
              width: Math.max(0, energyX - TRACK.l + 30),
              height: 10,
              borderRadius: 5,
              background: COLORS.accent,
              boxShadow: `0 0 22px ${COLORS.accent}, 0 0 6px ${COLORS.accent}`,
            }}
          />
          {energyX > 40 ? (
            <div
              style={{
                position: "absolute",
                left: TRACK.l + ((f * 16) % Math.max(1, energyX - TRACK.l)) - 30,
                top: PIPE_Y - 4,
                width: 60,
                height: 8,
                borderRadius: 4,
                background: "linear-gradient(90deg, rgba(255,255,255,0), #fff, rgba(255,255,255,0))",
                opacity: 0.85,
              }}
            />
          ) : null}
        </>
      ) : null}

      {/* Leads flowing left -> right through the pipeline */}
      {flows.map((fl, i) =>
        fl.patient ? (
          <IconBadge
            key={i}
            Icon={UserRound}
            size={50}
            bg={COLORS.green}
            iconScale={0.6}
            style={{ position: "absolute", left: fl.x - 25, top: fl.y - 25, opacity: fl.opacity }}
          />
        ) : (
          <div
            key={i}
            style={{
              position: "absolute",
              left: fl.x - 22 * fl.scale,
              top: fl.y - 15 * fl.scale,
              width: 44 * fl.scale,
              height: 30 * fl.scale,
              borderRadius: 10,
              borderBottomLeftRadius: 3,
              background: fl.passed >= 2 && fl.good ? COLORS.green : fl.good ? COLORS.accentPale : COLORS.grayDark,
              opacity: fl.opacity,
              rotate: `${fl.rotate}deg`,
            }}
          />
        ),
      )}

      {/* Nodes + docked labels */}
      {NODE_X.map((x, k) => {
        const appear = pop(f, morphAt + 8 + k * 2, 12);
        const lit = f >= litAt[k];
        const lp = pop(f, litAt[k], 9);
        const ring = rise(f, litAt[k], 16, EASE_OUT);
        const Icon = NODE_ICONS[k];
        const below = k % 2 === 0;
        return (
          <React.Fragment key={k}>
            {lit && ring < 1 ? (
              <div
                style={{
                  position: "absolute",
                  left: x - NODE_D / 2,
                  top: PIPE_Y - NODE_D / 2,
                  width: NODE_D,
                  height: NODE_D,
                  borderRadius: "50%",
                  border: `5px solid ${COLORS.accent}`,
                  scale: `${1 + ring * 0.9}`,
                  opacity: 1 - ring,
                }}
              />
            ) : null}
            <IconBadge
              Icon={Icon}
              size={NODE_D}
              bg={lit ? (k === 4 ? COLORS.green : COLORS.brand) : COLORS.bgCard}
              fg={lit ? COLORS.white : COLORS.grayDark}
              ring={lit ? COLORS.accent : COLORS.stroke}
              ringWidth={4}
              iconScale={0.48}
              style={{
                position: "absolute",
                left: x - NODE_D / 2,
                top: PIPE_Y - NODE_D / 2,
                scale: `${f >= morphAt + 8 + k * 2 ? appear * (lit ? 1 + 0.18 * Math.sin(Math.PI * Math.min(1, lp)) * (1 - Math.min(1, (f - litAt[k]) / 12)) : 1) : 0}`,
                boxShadow: lit ? `0 0 34px ${k === 4 ? COLORS.green : COLORS.accent}88` : undefined,
              }}
            />
            {/* Labels: all under the line; odd nodes drop to a second row with a connector */}
            {!below ? (
              <div
                style={{
                  position: "absolute",
                  left: x - 2,
                  top: PIPE_Y + NODE_D / 2 + 4,
                  width: 4,
                  height: 46,
                  borderRadius: 2,
                  background: lit ? COLORS.white : COLORS.stroke,
                  opacity: rise(f, morphAt + 12 + k * 2, 8),
                }}
              />
            ) : null}
            <div
              style={{
                position: "absolute",
                left: k === 0 ? TRACK.l : k === 4 ? TRACK.r - 300 : x - 160,
                width: k === 0 || k === 4 ? 300 : 320,
                top: PIPE_Y + NODE_D / 2 + (below ? 14 : 56),
                textAlign: k === 0 ? "left" : k === 4 ? "right" : "center",
                fontFamily: FONT_STACK,
                fontWeight: 800,
                fontSize: 34,
                lineHeight: 1.08,
                letterSpacing: "0.02em",
                color: lit ? COLORS.white : COLORS.gray,
                opacity: rise(f, morphAt + 12 + k * 2, 8),
                whiteSpace: "pre-line",
              }}
            >
              {k === 3 ? COPY.s4.nodes[k].replace(" ", "\n") : COPY.s4.nodes[k]}
            </div>
          </React.Fragment>
        );
      })}

      {/* Spotlight: the active verb, big, with its own mini-animation */}
      {COPY.s4.nodes.map((label, k) => {
        const s = spot(k);
        if (!s.on) return null;
        return (
          <div key={label} style={{ position: "absolute", left: 0, top: 0, width: 960, height: 500, opacity: s.o }}>
            <div style={{ position: "absolute", left: 0, top: 18, width: 960 }}>
              <KineticWords
                text={label}
                f={s.t}
                at={0}
                stagger={2}
                dur={8}
                fontSize={k === 3 ? 80 : 96}
                color={k === 4 ? COLORS.white : COLORS.white}
                style={{ maxWidth: 900, margin: "0 auto" }}
              />
            </div>
            {k === 0 ? <Capta t={s.t} labelT={f - (litAt[0] + 9)} /> : null}
            {k === 1 ? <Precalifica t={s.t} /> : null}
            {k === 2 ? <Ordena t={s.t} /> : null}
            {k === 3 ? <div style={{ position: "absolute", left: 0, top: 30, width: 960, height: 500 }}><Automatiza t={s.t} /></div> : null}
            {k === 4 ? <Convierte t={s.t} outcomeT={f - c("pacientes")} /> : null}
          </div>
        );
      })}

      {/* Counter of real patients coming out the end */}
      {f >= litAt[4] ? (
        <div
          style={{
            position: "absolute",
            right: 30,
            top: 850,
            display: "flex",
            alignItems: "center",
            gap: 16,
            opacity: rise(f, litAt[4], 8),
            scale: `${pop(f, litAt[4], 12)}`,
            transformOrigin: "100% 50%",
          }}
        >
          <IconBadge Icon={UserCheck} size={78} bg={COLORS.green} />
          <div
            style={{
              fontFamily: FONT_STACK,
              fontWeight: 900,
              fontSize: 88,
              color: COLORS.white,
              fontVariantNumeric: "tabular-nums",
              minWidth: 150,
            }}
          >
            +{converted}
          </div>
        </div>
      ) : null}
    </SceneFrame>
  );
};
