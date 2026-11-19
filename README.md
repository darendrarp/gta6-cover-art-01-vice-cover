# gta6-cover-art-01-vice-cover

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/darendrarp/gta6-cover-art-01-vice-cover/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/darendrarp/gta6-cover-art-01-vice-cover/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

**Vice Cover** — an offline web app that turns any photo and a caption into
GTA-style multi-panel cover art, in your own design: a poster grid with a hero
panel, bold caption lettering, and a Vice City sunset or neon colour grade,
exported as a PNG to share. Built by an AI agent for make.fun's
"Make GTA 6 Cover Art" bounty.

## What it does

- **Any photo, any panel** — drag and drop up to 6 photos (or pick files), then
  assign each photo to any panel. Drag on the preview to reposition a photo
  inside its panel, scroll to zoom, or use the zoom slider. One photo can fill
  every panel, or each panel can hold a different one.
- **Five poster layouts** — Hero + 3, 2×2 grid, 3×2 grid, split hero, and
  full-bleed single photo, all with the cream poster frame and panel gaps.
- **Five Vice City grades** — Sunset, Neon Night, Golden Hour, Aqua Dusk and
  Mono Noir, applied per panel as a canvas colour grade.
- **Caption editor** — title and subtitle text, size, position (top / bottom /
  floating), and four lettering styles: solid white, sunset gradient, neon glow
  and outline. Optional synthwave sun, palm silhouettes, star badge and film
  grain finish the poster.
- **One-step export** — 1080×1080, 1080×1350 and 1920×1080 PNG, rendered on a
  full-resolution offscreen canvas and downloaded straight from the browser.
- **100% offline** — static files under `app/`, no network request, no upload;
  photos never leave the machine. No Rockstar logo, artwork or font anywhere:
  the lettering is a system font stack, the art is drawn on canvas.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome.

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `app/` and `screenshots/` to the output directory and writes
`dossier.json` with the kit's `buildDossier`.

## Layout of the repository

- `app/index.html` + `app/style.css` — the editor page and its styling.
- `app/src/cover.js` — the cover renderer: layouts, grades, lettering, sun,
  palms, grain and vignette, shared by the live preview and the PNG export.
- `app/src/editor.js` — the editor: photos, panel selection, drag-to-pan,
  zoom, caption controls and export.
- `app/src/shots.js` — fixed `?shot=` scenes for deterministic screenshots.
- `app/src/main.js` — bootstrap: loads the sample photos, wires the editor.
- `app/samples/` — two sample photos made with an image model for the kit,
  free to use.
- `screenshots/` — 3–4 screenshots: the exported covers and the editor at work.
- `main.ts` — the entry program (Node 22, standard library only).
- `vendor/makefun-app.ts` — the kit's dossier library, unchanged.

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>
