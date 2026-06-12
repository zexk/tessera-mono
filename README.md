# Tessera Mono

A neoretro bitmap monospace font. 8×16 px cell, hand-drawn pixels, designed to carry the full Nerd Fonts glyphset.

Every glyph is a bitmap at native size and renders as crisp filled paths at any integer scale — no antialiasing, no hinting, just the grid.

## Status

v0.1.0-draft. Basic Latin is complete; Latin diacritics, math operators, arrows, box drawing, Powerline icons, and ~450 Nerd Fonts glyphs are drawn or algorithmic. See the [specimen page](https://zexk.github.io/tessera-mono) for the full atlas.

## Project structure

```
tessera-mono/
├── flake.nix                  # Nix devShell + font package
├── package.json               # Node scripts
├── index.html                 # Type specimen (entry point)
├── build-ttf.html             # Browser-based TTF builder (legacy)
├── src/
│   ├── glyphs.js              # Bitmap glyph data (IIFE → globalThis.TESSERA)
│   ├── icons.js               # Powerline + Nerd Font icons
│   ├── renderer.jsx           # Canvas rendering primitives
│   ├── tweaks-panel.jsx       # Reusable tweak controls
│   └── app.jsx                # Specimen app
├── scripts/
│   ├── build-font.mjs         # Node script: traces bitmaps → TTF via opentype.js
│   ├── check-glyphs.mjs       # Glyph lint: structure + vertical alignment
│   └── bdf2js.mjs             # Read edited BDF back into JS source
├── dist/
│   └── TesseraMono-Regular.ttf  # Built font (80 KB, 565 glyphs)
└── screenshots/
```

## Quick start

### Nix (recommended)

```bash
nix develop        # enter dev shell with node, gbdfed, otf2bdf, ripgrep
npm run build:font  # lint glyphs + build the TTF from source
npm run check       # lint only: row structure, duplicates, alignment
```

Or build the font package directly:

```bash
nix build           # produces result/share/fonts/truetype/TesseraMono-Regular.ttf
```

### Size variants

The TTF is a scalable vector and renders pixel-perfect at any integer
multiple of the 8×16 cell. For terminals, fixed-size OTB bitmap strikes
are also available — they render at their native pixel size regardless
of the requested point size, so no font-size tuning is needed:

```bash
nix build .#otb-1x   # 8×16 px cell
nix build .#otb-2x   # 16×32 px cell — comfortable on 1080p
nix build .#otb-3x   # 24×48 px cell — comfortable on 4k
npm run build:otb    # all three, locally (needs fonttosfnt)
```

### Without Nix

Requires Node 22+.

```bash
npm install
npm run build:font
```

## View the specimen

Open `index.html` in a browser, or serve it:

```bash
npx serve .
```

The specimen lets you toggle weight, rounding, color themes, ligatures, and view the full glyph atlas.

## Editing glyphs

The recommended workflow uses **gbdfed** — a bitmap font editor that works directly with BDF files.

### One-shot edit

```bash
nix develop
npm run edit
```

This runs the full cycle: `build:font → edit:bdf → gbdfed → edit:import → build:font`.

1. Builds the TTF from source
2. Converts it to BDF format via `otf2bdf`
3. Opens `gbdfed` with the BDF file — edit pixels on the 8×16 grid, save
4. Imports your changes back into `src/glyphs.js` and `src/icons.js`
5. Rebuilds the TTF

### Manual step-by-step

```bash
npm run build:font      # 1. Build TTF
npm run edit:bdf        # 2. Export to BDF (dist/TesseraMono-edit.bdf)
gbdfed dist/TesseraMono-edit.bdf   # 3. Edit, save
npm run edit:import     # 4. Import changes to src/
npm run build:font      # 5. Rebuild TTF
```

### Preview without writing

```bash
node scripts/bdf2js.mjs --input dist/TesseraMono-edit.bdf --dry-run
```

### What gbdfed shows

- **Glyph grid** — each glyph on its 8×16 pixel grid
- **Hex codepoint labels** — U+0041, U+E0B0, etc.
- **Navigation** — arrow keys between glyphs
- **Drawing** — click to toggle pixels
- **Metrics** — BBX, advance width, DWIDTH visible in the info panel

### Which glyphs can be edited

- All hand-drawn glyphs in `glyphs.js` (Basic Latin, Latin-1 supplement, math, arrows, dingbats)
- All icon glyphs in `icons.js` (Powerline, Codicons, Octicons, Font Awesome, etc.)

The following are **algorithmic** and cannot be edited through BDF (they regenerate at build time):
- Box drawing characters (U+2500–U+257F)
- Block elements (U+2580–U+259F)
- Diacritic composites (À, é, ñ, etc. — built from base + accent overlay)

## Build pipeline

```
src/glyphs.js ──┐
src/icons.js  ──┤
                ▼
      build-font.mjs ──→ dist/TesseraMono-Regular.ttf
              │
              ▼
        otf2bdf ──→ .bdf ──→ gbdfed (edit) ──→ bdf2js.mjs ──→ src/
```

## License

[SIL Open Font License 1.1](OFL.txt), with Reserved Font Name "Tessera Mono".
