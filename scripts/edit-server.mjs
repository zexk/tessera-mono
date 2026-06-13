// edit-server.mjs — tiny zero-dep web editor for src/glyphs.js + src/icons.js
//
// Run:  node scripts/edit-server.mjs   (or `npm run edit:web`, inside `nix develop`)
// Then open the printed http://localhost URL.
//
// Pick a glyph → paint the 8×16 grid (left-click draw, right-click erase) → Save
// writes the edited block straight back into the right source file, preserving the
// codepoint, its label (or name+group), and the rest of the file untouched.

import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(DIR, '..', 'src');
const EDITOR_HTML = resolve(DIR, 'editor.html');
const PORT = Number(process.env.PORT) || 8009;

// Two source formats, same 8×16 bitmap body:
//   glyphs.js:  GLYPHS[0x69] = G(/* i */`\n…`)
//   icons.js:   reg(0xe0b0, 'nf-pl-right-solid', 'Powerline', `\n…`)
const FILES = {
  glyphs: {
    path: resolve(SRC, 'glyphs.js'),
    parse: /GLYPHS\[0x([0-9a-fA-F]+)\] = G\((?:\/\*(.*?)\*\/)?`\n([^`]*)`\)/g,
    body: 3,
    label: (m) => (m[2] || '').trim(),
    block: (cp) =>
      new RegExp('(GLYPHS\\[0x' + cp.toString(16) + '\\] = G\\((?:/\\*.*?\\*/)?`\\n)([^`]*)(`\\))'),
  },
  icons: {
    path: resolve(SRC, 'icons.js'),
    parse: /reg\(0x([0-9a-fA-F]+),\s*'([^']*)',\s*'([^']*)',\s*`\n([^`]*)`\)/g,
    body: 4,
    label: (m) => (m[3] || '') + ' / ' + (m[2] || ''),
    block: (cp) =>
      new RegExp("(reg\\(0x" + cp.toString(16) + ",\\s*'[^']*',\\s*'[^']*',\\s*`\\n)([^`]*)(`\\))"),
  },
};

async function listFrom(key) {
  const cfg = FILES[key];
  const src = await readFile(cfg.path, 'utf8');
  const out = [];
  cfg.parse.lastIndex = 0;
  let m;
  while ((m = cfg.parse.exec(src))) {
    const rows = m[cfg.body].split('\n').filter((r) => r !== '');
    if (rows.length !== 16) continue;
    out.push({ cp: parseInt(m[1], 16), label: cfg.label(m), rows, src: key });
  }
  return out;
}

async function listAll() {
  const sets = await Promise.all(Object.keys(FILES).map(listFrom));
  return sets.flat();
}

const validRows = (rows) =>
  Array.isArray(rows) &&
  rows.length === 16 &&
  rows.every((r) => typeof r === 'string' && /^[#.]{8}$/.test(r));

async function saveGlyph(key, cp, rows) {
  const cfg = FILES[key];
  const src = await readFile(cfg.path, 'utf8');
  const re = cfg.block(cp);
  if (!re.test(src)) throw new Error('no editable block for 0x' + cp.toString(16) + ' in ' + key);
  const next = src.replace(re, (_, pre, _old, post) => pre + rows.join('\n') + post);
  if (next !== src) await writeFile(cfg.path, next);
}

const send = (res, code, type, body) => {
  res.writeHead(code, { 'content-type': type });
  res.end(body);
};

const server = createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/')
      return send(res, 200, 'text/html; charset=utf-8', await readFile(EDITOR_HTML, 'utf8'));

    if (req.method === 'GET' && req.url === '/api/glyphs')
      return send(res, 200, 'application/json', JSON.stringify(await listAll()));

    if (req.method === 'POST' && req.url === '/api/save') {
      let raw = '';
      for await (const chunk of req) raw += chunk;
      const { src, cp, rows } = JSON.parse(raw || '{}');
      if (!FILES[src] || !Number.isInteger(cp) || !validRows(rows))
        return send(res, 400, 'application/json', JSON.stringify({ error: 'bad payload' }));
      await saveGlyph(src, cp, rows);
      return send(res, 200, 'application/json', JSON.stringify({ ok: true }));
    }

    send(res, 404, 'text/plain', 'not found');
  } catch (e) {
    send(res, 500, 'application/json', JSON.stringify({ error: String(e.message || e) }));
  }
});

server.listen(PORT, () => {
  console.log('tessera glyph editor → http://localhost:' + PORT);
  console.log('editing ' + FILES.glyphs.path + ' + ' + FILES.icons.path);
});
