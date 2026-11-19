// Vice Cover renderer: turns photos + a caption into multi-panel GTA-style
// poster art on any 2D canvas. The live preview and the PNG export share this
// one function, so what you see is exactly what you export.

/** Poster layouts: each names its panels as fractions of the inner area. */
export const LAYOUTS = {
  hero: { label: 'Hero + 3', panels: 4 },
  grid4: { label: 'Grid 2x2', panels: 4 },
  grid6: { label: 'Grid 3x2', panels: 6 },
  split: { label: 'Split hero', panels: 3 },
  full: { label: 'Full bleed', panels: 1 },
};

/** Colour grades: a canvas filter plus overlay washes, per panel. */
export const GRADES = {
  sunset: {
    label: 'Sunset',
    filter: 'saturate(1.32) contrast(1.08) sepia(0.22) brightness(1.02)',
    overlay: [[0, 'rgba(255,122,26,0)'], [1, 'rgba(232,62,140,0.30)']],
    overlayMode: 'soft-light',
    wash: 'rgba(255,110,60,0.10)',
  },
  neon: {
    label: 'Neon Night',
    filter: 'saturate(1.45) contrast(1.12) brightness(0.98)',
    overlay: [[0, 'rgba(34,211,238,0.22)'], [1, 'rgba(217,70,239,0.30)']],
    overlayMode: 'overlay',
    wash: 'rgba(20,0,60,0.12)',
  },
  golden: {
    label: 'Golden Hour',
    filter: 'saturate(1.15) sepia(0.35) contrast(1.05) brightness(1.03)',
    overlay: [[0, 'rgba(255,200,80,0.10)'], [1, 'rgba(180,90,10,0.28)']],
    overlayMode: 'soft-light',
    wash: 'rgba(255,170,40,0.08)',
  },
  aqua: {
    label: 'Aqua Dusk',
    filter: 'saturate(1.25) contrast(1.06) hue-rotate(-18deg) brightness(1.01)',
    overlay: [[0, 'rgba(6,182,212,0.20)'], [1, 'rgba(10,30,90,0.32)']],
    overlayMode: 'soft-light',
    wash: 'rgba(0,120,160,0.08)',
  },
  noir: {
    label: 'Mono Noir',
    filter: 'grayscale(1) contrast(1.25) brightness(1.04)',
    overlay: [[0, 'rgba(255,255,255,0.10)'], [1, 'rgba(0,0,0,0.22)']],
    overlayMode: 'soft-light',
    wash: 'rgba(0,0,0,0.05)',
  },
};

/** Export sizes: the common post sizes. */
export const EXPORT_SIZES = {
  '1080x1080': { w: 1080, h: 1080, label: '1080 x 1080' },
  '1080x1350': { w: 1080, h: 1350, label: '1080 x 1350' },
  '1920x1080': { w: 1920, h: 1080, label: '1920 x 1080' },
};

export const MAX_PANELS = 6;
export const MAX_PHOTOS = 6;
const FRAME_BG = '#f2ede3';
const DARK_BG = '#14101f';
const TITLE_STACK = 'Impact, "Arial Narrow Bold", "Helvetica Narrow", "Segoe UI", Arial, sans-serif';

/** A fresh panel: which photo it shows, its zoom and its pan (-1..1 each way). */
export function freshPanel(photo = 0) {
  return { photo, zoom: 1, dx: 0, dy: 0 };
}

/** A fresh cover state: the editor's defaults. */
export function freshState() {
  return {
    layout: 'hero',
    grade: 'sunset',
    size: '1920x1080',
    title: 'VICE NIGHTS',
    subtitle: 'PALM CITY · EST. 2026',
    titleScale: 1,
    titleStyle: 'white',
    titlePos: 'bottom',
    showSun: true,
    showPalms: true,
    showBadge: true,
    showGrain: true,
    showFrame: true,
    selectedPanel: 0,
    panels: [freshPanel(0), freshPanel(1), freshPanel(0), freshPanel(1), freshPanel(0), freshPanel(1)],
  };
}

/**
 * Panel rectangles for a layout, in pixels, inside the poster's inner area.
 * Returns { rects, hero } where hero is the index of the big panel (-1: none).
 */
