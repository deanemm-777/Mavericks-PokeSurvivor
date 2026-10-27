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
console.log(`offline-files.js: ${files.length} files, version ${version}`);
