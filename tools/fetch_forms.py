#!/usr/bin/env python3
"""
Standalone build: special and regional forms (Halloween Shop).

Each form becomes its own collectable Pokémon with a pseudo Pokédex number
(see FORMS below). Forms drawn in SpriteCollab are downloaded (normal and
shiny) to assets/pokemon/{id}/. Shadow Pokémon without their own drawing get
their base sprite sheets recoloured dark purple here, once, so the game needs
nothing special at run time. Writes js/data/forms.js.

    python3 tools/fetch_forms.py

Source: https://github.com/PMDCollab/SpriteCollab (CC BY-NC 4.0)
"""
import io
import json
import os
import shutil
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fetch_sprites as fs  # noqa: E402

# id, base dex, name, types, kind, SpriteCollab form folder (None = tinted base), stat changes, abilities
FORMS = [
    (31150, 150, 'Shadow Mewtwo',      None,                    'shadow',   '0003', None),
    (31249, 249, 'Shadow Lugia',       None,                    'shadow',   '0001', None),
    (31006,   6, 'Shadow Charizard',   None,                    'shadow',   None,   None),
    (31212, 212, 'Shadow Scizor',      None,                    'shadow',   None,   None),
    (31399, 399, 'Shadow Bidoof',      None,                    'shadow',   None,   None),
    (31526, 526, 'Shadow Gigalith',    None,                    'shadow',   None,   None),
    (31623, 623, 'Shadow Golurk',      None,                    'shadow',   None,   None),
    (31937, 937, 'Shadow Ceruledge',   None,                    'shadow',   None,   None),
    # Doofcraft update 40: ten more Shadow Pokémon
    (31024,  24, 'Shadow Arbok',       None,                    'shadow',   None,   None),
    (31149, 149, 'Shadow Dragonite',   None,                    'shadow',   None,   None),
    (31169, 169, 'Shadow Crobat',      None,                    'shadow',   None,   None),
    (31213, 213, 'Shadow Shuckle',     None,                    'shadow',   None,   None),
    (31248, 248, 'Shadow Tyranitar',   None,                    'shadow',   None,   None),
    (31330, 330, 'Shadow Flygon',      None,                    'shadow',   None,   None),
    (31384, 384, 'Shadow Rayquaza',    None,                    'shadow',   None,   None),
    (31646, 646, 'Shadow Kyurem',      None,                    'shadow',   None,   None),
    (31693, 693, 'Shadow Clawitzer',   None,                    'shadow',   None,   None),
    (31721, 721, 'Shadow Volcanion',   None,                    'shadow',   None,   None),
    (30901, 901, 'Bloodmoon Ursaluna', ['ground', 'normal'],    'special',  '0001', ['minds-eye']),
    (30105, 105, 'Alolan Marowak',     ['fire', 'ghost'],       'regional', '0001', ['cursed-body', 'lightning-rod', 'rock-head']),
    (30157, 157, 'Hisuian Typhlosion', ['fire', 'ghost'],       'regional', '0001', ['blaze', 0, 'frisk']),
    (30570, 570, 'Hisuian Zorua',      ['normal', 'ghost'],     'regional', '0001', ['illusion']),
    (30571, 571, 'Hisuian Zoroark',    ['normal', 'ghost'],     'regional', '0001', ['illusion']),
    (30144, 144, 'Galarian Articuno',  ['psychic', 'flying'],   'regional', '0001', ['competitive']),
    (30145, 145, 'Galarian Zapdos',    ['fighting', 'flying'],  'regional', '0001', ['defiant']),
    (30146, 146, 'Galarian Moltres',   ['dark', 'flying'],      'regional', '0001', ['berserk']),
]
OUT_JS = os.path.join(fs.ROOT, 'js', 'data', 'forms.js')


