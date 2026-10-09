import React from "react";
import { Composition, Folder } from "remotion";
import "./components/fonts";
import { adSchema, DigLabAd, SCENE_COMPONENTS, sceneDuration } from "./DigLabAd";
import { FPS, SCENE_IDS, TOTAL_FRAMES } from "./config/timeline";

/**
 * Compositions:
 *   DigLab-9x16           main delivery (VO + music + SFX), 1080x1920
 *   DigLab-9x16-SinMusica same edit, VO + SFX only (for remixing)
 *   DigLab-4x5            Feed variant, 1080x1350 (same scenes, re-flowed safe zones)
 *   Escenas/*             each scene on its own timeline (connected compositions)
 */
export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="DigLab-9x16"
        component={DigLabAd}
        schema={adSchema}
        defaultProps={{ withMusic: true, showSafeZones: false }}
        durationInFrames={TOTAL_FRAMES}
        fps={FPS}
        width={1080}
        height={1920}
      />
      <Composition
        id="DigLab-9x16-SinMusica"
        component={DigLabAd}
        schema={adSchema}
        defaultProps={{ withMusic: false, showSafeZones: false }}
        durationInFrames={TOTAL_FRAMES}
        fps={FPS}
        width={1080}
        height={1920}
      />
      <Composition
        id="DigLab-4x5"
        component={DigLabAd}
        schema={adSchema}
        defaultProps={{ withMusic: true, showSafeZones: false }}
        durationInFrames={TOTAL_FRAMES}
        fps={FPS}
        width={1080}
        height={1350}
      />
      <Folder name="Escenas">
        {SCENE_IDS.map((id) => (
          <Composition
            key={id}
            id={`Escena-${id.toUpperCase()}`}
            component={SCENE_COMPONENTS[id]}
            durationInFrames={sceneDuration(id)}
            fps={FPS}
            width={1080}
            height={1920}
          />
        ))}
      </Folder>
    </>
  );
};
