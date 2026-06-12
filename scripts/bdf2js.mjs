// bdf2js.mjs — Read edited BDF back into src/glyphs.js and src/icons.js
//
// Usage:
//   node scripts/bdf2js.mjs --input dist/TesseraMono-edit.bdf
//   node scripts/bdf2js.mjs --input dist/TesseraMono-edit.bdf --dry-run
//
// The BDF must come from the same glyph set (same codepoints) that
// build-font.mjs produces.  Algorithmic glyphs (box drawing, block
// elements, diacritic composites) are skipped — they are generated
// at build time and have no direct GLYPHS[] entry to update.

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(DIR, '..');
const SRC = resolve(ROOT, 'src');

const BASELINE = 10;     // must match glyphs.js
const CELL_W = 8;
const CELL_H = 16;

// ─── CLI ───────────────────────────────────────────────────────────────
const args = {};
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a === '--input' && i + 1 < process.argv.length) args.input = process.argv[++i];
  else if (a === '--dry-run') args.dryRun = true;
  else if (a === '--threshold' && i + 1 < process.argv.length) args.threshold = +process.argv[++i];
}
if (!args.input) {
  console.error('Usage: node scripts/bdf2js.mjs --input <file.bdf> [--dry-run]');
  process.exit(1);
}

// ─── BDF parser ────────────────────────────────────────────────────────
function parseBdf(filepath) {
  const text = readFileSync(filepath, 'utf-8');
  const glyphs = {};

  const charRe = /STARTCHAR\s+\S+\n([\s\S]*?)ENDCHAR/g;
  let match;
  while ((match = charRe.exec(text)) !== null) {
    const block = match[1];

    const enc = block.match(/ENCODING\s+(\d+)/);
    if (!enc) continue;
    const cp = +enc[1];

    const bbx = block.match(/BBX\s+(\d+)\s+(\d+)\s+(-?\d+)\s+(-?\d+)/);
    if (!bbx) continue;
    const w = +bbx[1], h = +bbx[2], xoff = +bbx[3], yoff = +bbx[4];

    // block is content between STARTCHAR and ENDCHAR (no ENDCHAR in it)
    const bm = block.match(/BITMAP\n([\s\S]*)$/);
    if (!bm) continue;
    const hexRows = bm[1].split('\n').map(r => r.trim()).filter(r => r.length > 0);

    glyphs[cp] = { w, h, xoff, yoff, hexRows };
  }
  return glyphs;
}

// ─── Convert BDF row to our 8-bit row byte ─────────────────────────────
function bdfRowToByte(hex, w, xoff) {
  let ourByte = 0;
  for (let b = 0; b < w; b++) {
    if ((hex >>> (7 - b)) & 1) {
      ourByte |= (1 << (7 - (xoff + b)));
    }
  }
  return ourByte;
}

// ─── Convert our bitmap to #/. string (exactly 16 lines) ────────────────
function bitmapToString(bitmap) {
  let s = '';
  for (let i = 0; i < 16; i++) {
    const row = bitmap[i] || 0;
    let line = '';
    for (let j = 0; j < 8; j++) {
      line += (row & (1 << (7 - j))) ? '#' : '.';
    }
    s += '\n' + line;
  }
  return s;
}

// ─── Parse bitmaps from BDF glyph block ────────────────────────────────
function bdfToOurBitmap(bdfGlyph) {
  const { w, h, xoff, yoff, hexRows } = bdfGlyph;
  if (w === 0 || h === 0) return new Uint8Array(16); // empty glyph (space)

  const bitmap = new Uint8Array(16);
  for (let i = 0; i < hexRows.length && i < h; i++) {
    const hex = parseInt(hexRows[i], 16);
    const ourRow = BASELINE - yoff - h + 1 + i;
    if (ourRow < 0 || ourRow >= 16) continue;
    bitmap[ourRow] = bdfRowToByte(hex, w, xoff);
  }
  return bitmap;
}

