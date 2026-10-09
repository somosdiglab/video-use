# DigLab — Anuncio "Sistema" (Meta Ads, 9:16)

Anuncio vertical estilo explainer VOX + motion graphics para dueños de clínicas
(odontología, quiropraxia, kinesiología, ópticas/estética). Vende el sistema
completo (Método CRECE / Crece CRM), no "correr anuncios".

Remotion 4 · TypeScript + React · 1080×1920 · 30 fps · ~62 s.

## Estado

| Pieza | Estado |
|---|---|
| 6 escenas, transiciones, subtítulos, CTA | ✅ hechas |
| Tiempos | ⚠️ **estimados** desde el guion — se bloquean al VO real con un comando (ver abajo) |
| Voz en off (`vo.mp3`) | ❌ falta |
| Colores de marca | ⚠️ **provisorios** (paleta de respaldo del brief) — no se pudo leer la carpeta `Identidad` |
| Logo DigLab | ❌ falta — se muestra un recuadro "LOGO DIGLAB" (no se recreó el logo) |
| Tipografía de marca | ❌ falta — se usa Montserrat como respaldo |
| Música | ⚠️ cama **provisoria** sintetizada (sin licencia que gestionar); reemplazable |
| SFX | ✅ sintetizados (sin licencia que gestionar) |

## Abrir y previsualizar

```bash
npm install
npm run dev          # Remotion Studio -> http://localhost:3000
```

Composiciones:

- `DigLab-9x16` — entrega principal (VO + música + SFX)
- `DigLab-9x16-SinMusica` — misma edición, solo VO + SFX (para remezclar)
- `DigLab-4x5` — variante Feed 1080×1350 (mismas escenas, zonas seguras reacomodadas)
- `Escenas/Escena-S1 … S6` — cada escena en su propia línea de tiempo

Para ver las zonas seguras de Reels en Studio, activá la prop `showSafeZones`.

## 1) Cargar la marca (sin tocar código)

Soltá los archivos en `public/` con estos nombres — se detectan solos:

| Archivo | Para qué |
|---|---|
| `public/brand/logo.svg` (o `.png`) | Logo para fondos oscuros (versión blanca/negativa) |
| `public/brand/logo-dark.svg` (o `.png`) | Logo para fondos claros (opcional) |
| `public/fonts/brand/*.ttf / .otf / .woff2` | Tipografía de marca. El peso sale del nombre del archivo (`…-Bold` = 700, `…-Black` = 900, etc.) |

Los **colores** se cambian a mano en un solo archivo: `src/config/brand.ts`
(`COLORS.red`, `COLORS.bg`, etc.). Copiá los hex del Manual de Identidad.

## 2) Bloquear los tiempos al VO real

```bash
npm run timing:lock -- ruta/al/vo_crudo.mp3
```

Hace todo en una pasada:

1. Transcribe el VO con ElevenLabs Scribe (palabra por palabra; usa el helper de video-use y la API key de `video-use/.env`). Queda en caché: re-correrlo no vuelve a cobrar.
2. Detecta las **dos tomas del hook** ("Toma 1" / "Toma 2") y se queda con **una** (la que mejor coincide con el guion y tiene menos muletillas). Para forzar: `--hook-take 1` o `--hook-take 2`.
3. Arma `public/audio/vo.mp3` editado: cortes en límites de palabra, con padding y fades de 30 ms (sin "pops").
4. Reescribe `src/config/vo-timing.json` → escenas, animaciones, subtítulos, SFX y ducking de música siguen la forma de onda real.
5. Regenera la música para que sus secciones caigan en los nuevos cortes (`--no-music` si ya pusiste una música licenciada).

Revisá `vo-work/lock_report.md`: lista la toma elegida y las palabras del guion que el ASR no escuchó (conviene escucharlas).

Ajuste fino de un beat puntual: `CUE_NUDGE_FRAMES` en `src/config/timeline.ts`
(ej. `{ "s4.capta": -2 }`).

Requisitos: Python con `numpy` y `scipy` (o correr con el entorno de video-use:
`uv run --project <ruta a video-use> python scripts/lock_timing.py --vo …`), y `ffmpeg`.

## 3) Renderizar

```bash
npm run render:all
```

| Salida | Qué es |
|---|---|
| `out/diglab-ad-sistema-9x16.mp4` | Principal, masterizado a −14 LUFS / −1 dBTP |
| `out/diglab-ad-sistema-9x16-sin-musica.mp4` | VO + SFX, sin masterizar (para remezcla) |
| `out/diglab-ad-sistema-4x5.mp4` | Variante 4:5, masterizada |

El comando del brief también funciona tal cual (sin masterizado):
`npx remotion render DigLab-9x16 out/diglab-ad-sistema-9x16.mp4 --codec h264`

## Música

`public/audio/music.mp3` es una cama provisoria (tensión → resolución, sube al
cierre). Para usar una música licenciada, reemplazá ese archivo con el mismo
nombre. El ducking (−20 dB bajo la voz, subida al cierre) se aplica igual.

## Mapa del proyecto

```
src/config/script.json    Guion VO verbatim (fuente de los subtítulos)
src/config/copy.ts        TODOS los textos en pantalla, verbatim
src/config/brand.ts       Tokens de marca (colores, tipografía)
src/config/timeline.ts    Escenas, cues anclados a frases del VO, transiciones
src/config/vo-timing.json Tiempos palabra por palabra (estimados o de Scribe)
src/scenes/S1…S6          Una escena por archivo (+ tabla de beats compartida con el audio)
src/components/           Layout/zonas seguras, barra roja, subtítulos, transiciones
src/audio/                Capa de audio + hoja de cues de SFX
scripts/                  estimate_timing.py · lock_timing.py · make_audio.py · master.mjs
```

## Checklist del brief

- [x] Tema claro en 0–3 s (bloque de marca desde el frame 0)
- [x] Una sola toma del hook (`lock_timing.py` elige y corta la otra)
- [x] Sin "no es X, es Y" en pantalla
- [x] Subtítulos legibles sin sonido, sincronizados al VO
- [x] Texto clave y logo dentro de la zona segura (250 px arriba / 500 px abajo)
- [ ] Colores, tipografía y logo desde `Identidad` — **pendiente** (provisorios)
- [x] Pipeline de 5 etapas; etiquetas = verbos del VO
- [x] CTA beneficio → acción, con indicación de clic
- [x] Marca (rojo + barra + logo) consistente
- [ ] Tiempos bloqueados a la forma de onda — **pendiente** de `vo.mp3`
- [x] Todo el texto en pantalla en español, verbatim

## Licencia de Remotion

Remotion es gratis para equipos de hasta 3 personas; empresas más grandes
necesitan una licencia: https://www.remotion.pro/license