export function layoutPanelsFor(layout, W, H, frame) {
  const g = frame ? Math.max(4, Math.round(Math.min(W, H) * 0.011)) : Math.max(2, Math.round(Math.min(W, H) * 0.003));
  const m = frame ? Math.max(6, Math.round(Math.min(W, H) * 0.018)) : 0;
  const ix = m, iy = m, iw = W - 2 * m, ih = H - 2 * m;
  const row = (y, h, count) => {
    const w = (iw - g * (count - 1)) / count;
    return Array.from({ length: count }, (_, i) => ({ x: ix + i * (w + g), y, w, h }));
  };
  if (layout === 'hero') {
    const topH = (ih - g) * 0.62;
    return { rects: [{ x: ix, y: iy, w: iw, h: topH }, ...row(iy + topH + g, ih - g - topH, 3)], hero: 0 };
  }
  if (layout === 'grid4') {
    const h = (ih - g) / 2;
    return { rects: [...row(iy, h, 2), ...row(iy + h + g, h, 2)], hero: -1 };
  }
  if (layout === 'grid6') {
    const h = (ih - g) / 2;
    return { rects: [...row(iy, h, 3), ...row(iy + h + g, h, 3)], hero: -1 };
  }
  if (layout === 'split') {
    const leftW = (iw - g) * 0.58;
    const h = (ih - g) / 2;
    return {
      rects: [
        { x: ix, y: iy, w: leftW, h: ih },
        { x: ix + leftW + g, y: iy, w: iw - g - leftW, h },
        { x: ix + leftW + g, y: iy + h + g, w: iw - g - leftW, h },
      ],
      hero: 0,
    };
  }
  return { rects: [{ x: ix, y: iy, w: iw, h: ih }], hero: 0 };
}

