import React from "react";
import { AbsoluteFill, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Trail } from "@remotion/motion-blur";
import { COLORS } from "../config/brand";
import { AROLL, CUTAWAYS, type CutawayId, FACE_ORIGIN, inCutaway, WIPES, zoomAt } from "../config/edit";
import { type SceneId } from "../config/timeline";
import { Bars } from "../components/TransitionLayer";
import { sceneSequence } from "../components/SceneFrame";
import { S1Hook } from "../scenes/S1Hook";
import { S3NoComparaIgual } from "../scenes/S3NoComparaIgual";
import { S4Sistema } from "../scenes/S4Sistema";
import { S6Cierre } from "../scenes/S6Cierre";

/**
 * The narrator — picture only. The file has no audio track and is muted anyway:
 * the only audible voice is the VO mounted once at the composition root.
 */
export const ARoll: React.FC = () => {
  const frame = useCurrentFrame();
  if (!AROLL.file) return null;
  return (
    <Sequence durationInFrames={AROLL.end} name="Narrador (a-roll, mudo)" layout="absolute-fill">
      {/* Not drawn under a full-screen cutaway (saves frame extraction). */}
      {inCutaway(frame) ? null : (
        <AbsoluteFill style={{ backgroundColor: COLORS.bg, overflow: "hidden" }}>
          <AbsoluteFill
            style={{
              transformOrigin: `${FACE_ORIGIN.x * 100}% ${FACE_ORIGIN.y * 100}%`,
              scale: `${zoomAt(frame)}`,
            }}
          >
            <OffthreadVideo
              src={staticFile(AROLL.file)}
              muted
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </AbsoluteFill>
        </AbsoluteFill>
      )}
    </Sequence>
  );
};

const SCENE_OF: Record<SceneId, React.FC | null> = {
  s1: S1Hook,
  s2: null,
  s3: S3NoComparaIgual,
  s4: S4Sistema,
  s5: null,
  s6: S6Cierre,
};

/** Shows its scene only inside the cutaway window (global frames). */
const Gate: React.FC<{ seqFrom: number; from: number; to: number; children: React.ReactNode }> = ({
  seqFrom,
  from,
  to,
  children,
}) => {
  const f = useCurrentFrame() + seqFrom;
  return f >= from && f < to ? <>{children}</> : null;
};

/**
 * Full-screen cutaways. Each scene is mounted on its own VO-anchored window so
 * its animation stays locked to the words, and is only revealed during the
 * cutaway — the voice never stops underneath.
 */
export const CutawayLayer: React.FC = () => (
  <>
    {CUTAWAYS.map((cw) => {
      const Comp = SCENE_OF[cw.scene];
      if (!Comp) return null;
      const seq = sceneSequence(cw.scene);
      return (
        <Sequence key={cw.id} name={`Cutaway · ${cw.id}`} {...seq} premountFor={20}>
          <Gate seqFrom={seq.from} from={cw.from} to={cw.to}>
            <Comp />
          </Gate>
        </Sequence>
      );
    })}
  </>
);

export const cutawayById = (id: CutawayId) => CUTAWAYS.find((c) => c.id === id)!;

/** Brand-bar wipes: the cut happens while the screen is fully covered. */
export const WipeLayer: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {WIPES.map((w) => {
        const half = w.frames / 2;
        if (frame < w.at - half - 2 || frame > w.at + half + 2) return null;
        return (
          <Trail key={w.at} layers={5} lagInFrames={0.22} trailOpacity={0.55}>
            <Bars boundary={w.at} frames={w.frames} vertical={w.vertical} />
          </Trail>
        );
      })}
    </AbsoluteFill>
  );
};
