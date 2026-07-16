# Tessera Mono design rules

Use this as the acceptance checklist for every new or revised glyph. The grid is
the source of truth; exceptions should improve recognition at native 8×16 size.

## Grid and vertical zones

- Every glyph occupies an 8×16 cell and advances exactly 8 pixels.
- The baseline is row 10 (zero-indexed).
- Capitals and digits normally begin on row 2; x-height letters on row 4.
- Descenders may reach row 12. Rows 0–1 and 13–15 are breathing room and accent
  reserve, not ordinary drawing space.
- Test accents and adjacent lines before using the reserve rows.

## Stroke and shape language

- One pixel is the normal text stroke. Two-pixel masses are reserved for joins,
  counters that require them, and intentionally solid symbols.
- Prefer square terminals and clipped corners. A curve is a deliberate staircase,
  not an attempt to imitate antialiased type.
- Reuse bowl, shoulder, diagonal, and terminal patterns across related letters.
- Preserve counters at native size. If a counter closes at 1×, simplify the form.
- Diagonals should progress regularly; avoid isolated pixels unless they are the
  only way to preserve identity.

## Spacing and optical centering

- Monospace advance does not imply mechanically centered ink. Center perceived
  mass, especially for `i l t f`, punctuation, diagonals, and asymmetric icons.
- Keep at least one empty side column for ordinary text unless the glyph must join
  its neighbors (box drawing, blocks, and Powerline separators).
- Judge strings, not only isolated glyphs. Side-bearing rhythm should remain even
  in `minimum`, `Il1|`, `rn`, paths, and bracket runs.

## Recognition

- Review `0 O o Q`, `1 l I i |`, `2 Z z`, `5 S s`, `6 G`, `8 B`, `rn m`, and
  `cl d` after changing any member of those groups.
- Punctuation must remain visible beside letters without becoming darker than the
  text. Quotes, comma/period, colon/semicolon, hyphen/underscore, and brackets are
  mandatory proof strings.
- A stylistic alternate must not be the only legible version of a character.

## Icons

- Match the perceived weight of the alphabet whenever the source icon permits.
- Treat solid icons as explicit exceptions. Do not fill a glyph merely because
  the upstream vector is filled.
- Optical centering takes priority over equal empty columns.
- Inspect icons inside a real prompt and beside text, not only in the atlas.
- Run `npm run audit:glyphs`; investigate density and centering outliers rather
  than automatically changing every reported glyph.

## Acceptance proof

Review the specimen’s Recognition proofs at 1× and 2×, then test JavaScript,
Zig, shell paths, JSON, and a diff in at least one terminal and one editor. A
glyph is ready when it is recognizable, rhythmically consistent, and does not
force unexpected line height.
