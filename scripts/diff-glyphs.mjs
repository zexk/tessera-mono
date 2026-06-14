// diff-glyphs.mjs — Report which codepoints changed vs HEAD, append to edits.log
// Usage: node scripts/diff-glyphs.mjs [--no-log]

import { execSync } from 'node:child_process';
import { readFileSync, appendFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(DIR, '..');
const LOG = resolve(ROOT, 'edits.log');
const noLog = process.argv.includes('--no-log');

const cpLabel = cp => {
  const hex = cp.toString(16).toUpperCase().padStart(4, '0');
  const ch = cp >= 0x21 && cp < 0xe000 ? ` (${String.fromCodePoint(cp)})` : '';
  return `U+${hex}${ch}`;
};

// Build map: codepoint → {start, end} (1-based line numbers) from source text
function parseCodepoints(src, isIcons) {
  const re = isIcons
    ? /reg\(0x([0-9a-fA-F]+),/g
    : /GLYPHS\[0x([0-9a-fA-F]+)\]/g;
  const matches = [];
  let m;
  while ((m = re.exec(src)) !== null) {
    const line = src.slice(0, m.index).split('\n').length;
    matches.push({ cp: parseInt(m[1], 16), line });
  }
  const map = new Map();
  const total = src.split('\n').length;
  for (let i = 0; i < matches.length; i++) {
    const end = i + 1 < matches.length ? matches[i + 1].line - 1 : total;
    map.set(matches[i].cp, { start: matches[i].line, end });
  }
  return map;
}

// Parse unified diff to collect current-file line numbers of added/changed lines
function changedLinesFromDiff(diff) {
  const set = new Set();
  let cur = 0;
  for (const dline of diff.split('\n')) {
    if (dline.startsWith('@@')) {
      const mm = /\+(\d+)/.exec(dline);
      if (mm) cur = parseInt(mm[1]) - 1;
    } else if (dline.startsWith('+') && !dline.startsWith('+++')) {
      set.add(++cur);
    } else if (!dline.startsWith('-')) {
      cur++;
    }
  }
  return set;
}

const FILES = [
  { path: 'src/glyphs.js', isIcons: false, tag: 'glyph' },
  { path: 'src/icons.js',  isIcons: true,  tag: 'icon'  },
];

const results = []; // { cp, tag, file, removed }

for (const { path: f, isIcons, tag } of FILES) {
  let headSrc;
  try {
    headSrc = execSync(`git show HEAD:${f}`, { cwd: ROOT, encoding: 'utf-8' });
  } catch { continue; }

  const curSrc = readFileSync(resolve(ROOT, f), 'utf-8');
  const headMap = parseCodepoints(headSrc, isIcons);
  const curMap  = parseCodepoints(curSrc,  isIcons);

  let diff;
  try {
    diff = execSync(`git diff HEAD -- ${f}`, { cwd: ROOT, encoding: 'utf-8' });
  } catch { continue; }

  if (!diff.trim()) continue;

  const touched = changedLinesFromDiff(diff);

  for (const [cp, range] of curMap) {
    for (const l of touched) {
      if (l >= range.start && l <= range.end) {
        results.push({ cp, tag, file: f });
        break;
      }
    }
  }
  for (const [cp] of headMap) {
    if (!curMap.has(cp)) results.push({ cp, tag, file: f, removed: true });
  }
}

if (results.length === 0) {
  console.log('No glyph changes vs HEAD.');
  process.exit(0);
}

results.sort((a, b) => a.cp - b.cp);

const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
const logLines = [`\n--- ${now} (${results.length} codepoint(s)) ---`];

for (const { cp, tag, removed } of results) {
  const label = `  ${tag.padEnd(5)} ${cpLabel(cp)}${removed ? '  [removed]' : ''}`;
  console.log(label);
  logLines.push(label);
}

console.log(`\n${results.length} codepoint(s) changed.`);
if (!noLog) {
  appendFileSync(LOG, logLines.join('\n') + '\n');
  console.log(`Logged → ${LOG}`);
}
