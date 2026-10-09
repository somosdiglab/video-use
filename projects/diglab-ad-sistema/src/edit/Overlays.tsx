import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { evolvePath, getLength, getPointAtLength } from "@remotion/paths";
import {
  ArrowDown,
  Award,
  Building2,
  Check,
  Hospital,
  Lock,
  Megaphone,
  ShieldCheck,
  Sparkles,
  UserCheck,
  UserRound,
  Users,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { COLORS } from "../config/brand";
import { COPY } from "../config/copy";
import { OVERLAYS } from "../config/edit";
import { cue, SCENES } from "../config/timeline";
import { CLAMP, EASE_IN, EASE_IN_OUT, fall, pop, rise, settle } from "../components/anim";
import { FONT_STACK } from "../components/fonts";
import { Stage } from "../components/Layout";
import { Logo } from "../components/Logo";
import { IconBadge, PriceTag } from "../components/Pieces";
import { breakWords, KineticWords, RedBarText } from "../components/Text";
import { S4_BEATS } from "../scenes/S4Sistema";
import { S6_BEATS } from "../scenes/S6Cierre";

type Win = { from: number; to: number };
const SHADOW = "0 2px 14px rgba(2,8,16,0.75), 0 1px 3px rgba(2,8,16,0.6)";

const useWin = (w: Win) => {
  const F = useCurrentFrame();
  return { F, on: F >= w.from && F < w.to };
};

/** Navy gradients so overlay text reads over real footage. */
const Scrim: React.FC<{ F: number; w: Win; top?: boolean; bottom?: boolean }> = ({ F, w, top, bottom = true }) => {
  const o = Math.min(rise(F, w.from - 2, 6), fall(F, w.to - 4, 6));
  return (
    <AbsoluteFill style={{ opacity: o, pointerEvents: "none" }}>
      {bottom ? (
        <AbsoluteFill
          style={{ background: "linear-gradient(to bottom, rgba(7,26,47,0) 40%, rgba(7,26,47,0.55) 62%, rgba(7,26,47,0.85) 100%)" }}
        />
      ) : null}
      {top ? (
        <AbsoluteFill
          style={{ background: "linear-gradient(to top, rgba(7,26,47,0) 70%, rgba(7,26,47,0.55) 84%, rgba(7,26,47,0.8) 100%)" }}
        />
      ) : null}
    </AbsoluteFill>
  );
};

const Toggle: React.FC<{ on: number; scale?: number }> = ({ on, scale = 1 }) => {
  const w = 200 * scale;
  const h = 104 * scale;
  const knob = h - 16 * scale;
  return (
    <div style={{ width: w, height: h, borderRadius: h / 2, background: on > 0.5 ? COLORS.accent : "rgba(255,255,255,0.35)", position: "relative" }}>
      <div
        style={{
          position: "absolute",
          top: 8 * scale,
          left: 8 * scale + (w - knob - 16 * scale) * on,
          width: knob,
          height: knob,
          borderRadius: "50%",
          background: COLORS.white,
          boxShadow: "0 4px 10px rgba(0,0,0,0.25)",
        }}
      />
    </div>
  );
};

// ---------------------------------------------------------------- S1 brand block
const BrandBlock: React.FC = () => {
  const w = OVERLAYS.brandBlock;
  const { F, on } = useWin(w);
  if (!on) return null;
  return (
    <>
      <Scrim F={F} w={w} top />
      <Stage>
        <div style={{ position: "absolute", left: 24, top: 14 }}>
          <Logo height={84} />
        </div>
        <div
          style={{
            position: "absolute",
            left: 24,
            top: 586,
            width: 920,
            // Readable at frame 0, with a short punch-in so the open still moves.
            scale: `${1.05 - 0.05 * settle(F, 0, 14)}`,
            transformOrigin: "0% 50%",
          }}
        >
          <RedBarText
            text={breakWords(COPY.s1.headline, [3, 2])}
            f={F}
            at={-14}
            fontSize={74}
            lineHeight={1.22}
            style={{ whiteSpace: "pre-line" }}
          />
          <KineticWords
            text={breakWords(COPY.s1.question, [5, 4])}
            f={F}
            at={3}
            stagger={2}
            dur={9}
            fontSize={42}
            weight={800}
            lineHeight={1.16}
            letterSpacing="0em"
            align="left"
            style={{ marginTop: 22, maxWidth: 880, textShadow: SHADOW }}
          />
        </div>
      </Stage>
    </>
  );
};

// ---------------------------------------------------------------- S2 trust touchpoints
const CHIPS: { label: string; Icon: LucideIcon; at: number }[] = [
  { label: COPY.s2.team, Icon: Users, at: cue("s2", "equipo").start },
  { label: COPY.s2.trackRecord, Icon: Award, at: cue("s2", "trayectoria").start },
  { label: COPY.s2.different, Icon: Sparkles, at: cue("s2", "queHace").start },
];

const Trust: React.FC = () => {
  const w = OVERLAYS.trust;
  const { F, on } = useWin(w);
  if (!on) return null;
  const tOtro = cue("s2", "otroEscenario").start;
  const tKick = cue("s2", "antesPrecio").start - 4;
  const tPrice = cue("s2", "antesPrecio").end - 4;
  const tPatient = cue("s2", "aseguraste").start;
  const tQ = cue("s2", "queHace").start + 8;
  const tDif = cue("s2", "diferente").start;
  const unlock = cue("s2", "diferente").end;
  const fill = CHIPS.reduce((n, c) => n + settle(F, c.at + 4, 14), 0) / 3;
  const full = rise(F, CHIPS[2].at + 14, 8);
  const titleOut = rise(F, tKick, 8, EASE_IN);
  const q = rise(F, tQ, 8);
  const unlocked = rise(F, unlock, 8);
  return (
    <>
      <Scrim F={F} w={w} top={F >= tKick} />
      <Stage>
        {/* OTRO ESCENARIO: the switch flips */}
        {titleOut < 1 ? (
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 560,
              width: 960,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 26,
              opacity: 1 - titleOut,
              translate: `0px ${-titleOut * 60}px`,
            }}
          >
            <div style={{ scale: `${pop(F, w.from + 2, 12)}` }}>
              <Toggle on={settle(F, tOtro - 6, 10)} />
            </div>
            <KineticWords text={COPY.s2.title} f={F} at={tOtro} fontSize={100} stagger={5} style={{ textShadow: SHADOW, maxWidth: 900 }} />
          </div>
        ) : null}
        {/* Kicker */}
        <div
          style={{
            position: "absolute",
            left: 24,
            top: 18,
            display: "flex",
            alignItems: "center",
            gap: 14,
            opacity: rise(F, tKick + 4, 8) * (1 - q),
          }}
        >
          <Toggle on={1} scale={0.36} />
          <span style={{ fontFamily: FONT_STACK, fontWeight: 900, fontSize: 32, letterSpacing: "0.04em", color: COLORS.white, textShadow: SHADOW }}>
            {COPY.s2.title}
          </span>
        </div>

        {/* The price waits, locked, until trust is built */}
        {F >= tPrice ? (
          <div style={{ position: "absolute", left: 720, top: 430, scale: `${pop(F, tPrice, 12)}` }}>
            <div style={{ position: "relative" }}>
              <PriceTag width={180} color={unlocked > 0.5 ? COLORS.brand : COLORS.paperMuted} holeColor={COLORS.bg} />
              <IconBadge
                Icon={unlocked > 0.5 ? Check : Lock}
                size={62}
                bg={unlocked > 0.5 ? COLORS.green : COLORS.ink}
                style={{ position: "absolute", left: 136, top: -26, scale: `${unlocked > 0.5 ? pop(F, unlock, 9) : 1}` }}
              />
            </div>
          </div>
        ) : null}

        {/* Touchpoints pop in beside the narrator */}
        {CHIPS.map((c, k) => {
          if (F < c.at) return null;
          const p = pop(F, c.at, 11);
          return (
            <div
              key={c.label}
              style={{
                position: "absolute",
                left: 24,
                top: 588 + k * 92,
                display: "inline-flex",
                alignItems: "center",
                gap: 16,
                padding: "12px 22px 12px 12px",
                borderRadius: 24,
                background: COLORS.paperCard,
                boxShadow: "0 10px 30px rgba(2,8,16,0.35)",
                opacity: Math.min(1, p * 1.4) * (1 - 0.35 * q),
                translate: `${(1 - p) * -80}px 0px`,
              }}
            >
              <IconBadge Icon={c.Icon} size={62} />
              <span style={{ fontFamily: FONT_STACK, fontWeight: 900, fontSize: 38, color: COLORS.ink, whiteSpace: "nowrap" }}>{c.label}</span>
            </div>
          );
        })}

        {/* Patient + trust meter */}
        {F >= tPatient ? (
          <div style={{ position: "absolute", left: 24, top: 882, display: "flex", alignItems: "center", gap: 16, opacity: rise(F, tPatient, 8) }}>
            <IconBadge Icon={UserRound} size={66} bg={COLORS.accent} iconScale={0.56} />
            <div style={{ width: 640, height: 34, borderRadius: 17, background: "rgba(255,255,255,0.28)", overflow: "hidden" }}>
              <div
                style={{
                  width: `${fill * 100}%`,
                  height: "100%",
                  borderRadius: 17,
                  background: full > 0.5 ? COLORS.green : COLORS.accent,
                  boxShadow: `0 0 20px ${full > 0.5 ? COLORS.green : COLORS.accent}88`,
                }}
              />
            </div>
            <IconBadge Icon={ShieldCheck} size={66} bg={full > 0.5 ? COLORS.green : "rgba(255,255,255,0.28)"} style={{ scale: `${1 + 0.18 * Math.sin(Math.PI * full)}` }} />
          </div>
        ) : null}

        {/* ¿QUÉ TE HACE DIFERENTE? */}
        {F >= tQ ? (
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 16,
              width: 960,
              display: "flex",
              justifyContent: "center",
              scale: `${(0.9 + 0.1 * q) * (1 + 0.05 * Math.sin(Math.PI * rise(F, tDif, 10)))}`,
            }}
          >
            <RedBarText
              text={breakWords(COPY.s2.differentQuestion, [3])}
              f={F}
              at={tQ}
              fontSize={80}
              align="center"
              style={{ whiteSpace: "pre-line" }}
            />
          </div>
        ) : null}
      </Stage>
    </>
  );
};

