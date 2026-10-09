import React from "react";
import { interpolate } from "remotion";
import { Ghost, UserRound } from "lucide-react";
import { COLORS } from "../config/brand";
import { COPY } from "../config/copy";
import { CLAMP, EASE_IN, EASE_OUT, fall, hash01, pop, rise, settle } from "../components/anim";
import { FONT_STACK } from "../components/fonts";
import { Avatar, ChatBubble, PriceTag, TypingDots } from "../components/Pieces";
import { SceneFrame, useScene } from "../components/SceneFrame";
import { CUTAWAYS } from "../config/edit";
import { cuesOf, SCENES } from "../config/timeline";
import { breakWords, KineticWords, RedBarText } from "../components/Text";

// Scenario A palette: cold grays, red only on the price tag.
const COLD_BUBBLE = "#14263A";
const COLD_TEXT = COLORS.accentPale;
const COLD_DIM = "#6F879E";

/** Key beats (scene-local frames) — shared with the SFX cue sheet. */
export const S1_BEATS = (() => {
  const { c, ce, dur } = cuesOf("s1");
  // Talking-head edit: this scene is seen only as a ~2s cutaway, so the chat
  // beat is packed into that window (bubble -> price -> gone).
  const cut = CUTAWAYS.find((x) => x.id === "chat")!;
  const chatIn = cut.from - SCENES.s1.from - 2;
  const typingFrames = 3;
  const charsPerFrame = 3;
  const typeStart = chatIn + 2 + typingFrames;
  const typedDone = typeStart + Math.ceil(COPY.s1.leadMessage.length / charsPerFrame);
  const tagAt = Math.max(ce("pregunta"), typedDone + 2);
  return {
    blockOut: chatIn - 6,
    chatIn,
    askLabelAt: chatIn,
    typingFrames,
    charsPerFrame,
    typeStart,
    typedDone,
    tagAt,
    gone: Math.max(c("desaparece"), tagAt + 10),
    silentTypingAt: c("sinDecir") + 2,
    dissolveAt: dur - 22,
  };
})();

