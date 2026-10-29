// Standalone offline build: lists every file the game needs, for sw.js to download.
// Run after tools/build.js. Writes offline-files.js at the repo root.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const root = path.join(__dirname, '..');
const walk = d => fs.readdirSync(path.join(root, d), { withFileTypes: true }).flatMap(e =>
  e.isDirectory() ? walk(d + '/' + e.name) : [d + '/' + e.name]);
const files = [
  'index.html', 'manifest.webmanifest', 'favicon.ico', 'css/style.css',
  'js/app.min.js', 'js/boot.js', 'js/noframe.js', 'js/core/locales.js',
  ...(fs.existsSync(path.join(root, 'js/lang')) ? walk('js/lang') : []),
  ...walk('assets').filter(f => !/og-image/.test(f))
].filter(f => fs.existsSync(path.join(root, f)));
// Version = hash of the code files, so a rebuild makes phones refresh.
const h = crypto.createHash('sha1');
for (const f of ['index.html', 'js/app.min.js', 'css/style.css']) h.update(fs.readFileSync(path.join(root, f)));
const version = h.digest('hex').slice(0, 10);
fs.writeFileSync(path.join(root, 'offline-files.js'),
  'self.OFFLINE = ' + JSON.stringify({ version, files }) + ';\n');
// Show the version in the main menu (bottom right), to tell which build a phone runs.
const idx = path.join(root, 'index.html');
fs.writeFileSync(idx, fs.readFileSync(idx, 'utf8').replace(/<div id="build-tag" translate="no">[^<]*<\/div>/, `<div id="build-tag" translate="no">build ${version.slice(0, 6)}</div>`));
// Stamp the version into sw.js itself, so its bytes change and phones see the update.
const swPath = path.join(root, 'sw.js');
fs.writeFileSync(swPath, fs.readFileSync(swPath, 'utf8').replace(/const BUILD = '[^']*';/, `const BUILD = '${version}';`));
console.log(`offline-files.js: ${files.length} files, version ${version}`);
