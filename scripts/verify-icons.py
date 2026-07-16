#!/usr/bin/env python3
"""Render Nerd Fonts reference glyphs beside Tessera's 8x16 bitmaps."""

import argparse
import math
import os
import re
from pathlib import Path

import freetype
from PIL import Image, ImageDraw, ImageFont
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
ENTRY_RE = re.compile(
    r"reg\(0x([0-9a-fA-F]+),\s*'([^']+)',\s*'([^']+)',"
    r"\s*(?:/\*.*?\*/)?\s*`([^`]+)`\)",
    re.S,
)


def find_reference_font(explicit):
    candidates = []
    if explicit:
        candidates.append(Path(explicit))
    if os.environ.get("NERD_FONT_DIR"):
        candidates.extend(Path(os.environ["NERD_FONT_DIR"]).rglob("SymbolsNerdFontMono-Regular.ttf"))
    candidates.extend(Path("/run/current-system/sw/share/fonts").rglob("SymbolsNerdFontMono-Regular.ttf"))
    for path in candidates:
        if path.is_file():
            return path
    raise SystemExit("SymbolsNerdFontMono-Regular.ttf not found; enter `nix develop` or pass --font")


def parse_codepoints(value):
    if not value:
        return None
    return {int(item.removeprefix("U+").removeprefix("u+").removeprefix("0x"), 16)
            for item in value.split(",")}


def load_entries(groups, codepoints):
    source = (ROOT / "src/icons.js").read_text()
    entries = []
    for match in ENTRY_RE.finditer(source):
        cp = int(match.group(1), 16)
        group = match.group(3)
        if groups and group not in groups:
            continue
        if codepoints and cp not in codepoints:
            continue
        entries.append((cp, match.group(2), group, match.group(4).strip().splitlines()))
    return entries


def reference_glyph(face, cp, size):
    if face.get_char_index(cp) == 0:
        return None
    face.load_char(chr(cp), freetype.FT_LOAD_RENDER | freetype.FT_LOAD_NO_HINTING)
    bitmap = face.glyph.bitmap
    if not bitmap.width or not bitmap.rows:
        return None
    glyph = Image.frombytes("L", (bitmap.width, bitmap.rows), bytes(bitmap.buffer))
    scale = min(size / glyph.width, size / glyph.height, 1)
    if scale < 1:
        glyph = glyph.resize((max(1, round(glyph.width * scale)), max(1, round(glyph.height * scale))))
    canvas = Image.new("L", (size, size), 255)
    canvas.paste(Image.eval(glyph, lambda pixel: 255 - pixel),
                 ((size - glyph.width) // 2, (size - glyph.height) // 2))
    return canvas


def tessera_glyph(rows, scale):
    image = Image.new("L", (8 * scale, 16 * scale), 255)
    draw = ImageDraw.Draw(image)
    for y, row in enumerate(rows):
        for x, pixel in enumerate(row):
            if pixel == "#":
                draw.rectangle((x * scale, y * scale,
                                (x + 1) * scale - 1, (y + 1) * scale - 1), fill=0)
    return image


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--font", help="path to SymbolsNerdFontMono-Regular.ttf")
    parser.add_argument("--group", action="append", dest="groups", help="only render this group; repeatable")
    parser.add_argument("--codepoints", help="comma-separated hexadecimal codepoints")
    parser.add_argument("--output", default="screenshots/icon-verification", help="output directory")
    parser.add_argument("--columns", type=int, default=5)
    parser.add_argument("--rows", type=int, default=6, help="tile rows per sheet")
    args = parser.parse_args()

    font_path = find_reference_font(args.font)
    entries = load_entries(set(args.groups or []), parse_codepoints(args.codepoints))
    if not entries:
        raise SystemExit("no matching icons")

    output = ROOT / args.output
    output.mkdir(parents=True, exist_ok=True)
    face = freetype.Face(str(font_path))
    reference_size = 96
    face.set_pixel_sizes(0, reference_size)
    cmap = TTFont(font_path).getBestCmap()
    label_font = ImageFont.load_default()
    tile_width, tile_height = 160, 114
    per_sheet = args.columns * args.rows
    missing = []

    for sheet_number in range(math.ceil(len(entries) / per_sheet)):
        chunk = entries[sheet_number * per_sheet:(sheet_number + 1) * per_sheet]
        sheet = Image.new("L", (args.columns * tile_width, args.rows * tile_height), 224)
        draw = ImageDraw.Draw(sheet)
        for index, (cp, name, _group, rows) in enumerate(chunk):
            x = (index % args.columns) * tile_width
            y = (index // args.columns) * tile_height
            reference = reference_glyph(face, cp, reference_size)
            if reference is None:
                missing.append(cp)
                draw.text((x + 4, y + 48), "MISSING", fill=0, font=label_font)
            else:
                sheet.paste(reference, (x + 4, y + 16))
            sheet.paste(tessera_glyph(rows, 6), (x + 108, y + 16))
            glyph_name = cmap.get(cp, name).removeprefix("nf-")
            draw.text((x + 4, y + 2), f"{cp:04X} {glyph_name[:22]}", fill=0, font=label_font)
        sheet.save(output / f"sheet-{sheet_number + 1:02d}.png")

    print(f"rendered {len(entries)} icons to {output}")
    if missing:
        print("missing from reference font: " + ", ".join(f"U+{cp:04X}" for cp in missing))


if __name__ == "__main__":
    main()
