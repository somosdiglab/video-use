# DigLab — Anuncio "Sistema" (Meta Ads, 9:16)

Edición estilo VOX con narrador a cámara: la cara del narrador es la columna
del video, el VO suena de punta a punta, y los motion graphics puntúan los
momentos clave como **overlays** (sobre la cara) o **cutaways** (pantalla
completa, con la voz sonando debajo).

Remotion 4 · TypeScript + React · 1080×1920 · 30 fps · ~59 s.

## Estado

| Pieza | Estado |
|---|---|
| Edición de tomas (hook toma 2, tomas fluidas, sin pausas) | ✅ 129,5 s crudos → 57,0 s |
| Sincronía labios / voz | ✅ verificada por correlación (< 1 ms en los 10 cortes) |
| Narrador a cámara | ✅ ~58 % del tiempo (brief: 55–70 %) |
| Colores DigLab + logo | ✅ paleta navy/celeste provista; rojo solo como alerta |
| Tipografía de marca | ⚠️ falta — se usa Montserrat |
| Música | ⚠️ cama provisoria sintetizada (reemplazable) |

## Archivos de origen (NO van a git)

El repo es público: el video, la voz y la transcripción quedan fuera de git.
Copialos así antes de trabajar:

```
media/VO.mp3          <- el .mp3 del VO (Drive: carpeta del anuncio)
media/IMG_8160.MOV    <- el video del narrador
```

## Regenerar la edición (una pasada)

```bash
# 1) Transcripción palabra por palabra (Scribe, vía video-use). Queda en caché.
python <video-use>/helpers/transcribe.py media/VO.mp3 --edit-dir vo-work --language es
# 2) Cortes + VO editado + video del narrador + tiempos del guion
python scripts/build_edit.py
# 3) Música alineada a las nuevas secciones (opcional si usás música propia)
python scripts/make_audio.py --music-only
```

`build_edit.py` lee `src/config/edl.json` (qué tomas se usan) y genera:

- `public/media/vo.wav` — la voz editada, **única voz audible** (montada una vez en la raíz)
- `public/media/aroll.mp4` — el narrador con **los mismos cortes**, sin pista de audio (no puede duplicarse la voz), HDR→SDR, 1080×1920
- `src/config/vo-timing.json` — cada palabra del guion en la nueva línea de tiempo
- `vo-work/edit_report.md` — qué se cortó y por qué

Cortes: en el punto más silencioso entre palabras, con fades de 30 ms, cuantizados
a frames. Para fijar un corte a mano: `cutIn` / `cutOut` en `edl.json`.

## Qué se ve cuándo

Todo en `src/config/edit.ts`, anclado a palabras del VO:

- `CUTAWAYS` — burbuja (S1), balanza (S3), puente → pipeline (S4), recorrido (S6), placa final
- `OVERLAYS` — bloque de marca, chips de confianza, "VALE LO QUE COBRA", "EL PUENTE",
  resultado, guerra de precios, megáfono, CTA
- `WIPES` — barridas de marca al entrar a cada cutaway
- `zoomAt` — punch-ins en cada corte de toma (disimulan los saltos)

## Abrir y renderizar

```bash
npm install
npm run dev          # Remotion Studio
npm run render:all   # out/diglab-ad-sistema-9x16.mp4 (+ sin-musica, + 4x5)
```

| Salida | Qué es |
|---|---|
| `out/diglab-ad-sistema-9x16.mp4` | Principal, masterizado a −14 LUFS / −1 dBTP |
| `out/diglab-ad-sistema-9x16-sin-musica.mp4` | Voz + SFX, sin masterizar (para remezcla) |
| `out/diglab-ad-sistema-4x5.mp4` | Variante Feed 1080×1350 |

## Marca

- Colores: `src/config/brand.ts` (tokens DigLab). Barra de marca `#1E7FA8`, acento `#29ABE2`, rojo solo para alertas.
- Logo: `public/brand/logo.png`. Tipografía: soltá los .ttf/.otf en `public/fonts/brand/`.

## Checklist del brief

- [x] VO audible de principio a fin, sin cortes en los cutaways (montado una vez en la raíz)
- [x] Sin audio duplicado (el video del narrador no tiene pista de audio y está muteado)
- [x] Narrador como columna (~58 % del tiempo), gráficos solo en los beats indicados
- [x] Tema claro en 0–3 s · una sola toma del hook · sin "no es X, es Y"
- [x] Subtítulos legibles sin sonido y sincronizados
- [x] Texto clave y logo dentro de la zona segura
- [x] Colores y logo de DigLab (tipografía pendiente)
- [x] Pipeline de 5 etapas con etiquetas = verbos del VO
- [x] CTA beneficio → acción, con indicación de clic
- [x] Todo el texto en pantalla en español, verbatim

## Licencia de Remotion

Gratis para equipos de hasta 3 personas; empresas más grandes necesitan
licencia: https://www.remotion.pro/license
