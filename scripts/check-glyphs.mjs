// check-glyphs.mjs — Lint bitmap glyph sources
//
// Structural errors (exit 1):
//   - bitmap with a row count ≠ 16 or a row that isn't exactly 8 of [#.]
//     (G() silently drops short rows, shifting the whole glyph)
//   - the same codepoint defined twice
//
// Consistency warnings (exit 0):
//   - letters/digits that miss the baseline or leak into the line gap
//   - lowercase that misses x-height, caps/digits that miss cap height
//
// Usage: node scripts/check-glyphs.mjs

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(DIR, '..');

const BASELINE = 10;
const CAP_TOP = 2;
const X_TOP = 4;
const DESC_BOTTOM = 12;

let errors = 0;
let warnings = 0;

const cpLabel = cp =>
  'U+' + cp.toString(16).toUpperCase().padStart(4, '0') +
  (cp >= 0x21 && cp < 0xe000 ? ` (${String.fromCodePoint(cp)})` : '');

// ─── Structural: validate raw template literals ────────────────────────
function checkSource(file, blockRe) {
  const content = readFileSync(resolve(ROOT, 'src', file), 'utf-8');
  const seen = new Map();
  let match;
  while ((match = blockRe.exec(content)) !== null) {
    const cp = parseInt(match[1], 16);
    const body = match[2];
    const line = content.slice(0, match.index).split('\n').length;
    const where = `${file}:${line} ${cpLabel(cp)}`;

    if (seen.has(cp)) {
      console.error(`ERROR ${where} — already defined at ${file}:${seen.get(cp)}`);
      errors++;
    }
    seen.set(cp, line);

    const rows = body.split('\n').filter(r => r !== '');
    if (rows.length !== 16) {
      console.error(`ERROR ${where} — ${rows.length} rows, expected 16`);
      errors++;
    }
    for (const r of rows) {
      if (!/^[#.]{8}$/.test(r)) {
        console.error(`ERROR ${where} — bad row ${JSON.stringify(r)}`);
        errors++;
      }
    }
  }
  return seen.size;
}

const nGlyphs = checkSource(
  'glyphs.js',
  /GLYPHS\[0x([0-9a-fA-F]+)\] = G\((?:\/\*[^*]*\*\/)?`\n([^`]*)`\)/g
);
const nIcons = checkSource(
  'icons.js',
  /reg\(0x([0-9a-fA-F]+),\s*'[^']*',\s*'[^']*',\s*`\n([^`]*)`\)/g
);
console.log(`structure: ${nGlyphs} glyphs + ${nIcons} icons checked`);

// ─── Consistency: load the data and check vertical alignment ───────────
globalThis.window = globalThis;
await import(resolve(ROOT, 'src/glyphs.js'));
const T = globalThis.TESSERA;

const inkRows = bitmap => {
  const rows = [];
  for (let y = 0; y < 16; y++) if (bitmap[y]) rows.push(y);
  return rows;
};

const DESCENDERS = new Set([...'gjpqyµ'].map(c => c.codePointAt(0)));
const CAPS_DIGITS = [];
for (let cp = 0x30; cp <= 0x39; cp++) CAPS_DIGITS.push(cp);
for (let cp = 0x41; cp <= 0x5a; cp++) CAPS_DIGITS.push(cp);
const LOWER = [];
for (let cp = 0x61; cp <= 0x7a; cp++) LOWER.push(cp);
// lowercase whose top should sit exactly at x-height (i/j dots sit higher)
const X_HEIGHT = new Set([...'acemnorsuvwxyz'].map(c => c.codePointAt(0)));

function warn(cp, msg) {
  console.warn(`warn  ${cpLabel(cp)} — ${msg}`);
  warnings++;
}

for (const cp of [...CAPS_DIGITS, ...LOWER]) {
  const g = T.GLYPHS[cp];
  if (!g) continue;
  const rows = inkRows(g);
  if (!rows.includes(BASELINE)) warn(cp, 'no ink on baseline (row 10)');
  const bottom = rows[rows.length - 1];
  const allowed = (DESCENDERS.has(cp) || cp === 0x51 /* Q */) ? DESC_BOTTOM : BASELINE;
  if (bottom > allowed) warn(cp, `ink below row ${allowed} (reaches ${bottom})`);
}
for (const cp of CAPS_DIGITS) {
  if (T.GLYPHS[cp] && inkRows(T.GLYPHS[cp])[0] !== CAP_TOP)
    warn(cp, `top at row ${inkRows(T.GLYPHS[cp])[0]}, cap height is row ${CAP_TOP}`);
}
for (const cp of LOWER) {
  if (X_HEIGHT.has(cp) && T.GLYPHS[cp] && inkRows(T.GLYPHS[cp])[0] !== X_TOP)
    warn(cp, `top at row ${inkRows(T.GLYPHS[cp])[0]}, x-height is row ${X_TOP}`);
}

console.log(`alignment: ${warnings} warning(s)`);
if (errors > 0) {
  console.error(`\n${errors} structural error(s)`);
  process.exit(1);
}
