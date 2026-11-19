// Vice Cover editor: wires the controls to the renderer — photos, panel
// selection, drag-to-pan and scroll-to-zoom on the preview, caption controls
// and the one-step PNG export.
import {
  EXPORT_SIZES, LAYOUTS, MAX_PHOTOS, freshPanel, layoutPanelsFor,
  renderCover, renderCoverToCanvas,
} from './cover.js';

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

const $ = (id) => document.getElementById(id);

/** Attaches the editor to the preview canvas and the control panel. */
export function attachEditor(canvas, state) {
  const photos = [];
  const ctx = canvas.getContext('2d');
  let selectedPhoto = 0;
  let drag = null;

  function previewSize() {
    const size = EXPORT_SIZES[state.size] ?? EXPORT_SIZES['1920x1080'];
    const long = 960;
    if (size.w >= size.h) return { w: long, h: Math.round((long * size.h) / size.w) };
    return { w: Math.round((long * size.w) / size.h), h: long };
  }

  function redraw() {
    const { w, h } = previewSize();
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    renderCover(ctx, w, h, state, photos.map((p) => p.img));
    updatePanelLabel();
  }

  function panelCount() {
    return LAYOUTS[state.layout]?.panels ?? 1;
  }

  function updatePanelLabel() {
    const n = panelCount();
    const sel = Math.min(state.selectedPanel, n - 1);
    const panel = state.panels[sel];
    const name = photos[panel?.photo]?.name ?? 'no photo yet';
    $('panelLabel').textContent =
      `Panel ${sel + 1} of ${n} selected — ${name}. Drag the photo to reposition, scroll to zoom.`;
    $('zoomSlider').value = Math.round((panel?.zoom ?? 1) * 100);
    $('zoomValue').textContent = `${Math.round((panel?.zoom ?? 1) * 100)}%`;
  }

  function renderPhotoSlots() {
    const slots = $('photoSlots');
    slots.innerHTML = '';
    photos.forEach((photo, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `photo-slot${i === selectedPhoto ? ' selected' : ''}`;
      btn.title = photo.name;
      btn.setAttribute('aria-label', `Use photo ${photo.name}`);
      const img = document.createElement('img');
      img.src = photo.url;
      img.alt = photo.name;
      btn.appendChild(img);
      btn.addEventListener('click', () => assignPhotoToSelectedPanel(i));
      slots.appendChild(btn);
    });
    for (let i = photos.length; i < Math.min(MAX_PHOTOS, 4); i++) {
      const empty = document.createElement('div');
      empty.className = 'photo-slot empty';
      empty.textContent = '+';
      empty.title = 'Add a photo';
      slots.appendChild(empty);
    }
  }

  /** Puts photo `index` into the selected panel and redraws. */
  function assignPhotoToSelectedPanel(index) {
    selectedPhoto = index;
    const sel = Math.min(state.selectedPanel, panelCount() - 1);
    state.panels[sel] = { ...(state.panels[sel] ?? freshPanel(index)), photo: index };
    renderPhotoSlots();
    redraw();
  }

  /** Adds a loaded image to the photo tray (at most MAX_PHOTOS). */
  function addPhoto(img, url, name) {
    if (photos.length >= MAX_PHOTOS) {
      const old = photos.shift();
      if (old.url.startsWith('blob:')) URL.revokeObjectURL(old.url);
      for (const panel of state.panels) panel.photo = Math.max(0, panel.photo - 1);
    }
    photos.push({ img, url, name });
    selectedPhoto = photos.length - 1;
    renderPhotoSlots();
    return photos.length - 1;
  }

  async function loadPhotoFile(file) {
    const url = URL.createObjectURL(file);
    try {
      const img = await loadImage(url);
      const index = addPhoto(img, url, file.name);
      assignPhotoToSelectedPanel(index);
      setStatus(`Loaded ${file.name}`);
    } catch {
      URL.revokeObjectURL(url);
      setStatus(`Could not read ${file.name} — try another image.`);
    }
  }

  /** Loads one of the bundled sample photos into the tray. */
  async function loadSamplePhoto(sample) {
    const url = `samples/${sample}.jpg`;
    const img = await loadImage(url);
    return addPhoto(img, url, `${sample}.jpg`);
  }

  function setStatus(text) {
    $('status').textContent = text;
  }

  /** Fills every panel with the selected photo. */
  function fillAllPanelsWithSelectedPhoto() {
    for (let i = 0; i < panelCount(); i++) {
      state.panels[i] = { ...(state.panels[i] ?? freshPanel(selectedPhoto)), photo: selectedPhoto };
    }
    redraw();
  }

  /** Deals the loaded photos across the panels, round-robin. */
  function autoFillPanels() {
    if (photos.length === 0) return;
    for (let i = 0; i < panelCount(); i++) {
      state.panels[i] = { ...(state.panels[i] ?? freshPanel(0)), photo: i % photos.length };
    }
    redraw();
  }

  /** Picks a random layout, grade and lettering style. */
  function surpriseMe() {
    const layouts = Object.keys(LAYOUTS);
    const grades = ['sunset', 'neon', 'golden', 'aqua', 'noir'];
    const styles = ['white', 'sunset', 'neon', 'outline'];
    state.layout = layouts[Math.floor(Math.random() * layouts.length)];
    state.grade = grades[Math.floor(Math.random() * grades.length)];
    state.titleStyle = styles[Math.floor(Math.random() * styles.length)];
    syncChips();
    $('titleStyleSelect').value = state.titleStyle;
    autoFillPanels();
  }

  function syncChips() {
    for (const btn of document.querySelectorAll('#layoutBtns .chip')) {
      btn.classList.toggle('active', btn.dataset.layout === state.layout);
    }
    for (const btn of document.querySelectorAll('#gradeBtns .chip')) {
      btn.classList.toggle('active', btn.dataset.grade === state.grade);
    }
  }

  /** Exports the cover at its full post size as a PNG download. */
  function exportCoverPng() {
    const size = EXPORT_SIZES[state.size] ?? EXPORT_SIZES['1920x1080'];
    const out = renderCoverToCanvas(state, photos.map((p) => p.img));
    out.toBlob((blob) => {
      if (!blob) {
        setStatus('Export failed — try again.');
        return;
      }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `vice-cover-${size.w}x${size.h}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      setStatus(`Saved vice-cover-${size.w}x${size.h}.png`);
    }, 'image/png');
  }

  function canvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function panelAt(x, y) {
    const { rects } = layoutPanelsFor(state.layout, canvas.width, canvas.height, state.showFrame);
    for (let i = 0; i < panelCount(); i++) {
      const r = rects[i];
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return i;
    }
    return -1;
  }

  canvas.addEventListener('pointerdown', (event) => {
    const { x, y } = canvasPoint(event);
    const hit = panelAt(x, y);
    if (hit === -1) return;
    state.selectedPanel = hit;
    canvas.setPointerCapture(event.pointerId);
    drag = { x, y, panel: { ...state.panels[hit] } };
    redraw();
  });

  canvas.addEventListener('pointermove', (event) => {
    if (!drag) return;
    const { x, y } = canvasPoint(event);
    const { rects } = layoutPanelsFor(state.layout, canvas.width, canvas.height, state.showFrame);
    const rect = rects[drag.panel ? state.selectedPanel : 0];
    const img = photos[state.panels[state.selectedPanel]?.photo]?.img;
    if (!img || !rect) return;
    const base = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight);
    const scale = base * state.panels[state.selectedPanel].zoom;
    const ox = Math.max(1, (img.naturalWidth * scale - rect.w) / 2);
    const oy = Math.max(1, (img.naturalHeight * scale - rect.h) / 2);
    const panel = state.panels[state.selectedPanel];
    panel.dx = Math.max(-1, Math.min(1, drag.panel.dx + (x - drag.x) / ox));
    panel.dy = Math.max(-1, Math.min(1, drag.panel.dy + (y - drag.y) / oy));
    redraw();
  });

  const endDrag = () => { drag = null; };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  canvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    const panel = state.panels[Math.min(state.selectedPanel, panelCount() - 1)];
    if (!panel) return;
    panel.zoom = Math.max(1, Math.min(3, panel.zoom * (event.deltaY < 0 ? 1.08 : 1 / 1.08)));
    redraw();
  }, { passive: false });

  $('photoInput').addEventListener('change', async (event) => {
    for (const file of event.target.files ?? []) await loadPhotoFile(file);
    event.target.value = '';
  });

  for (const btn of document.querySelectorAll('[data-sample]')) {
    btn.addEventListener('click', async () => {
      const index = await loadSamplePhoto(btn.dataset.sample);
      assignPhotoToSelectedPanel(index);
      setStatus(`Loaded sample ${btn.dataset.sample}.jpg`);
    });
  }

  for (const btn of document.querySelectorAll('#layoutBtns .chip')) {
    btn.addEventListener('click', () => {
      state.layout = btn.dataset.layout;
      state.selectedPanel = 0;
      syncChips();
      redraw();
    });
  }

  for (const btn of document.querySelectorAll('#gradeBtns .chip')) {
    btn.addEventListener('click', () => {
      state.grade = btn.dataset.grade;
      syncChips();
      redraw();
    });
  }

  $('titleInput').addEventListener('input', (e) => { state.title = e.target.value; redraw(); });
  $('subtitleInput').addEventListener('input', (e) => { state.subtitle = e.target.value; redraw(); });
  $('titleSizeSlider').addEventListener('input', (e) => {
    state.titleScale = Number(e.target.value) / 100;
    $('titleSizeValue').textContent = `${e.target.value}%`;
    redraw();
  });
  $('titleStyleSelect').addEventListener('change', (e) => { state.titleStyle = e.target.value; redraw(); });
  $('titlePosSelect').addEventListener('change', (e) => { state.titlePos = e.target.value; redraw(); });
  $('sizeSelect').addEventListener('change', (e) => { state.size = e.target.value; redraw(); });
  $('zoomSlider').addEventListener('input', (e) => {
    const panel = state.panels[Math.min(state.selectedPanel, panelCount() - 1)];
    if (!panel) return;
    panel.zoom = Number(e.target.value) / 100;
    $('zoomValue').textContent = `${e.target.value}%`;
    redraw();
  });

  const toggle = (id, key) => $(id).addEventListener('change', (e) => { state[key] = e.target.checked; redraw(); });
  toggle('sunToggle', 'showSun');
  toggle('palmsToggle', 'showPalms');
  toggle('badgeToggle', 'showBadge');
  toggle('grainToggle', 'showGrain');
  toggle('frameToggle', 'showFrame');

  $('fillAllBtn').addEventListener('click', fillAllPanelsWithSelectedPhoto);
  $('autoFillBtn').addEventListener('click', autoFillPanels);
  $('surpriseBtn').addEventListener('click', surpriseMe);
  $('exportBtn').addEventListener('click', exportCoverPng);
  $('exportBtnTop').addEventListener('click', exportCoverPng);

  let dragDepth = 0;
  window.addEventListener('dragenter', (event) => {
    event.preventDefault();
    dragDepth++;
    $('dropOverlay').hidden = false;
  });
  window.addEventListener('dragleave', (event) => {
    event.preventDefault();
    dragDepth = Math.max(0, dragDepth - 1);
    if (dragDepth === 0) $('dropOverlay').hidden = true;
  });
  window.addEventListener('dragover', (event) => event.preventDefault());
  window.addEventListener('drop', async (event) => {
    event.preventDefault();
    dragDepth = 0;
    $('dropOverlay').hidden = true;
    for (const file of event.dataTransfer?.files ?? []) {
      if (file.type.startsWith('image/')) await loadPhotoFile(file);
    }
  });

  renderPhotoSlots();
  return {
    state,
    photos,
    redraw,
    syncChips,
    loadSamplePhoto,
    loadPhotoFile,
    assignPhotoToSelectedPanel,
    autoFillPanels,
    fillAllPanelsWithSelectedPhoto,
    exportCoverPng,
  };
}
