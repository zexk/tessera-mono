// build-font.mjs — Tessera Mono TTF builder
// Reads the bitmap glyph data from src/glyphs.js and src/icons.js,
// traces each pixel as a CCW square contour, and emits a TrueType font.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import opentype from 'opentype.js';

const DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(DIR, '..');

// ─── Load glyph data (IIFE sets globalThis.TESSERA) ─────────────────────────
globalThis.window = globalThis; // glyphs.js checks typeof window
await import(resolve(ROOT, 'src/glyphs.js'));
await import(resolve(ROOT, 'src/icons.js'));

const T = globalThis.TESSERA;

const PX = 64;                   // font units per bitmap pixel
const UPM = 1024;                // units per em (16 rows × 64)
const CELL_W = T.CELL_W;         // 8
const CELL_H = T.CELL_H;         // 16
const BASELINE = T.BASELINE;     // 10
const ADVANCE = CELL_W * PX;     // 512

// ─── Path tracing: decompose the bitmap into maximal rectangles ────────
// Horizontal runs per row, merged with identical runs on adjacent rows.
// One CCW contour per rectangle instead of per pixel.
function pixelRects(bitmap) {
  const rects = [];
  let open = new Map(); // 'x0,x1' → rect still growing downward
  for (let y = 0; y < CELL_H; y++) {
    const row = bitmap[y] || 0;
    const next = new Map();
    for (let x = 0; x < CELL_W; ) {
      if (!((row >>> (7 - x)) & 1)) { x++; continue; }
      const x0 = x;
      while (x < CELL_W && ((row >>> (7 - x)) & 1)) x++;
      const key = x0 + ',' + x;
      const prev = open.get(key);
      if (prev) {
        prev.y1 = y + 1;
        next.set(key, prev);
      } else {
        const r = { x0, x1: x, y0: y, y1: y + 1 };
        rects.push(r);
        next.set(key, r);
      }
    }
    open = next;
  }
  return rects;
}

function pixelPath(bitmap) {
  const path = new opentype.Path();
  if (!bitmap) return path;
  for (const { x0, x1, y0, y1 } of pixelRects(bitmap)) {
    const left   = x0 * PX;
    const right  = x1 * PX;
    const top    = (BASELINE - y0 + 1) * PX;
    const bottom = (BASELINE - y1 + 1) * PX;
    path.moveTo(left,  bottom);
    path.lineTo(right, bottom);
    path.lineTo(right, top);
    path.lineTo(left,  top);
    path.close();
  }
  return path;
}

function notdefPath() {
  const p = new opentype.Path();
  const outerL = 1 * PX, outerR = 7 * PX;
  const outerB = 0,       outerT = 11 * PX;
  const innerL = 2 * PX, innerR = 6 * PX;
  const innerB = 1 * PX, innerT = 10 * PX;
  p.moveTo(outerL, outerB); p.lineTo(outerR, outerB);
  p.lineTo(outerR, outerT); p.lineTo(outerL, outerT); p.close();
  p.moveTo(innerL, innerB); p.lineTo(innerL, innerT);
  p.lineTo(innerR, innerT); p.lineTo(innerR, innerB); p.close();
  return p;
}

// ─── Collect codepoints ───────────────────────────────────────────────
function collectCodepoints() {
  const set = new Set();
  for (const k of Object.keys(T.GLYPHS)) set.add(+k);
  for (const k of Object.keys(T.DIACRITICS || {})) set.add(+k);
  for (let cp = 0x2500; cp <= 0x257f; cp++) {
    if (T.boxDrawingClean && T.boxDrawingClean(cp)) set.add(cp);
  }
  for (let cp = 0x2580; cp <= 0x259f; cp++) {
    if (T.blockElement && T.blockElement(cp)) set.add(cp);
  }
  return [...set].sort((a, b) => a - b);
}

// ─── Main ──────────────────────────────────────────────────────────────
const cps = collectCodepoints();
console.log(`collected ${cps.length} unique codepoints`);

const notdef = new opentype.Glyph({
  name: '.notdef',
  unicode: 0,
  advanceWidth: ADVANCE,
  path: notdefPath(),
});
const glyphs = [notdef];
let contours = 0;

for (const cp of cps) {
  const bitmap = T.getGlyph(cp);
  if (!bitmap) continue;
  const path = pixelPath(bitmap);
  for (const cmd of path.commands) if (cmd.type === 'Z') contours++;
  const name = 'u' + cp.toString(16).toUpperCase().padStart(4, '0');
  glyphs.push(
    new opentype.Glyph({
      name,
      unicode: cp,
      advanceWidth: ADVANCE,
      path,
    })
  );
}

console.log(`traced ${glyphs.length - 1} glyphs / ${contours} contours`);

const pkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf-8'));
const version = pkg.version.split('-')[0];

const font = new opentype.Font({
  familyName: 'Tessera Mono',
  styleName: 'Regular',
  unitsPerEm: UPM,
  ascender: 11 * PX,     // 704
  descender: -5 * PX,     // -320
  glyphs,
  version: `Version ${version}`,
  description: pkg.description,
  copyright: 'Copyright 2026 Bouraoui Ochi',
  license: 'This Font Software is licensed under the SIL Open Font License, Version 1.1.',
  licenseURL: 'https://openfontlicense.org',
  tables: {
    os2: {
      bFamilyType: 2,    // panose: latin text
      bProportion: 9,    // panose: monospaced
      achVendID: 'ZEXK',
    },
  },
});

const buf = font.toArrayBuffer();
markFixedPitch(buf);
const sizeKb = (buf.byteLength / 1024).toFixed(1);
console.log(`assembled · ${sizeKb} KB`);

// ─── post.isFixedPitch: opentype.js hardcodes 0; patch the binary ──────
function markFixedPitch(buffer) {
  const view = new DataView(buffer);
  const numTables = view.getUint16(4);
  let headRecord = -1;
  let postRecord = -1;
  for (let i = 0; i < numTables; i++) {
    const rec = 12 + i * 16;
    const tag = String.fromCharCode(
      view.getUint8(rec), view.getUint8(rec + 1),
      view.getUint8(rec + 2), view.getUint8(rec + 3));
    if (tag === 'head') headRecord = rec;
    if (tag === 'post') postRecord = rec;
  }
  if (headRecord < 0 || postRecord < 0) throw new Error('head/post table not found');

  const tableChecksum = (offset, length) => {
    let sum = 0;
    for (let i = 0; i < length; i += 4) sum = (sum + view.getUint32(offset + i)) >>> 0;
    return sum;
  };

  // isFixedPitch is at offset 12 within post (version 4 + italicAngle 4 +
  // underlinePosition 2 + underlineThickness 2)
  const postOffset = view.getUint32(postRecord + 8);
  const postLength = view.getUint32(postRecord + 12);
  view.setUint32(postOffset + 12, 1);
  view.setUint32(postRecord + 4, tableChecksum(postOffset, postLength));

  // Recompute head.checkSumAdjustment over the whole font
  const headOffset = view.getUint32(headRecord + 8);
  view.setUint32(headOffset + 8, 0);
  view.setUint32(headOffset + 8, (0xb1b0afba - tableChecksum(0, buffer.byteLength)) >>> 0);
}

const outDir = resolve(ROOT, 'dist');
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
const outPath = resolve(outDir, 'TesseraMono-Regular.ttf');
writeFileSync(outPath, Buffer.from(buf));
console.log(`wrote ${outPath}`);
