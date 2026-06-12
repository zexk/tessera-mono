// renderer.jsx — Tessera Mono glyph rendering primitives + React components

const { useRef, useEffect, useState, useMemo, useCallback } = React;

// ─── Core: draw a glyph to a canvas context ──────────────────────────────────
function drawGlyph(ctx, glyph, x0, y0, px, opts) {
  const { color, bold = 0, rounding = 0, alpha = 1 } = opts || {};
  if (!glyph) return;
  const g = bold > 0 ? TESSERA.bolden(glyph, bold) : glyph;

  ctx.save();
  ctx.fillStyle = color;
  ctx.globalAlpha = alpha;

  const W = TESSERA.CELL_W, H = TESSERA.CELL_H;
  const r = rounding * (px / 2);

  for (let y = 0; y < H; y++) {
    const row = g[y];
    if (!row) continue;
    for (let x = 0; x < W; x++) {
      if (!((row >>> (7 - x)) & 1)) continue;
      const get = (xx, yy) => {
        if (xx < 0 || xx >= W || yy < 0 || yy >= H) return 0;
        return (g[yy] >>> (7 - xx)) & 1;
      };
      // Outside-corner test: both adjacent + diagonal must be empty
      const rTL = (!get(x-1, y) && !get(x, y-1) && !get(x-1, y-1)) ? r : 0;
      const rTR = (!get(x+1, y) && !get(x, y-1) && !get(x+1, y-1)) ? r : 0;
      const rBR = (!get(x+1, y) && !get(x, y+1) && !get(x+1, y+1)) ? r : 0;
      const rBL = (!get(x-1, y) && !get(x, y+1) && !get(x-1, y+1)) ? r : 0;

      const PX = x0 + x * px;
      const PY = y0 + y * px;

      ctx.beginPath();
      ctx.moveTo(PX + rTL, PY);
      ctx.lineTo(PX + px - rTR, PY);
      if (rTR) ctx.arcTo(PX + px, PY, PX + px, PY + rTR, rTR);
      ctx.lineTo(PX + px, PY + px - rBR);
      if (rBR) ctx.arcTo(PX + px, PY + px, PX + px - rBR, PY + px, rBR);
      ctx.lineTo(PX + rBL, PY + px);
      if (rBL) ctx.arcTo(PX, PY + px, PX, PY + px - rBL, rBL);
      ctx.lineTo(PX, PY + rTL);
      if (rTL) ctx.arcTo(PX, PY, PX + rTL, PY, rTL);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawGrid(ctx, x0, y0, px, color, baseline) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  const W = TESSERA.CELL_W, H = TESSERA.CELL_H;
  for (let x = 0; x <= W; x++) {
    ctx.beginPath();
    ctx.moveTo(Math.round(x0 + x * px) + 0.5, y0);
    ctx.lineTo(Math.round(x0 + x * px) + 0.5, y0 + H * px);
    ctx.stroke();
  }
  for (let y = 0; y <= H; y++) {
    ctx.beginPath();
    ctx.moveTo(x0, Math.round(y0 + y * px) + 0.5);
    ctx.lineTo(x0 + W * px, Math.round(y0 + y * px) + 0.5);
    ctx.stroke();
  }
  if (baseline) {
    ctx.strokeStyle = baseline;
    ctx.lineWidth = 1;
    ctx.beginPath();
    const by = Math.round(y0 + (TESSERA.BASELINE + 1) * px) + 0.5;
    ctx.moveTo(x0 - 4, by);
    ctx.lineTo(x0 + W * px + 4, by);
    ctx.stroke();
  }
  ctx.restore();
}

// ─── Single glyph card (atlas cell) ──────────────────────────────────────────
function GlyphCell({ cp, px = 8, bold = 0, rounding = 0, ink, paper, grid, label, baseline, alts = false }) {
  const ref = useRef(null);
  const W = TESSERA.CELL_W, H = TESSERA.CELL_H;
  const cw = W * px, ch = H * px;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = cw * dpr;
    canvas.height = ch * dpr;
    canvas.style.width = cw + 'px';
    canvas.style.height = ch + 'px';
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;

    ctx.fillStyle = paper;
    ctx.fillRect(0, 0, cw, ch);
    if (grid) drawGrid(ctx, 0, 0, px, grid, baseline);
    const ALTS = TESSERA.ALTERNATES || {};
    const g = (alts && ALTS[cp]) ? ALTS[cp] : TESSERA.getGlyph(cp);
    if (g) drawGlyph(ctx, g, 0, 0, px, { color: ink, bold, rounding });
  }, [cp, px, bold, rounding, ink, paper, grid, baseline, alts]);

  const hex = cp.toString(16).toUpperCase().padStart(4, '0');
  const ch_ = (cp >= 32 && cp < 127) ? String.fromCodePoint(cp) :
              (cp >= 160) ? String.fromCodePoint(cp) : '·';

  return (
    <div className="glyph-cell">
      <canvas ref={ref} className="glyph-canvas" />
      {label !== false && (
        <div className="glyph-meta">
          <span className="glyph-hex">U+{hex}</span>
          <span className="glyph-char">{ch_}</span>
        </div>
      )}
    </div>
  );
}

