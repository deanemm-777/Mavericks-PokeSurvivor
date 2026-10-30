#!/usr/bin/env python3
"""
Standalone build: the Shadow Pokémon look for forms without their own drawing.

A palette swap in the style of the Shadow forms in other PokéSurvivor builds:
  - the Pokémon's main colour (its biggest hue family) turns charcoal grey
  - the other colours (accents, flames, wings, crystals) turn purple
  - its brightest, most saturated spots (eyes, flame tips) turn magenta
  - outlines, whites and greys stay as they are
The mapping is worked out once per sheet set (normal, shiny) from the base
species' sheets and applied to every animation.

    python3 tools/shadow_recolor.py            (all forms in FORMS)
"""
import colorsys
import io
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fetch_sprites as fs  # noqa: E402

FORMS = {31006: 6, 31212: 212, 31399: 399, 31526: 526, 31623: 623, 31937: 937,
         # update 40: ten more Shadow Pokémon, and the Shadow Megas / Kyurem fusions
         31024: 24, 31149: 149, 31169: 169, 31213: 213, 31248: 248, 31330: 330, 31384: 384,
         31646: 646, 31693: 693, 31721: 721,
         21150: 20150, 21248: 20248, 21384: 20384, 24646: 22646, 25646: 23646}
NEUTRAL_S = 0.16          # below this saturation a colour counts as grey
FAMILY = 38 / 360         # hue distance that still counts as the main colour


def hsv(c):
    return colorsys.rgb_to_hsv(c[0] / 255, c[1] / 255, c[2] / 255)


def hue_dist(a, b):
    d = abs(a - b) % 1
    return min(d, 1 - d)


def mapping(paths):
    """Colour → new colour, from the pixel counts of every sheet in `paths`."""
    counts = {}
    for p in paths:
        im = Image.open(p).convert('RGBA')
        for n, c in im.getcolors(1 << 20) or []:
            if c[3] == 0:
                continue
            counts[c[:3]] = counts.get(c[:3], 0) + n
    chroma = {c: n for c, n in counts.items() if hsv(c)[1] >= NEUTRAL_S and hsv(c)[2] > 0.12}
    if not chroma:
        return {}
    # Main hue: the weighted hue bin (30 bins) with most pixels.
    bins = [0] * 30
    for c, n in chroma.items():
        bins[int(hsv(c)[0] * 30) % 30] += n
    main = (bins.index(max(bins)) + 0.5) / 30
    total = sum(chroma.values())
    # How much of the sprite the bright colours of each hue cover together (a belly is several shades).
    bright = lambda c: hsv(c)[2] > 0.82 and hsv(c)[1] > 0.45
    share = [0] * 12
    for c, n in chroma.items():
        if bright(c):
            share[int(hsv(c)[0] * 12) % 12] += n / total
    out = {}
    for c in chroma:
        h, s, v = hsv(c)
        if hue_dist(h, main) <= FAMILY:
            # Charcoal: lightness kept (a bit darker), slightly cool.
            lum = (0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]) / 255
            l = min(1, lum * 0.92 + 0.04)
            out[c] = (round(l * 236), round(l * 236), round(min(1, l * 1.06) * 255))
        elif v > 0.82 and s > 0.45:
            if share[int(h * 12) % 12] < 0.03:
                r, g, b = colorsys.hsv_to_rgb(0.83, min(1, s * 1.05), v)    # small spots (eyes, flame tips): magenta glow
            else:
                r, g, b = colorsys.hsv_to_rgb(0.97, 0.32, min(1, v * 1.02))  # big bright patches (bellies): pale rose
            out[c] = (round(r * 255), round(g * 255), round(b * 255))
        else:
            r, g, b = colorsys.hsv_to_rgb(0.78, min(1, max(0.45, s)), v * 0.95)   # purple
            out[c] = (round(r * 255), round(g * 255), round(b * 255))
    return out


def apply(src, dst, cmap):
    im = Image.open(src).convert('RGBA')
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            c = px[x, y]
            if c[3] and c[:3] in cmap:
                px[x, y] = cmap[c[:3]] + (c[3],)
    buf = io.BytesIO()
    im.save(buf, 'PNG')
    fs.save_optimized(buf.getvalue(), dst)


def main():
    only = {int(a) for a in sys.argv[1:]}
    for fid, base in FORMS.items():
        if only and fid not in only:
            continue
        bdir = os.path.join(fs.OUT_ASSETS, str(base))
        odir = os.path.join(fs.OUT_ASSETS, str(fid))
        for sub in ['', 's']:
            sdir = os.path.join(bdir, sub)
            if not os.path.isdir(sdir):
                continue
            files = [f for f in os.listdir(sdir) if f.endswith('.png')]
            cmap = mapping([os.path.join(sdir, f) for f in files])
            os.makedirs(os.path.join(odir, sub), exist_ok=True)
            for f in files:
                apply(os.path.join(sdir, f), os.path.join(odir, sub, f), cmap)
        print(f'  {fid}: Shadow look from {base}')


if __name__ == '__main__':
    main()
