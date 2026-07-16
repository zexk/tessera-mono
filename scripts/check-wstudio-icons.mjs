// Verify that Tessera covers every Nerd Font codepoint used by wstudio.

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const wstudio = resolve(ROOT, process.argv[2] || '../wstudio');
const iconSource = readFileSync(resolve(ROOT, 'src/icons.js'), 'utf8');
const wstudioSource = readFileSync(resolve(wstudio, 'src/tui/icons.zig'), 'utf8');

const tessera = new Set(
  [...iconSource.matchAll(/reg\(0x([0-9a-fA-F]+),/g)].map(match =>
    Number.parseInt(match[1], 16)
  )
);
const required = new Set(
  [...wstudioSource.matchAll(/\\u\{([0-9a-fA-F]+)\}/g)].map(match =>
    Number.parseInt(match[1], 16)
  )
);
const missing = [...required].filter(cp => !tessera.has(cp)).sort((a, b) => a - b);

if (missing.length) {
  console.error(`missing wstudio icons: ${missing.map(cp => `U+${cp.toString(16).toUpperCase()}`).join(', ')}`);
  process.exit(1);
}
console.log(`wstudio coverage: ${required.size}/${required.size} unique icon codepoints`);