// ─── Ligature substitution (opt-in) ──────────────────────────────────────────
const LIGATURE_RULES = [
  ['...', '\u2026'],
  ['<=',  '\u2264'],
  ['>=',  '\u2265'],
  ['!=',  '\u2260'],
  ['~~',  '\u2248'],
  ['->',  '\u2192'],
  ['=>',  '\u21d2'],
  ['<-',  '\u2190']
];
function applyLigatures(text) {
  let s = text;
  for (const [from, to] of LIGATURE_RULES) {
    s = s.split(from).join(to);
  }
  return s;
}

// ─── Run of text rendered as bitmap ──────────────────────────────────────────
function TextRun({ text, px = 3, bold = 0, rounding = 0, ink, paper, lineHeight = 18, maxWidth, ligatures = false, alts = false }) {
  const ref = useRef(null);
  const W = TESSERA.CELL_W, H = TESSERA.CELL_H;
  const cw = W * px, ch = H * px;
  const lh = Math.round(lineHeight / 16 * ch);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = Math.max(1, window.devicePixelRatio || 1);

    // Pre-process text: ligatures
    const src = ligatures ? applyLigatures(text) : text;

    // First pass: lay out lines with word wrapping
    const wrap = maxWidth ? Math.max(1, Math.floor(maxWidth / cw)) : 999;
    const paras = src.split('\n');
    const lines = [];
    for (const para of paras) {
      if (!para) { lines.push(''); continue; }
      const words = para.split(/(\s+)/);
      let line = '';
      for (const w of words) {
        if (line.length + w.length <= wrap) {
          line += w;
        } else if (w.length > wrap) {
          // hard break long token
          if (line) lines.push(line);
          let rest = w;
          while (rest.length > wrap) { lines.push(rest.slice(0, wrap)); rest = rest.slice(wrap); }
          line = rest;
        } else {
          lines.push(line);
          line = w.replace(/^\s+/, '');
        }
      }
      if (line) lines.push(line);
    }

    const maxCols = Math.max(1, ...lines.map(l => [...l].length));
    const widthPx = maxCols * cw;
    const heightPx = Math.max(1, lines.length) * lh;

    canvas.width = widthPx * dpr;
    canvas.height = heightPx * dpr;
    canvas.style.width = widthPx + 'px';
    canvas.style.height = heightPx + 'px';
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = paper;
    ctx.fillRect(0, 0, widthPx, heightPx);

    const ALTS = TESSERA.ALTERNATES || {};
    for (let li = 0; li < lines.length; li++) {
      const chars = [...lines[li]];
      for (let ci = 0; ci < chars.length; ci++) {
        const cp = chars[ci].codePointAt(0);
        const g = (alts && ALTS[cp]) ? ALTS[cp] : TESSERA.getGlyph(cp);
        if (g) drawGlyph(ctx, g, ci * cw, li * lh, px, { color: ink, bold, rounding });
      }
    }
  }, [text, px, bold, rounding, ink, paper, lh, cw, maxWidth, ligatures, alts]);

  return <canvas ref={ref} className="text-run-canvas" />;
}

// Inline text run — used inside flowing prose
function InlineText({ text, px = 2, bold = 0, rounding = 0, ink, paper, ligatures, alts }) {
  return <TextRun text={text} px={px} bold={bold} rounding={rounding} ink={ink} paper={paper || 'transparent'} ligatures={ligatures} alts={alts} />;
}

// Export to window
Object.assign(window, { drawGlyph, drawGrid, GlyphCell, TextRun, InlineText, applyLigatures });
