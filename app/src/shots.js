// Fixed scenes for screenshots: ?shot=editor shows the editor with sample
// photos loaded; ?shot=cover shows the exported cover alone, edge to edge,
// drawn by the app itself at the viewport's size. Query knobs: photo (comma
// list of samples), caption, subtitle, layout, grade, style, pos, size.
// window.__shotReady is set once the scene has painted.
import { renderCover } from './cover.js';

/** Applies the scene's caption, layout, grade and lettering from the query. */
function applyShotSettings(editor, query) {
  const s = editor.state;
  if (query.get('caption')) s.title = query.get('caption');
  if (query.get('subtitle')) s.subtitle = query.get('subtitle');
  if (query.get('layout')) s.layout = query.get('layout');
  if (query.get('grade')) s.grade = query.get('grade');
  if (query.get('style')) s.titleStyle = query.get('style');
  if (query.get('pos')) s.titlePos = query.get('pos');
  if (query.get('size')) s.size = query.get('size');
  document.getElementById('titleInput').value = s.title;
  document.getElementById('subtitleInput').value = s.subtitle;
  document.getElementById('titleStyleSelect').value = s.titleStyle;
  document.getElementById('titlePosSelect').value = s.titlePos;
  document.getElementById('sizeSelect').value = s.size;
  editor.syncChips();
}

/** Loads the scene's sample photos and deals them across the panels. */
async function loadShotPhotos(editor, query) {
  const names = (query.get('photo') ?? 'boulevard,pier').split(',').map((n) => n.trim()).filter(Boolean);
  for (const name of names) await editor.loadSamplePhoto(name);
  editor.autoFillPanels();
  // `pans` nudges each panel's vertical crop (-1..1, empty keeps the centre),
  // so a scene can frame faces instead of torsos.
  const pans = (query.get('pans') ?? '').split(',');
  pans.forEach((value, i) => {
    const dy = Number.parseFloat(value);
    if (Number.isFinite(dy) && editor.state.panels[i]) editor.state.panels[i].dy = dy;
  });
}

function markShotReady() {
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}

/** Runs one screenshot scene on the editor. */
export async function runShot(shot, query, editor) {
  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    applyShotSettings(editor, query);
    await loadShotPhotos(editor, query);
    const canvas = document.getElementById('preview');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    renderCover(canvas.getContext('2d'), canvas.width, canvas.height, editor.state,
      editor.photos.map((p) => p.img));
    markShotReady();
    return;
  }
  applyShotSettings(editor, query);
  await loadShotPhotos(editor, query);
  editor.redraw();
  markShotReady();
}
