import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { z } from "zod";
import { AudioLayer } from "./audio/AudioLayer";
import { COLORS } from "./config/brand";
import { type SceneId } from "./config/timeline";
import { SafeZoneOverlay } from "./components/Layout";
import { sceneSequence } from "./components/SceneFrame";
import { Subtitles } from "./components/Subtitles";
import { TransitionLayer } from "./components/TransitionLayer";
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

export const SCENE_COMPONENTS: Record<SceneId, React.FC> = {
  s1: S1Hook,
  s2: S2OtroEscenario,
  s3: S3NoComparaIgual,
  s4: S4Sistema,
  s5: S5DejarDeCompetir,
  s6: S6Cierre,
};

/**
 * Main ad. Layers, bottom to top:
 *   scenes (motion graphics) -> red-bar wipes -> subtitles -> debug overlay.
 * Audio: VO (if public/audio/vo.mp3 exists), music (optional), SFX.
 */
export const DigLabAd: React.FC<AdProps> = ({ withMusic, showSafeZones }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      <Sequence name="Escena 1 · Hook" {...sceneSequence("s1")} premountFor={15}>
        <S1Hook />
      </Sequence>
      <Sequence name="Escena 2 · Otro escenario" {...sceneSequence("s2")} premountFor={15}>
        <S2OtroEscenario />
      </Sequence>
      <Sequence name="Escena 3 · No compara igual" {...sceneSequence("s3")} premountFor={15}>
        <S3NoComparaIgual />
      </Sequence>
      <Sequence name="Escena 4 · Sistema" {...sceneSequence("s4")} premountFor={15}>
        <S4Sistema />
      </Sequence>
      <Sequence name="Escena 5 · Dejar de competir" {...sceneSequence("s5")} premountFor={15}>
        <S5DejarDeCompetir />
      </Sequence>
      <Sequence name="Escena 6 · Cierre / CTA" {...sceneSequence("s6")} premountFor={15}>
        <S6Cierre />
      </Sequence>
      <TransitionLayer />
      <Subtitles />
      <AudioLayer withMusic={withMusic} />
      {showSafeZones ? <SafeZoneOverlay /> : null}
    </AbsoluteFill>
  );
};

/** Scene length incl. transition overlaps, for the Studio scene folder. */
export const sceneDuration = (id: SceneId) => sceneSequence(id).durationInFrames;