/** Draws one photo into its panel rect: cover-fit, zoomed and panned. */
export function drawPanelPhoto(ctx, img, rect, panel, grade) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  if (!img) {
    const grad = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
    grad.addColorStop(0, '#2b1542');
    grad.addColorStop(1, '#12081f');
    ctx.fillStyle = grad;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = `700 ${Math.round(rect.h * 0.09)}px ${TITLE_STACK}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('＋  ADD A PHOTO', rect.x + rect.w / 2, rect.y + rect.h / 2);
    ctx.restore();
    return;
  }
  const base = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight);
  const scale = base * panel.zoom;
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const ox = (dw - rect.w) / 2;
  const oy = (dh - rect.h) / 2;
  ctx.filter = grade.filter;
  ctx.drawImage(img, rect.x - ox + panel.dx * ox, rect.y - oy + panel.dy * oy, dw, dh);
  ctx.filter = 'none';
  ctx.restore();
}

/** Washes a panel rect with the grade's overlay gradient and tint. */
export function applyViceGrade(ctx, rect, grade) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  const grad = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  for (const [at, color] of grade.overlay) grad.addColorStop(at, color);
  ctx.globalCompositeOperation = grade.overlayMode;
  ctx.fillStyle = grad;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = grade.wash;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}

/** A synthwave sun: a gradient disc cut by widening horizontal slits.
 *  Drawn on an offscreen canvas first, so the slits show the photo beneath
 *  instead of punching through to the poster's background. */
export function drawSynthwaveSun(ctx, cx, cy, r) {
  const off = document.createElement('canvas');
  off.width = Math.ceil(r * 2);
  off.height = Math.ceil(r * 2);
  const octx = off.getContext('2d');
  const grad = octx.createLinearGradient(0, 0, 0, r * 2);
  grad.addColorStop(0, '#ffe259');
  grad.addColorStop(0.45, '#ff7e5f');
  grad.addColorStop(1, '#e83e8c');
  octx.fillStyle = grad;
  octx.beginPath();
  octx.arc(r, r, r, 0, Math.PI * 2);
  octx.fill();
  octx.globalCompositeOperation = 'destination-out';
  let y = r * 1.08;
  let gap = r * 0.045;
  while (y < r * 2) {
    octx.fillRect(0, y, r * 2, gap);
    y += gap + r * 0.14;
    gap = Math.min(gap * 1.35, r * 0.13);
  }
  ctx.drawImage(off, cx - r, cy - r);
}

/** One palm frond: a broad leaf, wide at the crown and tapering to its tip. */
function drawPalmFrond(ctx, cx, cy, angle, len, droop) {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const px = -dy;
  const py = dx;
  const w = len * 0.085;
  const tipX = cx + dx * len;
  const tipY = cy + dy * len + droop;
  const mx = cx + dx * len * 0.55;
  const my = cy + dy * len * 0.55 - len * 0.05;
  ctx.beginPath();
  ctx.moveTo(cx + px * w, cy + py * w);
  ctx.quadraticCurveTo(mx + px * w * 0.9, my + py * w * 0.9, tipX, tipY);
  ctx.quadraticCurveTo(mx - px * w * 0.9, my - py * w * 0.9, cx - px * w, cy - py * w);
  ctx.closePath();
  ctx.fill();
}

/** A palm silhouette: a curved trunk with seven drooping fronds. */
export function drawPalmSilhouette(ctx, x, y, s, flip) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(flip ? -1 : 1, 1);
  ctx.fillStyle = 'rgba(16,6,26,0.80)';
  ctx.strokeStyle = 'rgba(16,6,26,0.80)';
  ctx.lineWidth = s * 0.035;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(s * 0.10, -s * 0.45, s * 0.28, -s * 0.72);
  ctx.stroke();
  const crownX = s * 0.28;
  const crownY = -s * 0.72;
  const spread = [-2.6, -2.0, -1.45, -0.9, -0.35, 0.25, 0.75];
  for (const a of spread) {
    drawPalmFrond(ctx, crownX, crownY, a, s * 0.52, s * 0.22);
  }
  ctx.restore();
}

/** Fits the title font size to the width, then returns it. */
export function fitTitleFont(ctx, text, maxWidth, size) {
  let s = size;
  ctx.font = `900 ${s}px ${TITLE_STACK}`;
  while (s > 12 && ctx.measureText(text).width > maxWidth) {
    s -= 2;
    ctx.font = `900 ${s}px ${TITLE_STACK}`;
  }
  return s;
}

/** The caption block: band, title, subtitle and star badge. */
export function drawTitleBlock(ctx, W, H, state) {
  const title = state.title.trim().toUpperCase();
  const subtitle = state.subtitle.trim().toUpperCase();
  if (!title && !subtitle) return;
  const bandH = H * 0.175;
  const bandY = state.titlePos === 'top' ? 0 : H - bandH;
  if (state.titlePos !== 'float') {
    const band = ctx.createLinearGradient(0, bandY, 0, bandY + bandH);
    band.addColorStop(0, 'rgba(12,6,24,0.92)');
    band.addColorStop(1, 'rgba(46,10,52,0.88)');
    ctx.fillStyle = band;
    ctx.fillRect(0, bandY, W, bandH);
    const edge = ctx.createLinearGradient(0, 0, W, 0);
    edge.addColorStop(0, '#ffb020');
    edge.addColorStop(0.5, '#ff2e88');
    edge.addColorStop(1, '#22d3ee');
    ctx.fillStyle = edge;
    const edgeY = state.titlePos === 'top' ? bandY + bandH - 4 : bandY;
    ctx.fillRect(0, edgeY, W, 4);
  }
  const cx = W / 2;
  const centerY = state.titlePos === 'float'
    ? (state.titlePos === 'top' ? bandH * 0.5 : H - bandH * 0.5)
    : bandY + bandH * 0.52;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (state.showBadge) {
    ctx.font = `700 ${Math.round(H * 0.022)}px ${TITLE_STACK}`;
    ctx.fillStyle = '#ffb020';
    ctx.fillText('★ ★ ★ ★ ★', cx, centerY - bandH * 0.34);
  }
  if (title) {
    const size = fitTitleFont(ctx, title, W * 0.9, H * 0.085 * state.titleScale);
    ctx.save();
    ctx.translate(cx, centerY + (state.showBadge ? bandH * 0.03 : 0));
    ctx.transform(1, 0, -0.05, 1, 0, 0);
    ctx.font = `900 ${size}px ${TITLE_STACK}`;
    try { ctx.letterSpacing = '1px'; } catch { /* older canvas: ignore */ }
    const outline = size * 0.085;
    if (state.titleStyle === 'sunset') {
      const fill = ctx.createLinearGradient(0, -size / 2, 0, size / 2);
      fill.addColorStop(0, '#ffd319');
      fill.addColorStop(0.5, '#ff2975');
      fill.addColorStop(1, '#8c1eff');
      ctx.lineWidth = outline;
      ctx.strokeStyle = 'rgba(12,5,24,0.9)';
      ctx.lineJoin = 'round';
      ctx.strokeText(title, 0, 0);
      ctx.fillStyle = fill;
      ctx.fillText(title, 0, 0);
    } else if (state.titleStyle === 'neon') {
      ctx.shadowColor = '#ff2e88';
      ctx.shadowBlur = size * 0.32;
      ctx.lineWidth = outline * 0.6;
      ctx.strokeStyle = '#22d3ee';
      ctx.lineJoin = 'round';
      ctx.strokeText(title, 0, 0);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(title, 0, 0);
      ctx.shadowBlur = 0;
    } else if (state.titleStyle === 'outline') {
      ctx.lineWidth = size * 0.045;
      ctx.strokeStyle = '#ffffff';
      ctx.lineJoin = 'round';
      ctx.strokeText(title, 0, 0);
      ctx.fillStyle = 'rgba(255,255,255,0.10)';
      ctx.fillText(title, 0, 0);
    } else {
      ctx.shadowColor = 'rgba(0,0,0,0.55)';
      ctx.shadowBlur = size * 0.14;
      ctx.shadowOffsetY = size * 0.05;
      ctx.lineWidth = outline;
      ctx.strokeStyle = 'rgba(12,5,24,0.9)';
      ctx.lineJoin = 'round';
      ctx.strokeText(title, 0, 0);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(title, 0, 0);
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
    }
    ctx.restore();
  }
  if (subtitle) {
    ctx.font = `700 ${Math.round(H * 0.021)}px ${TITLE_STACK}`;
    try { ctx.letterSpacing = `${Math.round(H * 0.006)}px`; } catch { /* older canvas */ }
    ctx.fillStyle = '#8be9ff';
    ctx.fillText(subtitle, cx, centerY + bandH * 0.34);
    try { ctx.letterSpacing = '0px'; } catch { /* older canvas */ }
  }
  ctx.restore();
}

/** Deterministic film grain: seeded dots, the same on every render. */
export function drawFilmGrain(ctx, W, H, seed = 20261119) {
  let a = seed >>> 0;
  const rand = () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const dots = Math.floor((W * H) / 260);
  for (let i = 0; i < dots; i++) {
    const x = Math.floor(rand() * W);
    const y = Math.floor(rand() * H);
    ctx.fillStyle = rand() > 0.5 ? `rgba(255,255,255,${0.03 + rand() * 0.05})` : `rgba(0,0,0,${0.03 + rand() * 0.06})`;
    ctx.fillRect(x, y, 1.4, 1.4);
  }
}

/** A soft dark vignette around the poster's edges. */
export function drawVignette(ctx, W, H) {
  const grad = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.75);
  grad.addColorStop(0, 'rgba(10,5,20,0)');
  grad.addColorStop(1, 'rgba(10,5,20,0.30)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
}

/**
 * Renders the whole cover onto a 2D context at W x H: frame, panels with
 * their grades, sun and palms, caption block, grain and vignette.
 */
export function renderCover(ctx, W, H, state, photos) {
  const grade = GRADES[state.grade] ?? GRADES.sunset;
  ctx.save();
  ctx.fillStyle = state.showFrame ? FRAME_BG : DARK_BG;
  ctx.fillRect(0, 0, W, H);
  const { rects, hero } = layoutPanelsFor(state.layout, W, H, state.showFrame);
  const count = LAYOUTS[state.layout]?.panels ?? rects.length;
  for (let i = 0; i < count; i++) {
    const panel = state.panels[i] ?? freshPanel(0);
    const img = photos[panel.photo] ?? null;
    drawPanelPhoto(ctx, img, rects[i], panel, grade);
    if (img) applyViceGrade(ctx, rects[i], grade);
  }
  if (hero >= 0 && hero < count) {
    const hr = rects[hero];
    const wideHero = hr.w / hr.h > 1.05;
    ctx.save();
    ctx.beginPath();
    ctx.rect(hr.x, hr.y, hr.w, hr.h);
    ctx.clip();
    // The sun only suits a wide hero: on a tall one it would sit on a face.
    if (state.showSun && wideHero) {
      const r = Math.min(hr.w, hr.h) * 0.26;
      drawSynthwaveSun(ctx, hr.x + hr.w - r * 1.25, hr.y + r * 1.25, r);
    }
    if (state.showPalms) {
      drawPalmSilhouette(ctx, hr.x + hr.w * 0.02, hr.y + hr.h + 2, hr.h * 0.42, false);
      drawPalmSilhouette(ctx, hr.x + hr.w * 0.98, hr.y + hr.h + 2, hr.h * 0.30, true);
    }
    ctx.restore();
  }
  drawTitleBlock(ctx, W, H, state);
  if (state.showGrain) drawFilmGrain(ctx, W, H);
  drawVignette(ctx, W, H);
  ctx.restore();
}

/** Renders the cover at its export size onto a fresh canvas. */
export function renderCoverToCanvas(state, photos) {
  const size = EXPORT_SIZES[state.size] ?? EXPORT_SIZES['1920x1080'];
  const canvas = document.createElement('canvas');
  canvas.width = size.w;
  canvas.height = size.h;
  renderCover(canvas.getContext('2d'), size.w, size.h, state, photos);
  return canvas;
}
