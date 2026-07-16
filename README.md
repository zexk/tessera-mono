# Tessera Mono

A neoretro bitmap monospace font. 8×16 px cell, hand-drawn pixels, designed to carry the full Nerd Fonts glyphset.

Every glyph is a bitmap at native size and renders as crisp filled paths at any integer scale: no antialiasing, no hinting, just the grid.

## Status

v0.1.0-draft. Basic Latin is complete; Latin diacritics, math operators, arrows, box drawing, Powerline icons, and ~450 Nerd Fonts glyphs are drawn or algorithmic. See the [specimen page](https://zexk.github.io/tessera-mono) for the full atlas.

## Project structure

```
tessera-mono/
├── flake.nix                  # Nix devShell + font package
├── package.json               # Node scripts
├── index.html                 # Type specimen (entry point)
├── src/
│   ├── glyphs.js              # Bitmap glyph data (IIFE → globalThis.TESSERA)
│   ├── icons.js               # Powerline + Nerd Font icons
│   ├── renderer.jsx           # Canvas rendering primitives
│   ├── tweaks-panel.jsx       # Reusable tweak controls
│   └── app.jsx                # Specimen app
├── scripts/
│   ├── edit-server.mjs        # Browser-based glyph editor (zero-dep HTTP server)
│   ├── editor.html            # Editor UI (pixel grid, Nerd Font reference pane)
│   ├── build-font.mjs         # Traces bitmaps → TTF via opentype.js
│   ├── check-glyphs.mjs       # Glyph lint: structure + vertical alignment
│   └── bdf2js.mjs             # Import edited BDF back into JS source
├── dist/
│   └── TesseraMono-Regular.ttf  # Built font (80 KB, 565 glyphs)
└── screenshots/
```

## Quick start

### Nix (recommended)

```bash
nix develop        # enter dev shell with node, otf2bdf, ripgrep
npm run build:font  # lint glyphs + build the TTF from source
npm run check       # lint only: row structure, duplicates, alignment
npm run audit:glyphs # report unusually heavy or off-center icons
```

Or build the font package directly:

```bash
nix build           # produces result/share/fonts/truetype/TesseraMono-Regular.ttf
```

### Size variants

The TTF is a scalable vector and renders pixel-perfect at any integer
multiple of the 8×16 cell. For terminals, fixed-size OTB bitmap strikes
are also available; they render at their native pixel size regardless
of the requested point size, so no font-size tuning is needed:

```bash
nix build .#otb-1x   # 8×16 px cell
nix build .#otb-2x   # 16x32 px cell, comfortable on 1080p
nix build .#otb-3x   # 24x48 px cell, comfortable on 4k
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
It also includes permanent confusable-character and real-code proofs. Review new
glyphs against the rules in [`docs/design-rules.md`](docs/design-rules.md).

## Editing glyphs

The recommended workflow uses the built-in browser editor; no external tools required.

```bash
npm run edit:web    # start editor at http://localhost:8009
```

Then open the URL in a browser. Pick a glyph from the sidebar, paint the 8×16 grid, and save. Changes write directly into `src/glyphs.js` or `src/icons.js`; rebuild the font afterward:

```bash
npm run build:font
```

### Editor features

- **Sidebar**: filter by character, hex codepoint (`69`, `e0b0`), or name (`git`, `arrow`); scope buttons narrow to Latin / Icons / All
- **Pixel grid**: left-click draws, right-click erases, drag to paint
- **Nerd Font reference pane**: press `r` or click the NF ref button to open a side-by-side reference rendered from the installed Nerd Font (auto-detected from `$NERD_FONT_DIR` or `~/.nix-profile`)
- **Save**: `Cmd/Ctrl+S` or the Save button; writes only the changed glyph block, leaves the rest of the file untouched
- **Revert / Clear**: undo unsaved edits or wipe the glyph

### Which glyphs can be edited

- All hand-drawn glyphs in `src/glyphs.js` (Basic Latin, Latin-1 supplement, math, arrows, dingbats)
- All icon glyphs in `src/icons.js` (Powerline, Codicons, Octicons, Font Awesome, etc.)

The following are **algorithmic** and regenerate at build time, editing them has no effect:
- Box drawing characters (U+2500-U+257F)
- Block elements (U+2580-U+259F)
- Diacritic composites (À, é, ñ, etc., built from base + accent overlay)

### Verifying Nerd Font icons

The dev shell includes FreeType, Pillow, fontTools, and the pinned Nerd Fonts
Symbols font. Render side-by-side contact sheets of the reference outlines and
Tessera bitmaps with:

```bash
npm run verify:icons
npm run verify:icons -- --group Media
npm run verify:icons -- --codepoints f04b,f04c,f04d
```

The sheets are written to `screenshots/icon-verification/` by default. Use
`npm run check:wstudio` to confirm that every icon codepoint currently used by
the sibling `../wstudio` checkout is present.

### BDF round-trip (legacy)

The old gbdfed-based workflow is still available if you need it:

```bash
npm run build:font                         # 1. build TTF
npm run edit:bdf                           # 2. export to dist/TesseraMono-edit.bdf
gbdfed dist/TesseraMono-edit.bdf           # 3. edit in gbdfed, save
npm run edit:import                        # 4. import changes back to src/
npm run build:font                         # 5. rebuild
```

Or as a single command: `npm run edit` (requires `gbdfed` and `otf2bdf` in `PATH`).

## Build pipeline

```
  edit:web (browser pixel editor)
  └─ paint glyph → Save → writes directly to src/
                                    │
src/glyphs.js ──┐                   │
src/icons.js  ──┤ ◄─────────────────┘
                ▼
      build-font.mjs ──→ dist/TesseraMono-Regular.ttf
```

## License

[SIL Open Font License 1.1](OFL.txt), with Reserved Font Name "Tessera Mono".
