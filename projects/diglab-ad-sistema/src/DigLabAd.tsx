import React from "react";
import { AbsoluteFill } from "remotion";
import { z } from "zod";
import { AudioLayer } from "./audio/AudioLayer";
import { COLORS } from "./config/brand";
import { type SceneId } from "./config/timeline";
import { SafeZoneOverlay } from "./components/Layout";
import { sceneSequence } from "./components/SceneFrame";
import { Subtitles } from "./components/Subtitles";
import { ARoll, CutawayLayer, WipeLayer } from "./edit/Layers";
import { OverlayLayer } from "./edit/Overlays";
import { S1Hook } from "./scenes/S1Hook";
import { S2OtroEscenario } from "./scenes/S2OtroEscenario";
import { S3NoComparaIgual } from "./scenes/S3NoComparaIgual";
import { S4Sistema } from "./scenes/S4Sistema";
import { S5DejarDeCompetir } from "./scenes/S5DejarDeCompetir";
import { S6Cierre } from "./scenes/S6Cierre";

export const adSchema = z.object({
  withMusic: z.boolean(),
  showSafeZones: z.boolean(),
});
export type AdProps = z.infer<typeof adSchema>;

/** Full-screen graphic components (used as cutaways; also previewable on their own). */
export const SCENE_COMPONENTS: Record<SceneId, React.FC> = {
  s1: S1Hook,
  s2: S2OtroEscenario,
  s3: S3NoComparaIgual,
  s4: S4Sistema,
  s5: S5DejarDeCompetir,
  s6: S6Cierre,
};

/**
 * VOX-style talking-head ad. Visual layers, bottom to top:
 *   narrator a-roll (muted) -> overlays on the face -> full-screen cutaways
 *   -> brand-bar wipes -> subtitles.
 * Audio is a separate layer: the VO is mounted ONCE at the root for the whole
 * duration, so cutaways never interrupt the voice; music + SFX sit under it.
 */
export const DigLabAd: React.FC<AdProps> = ({ withMusic, showSafeZones }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      <ARoll />
      <OverlayLayer />
      <CutawayLayer />
      <WipeLayer />
      <Subtitles />
      <AudioLayer withMusic={withMusic} />
      {showSafeZones ? <SafeZoneOverlay /> : null}
    </AbsoluteFill>
  );
};

/** Scene length incl. transition overlaps, for the Studio scene folder. */
export const sceneDuration = (id: SceneId) => sceneSequence(id).durationInFrames;
