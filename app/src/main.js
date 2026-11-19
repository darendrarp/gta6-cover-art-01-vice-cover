// Vice Cover bootstrap: builds the editor, loads the two bundled sample
// photos so the poster is never empty, and hands `?shot=` scenes to shots.js.
import { freshState } from './cover.js';
import { attachEditor } from './editor.js';
import { runShot } from './shots.js';

const state = freshState();
const canvas = document.getElementById('preview');
const editor = attachEditor(canvas, state);

const query = new URLSearchParams(location.search);
const shot = query.get('shot');
if (shot) {
  runShot(shot, query, editor).catch((error) => {
    console.error('shot scene failed', error);
    window.__shotReady = true;
  });
} else {
  (async () => {
    await editor.loadSamplePhoto('boulevard');
    await editor.loadSamplePhoto('pier');
    editor.autoFillPanels();
    editor.redraw();
  })();
}
