import React from "react";
import { interpolate } from "remotion";
import { evolvePath, getLength, getPointAtLength } from "@remotion/paths";
import { Building2, Hospital } from "lucide-react";
import { COLORS } from "../config/brand";
import { COPY } from "../config/copy";
import { CLAMP, EASE_IN_OUT, fall, pop, rise } from "../components/anim";
import { FONT_STACK } from "../components/fonts";
import { IconBadge } from "../components/Pieces";
import { SceneFrame, useScene } from "../components/SceneFrame";
import { cuesOf } from "../config/timeline";
import { breakWords, KineticWords, RedBarText } from "../components/Text";

const poly = (pts: [number, number][]) => `M ${pts.map(([x, y]) => `${x} ${y}`).join(" L ")}`;

// Race to the bottom: generic clinics cutting prices.
const GENERIC = [
  poly([[70, 560], [180, 575], [270, 560], [370, 640], [470, 625], [580, 700], [690, 690], [800, 760]]),
  poly([[70, 560], [190, 600], [300, 590], [400, 680], [510, 665], [610, 760], [720, 748], [830, 820]]),
  poly([[70, 560], [170, 622], [290, 612], [380, 720], [500, 706], [600, 806], [730, 796], [850, 862]]),
  poly([[70, 560], [160, 640], [270, 632], [360, 760], [470, 748], [570, 846], [700, 836], [860, 892]]),
];
/** Where along each falling line its discount sits (fraction of length). */
const BADGE_AT = [0.42, 0.58, 0.74, 0.9];
const DISCOUNTS = ["-10%", "-20%", "-30%", "-40%"];
// Your clinic: follows the pack, then breaks away upward.
const OURS = "M 70 560 L 190 590 L 300 600 C 380 606 430 520 520 462 S 760 344 880 318";
const OURS_BREAK = 0.27;

const mixGrayRed = (t: number) => {
  const a = [138, 138, 142];
  const b = [225, 29, 42];
  const m = a.map((v, i) => Math.round(v + (b[i] - v) * t));
  return `rgb(${m[0]},${m[1]},${m[2]})`;
};

/** Key beats (scene-local frames) — shared with the SFX cue sheet. */
export const S5_BEATS = (() => {
  const { c, ce } = cuesOf("s5");
  // The race to the bottom starts as soon as the scene lands (no empty frame).
  const drawFrom = Math.min(8, c("competir") - 6);
  const drawTo = c("empezar") + 20;
  return {
    drawFrom,
    drawTo,
    badgeAt: BADGE_AT.map((b) => Math.round(drawFrom + b * (drawTo - drawFrom))),
    strikeAt: ce("precio") - 4,
    swapAt: c("empezar") + 6,
    riseAt: c("empezar"),
    haloAt: c("vale"),
  };
})();

