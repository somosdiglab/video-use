/**
 * Centralized timing. Everything time-based in the video derives from
 * vo-timing.json (word-level VO timestamps):
 *   - scene windows   (a scene starts LEAD_IN_S before its first word)
 *   - animation cues  (anchored to exact phrases of the VO, see CUE_PHRASES)
 *   - subtitles, SFX hits and music ducking
 *
 * vo-timing.json is ESTIMATED until scripts/lock_timing.py runs on the real
 * vo.mp3; then every cue snaps to the real waveform in one pass. Fine-tune a
 * single beat with CUE_NUDGE_FRAMES without touching scene code.
 */
import scriptData from "./script.json";
import timingData from "./vo-timing.json";

export const FPS = 30;

export const SCENE_IDS = ["s1", "s2", "s3", "s4", "s5", "s6"] as const;
export type SceneId = (typeof SCENE_IDS)[number];

export type VoWord = {
  scene: SceneId;
  i: number;
  text: string;
  startMs: number;
  endMs: number;
};

/** Scene starts this long before its first spoken word (room for the entrance). */
const LEAD_IN_S = 0.3;
/** End card hold after the last spoken word. */
const END_HOLD_S = 2.3;

export const TIMING_SOURCE = timingData.source as "estimate" | "scribe";

const tokenize = (vo: string) => vo.trim().split(/\s+/);

export const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

export const VO_WORDS: VoWord[] = timingData.words as VoWord[];

// Guard: the timing file must describe exactly the current script.
for (const scene of scriptData.scenes) {
  const tokens = tokenize(scene.vo);
  const words = VO_WORDS.filter((w) => w.scene === scene.id);
  const mismatch =
    tokens.length !== words.length ||
    tokens.some((t, idx) => words[idx].text !== t);
  if (mismatch) {
    throw new Error(
      `vo-timing.json does not match script.json for scene ${scene.id}. ` +
        "Re-run scripts/estimate_timing.py (or scripts/lock_timing.py).",
    );
  }
}

export const msToFrame = (ms: number) => Math.round((ms / 1000) * FPS);

const wordsOf = (id: SceneId) => VO_WORDS.filter((w) => w.scene === id);

export type SceneWindow = {
  id: SceneId;
  name: string;
  from: number;
  durationInFrames: number;
  end: number;
};

const sceneStarts = SCENE_IDS.map((id, idx) =>
  idx === 0 ? 0 : msToFrame(wordsOf(id)[0].startMs - LEAD_IN_S * 1000),
);
const lastWord = VO_WORDS[VO_WORDS.length - 1];
export const TOTAL_FRAMES = msToFrame(lastWord.endMs + END_HOLD_S * 1000);

export const SCENES = Object.fromEntries(
  SCENE_IDS.map((id, idx) => {
    const from = sceneStarts[idx];
    const end = idx < SCENE_IDS.length - 1 ? sceneStarts[idx + 1] : TOTAL_FRAMES;
    const name = scriptData.scenes.find((s) => s.id === id)?.name ?? id;
    return [id, { id, name, from, end, durationInFrames: end - from }];
  }),
) as Record<SceneId, SceneWindow>;

/** Frame where the VO stops (last word end) — the end card hold starts here. */
export const VO_END_FRAME = msToFrame(lastWord.endMs);

/**
 * Animation cues, anchored to phrases of the VO (matched accent- and
 * punctuation-insensitively inside the scene's line).
 */