export const S1Hook: React.FC = () => {
  const { f } = useScene("s1");
  const { blockOut, chatIn, askLabelAt, typingFrames, charsPerFrame, tagAt, gone, silentTypingAt, dissolveAt } = S1_BEATS;

  // --- Beat A: brand block (topic clear from frame 0) -----------------------
  const blockExit = rise(f, blockOut, 10, EASE_IN);

  // --- Beat B: the lead asks the price and vanishes ---------------------------
  const leadFade = fall(f, gone + 4, 16, EASE_OUT);
  const outline = rise(f, gone + 8, 10);
  const silentTyping = f >= silentTypingAt && f < silentTypingAt + 16;

  const avatarPop = pop(f, chatIn, 13);
  const bubblePop = pop(f, chatIn + 2, 13);
  const tagPop = pop(f, tagAt, 9);
  const ghostIn = rise(f, gone + 10, 12);

  return (
    <SceneFrame id="s1" bg="cold">
      {/* Brand block: headline over red bar + the question the video answers */}
      <div
        style={{
          position: "absolute",
          left: 10,
          top: 175,
          width: 940,
          opacity: 1 - blockExit,
          translate: `0px ${-blockExit * 60}px`,
          filter: `blur(${blockExit * 8}px)`,
          // Readable at frame 0 (topic clear from second zero + clean thumbnail),
          // with a short punch-in so the open still moves.
          scale: `${1.06 - 0.06 * settle(f, 0, 14)}`,
          transformOrigin: "0% 30%",
        }}
      >
        <RedBarText
          text={breakWords(COPY.s1.headline, [2, 1, 2])}
          f={f}
          at={-14}
          fontSize={104}
          lineHeight={1.2}
          style={{ whiteSpace: "pre-line" }}
        />
        <KineticWords
          text={COPY.s1.question}
          f={f}
          at={3}
          stagger={2}
          dur={9}
          fontSize={52}
          weight={700}
          lineHeight={1.16}
          letterSpacing="0em"
          align="left"
          style={{ marginTop: 44, maxWidth: 880 }}
        />
      </div>

      {f >= chatIn - 2 ? (
        <>
          {/* Kinetic label: PREGUNTA EL PRECIO -> DESAPARECE */}
          <div style={{ position: "absolute", left: 0, top: 30, width: 960 }}>
            <KineticWords
              text={breakWords(COPY.s1.asksPrice, [1, 2])}
              f={f}
              at={askLabelAt}
              fontSize={88}
              color={COLORS.white}
              exitAt={gone - 6}
              style={{ maxWidth: 760, margin: "0 auto" }}
            />
          </div>
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 62,
              width: 960,
              display: "flex",
              justifyContent: "center",
              fontFamily: FONT_STACK,
              fontWeight: 900,
              fontSize: 112,
              letterSpacing: "0.01em",
              color: COLORS.white,
            }}
          >
            {COPY.s1.disappears.split("").map((ch, i) => {
              const inP = rise(f, gone + i * 1.2, 9);
              const outP = rise(f, dissolveAt + hash01(i + 3) * 10, 10, EASE_IN);
              return (
                <span
                  key={i}
                  style={{
                    display: "inline-block",
                    opacity: inP * (1 - outP),
                    translate: `0px ${(1 - inP) * 40 - outP * 50}px`,
                    filter: `blur(${outP * 10}px)`,
                  }}
                >
                  {ch}
                </span>
              );
            })}
          </div>

          {/* Dashed outline left where the lead used to be */}
          <div
            style={{
              position: "absolute",
              left: 40,
              top: 392,
              width: 780,
              height: 156,
              borderRadius: 40,
              border: `4px dashed ${COLD_DIM}`,
              opacity: outline,
            }}
          />
          {/* Ghost */}
          <div
            style={{
              position: "absolute",
              left: 62,
              top: 410,
              opacity: ghostIn,
              translate: `0px ${Math.sin(f / 9) * 6 - ghostIn * 6}px`,
            }}
          >
            <Ghost size={112} color={COLD_DIM} strokeWidth={2.2} />
          </div>
          {/* "...sin decir nada más": typing starts, then stops */}
          {silentTyping ? (
            <div style={{ position: "absolute", left: 222, top: 442, opacity: 0.8 }}>
              <TypingDots t={f - silentTypingAt} color={COLD_DIM} size={16} />
            </div>
          ) : null}

          {/* Lead: avatar + bubble (fades to nothing on "desaparece") */}
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              opacity: leadFade,
              filter: `grayscale(${1 - leadFade}) blur(${(1 - leadFade) * 6}px)`,
              translate: `0px ${(1 - leadFade) * -18}px`,
            }}
          >
            <Avatar
              size={124}
              Icon={UserRound}
              bg={COLD_BUBBLE}
              fg={COLD_TEXT}
              style={{
                position: "absolute",
                left: 54,
                top: 408,
                scale: `${avatarPop}`,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: 200,
                top: 414,
                scale: `${bubblePop}`,
                transformOrigin: "0% 100%",
              }}
            >
              <ChatBubble
                text={COPY.s1.leadMessage}
                t={f - (chatIn + 2)}
                typingFrames={typingFrames}
                charsPerFrame={charsPerFrame}
                bg={COLD_BUBBLE}
                color={COLD_TEXT}
                fontSize={58}
              />
            </div>
          </div>

          {/* The price: the only red in the cold frame */}
          <div
            style={{
              position: "absolute",
              left: 520,
              top: 640,
              scale: `${tagPop}`,
              rotate: `${interpolate(tagPop, [0, 1], [-30, -9], CLAMP) + Math.sin(f / 14) * 1.5}deg`,
              opacity: f >= tagAt ? 1 : 0,
            }}
          >
            <PriceTag width={340} holeColor={COLORS.coldBg} />
          </div>
        </>
      ) : null}
    </SceneFrame>
  );
};
