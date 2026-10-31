/* ============ emotes.js — emotes (standalone build, Doofcraft update 40) ============
 *
 * Emotes are Pokémon faces (SpriteCollab portraits: Happy, Angry, Crying...),
 * about 24,000 of them with the shinies. Open your free pack in Emotes, buy
 * more packs (5 emotes, shinies included) in the Poké Mart or on the Emotes
 * screen, put up to 8 on your wheel, then hold G (or tap ☺) in a run or the
 * camp to show one above your partner.
 *
 * The pictures come from SpriteCollab the first time you get one (online) and
 * sw.js keeps them for offline play.
 */
G.Emotes = (() => {
  const RAW = 'https://raw.githubusercontent.com/PMDCollab/SpriteCollab/master/portrait/';
  const PACK = 5, PRICE = 300, SHINY = 1 / 16, SHOW = 2.6;
  const imgs = new Map();
  let shown = null;          // { key, t }

  const save = () => G.DB.save;
  const owned = () => (save() && save().emotes) || {};
  const wheel = () => (save() && save().emoteWheel) || [];
  const parse = key => { const [d, i, s] = key.split(':').map(Number); return { dex: d, face: G.EMOTE_NAMES[i], shiny: !!s }; };
  function url(key) {
    const k = parse(key), d = String(k.dex).padStart(4, '0');
    return RAW + d + '/' + (k.shiny ? '0000/0001/' : '') + k.face + '.png';
  }
  function img(key) {
    let im = imgs.get(key);
    if (!im) { im = new Image(); im.crossOrigin = 'anonymous'; im.src = url(key); imgs.set(key, im); }
    return im;
  }
  const label = key => { const k = parse(key), m = G.DEX_BY[k.dex]; return (k.shiny ? '★ ' : '') + (m ? m.name : '#' + k.dex) + ' · ' + k.face; };

  function roll() {
    for (let tries = 0; tries < 50; tries++) {
      const dex = 1 + Math.floor(Math.random() * G.EMOTE_CAT.length);
      const [m, sm] = G.EMOTE_CAT[dex - 1];
      const shiny = sm && Math.random() < SHINY;
      const mask = shiny ? sm : m;
      if (!mask) continue;
      const faces = G.EMOTE_NAMES.map((_, i) => i).filter(i => mask & (1 << i));
      return dex + ':' + G.U.pick(faces) + ':' + (shiny ? 1 : 0);
    }
    return '25:1:0';
  }

  /** Opens a pack: 5 emotes (duplicates give 20 PokéCoins). → the keys. */
  function openPack() {
    const s = save();
    s.emotes = s.emotes || {};
    const got = [];
    for (let i = 0; i < PACK; i++) {
      const k = roll();
      if (s.emotes[k]) s.coins += 20; else s.emotes[k] = 1;
      got.push(k);
      img(k);                                   // fetch now, so it's kept for offline
      if (!s.emoteWheel || s.emoteWheel.length < 8) { s.emoteWheel = s.emoteWheel || []; if (!s.emoteWheel.includes(k)) s.emoteWheel.push(k); }
    }
    G.DB.commit(true);
    return got;
  }
  function freeLeft() { const s = save(); return !!s && !s.emoteFree; }
  function openFree() { const s = save(); if (!freeLeft()) return null; s.emoteFree = 1; return openPack(); }
  function buy() { const s = save(); if (!s || s.coins < PRICE) return null; s.coins -= PRICE; return openPack(); }

  function toggleWheel(key) {
    const s = save(), w = s.emoteWheel = s.emoteWheel || [];
    const i = w.indexOf(key);
    if (i >= 0) w.splice(i, 1); else if (w.length < 8) w.push(key); else return false;
    G.DB.commit();
    return true;
  }

  function send(key) { shown = { key, t: SHOW }; img(key); G.Audio.sfx('select'); }
  function update(dt) { if (shown && (shown.t -= dt) <= 0) shown = null; }

  /** The bubble above your partner (world coords, inside the camera transform). */
  function drawAt(ctx, x, y) {
    if (!shown) return;
    const im = img(shown.key);
    const a = Math.min(1, shown.t * 3, (SHOW - shown.t) * 6), S = 30;
    ctx.save();
    ctx.globalAlpha = a;
    const by = y - S - 10 - (1 - Math.min(1, (SHOW - shown.t) * 4)) * 6;
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#1b1822'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x - S / 2 - 3, by - 3, S + 6, S + 6, 5) : ctx.rect(x - S / 2 - 3, by - 3, S + 6, S + 6); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 4, by + S + 3); ctx.lineTo(x, by + S + 8); ctx.lineTo(x + 4, by + S + 3); ctx.fill();
    if (im.complete && im.naturalWidth) { ctx.imageSmoothingEnabled = false; ctx.drawImage(im, x - S / 2, by, S, S); }
    ctx.restore();
  }

  // ---------------- the wheel (G, or the ☺ button) ----------------

  function openWheel() {
    const w = wheel();
    if (!w.length) { G.UI.toast('Open an emote pack in Emotes first'); return; }
    let el = document.getElementById('emote-wheel');
    if (!el) { el = document.createElement('div'); el.id = 'emote-wheel'; el.className = 'emote-wheel'; document.body.appendChild(el); }
    el.innerHTML = w.map((k, i) => {
      const a = i / w.length * 6.2832 - Math.PI / 2;
      return `<button class="ew-b" data-ek="${k}" style="left:calc(50% + ${Math.round(Math.cos(a) * 84)}px - 26px);top:calc(50% + ${Math.round(Math.sin(a) * 84)}px - 26px)"><img src="${url(k)}" alt=""></button>`;
    }).join('') + '<button class="ew-x" aria-label="Close">✕</button>';
    el.classList.remove('hidden');
    el.onclick = e => {
      const b = e.target.closest('[data-ek]');
      if (b) send(b.dataset.ek);
      el.classList.add('hidden');
    };
  }

  return { PRICE, owned, wheel, url, img, label, openFree, freeLeft, buy, toggleWheel, send, update, drawAt, openWheel,
           get total() { return G.EMOTE_CAT.reduce((a, [m, s]) => a + bitCount(m) + bitCount(s), 0); } };
  function bitCount(n) { let c = 0; while (n) { c += n & 1; n >>= 1; } return c; }
})();
