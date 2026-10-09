import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import {
  CUE_PHRASES,
  overlapFor,
  SCENE_IDS,
  SCENES,
  sceneCue,
  type SceneId,
  TRANSITIONS,
} from "../config/timeline";
import { CLAMP, EASE_IN_OUT, speedBlur } from "./anim";
import { Background, type BgKind } from "./Background";
import { Stage } from "./Layout";

const incoming = (id: SceneId) => {
  const idx = SCENE_IDS.indexOf(id);
  return idx > 0 ? TRANSITIONS.find((t) => t.after === SCENE_IDS[idx - 1]) : undefined;
};
const outgoing = (id: SceneId) => TRANSITIONS.find((t) => t.after === id);

/** Frames a scene renders before its logical start (incoming push/slide). */
export const preRoll = (id: SceneId) => {
  const t = incoming(id);
  return t ? overlapFor(t.type, t.frames) : 0;
};
/** Frames a scene renders after its logical end (outgoing push/slide). */
export const postRoll = (id: SceneId) => {
  const t = outgoing(id);
  return t ? overlapFor(t.type, t.frames) : 0;
};

/** <Sequence> placement for a scene in the main timeline. */
export const sceneSequence = (id: SceneId) => ({
  from: SCENES[id].from - preRoll(id),
  durationInFrames: SCENES[id].durationInFrames + preRoll(id) + postRoll(id),
});

/**
 * Scene clock. `f` is the scene's logical frame (0 = scene start, even when
 * the sequence started earlier for an incoming push/slide). `c(name)` gives a
 * cue's start frame, `ce(name)` its end, both relative to the scene.
 */
export const useScene = <S extends SceneId>(id: S) => {
  const frame = useCurrentFrame();
  const f = frame - preRoll(id);
  type Name = keyof (typeof CUE_PHRASES)[S] & string;
  return {
    f,
    dur: SCENES[id].durationInFrames,
    c: (name: Name) => sceneCue(id, name).start,
    ce: (name: Name) => sceneCue(id, name).end,
  };
};

/** Background + stage + push/slide transforms for one scene. */
export const SceneFrame: React.FC<{
  id: SceneId;
  bg: BgKind;
  children: React.ReactNode;
  /** Full-bleed layers drawn above the background, outside the stage. */
  fullBleed?: React.ReactNode;
}> = ({ id, bg, children, fullBleed }) => {
  const { f, dur } = useScene(id);
  const { width, height } = useVideoConfig();

  let tx = 0;
  let ty = 0;
  let blurP = 0;
  const inT = incoming(id);
  if (inT && (inT.type === "push" || inT.type === "slide")) {
    const h = overlapFor(inT.type, inT.frames);
    const p = interpolate(f, [-h, h], [0, 1], { ...CLAMP, easing: EASE_IN_OUT });
    if (p < 1) {
      if (inT.type === "push") ty = (1 - p) * height;
      else tx = (1 - p) * width;
      blurP = p;
    }
  }
  const outT = outgoing(id);
  if (outT && (outT.type === "push" || outT.type === "slide")) {
    const h = overlapFor(outT.type, outT.frames);
    const p = interpolate(f, [dur - h, dur + h], [0, 1], { ...CLAMP, easing: EASE_IN_OUT });
    if (p > 0) {
      if (outT.type === "push") ty = -p * height;
      else tx = -p * width;
      blurP = p;
    }
  }
  const moving = tx !== 0 || ty !== 0;

  return (
    <AbsoluteFill
      style={{
        translate: `${tx}px ${ty}px`,
        filter: moving ? speedBlur(blurP, 10) : undefined,
      }}
    >
      <Background kind={bg} />
      {fullBleed}
      <Stage>{children}</Stage>
    </AbsoluteFill>
  );
};