// ---------------------------------------------------------------- S3 / S4 bookends
const Vale: React.FC = () => {
  const w = OVERLAYS.vale;
  const { F, on } = useWin(w);
  if (!on) return null;
  return (
    <>
      <Scrim F={F} w={w} />
      <Stage>
        <div style={{ position: "absolute", left: 0, top: 660, width: 960, display: "flex", justifyContent: "center", opacity: fall(F, w.to - 5, 5) }}>
          {/* Continues the line the scale cutaway just landed on */}
          <RedBarText text={breakWords(COPY.s3.worth, [2, 3])} f={F} at={w.from - 14} fontSize={88} align="center" style={{ whiteSpace: "pre-line" }} />
        </div>
      </Stage>
    </>
  );
};

const BridgeWord: React.FC = () => {
  const w = OVERLAYS.bridgeWord;
  const { F, on } = useWin(w);
  if (!on) return null;
  const draw = rise(F, w.from + 6, 18, EASE_IN_OUT);
  return (
    <>
      <Scrim F={F} w={w} top bottom={false} />
      <Stage>
        <div style={{ position: "absolute", left: 0, top: 24, width: 960 }}>
          <KineticWords text={COPY.s4.bridge} f={F} at={w.from} fontSize={108} style={{ textShadow: SHADOW }} />
        </div>
        {/* The deck the cutaway will build on */}
        <div
          style={{
            position: "absolute",
            left: 480 - 300 * draw,
            top: 162,
            width: 600 * draw,
            height: 12,
            borderRadius: 6,
            background: COLORS.accent,
            boxShadow: `0 0 20px ${COLORS.accent}`,
          }}
        />
      </Stage>
    </>
  );
};

