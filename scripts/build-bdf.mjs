// build-bdf.mjs — Emit a BDF bitmap font at an integer scale.
//
// Generates the strike directly from the glyph data (no TTF roundtrip):
// each bitmap pixel becomes an N×N block. Pack the result into an OTB
// with fonttosfnt for pixel-perfect terminal rendering:
//
//   node scripts/build-bdf.mjs --scale 2 --output dist/TesseraMono-2x.bdf
//   fonttosfnt -o dist/TesseraMono-2x.otb dist/TesseraMono-2x.bdf

import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(DIR, '..');

globalThis.window = globalThis;
await import(resolve(ROOT, 'src/glyphs.js'));
await import(resolve(ROOT, 'src/icons.js'));
const T = globalThis.TESSERA;

// ─── CLI ───────────────────────────────────────────────────────────────
const args = { scale: 1, output: null };
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a === '--scale' && i + 1 < process.argv.length) args.scale = +process.argv[++i];
  else if (a === '--output' && i + 1 < process.argv.length) args.output = process.argv[++i];
}
if (!Number.isInteger(args.scale) || args.scale < 1 || args.scale > 8) {
  console.error('--scale must be an integer 1-8');
  process.exit(1);
}
const N = args.scale;
const out = args.output || `dist/TesseraMono-${N}x.bdf`;

const CELL_W = T.CELL_W;          // 8
const CELL_H = T.CELL_H;          // 16
const ASCENT = 11;                // rows above baseline (matches TTF ascender)
const DESCENT = CELL_H - ASCENT;  // 5

// ─── Collect codepoints (same set as build-font.mjs) ──────────────────
const set = new Set();
for (const k of Object.keys(T.GLYPHS)) set.add(+k);
for (const k of Object.keys(T.DIACRITICS || {})) set.add(+k);
for (let cp = 0x2500; cp <= 0x257f; cp++) if (T.boxDrawingClean(cp)) set.add(cp);
for (let cp = 0x2580; cp <= 0x259f; cp++) if (T.blockElement(cp)) set.add(cp);
const cps = [...set].sort((a, b) => a - b).filter(cp => T.getGlyph(cp));

// ─── Tight bounding box of a bitmap, in cell pixels ────────────────────
function inkBox(bitmap) {
  let x0 = CELL_W, x1 = 0, y0 = CELL_H, y1 = 0;
  for (let y = 0; y < CELL_H; y++) {
    const row = bitmap[y] || 0;
    if (!row) continue;
    y0 = Math.min(y0, y);
    y1 = Math.max(y1, y + 1);
    for (let x = 0; x < CELL_W; x++) {
      if ((row >>> (7 - x)) & 1) {
        x0 = Math.min(x0, x);
        x1 = Math.max(x1, x + 1);
      }
    }
  }
  return y1 > y0 ? { x0, x1, y0, y1 } : null;
}

// ─── Scale a row slice [x0,x1) to N bits per pixel, hex, byte-padded ───
function scaleRow(row, x0, x1) {
  const w = (x1 - x0) * N;
  const bytes = Math.ceil(w / 8);
  let bits = 0n;
  for (let x = x0; x < x1; x++) {
    bits <<= BigInt(N);
    if ((row >>> (7 - x)) & 1) bits |= (1n << BigInt(N)) - 1n;
  }
  bits <<= BigInt(bytes * 8 - w); // pad to byte boundary on the right
  return bits.toString(16).toUpperCase().padStart(bytes * 2, '0');
}

// ─── Emit BDF ──────────────────────────────────────────────────────────
const W = CELL_W * N;
const H = CELL_H * N;
const lines = [];
lines.push('STARTFONT 2.1');
lines.push(`FONT -zexk-Tessera Mono-Regular-R-Normal--${H}-${H * 10}-72-72-C-${W * 10}-ISO10646-1`);
lines.push(`SIZE ${H} 72 72`);
lines.push(`FONTBOUNDINGBOX ${W} ${H} 0 ${-DESCENT * N}`);
lines.push('STARTPROPERTIES 14');
lines.push('FOUNDRY "zexk"');
lines.push('FAMILY_NAME "Tessera Mono"');
lines.push('WEIGHT_NAME "Regular"');
lines.push('SLANT "R"');
lines.push('SETWIDTH_NAME "Normal"');
lines.push('SPACING "C"');
lines.push(`PIXEL_SIZE ${H}`);
lines.push(`POINT_SIZE ${H * 10}`);
lines.push('RESOLUTION_X 72');
lines.push('RESOLUTION_Y 72');
// FreeType keys the Unicode charmap off these two properties; without
// them fonttosfnt emits a symbol cmap and all char lookups fail
lines.push('CHARSET_REGISTRY "ISO10646"');
lines.push('CHARSET_ENCODING "1"');
lines.push(`FONT_ASCENT ${ASCENT * N}`);
lines.push(`FONT_DESCENT ${DESCENT * N}`);
lines.push('ENDPROPERTIES');
lines.push(`CHARS ${cps.length}`);

for (const cp of cps) {
  const bitmap = T.getGlyph(cp);
  lines.push(`STARTCHAR u${cp.toString(16).toUpperCase().padStart(4, '0')}`);
  lines.push(`ENCODING ${cp}`);
  lines.push(`SWIDTH ${Math.round((W / H) * 1000)} 0`);
  lines.push(`DWIDTH ${W} 0`);
  const box = inkBox(bitmap);
  if (!box) {
    lines.push('BBX 0 0 0 0');
    lines.push('BITMAP');
  } else {
    const { x0, x1, y0, y1 } = box;
    // yoff = bottom edge of the box relative to the baseline (row ASCENT-1
    // is the last row above it)
    const yoff = (ASCENT - y1) * N;
    lines.push(`BBX ${(x1 - x0) * N} ${(y1 - y0) * N} ${x0 * N} ${yoff}`);
    lines.push('BITMAP');
    for (let y = y0; y < y1; y++) {
      const hex = scaleRow(bitmap[y] || 0, x0, x1);
      for (let r = 0; r < N; r++) lines.push(hex);
    }
  }
  lines.push('ENDCHAR');
}
lines.push('ENDFONT');

mkdirSync(dirname(resolve(ROOT, out)), { recursive: true });
writeFileSync(resolve(ROOT, out), lines.join('\n') + '\n');
console.log(`wrote ${out} · ${cps.length} glyphs · ${W}×${H} px cell`);
