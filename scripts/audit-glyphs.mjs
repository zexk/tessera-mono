// Report visual-weight and optical-centering outliers in the bitmap source.
// This is diagnostic: unusual symbols can be intentional, so it never fails CI.

import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
globalThis.window = globalThis;
await import(resolve(ROOT, 'src/glyphs.js'));
await import(resolve(ROOT, 'src/icons.js'));
const T = globalThis.TESSERA;

const popcount = n => {
  let count = 0;
  for (; n; n >>>= 1) count += n & 1;
  return count;
};

function stats(bitmap) {
  let pixels = 0;
  let moment = 0;
  let minX = 8;
  let maxX = -1;
  for (let y = 0; y < 16; y++) {
    const row = bitmap[y] || 0;
    pixels += popcount(row);
    for (let x = 0; x < 8; x++) if (row & (1 << (7 - x))) {
      moment += x;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
    }
  }
  return { pixels, center: pixels ? moment / pixels : 3.5, minX, maxX };
}

const label = cp => `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`;
const entries = Object.keys(T.GLYPHS).map(Number).map(cp => ({ cp, ...stats(T.GLYPHS[cp]) }));
const ascii = entries.filter(g => g.cp >= 0x21 && g.cp <= 0x7e);
const textMedian = ascii.map(g => g.pixels).sort((a, b) => a - b)[Math.floor(ascii.length / 2)];
const icons = entries.filter(g => g.cp >= 0xe000);

const heavy = icons.filter(g => g.pixels > textMedian * 2.25).sort((a, b) => b.pixels - a.pixels);
const offCenter = icons.filter(g => g.pixels >= 4 && Math.abs(g.center - 3.5) > 1.15)
  .sort((a, b) => Math.abs(b.center - 3.5) - Math.abs(a.center - 3.5));

console.log(`reference: printable ASCII median = ${textMedian} pixels`);
console.log(`coverage: ${entries.length} stored glyphs; ${icons.length} private-use icons`);
console.log(`\nheavy icons (> ${Math.floor(textMedian * 2.25)} pixels): ${heavy.length}`);
for (const g of heavy.slice(0, 40)) console.log(`  ${label(g.cp)}  ${g.pixels} px  center ${g.center.toFixed(2)}`);
if (heavy.length > 40) console.log(`  … ${heavy.length - 40} more`);
console.log(`\noff-center icons (mass center > 1.15 px from cell center): ${offCenter.length}`);
for (const g of offCenter.slice(0, 40)) console.log(`  ${label(g.cp)}  ${g.pixels} px  center ${g.center.toFixed(2)}`);
if (offCenter.length > 40) console.log(`  … ${offCenter.length - 40} more`);