const Outcome: React.FC = () => {
  const w = OVERLAYS.outcome;
  const { F, on } = useWin(w);
  if (!on) return null;
  const n = S4_BEATS.conversions.length;
  return (
    <>
      <Scrim F={F} w={w} />
      <Stage>
        <div style={{ position: "absolute", left: 0, top: 600, width: 960, display: "flex", justifyContent: "center" }}>
          <RedBarText text={breakWords(COPY.s4.outcome, [2, 2])} f={F} at={w.from - 14} fontSize={72} align="center" style={{ whiteSpace: "pre-line" }} />
        </div>
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 830,
            width: 960,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 16,
            scale: `${pop(F, w.from + 4, 12)}`,
          }}
        >
          <IconBadge Icon={UserCheck} size={84} bg={COLORS.green} />
          <span style={{ fontFamily: FONT_STACK, fontWeight: 900, fontSize: 84, color: COLORS.white, textShadow: SHADOW }}>+{n}</span>
        </div>
      </Stage>
    </>
  );
};

// ---------------------------------------------------------------- S5 price war (beside the narrator)
const PW = { w: 912, h: 310 };
const pts = (a: [number, number][]) => `M ${a.map(([x, y]) => `${x} ${y}`).join(" L ")}`;
const GENERIC = [
  pts([[40, 150], [150, 168], [240, 158], [330, 210], [430, 200], [530, 252], [640, 244], [760, 296]]),
  pts([[40, 150], [160, 186], [260, 178], [350, 236], [460, 226], [560, 286], [670, 278], [790, 324]]),
  pts([[40, 150], [140, 196], [250, 190], [340, 262], [450, 252], [550, 312], [670, 304], [810, 346]]),
];
const DISCOUNTS = ["-10%", "-20%", "-30%"];
const OURS = "M 40 150 L 150 160 L 250 168 C 320 172 380 120 470 92 S 720 46 870 36";

