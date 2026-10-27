"""Builds the in-chat demo (a claude.ai artifact) from the built game.

Artifacts allow at most ~500 files, so the ~13,500 sprite PNGs are packed into
JSON bundles (base64 data URIs) of 64 Pokémon each, fetched only when a
Pokémon in that bundle first appears. Run after tools/build.js.
usage: python3 tools/make_demo.py OUTDIR
"""
import base64, json, os, re, shutil, sys

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out = sys.argv[1]
shutil.rmtree(out, ignore_errors=True)
os.makedirs(out)

# ---- sprite packs ----
packs = {}
pdir = os.path.join(root, 'assets', 'pokemon')
for dex in os.listdir(pdir):
    for cur, _, files in os.walk(os.path.join(pdir, dex)):
        for f in files:
            if not f.endswith('.png'):
                continue
            full = os.path.join(cur, f)
            rel = os.path.relpath(full, root).replace(os.sep, '/')
            kind = 's' if '/s/' in rel else 'k' if '/k-' in rel else 'n'
            key = f'{kind}{int(dex) // 64}'
            with open(full, 'rb') as fh:
                packs.setdefault(key, {})[rel] = 'data:image/png;base64,' + base64.b64encode(fh.read()).decode()
os.makedirs(os.path.join(out, 'packs'))
for key, m in packs.items():
    with open(os.path.join(out, 'packs', key + '.json'), 'w') as fh:
        json.dump(m, fh, separators=(',', ':'))

# ---- page: index.html without the document skeleton, CSP, frame guard or service worker ----
html = open(os.path.join(root, 'index.html'), encoding='utf-8').read()
head = re.search(r'<head>(.*?)</head>', html, re.S).group(1)
body = re.search(r'<body[^>]*>(.*)</body>', html, re.S).group(1)
body_cls = re.search(r'<body([^>]*)>', html).group(1)
keep = []
for tag in re.findall(r'<(?:link|script|style)[^>]*>(?:.*?</(?:script|style)>)?', head, re.S):
    if 'noframe.js' in tag or 'manifest' in tag or 'canonical' in tag or 'alternate' in tag or 'application/ld+json' in tag:
        continue
    if tag.startswith('<link') and 'stylesheet' not in tag and 'preload' not in tag:
        continue
    keep.append(tag)
resolver = """<script>
(function () {
  // Sprites come packed: assets/pokemon/{dex}/... -> packs/{n|s|k}{dex>>6}.json
  var packs = {};
  window.PS_RESOLVE_SPRITE = function (src, done) {
    var m = /assets\\/pokemon\\/(\\d+)\\//.exec(src);
    if (!m) { done(src); return; }
    var kind = /\\/s\\//.test(src) ? 's' : /\\/k-/.test(src) ? 'k' : 'n';
    var key = kind + (parseInt(m[1], 10) >> 6);
    if (!packs[key]) packs[key] = fetch('packs/' + key + '.json').then(function (r) { return r.json(); }).catch(function () { return {}; });
    packs[key].then(function (p) { done(p[src] || src); });
  };
})();
</script>"""
page = ('<title>PokéSurvivor</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n'
        '<style>:root{color-scheme:dark;background:#0a1430}html,body{height:100%;background:#0a1430}</style>\n'
        + resolver + '\n' + '\n'.join(keep) + '\n'
        + (f'<div id="ps-body-attrs" hidden data-attrs="{body_cls.strip()}"></div>\n' if body_cls.strip() else '')
        + body)
page = re.sub(r'<script src="js/noframe\.js"></script>', '', page)
with open(os.path.join(out, 'index.html'), 'w', encoding='utf-8') as fh:
    fh.write(page)

# ---- supporting files ----
def copy(rel):
    src = os.path.join(root, rel)
    if os.path.exists(src):
        os.makedirs(os.path.dirname(os.path.join(out, rel)) or out, exist_ok=True)
        shutil.copy(src, os.path.join(out, rel))
for rel in ['js/app.min.js', 'js/boot.js', 'js/core/locales.js', 'css/style.css', 'favicon.ico']:
    copy(rel)
for d in ['js/lang', 'assets/fonts', 'assets/icons']:
    for f in os.listdir(os.path.join(root, d)):
        copy(d + '/' + f)

n = sum(len(fs) for _, _, fs in os.walk(out))
size = sum(os.path.getsize(os.path.join(c, f)) for c, _, fs in os.walk(out) for f in fs)
print(f'demo: {n} files, {size / 1e6:.1f} MB, {len(packs)} sprite packs')