// ─── Bitmap equality ───────────────────────────────────────────────────
function bitmapsEqual(a, b) {
  for (let i = 0; i < 16; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

// ─── Source file updaters ──────────────────────────────────────────────

// ─── Parse an old bitmap string (from template literal) into Uint8Array ──
function parseOldBitmap(str) {
  const rows = str.split('\n');
  // Template literal has leading newline; skip first empty element
  const off = rows[0] === '' ? 1 : 0;
  const arr = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    const r = (rows[off + i] || '........').slice(0, 8);
    let n = 0;
    for (let j = 0; j < 8; j++) if (r[j] === '#') n |= (1 << (7 - j));
    arr[i] = n;
  }
  return arr;
}

// Update glyphs.js: replace GLYPHS[0xNN] = G(`...`) blocks
function updateGlyphsJs(content, bdfGlyphs) {
  const re = /(\s*GLYPHS\[0x([0-9a-fA-F]+)\] = G\(\/\*[^*]*\*\/`)([^`]*)`\);?/g;
  let changed = 0;
  const result = content.replace(re, (match, prefix, hex, oldBitmap) => {
    const cp = parseInt(hex, 16);
    const bdf = bdfGlyphs[cp];
    if (!bdf) return match;
    const newBitmap = bdfToOurBitmap(bdf);
    const oldArr = parseOldBitmap(oldBitmap);
    if (bitmapsEqual(oldArr, newBitmap)) return match;
    changed++;
    const newStr = bitmapToString(newBitmap);
    if (args.dryRun) {
      const ch = cp >= 32 ? String.fromCodePoint(cp) : '';
      console.log(`  U+${cp.toString(16).toUpperCase().padStart(4,'0')} ${ch ? `(${ch})` : ''} — changed`);
    }
    return prefix + newStr + '`);';
  });
  return { result, changed };
}

// Update icons.js: replace reg(0xNNNN, 'name', 'group', `...`) blocks
function updateIconsJs(content, bdfGlyphs) {
  const re = /(\s*reg\(0x([0-9a-fA-F]+),\s*'[^']*',\s*'[^']*',\s*`)([^`]*)`\);?/g;
  let changed = 0;
  const result = content.replace(re, (match, prefix, hex, oldBitmap) => {
    const cp = parseInt(hex, 16);
    const bdf = bdfGlyphs[cp];
    if (!bdf) return match;
    const newBitmap = bdfToOurBitmap(bdf);
    const oldArr = parseOldBitmap(oldBitmap);
    if (bitmapsEqual(oldArr, newBitmap)) return match;
    changed++;
    if (args.dryRun) {
      console.log(`  U+${cp.toString(16).toUpperCase().padStart(4,'0')} (icon) — changed`);
    }
    return prefix + bitmapToString(newBitmap) + '`);';
  });
  return { result, changed };
}

// ─── Main ──────────────────────────────────────────────────────────────
async function main() {
  // 1. Load glyph data to know which codepoints are algorithmic
  globalThis.window = globalThis;
  await import(resolve(SRC, 'glyphs.js'));
  await import(resolve(SRC, 'icons.js'));
  const T = globalThis.TESSERA;

  const algorithmic = new Set();
  for (const k of Object.keys(T.DIACRITICS || {})) algorithmic.add(+k);
  for (let cp = 0x2500; cp <= 0x257f; cp++) algorithmic.add(cp);
  for (let cp = 0x2580; cp <= 0x259f; cp++) algorithmic.add(cp);

  // 2. Parse BDF
  console.log(`Reading ${args.input} …`);
  const bdfGlyphs = parseBdf(args.input);
  console.log(`  ${Object.keys(bdfGlyphs).length} codepoints in BDF`);

  // 3. Filter to non-algorithmic
  for (const cp of algorithmic) delete bdfGlyphs[cp];
  console.log(`  ${Object.keys(bdfGlyphs).length} after removing algorithmic`);

  // 4. Update glyphs.js
  const glyphsPath = resolve(SRC, 'glyphs.js');
  let glyphsContent = readFileSync(glyphsPath, 'utf-8');
  const { result: glyphsResult, changed: glyphsChanged } = updateGlyphsJs(glyphsContent, bdfGlyphs);

  // 5. Update icons.js
  const iconsPath = resolve(SRC, 'icons.js');
  let iconsContent = readFileSync(iconsPath, 'utf-8');
  const { result: iconsResult, changed: iconsChanged } = updateIconsJs(iconsContent, bdfGlyphs);

  // 6. Write (or dry-run)
  const total = glyphsChanged + iconsChanged;
  console.log(`\n${total} glyph(s) changed`);

  if (args.dryRun) {
    console.log('(dry run — no files written)');
    return;
  }

  if (glyphsChanged > 0) {
    writeFileSync(glyphsPath, glyphsResult);
    console.log(`  wrote ${glyphsPath}`);
  }
  if (iconsChanged > 0) {
    writeFileSync(iconsPath, iconsResult);
    console.log(`  wrote ${iconsPath}`);
  }
  if (total === 0) {
    console.log('  No changes needed.');
  }
}

main();