/** Price-war beats (global frames) — shared with the SFX cue sheet. */
export const PRICEWAR_BEATS = (() => {
  const w = OVERLAYS.priceWar;
  const swapAt = cue("s5", "empezar").start + 6;
  return {
    strikeAt: cue("s5", "precio").end - 4,
    swapAt,
    riseDone: swapAt + 36,
    tVale: cue("s5", "vale").start,
    badgeAt: [0, 1, 2].map((k) => Math.round(w.from + 4 + (0.35 + 0.22 * k) * (swapAt + 12 - w.from))),
  };
})();

const PriceWar: React.FC = () => {
  const w = OVERLAYS.priceWar;
  const { F, on } = useWin(w);
  if (!on) return null;
  const { strikeAt, swapAt, tVale, badgeAt: badgeAts } = PRICEWAR_BEATS;
  const gP = interpolate(F, [w.from + 4, swapAt + 16], [0, 1], CLAMP);
  const oursP =
    F < swapAt
      ? interpolate(F, [w.from + 4, swapAt], [0, 0.3], CLAMP)
      : interpolate(F, [swapAt, swapAt + 36], [0.3, 1], { ...CLAMP, easing: EASE_IN_OUT });
  const head0 = getPointAtLength(OURS, Math.max(1, getLength(OURS) * oursP)) ?? { x: 40, y: 150 };
  const head = { x: head0.x, y: head0.y * (PW.h / 380) };
  const halo = rise(F, tVale, 12);
  const strike = rise(F, strikeAt, 8);
  return (
    <>
      <Scrim F={F} w={w} top />
      <Stage>
        {/* COMPETIR POR ~~PRECIO~~ -> COBRAR LO QUE VALÉS */}
        <div style={{ position: "absolute", left: 0, top: 14, width: 960, opacity: fall(F, swapAt, 8), translate: `0px ${-rise(F, swapAt, 8) * 40}px` }}>
          <KineticWords text={COPY.s5.compete} f={F} at={cue("s5", "competir").start} fontSize={80} style={{ textShadow: SHADOW }} />
          <div style={{ display: "flex", justifyContent: "center", marginTop: 4 }}>
            <div style={{ position: "relative" }}>
              <KineticWords text={COPY.s5.competeStruck} f={F} at={cue("s5", "precio").start} fontSize={80} color={strike > 0.5 ? COLORS.gray : COLORS.white} style={{ textShadow: SHADOW }} />
              <div style={{ position: "absolute", left: -14, right: -14, top: "46%", height: 14, borderRadius: 7, background: COLORS.alert, transformOrigin: "0% 50%", scale: `${strike} 1`, rotate: "-4deg" }} />
            </div>
          </div>
        </div>
        {F >= swapAt + 4 ? (
          <div style={{ position: "absolute", left: 0, top: 20, width: 960, display: "flex", justifyContent: "center", scale: `${1 + 0.05 * Math.sin(Math.PI * rise(F, tVale, 10))}` }}>
            <RedBarText text={breakWords(COPY.s5.charge, [2, 2])} f={F} at={swapAt + 6} fontSize={84} align="center" style={{ whiteSpace: "pre-line" }} />
          </div>
        ) : null}

        {/* The race to the bottom vs. your clinic, in a panel beside the narrator */}
        <div
          style={{
            position: "absolute",
            left: 24,
            top: 640,
            width: PW.w,
            height: PW.h,
            borderRadius: 28,
            background: "rgba(7,26,47,0.8)",
            border: `2px solid ${COLORS.stroke}`,
            overflow: "hidden",
            opacity: rise(F, w.from, 8),
            scale: `${0.94 + 0.06 * rise(F, w.from, 10)}`,
          }}
        >
          <svg width={PW.w} height={PW.h} viewBox="0 0 912 380" preserveAspectRatio="none" style={{ position: "absolute", inset: 0 }}>
            {GENERIC.map((d, k) => (
              <path key={k} d={d} fill="none" stroke={COLORS.alert} strokeOpacity={0.9} strokeWidth={6} strokeLinejoin="round" strokeLinecap="round" {...evolvePath(Math.max(0.001, gP), d)} />
            ))}
            <path d={OURS} fill="none" stroke={COLORS.white} strokeWidth={10} strokeLinecap="round" style={{ filter: `drop-shadow(0 0 ${6 + 12 * halo}px ${COLORS.accent})` }} {...evolvePath(Math.max(0.001, oursP), OURS)} />
          </svg>
          {GENERIC.map((d, k) => {
            if (gP < 0.05) return null;
            const p0 = getPointAtLength(d, getLength(d) * gP) ?? { x: 40, y: 150 };
            const p = { x: p0.x, y: p0.y * (PW.h / 380) };
            const badgeAt = badgeAts[k];
            const b0 = getPointAtLength(d, getLength(d) * (0.35 + 0.22 * k)) ?? p0;
            const b = { x: b0.x, y: b0.y * (PW.h / 380) };
            return (
              <React.Fragment key={k}>
                <IconBadge Icon={Building2} size={52} bg={COLORS.surface} fg={COLORS.gray} style={{ position: "absolute", left: p.x - 26, top: p.y - 26 }} />
                {F >= badgeAt ? (
                  <div style={{ position: "absolute", left: b.x - 40, top: b.y - 64, background: COLORS.alert, color: COLORS.white, fontFamily: FONT_STACK, fontWeight: 900, fontSize: 34, padding: "2px 12px", borderRadius: 10, scale: `${pop(F, badgeAt, 10)}` }}>
                    {DISCOUNTS[k]}
                  </div>
                ) : null}
              </React.Fragment>
            );
          })}
          <div
            style={{
              position: "absolute",
              left: head.x - 90,
              top: head.y - 90,
              width: 180,
              height: 180,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${COLORS.accent}aa 0%, ${COLORS.accent}22 45%, rgba(0,0,0,0) 70%)`,
              opacity: halo,
              scale: `${0.8 + 0.25 * halo + 0.05 * Math.sin(F / 5)}`,
            }}
          />
          <IconBadge
            Icon={Hospital}
            size={interpolate(oursP, [0.3, 1], [56, 84], CLAMP)}
            bg={COLORS.white}
            fg={COLORS.brand}
            ring={COLORS.accent}
            ringWidth={5}
            style={{ position: "absolute", left: head.x - interpolate(oursP, [0.3, 1], [28, 42], CLAMP), top: head.y - interpolate(oursP, [0.3, 1], [28, 42], CLAMP) }}
          />
        </div>
      </Stage>
    </>
  );
};

// ---------------------------------------------------------------- S6 megaphone + CTA
const MegaphoneBeat: React.FC = () => {
  const w = OVERLAYS.megaphone;
  const { F, on } = useWin(w);
  if (!on) return null;
  const tX = cue("s6", "diferencial").start;
  const shake = F >= tX ? Math.sin((F - tX) * 1.6) * 5 * Math.max(0, 1 - (F - tX) / 14) : 0;
  return (
    <>
      <Scrim F={F} w={w} />
      <Stage>
        <div style={{ position: "absolute", left: 24, top: 640, width: 560 }}>
          <KineticWords
            text={breakWords(COPY.s6.notEnough, [2, 3, 3])}
            f={F}
            at={cue("s6", "campanas").start}
            stagger={2}
            fontSize={52}
            weight={800}
            lineHeight={1.14}
            align="left"
            style={{ textShadow: SHADOW }}
          />
        </div>
        {[0, 1, 2].map((k) => {
          const cyc = ((F - w.from - k * 10) % 30) / 30;
          if (F < w.from + k * 10) return null;
          return (
            <div
              key={k}
              style={{
                position: "absolute",
                left: 800,
                top: 600,
                width: 150,
                height: 150,
                borderRadius: "50%",
                border: "6px solid transparent",
                borderRightColor: COLORS.gray,
                opacity: (1 - cyc) * 0.8 * fall(F, tX + 4, 10),
                scale: `${0.6 + cyc * 0.9}`,
              }}
            />
          );
        })}
        <div style={{ position: "absolute", left: 640, top: 590, scale: `${pop(F, w.from + 4, 12)}`, rotate: `${shake}deg` }}>
          <IconBadge Icon={Megaphone} size={180} bg={COLORS.surface} fg={COLORS.gray} iconScale={0.46} style={{ boxShadow: "0 10px 30px rgba(2,8,16,0.5)" }} />
          <IconBadge Icon={X} size={72} bg={COLORS.grayDark} iconScale={0.55} style={{ position: "absolute", right: -8, top: -8, scale: `${F >= tX ? pop(F, tX, 9) : 0}` }} />
        </div>
      </Stage>
    </>
  );
};

const Cta: React.FC = () => {
  const w = OVERLAYS.cta;
  const { F, on } = useWin(w);
  if (!on) return null;
  const E = cue("s6", "siTeInteresa").start;
  const actionAt = SCENES.s6.from + S6_BEATS.actionAt;
  const clic = cue("s6", "clic").start;
  return (
    <>
      <Scrim F={F} w={w} />
      <Stage>
        {/* Benefit first */}
        <div style={{ position: "absolute", left: 0, top: 604, width: 960, display: "flex", justifyContent: "center" }}>
          <RedBarText text={breakWords(COPY.s6.benefit, [3, 3])} f={F} at={E + 2} fontSize={66} align="center" style={{ whiteSpace: "pre-line" }} />
        </div>
        {/* ...then the action */}
        <div style={{ position: "absolute", left: 0, top: 806, width: 960 }}>
          <KineticWords text={breakWords(COPY.s6.action, [4, 3])} f={F} at={actionAt} stagger={2} fontSize={50} weight={800} lineHeight={1.14} style={{ textShadow: SHADOW }} />
        </div>
        {F >= clic ? (
          <div style={{ position: "absolute", left: 856, top: 820, scale: `${pop(F, clic, 10)}`, translate: `0px ${Math.abs(Math.sin((F - clic) / 6)) * 10}px` }}>
            <IconBadge Icon={ArrowDown} size={80} iconScale={0.55} style={{ boxShadow: `0 0 30px ${COLORS.accent}aa` }} />
          </div>
        ) : null}
      </Stage>
    </>
  );
};

/** Everything that floats over the narrator. */
export const OverlayLayer: React.FC = () => (
  <>
    <BrandBlock />
    <Trust />
    <Vale />
    <BridgeWord />
    <Outcome />
    <PriceWar />
    <MegaphoneBeat />
    <Cta />
  </>
);
