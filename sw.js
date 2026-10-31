/* ============ sw.js — standalone offline build ============
 * Everything the game needs (code, ~13,500 sprite files, fonts, icons) is
 * listed in offline-files.js. On first launch the page asks this worker to
 * download the whole list into the cache; after that the game runs with no
 * connection at all (airplane mode included). Everything, the page included,
 * comes from the saved copy, so the game opens without waiting on the network;
 * a new version is picked up when the browser sees a new sw.js.
 *
 * To ship a new version of your game, run tools/build_offline.sh: it rebuilds,
 * regenerates offline-files.js and stamps the version into BUILD below.
 */
// BUILD is rewritten by tools/make_offline_list.js on every build, so this file's
// bytes change with each version: that is what makes phones notice an update.
const BUILD = 'c193fb2c71';
importScripts('offline-files.js?v=' + BUILD);  // defines self.OFFLINE = { version, files: [...] }
const CACHE = 'ps-offline-' + self.OFFLINE.version;
const CORE = ['./', './index.html', './manifest.webmanifest'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE.map(u => new Request(u, { cache: 'reload' })))).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    const old = keys.filter(k => k.startsWith('ps-') && k !== CACHE);
    // Carry unchanged sprites over from an older version instead of re-downloading them.
    if (old.length) {
      const now = await caches.open(CACHE);
      for (const k of old) {
        const prev = await caches.open(k);
        for (const req of await prev.keys()) {
          if ((/\/assets\//.test(req.url) || /\/portrait\//.test(req.url)) && !(await now.match(req))) {
            const res = await prev.match(req);
            if (res) await now.put(req, res);
          }
        }
        await caches.delete(k);
      }
    }
    await self.clients.claim();
  })());
});

// ---------- full download, driven by messages from the page ----------
let running = null;
function tell(msg) {
  self.clients.matchAll({ includeUncontrolled: true }).then(cs => cs.forEach(c => c.postMessage(msg)));
}
async function downloadAll() {
  const c = await caches.open(CACHE);
  const base = new URL(self.registration.scope).pathname;
  const have = new Set((await c.keys()).map(r => new URL(r.url).pathname));
  const todo = self.OFFLINE.files.filter(f => !have.has(base + f));
  const total = self.OFFLINE.files.length;
  let done = total - todo.length, failed = 0, lastTell = 0, i = 0;
  tell({ type: 'offline-progress', done, total });
  async function worker() {
    while (i < todo.length) {
      const f = todo[i++];
      try {
        const res = await fetch(f, { cache: 'no-cache' });
        if (res.ok) await c.put(f, res); else failed++;
      } catch (e) { failed++; }
      done++;
      const now = Date.now();
      if (now - lastTell > 400) { lastTell = now; tell({ type: 'offline-progress', done, total }); }
    }
  }
  await Promise.all(Array.from({ length: 8 }, worker));
  tell({ type: failed ? 'offline-partial' : 'offline-ready', done: done - failed, total, failed });
}
self.addEventListener('message', e => {
  if (e.data === 'offline-download') {
    if (!running) running = downloadAll().finally(() => { running = null; });
    e.waitUntil(running);
  }
});

// ---------- serving ----------
// Everything else: the saved copy (exact version first), else the network, else
// any saved version of that file.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Emotes (SpriteCollab portraits): kept once fetched, for offline play.
  if (url.hostname === 'raw.githubusercontent.com' && url.pathname.includes('/SpriteCollab/') && url.pathname.includes('/portrait/')) {
    e.respondWith((async () => {
      const c = await caches.open(CACHE);
      const hit = await c.match(req.url);
      if (hit) return hit;
      try { const res = await fetch(req.url, { mode: 'cors' }); if (res.ok) c.put(req.url, res.clone()); return res; }
      catch (err) { return Response.error(); }
    })());
    return;
  }
  if (url.origin !== location.origin) return;
  if (req.mode === 'navigate') {
    // The saved page straight away (no waiting on the network). A new version
    // still arrives: the browser checks sw.js on every launch, the new worker
    // saves the new page, takes over, and the game reloads into it (main.js).
    e.respondWith((async () => {
      const c = await caches.open(CACHE);
      const saved = (await c.match('./index.html')) || (await c.match(req, { ignoreSearch: true }));
      if (saved) return saved;
      try {
        const res = await fetch(req, { cache: 'no-cache' });
        if (res.ok) c.put('./index.html', res.clone());
        return res;
      } catch (err) {
        return (await caches.match('./index.html', { ignoreSearch: true })) || Response.error();
      }
    })());
    return;
  }
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    const exact = await c.match(req);
    if (exact) return exact;
    try {
      const res = await fetch(req);
      if (res.ok) c.put(req, res.clone());
      return res;
    } catch (err) {
      return (await c.match(req, { ignoreSearch: true })) || Response.error();
    }
  })());
});