def tint(src, dst):
    """Shadow look: dark, desaturated, pushed toward purple; alpha kept."""
    im = Image.open(src).convert('RGBA')
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if not a:
                continue
            lum = 0.3 * r + 0.59 * g + 0.11 * b
            px[x, y] = (min(255, int(lum * 0.42 + r * 0.12 + 34)),
                        min(255, int(lum * 0.22 + g * 0.08 + 8)),
                        min(255, int(lum * 0.55 + b * 0.12 + 52)), a)
    buf = io.BytesIO()
    im.save(buf, 'PNG')
    fs.save_optimized(buf.getvalue(), dst)


def main():
    meta_all = json.loads('{' + '}')
    # base sprite metadata from the generated sprites-meta.js
    src = open(os.path.join(fs.ROOT, 'js', 'data', 'sprites-meta.js'), encoding='utf-8').read()
    base_meta = {}
    for line in src.splitlines():
        line = line.strip()
        if line[:1].isdigit() and ':' in line:
            k, v = line.split(':', 1)
            base_meta[int(k)] = json.loads(v.rstrip(','))

    entries = []
    for fid, base, name, types, kind, folder, abil in FORMS:
        out_dir = os.path.join(fs.OUT_ASSETS, str(fid))
        meta = None
        if folder:
            tag = f'{base:04d}/{folder}'
            xml = fs.fetch(f'{fs.BASE}/{tag}/AnimData.xml')
            if xml:
                anims, shadow = fs.parse_animdata(xml.decode('utf-8', 'replace'))
                normal = fs.download_set(f'{fs.BASE}/{tag}', out_dir, anims)
                if fs.REQUIRED & set(normal):
                    meta = {'s': shadow, 'a': normal}
                    sxml = fs.fetch(f'{fs.BASE}/{tag}/0001/AnimData.xml')
                    if sxml:
                        sanims = fs.parse_animdata(sxml.decode('utf-8', 'replace'))[0]
                        sh = fs.download_set(f'{fs.BASE}/{tag}/0001', os.path.join(out_dir, 's'), sanims, normal)
                        if 'Idle' in sh and 'Walk' in sh:
                            meta['sh'] = 1
                            diff = {k: v for k, v in sh.items() if normal.get(k) != v}
                            if diff:
                                meta['sa'] = diff
                            miss = [k for k in normal if k not in sh]
                            if miss:
                                meta['sm'] = miss
        if meta is None:
            # Tinted copy of the base sheets (normal and shiny), same geometry.
            bm = base_meta[base]
            bdir = os.path.join(fs.OUT_ASSETS, str(base))
            os.makedirs(os.path.join(out_dir, 's'), exist_ok=True)
            for f in os.listdir(bdir):
                if f.endswith('.png'):
                    tint(os.path.join(bdir, f), os.path.join(out_dir, f))
            sdir = os.path.join(bdir, 's')
            if os.path.isdir(sdir):
                for f in os.listdir(sdir):
                    if f.endswith('.png'):
                        tint(os.path.join(sdir, f), os.path.join(out_dir, 's', f))
            meta = json.loads(json.dumps(bm))
        meta_all[fid] = meta
        entries.append({'dex': fid, 'base': base, 'name': name, 'types': types, 'kind': kind, 'abil': abil,
                        'drawn': bool(folder)})
        print(f'  {fid} {name}: {"drawn" if folder else "tinted"}{" + shiny" if meta.get("sh") else ""}')

    lines = [
        '/* ============ forms.js — GENERATED by tools/fetch_forms.py, do not edit ============',
        ' * Special and regional forms (standalone build, Halloween Shop). Each is its own',
        ' * collectable Pokémon under a pseudo Pokédex number; data/forms-setup in this file',
        ' * builds its entry from the base species (G.DEX_BY), with the form\'s types.',
        ' */',
        'G.FORM_LIST = ' + json.dumps(entries, separators=(',', ':')) + ';',
        'Object.assign(G.SPRITE_META, ' + json.dumps(meta_all, separators=(',', ':')) + ');',
        '',
    ]
    with io.open(OUT_JS, 'w', encoding='utf-8', newline='\n') as f:
        f.write('\n'.join(lines))
    print('Wrote', OUT_JS)


if __name__ == '__main__':
    main()
