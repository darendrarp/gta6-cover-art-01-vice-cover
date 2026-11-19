// Vice Cover, a gta6-cover-art-01 entry (Node 22, standard library only).
// The app is this directory's app/ folder: plain static files a desktop
// browser loads offline (app/index.html and its ES modules, no library and no
// network request). The program hands it in: it copies app/ and screenshots/
// from beside this file to /output and writes /output/dossier.json, the
// summary the judge reads, with the vendored make.fun library.
//
// The app itself is a multi-panel GTA-style cover maker: five poster layouts,
// five Vice City colour grades, per-panel crop and position, a caption editor
// with four lettering styles, and PNG export in 1080 x 1080, 1080 x 1350 and
// 1920 x 1080. Its two sample photos (app/samples/) were made for make.fun
// with an image model and are free to use.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the
// bytes; the others refuse an entry the scorer would refuse (more than 4
// screenshots or one over 256 KiB; more than 993 files in app/ or 48 MiB of
// app files, in all, or a path under app/ over 1000 bytes: app/ counts beside
// /output's own 1000-entry cap, its screenshots/ and dossier.json).
const DOSSIER_LIMITS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
};

// Fail fast, before copying anything, when the entry is incomplete: the gate
// needs app/index.html and 3 or 4 screenshots, and a half-written /output
// would only hide the missing piece.
if (!existsSync(join(here, 'app', 'index.html'))) {
  throw new Error('Vice Cover: app/index.html is missing');
}
const shotDir = join(here, 'screenshots');
if (!existsSync(shotDir)) {
  throw new Error('Vice Cover: screenshots/ is missing (need 3 or 4 shots)');
}
const shots = readdirSync(shotDir).filter((name) => !name.startsWith('.'));
if (shots.length < 3 || shots.length > 4) {
  throw new Error(`Vice Cover: screenshots/ holds ${shots.length} shots, need 3 or 4`);
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
cpSync(shotDir, join(out, 'screenshots'), { recursive: true });

writeFileSync(join(out, 'dossier.json'), buildDossier(out, DOSSIER_LIMITS));