export const S5DejarDeCompetir: React.FC = () => {
  const { f, c } = useScene("s5");
  const { drawFrom, drawTo, badgeAt: badgeAts, strikeAt, swapAt } = S5_BEATS;
  // Linear: the race to the bottom is visibly moving from the first frames.
  const gP = interpolate(f, [drawFrom, drawTo], [0, 1], CLAMP);
  const oursP =
    f < c("empezar")
      ? interpolate(f, [drawFrom, c("empezar")], [0, OURS_BREAK], CLAMP)
      : interpolate(f, [c("empezar"), c("empezar") + 40], [OURS_BREAK, 1], { ...CLAMP, easing: EASE_IN_OUT });
  const oursLen = getLength(OURS);
  const head = getPointAtLength(OURS, Math.max(1, oursLen * oursP)) ?? { x: 70, y: 560 };
  const halo = rise(f, c("vale"), 14);

  const strike = rise(f, strikeAt, 8);

  return (
    <SceneFrame id="s5" bg="dark">
      {/* COMPETIR POR ~~PRECIO~~ */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 10,
          width: 960,
          opacity: fall(f, swapAt, 8),
          translate: `0px ${-rise(f, swapAt, 8) * 60}px`,
        }}
      >
        <KineticWords text={COPY.s5.compete} f={f} at={c("competir") + 4} fontSize={92} />
        <div style={{ display: "flex", justifyContent: "center", marginTop: 6 }}>
          <div style={{ position: "relative" }}>
            <KineticWords
              text={COPY.s5.competeStruck}
              f={f}
              at={c("precio") + 2}
              fontSize={92}
              color={strike > 0.5 ? COLORS.gray : COLORS.white}
            />
            <div
              style={{
                position: "absolute",
                left: -16,
                right: -16,
                top: "46%",
                height: 16,
                borderRadius: 8,
                background: COLORS.red,
                transformOrigin: "0% 50%",
                scale: `${strike} 1`,
                rotate: "-4deg",
              }}
            />
          </div>
        </div>
      </div>

      {/* COBRAR LO QUE VALÉS */}
      {f >= swapAt + 4 ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 24,
            width: 960,
            display: "flex",
            justifyContent: "center",
            scale: `${1 + 0.05 * Math.sin(Math.PI * rise(f, c("vale"), 10))}`,
          }}
        >
          <RedBarText
            text={breakWords(COPY.s5.charge, [2, 2])}
            f={f}
            at={swapAt + 6}
            fontSize={94}
            align="center"
            style={{ whiteSpace: "pre-line" }}
          />
        </div>
      ) : null}

      {/* Chart */}
      <svg width={960} height={960} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <path
          d="M 50 300 L 50 900 L 930 900"
          fill="none"
          stroke="#34343B"
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
          {...evolvePath(rise(f, 0, 14), "M 50 300 L 50 900 L 930 900")}
        />
        {GENERIC.map((d, k) => (
          <path
            key={k}
            d={d}
            fill="none"
            stroke={mixGrayRed(Math.min(1, gP * 1.4))}
            strokeOpacity={0.85}
            strokeWidth={6}
            strokeLinejoin="round"
            strokeLinecap="round"
            {...evolvePath(Math.max(0.001, gP), d)}
          />
        ))}
        <path
          d={OURS}
          fill="none"
          stroke={COLORS.white}
          strokeWidth={11}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ filter: `drop-shadow(0 0 ${8 + 14 * halo}px rgba(255,255,255,0.55))` }}
          {...evolvePath(Math.max(0.001, oursP), OURS)}
        />
      </svg>

      {/* Generic clinic heads + discounts spiraling down */}
      {GENERIC.map((d, k) => {
        if (gP <= 0.02) return null;
        const pt = getPointAtLength(d, getLength(d) * gP) ?? { x: 70, y: 560 };
        const bpt = getPointAtLength(d, getLength(d) * BADGE_AT[k]) ?? pt;
        const badgeAt = badgeAts[k];
        return (
          <React.Fragment key={k}>
            <IconBadge
              Icon={Building2}
              size={56}
              bg="#2A2A31"
              fg={COLORS.gray}
              style={{ position: "absolute", left: pt.x - 28, top: pt.y - 28 }}
            />
            {f >= badgeAt ? (
              <div
                style={{
                  position: "absolute",
                  left: bpt.x - 40,
                  top: bpt.y - 70,
                  background: COLORS.red,
                  color: COLORS.white,
                  fontFamily: FONT_STACK,
                  fontWeight: 900,
                  fontSize: 32,
                  padding: "4px 12px",
                  borderRadius: 10,
                  scale: `${pop(f, badgeAt, 10)}`,
                  opacity: 1 - 0.5 * halo,
                }}
              >
                {DISCOUNTS[k]}
              </div>
            ) : null}
          </React.Fragment>
        );
      })}

      {/* Your clinic: stable, premium, with a value halo */}
      {oursP > 0.01 ? (
        <>
          <div
            style={{
              position: "absolute",
              left: head.x - 130,
              top: head.y - 130,
              width: 260,
              height: 260,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${COLORS.red}88 0%, ${COLORS.red}22 45%, rgba(0,0,0,0) 70%)`,
              opacity: halo,
              scale: `${0.8 + 0.25 * halo + 0.05 * Math.sin(f / 5)}`,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: head.x - 64,
              top: head.y - 64,
              width: 128,
              height: 128,
              borderRadius: "50%",
              border: `4px solid ${COLORS.white}`,
              opacity: halo * (1 - ((f / 24) % 1)),
              scale: `${1 + ((f / 24) % 1) * 0.6}`,
            }}
          />
          <IconBadge
            Icon={Hospital}
            size={interpolate(oursP, [OURS_BREAK, 1], [64, 104], CLAMP)}
            bg={COLORS.white}
            fg={COLORS.red}
            ring={COLORS.red}
            ringWidth={5}
            style={{
              position: "absolute",
              left: head.x - interpolate(oursP, [OURS_BREAK, 1], [32, 52], CLAMP),
              top: head.y - interpolate(oursP, [OURS_BREAK, 1], [32, 52], CLAMP),
            }}
          />
        </>
      ) : null}
    </SceneFrame>
  );
};