export const CUE_PHRASES = {
  s1: {
    hoy: "hoy cuando",
    pregunta: "pregunta un precio",
    clinica: "en tu clinica",
    desaparece: "desaparece",
    sinDecir: "sin decir nada mas",
  },
  s2: {
    ahora: "ahora imaginate",
    otroEscenario: "otro escenario",
    antesPrecio: "antes de preguntar el precio",
    aseguraste: "te aseguraste",
    equipo: "tu equipo",
    trayectoria: "tu trayectoria",
    queHace: "y que hace",
    diferente: "diferente al resto",
  },
  s3: {
    comparar: "no va a comparar",
    mismaForma: "de la misma forma",
    compara: "compara sabiendo",
    tuClinica: "por que tu clinica",
    vale: "vale lo que cobra",
  },
  s4: {
    puente: "el puente",
    otro: "y el otro",
    sistema: "es un sistema",
    capta: "capta",
    precalifica: "precalifica",
    ordena: "ordena",
    automatiza: "automatiza",
    convierte: "convirtiendo",
    pacientes: "pacientes reales",
    recurrentes: "recurrentes",
  },
  s5: {
    unica: "es la unica forma",
    competir: "dejar de competir",
    precio: "por precio",
    empezar: "empezar a cobrar",
    vale: "realmente vale",
  },
  s6: {
    hoy: "hoy el solo hecho",
    campanas: "lanzar campanas",
    diferencial: "diferencial",
    chip: "cambiar el chip",
    sistemaCompleto: "sistema completo",
    etapas: "distintas etapas",
    recorrido: "recorrido del paciente",
    siTeInteresa: "si te interesa",
    comoLoHacemos: "como lo hacemos",
    clic: "hace clic",
    anuncio: "anuncio",
  },
} as const satisfies Record<SceneId, Record<string, string>>;

/** Per-cue fine-tuning in frames, e.g. { "s4.capta": -2 }. */
export const CUE_NUDGE_FRAMES: Partial<Record<string, number>> = {};

type CueName<S extends SceneId> = keyof (typeof CUE_PHRASES)[S] & string;

export type Cue = { start: number; end: number };

const findPhrase = (id: SceneId, phrase: string): { first: VoWord; last: VoWord } => {
  const words = wordsOf(id);
  const target = normalize(phrase);
  // Each script token may normalize to more than one piece ("¿Y" -> ["y"]).
  const flat: { tok: string; w: VoWord }[] = [];
  for (const w of words) for (const tok of normalize(w.text)) flat.push({ tok, w });
  for (let a = 0; a + target.length <= flat.length; a++) {
    if (target.every((t, k) => flat[a + k].tok === t)) {
      return { first: flat[a].w, last: flat[a + target.length - 1].w };
    }
  }
  throw new Error(`Cue phrase "${phrase}" not found in scene ${id}`);
};

const resolved = Object.fromEntries(
  SCENE_IDS.map((id) => [
    id,
    Object.fromEntries(
      Object.entries(CUE_PHRASES[id]).map(([name, phrase]) => {
        const { first, last } = findPhrase(id, phrase);
        const nudge = CUE_NUDGE_FRAMES[`${id}.${name}`] ?? 0;
        return [
          name,
          { start: msToFrame(first.startMs) + nudge, end: msToFrame(last.endMs) + nudge },
        ];
      }),
    ),
  ]),
) as Record<SceneId, Record<string, Cue>>;

/** Global (composition) frames of a cue. */
export const cue = <S extends SceneId>(scene: S, name: CueName<S>): Cue =>
  resolved[scene][name];

/** Cue frames relative to the scene's own start (what scenes use). */
export const sceneCue = <S extends SceneId>(scene: S, name: CueName<S>): Cue => {
  const c = resolved[scene][name];
  const from = SCENES[scene].from;
  return { start: c.start - from, end: c.end - from };
};

/** Transitions at scene boundaries ("after" = outgoing scene). */
export type TransitionType = "redWipeH" | "redWipeV" | "push" | "slide" | "matchCut";
export const TRANSITIONS: { after: SceneId; type: TransitionType; frames: number }[] = [
  { after: "s1", type: "redWipeH", frames: 14 },
  { after: "s2", type: "push", frames: 14 },
  { after: "s3", type: "matchCut", frames: 0 },
  { after: "s4", type: "redWipeV", frames: 14 },
  { after: "s5", type: "slide", frames: 16 },
];

/** Overlap needed around each boundary so both scenes render during push/slide. */
export const overlapFor = (type: TransitionType, frames: number) =>
  type === "push" || type === "slide" ? Math.ceil(frames / 2) : 0;

/** Cue helpers for module-level beat tables (same values scenes see at runtime). */
export const cuesOf = <S extends SceneId>(id: S) => ({
  c: (name: CueName<S>) => sceneCue(id, name).start,
  ce: (name: CueName<S>) => sceneCue(id, name).end,
  dur: SCENES[id].durationInFrames,
  from: SCENES[id].from,
});
