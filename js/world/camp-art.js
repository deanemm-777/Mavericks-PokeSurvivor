/* ============ camp-art.js — Doofcraft's camp art (standalone build) ============
 *
 * The camp main menu drawn with the art from Doofcraft's camp (update 40):
 *   - the camp map (46 x 30 tiles of 16 art px): grass, dirt paths and the
 *     cliff wall around it, painted tile by tile with Doofcraft's own generator
 *   - the play platform, the stalls, the PC, the slot machine, the job board,
 *     the Hall of Fame statue and the dojo floor (Doofcraft draws these pixel by
 *     pixel in code; the same code is here)
 *   - the campfire, the benches and the mailbox ("Serene Village" by LimeZu,
 *     CC BY 4.0) and the trees, rocks and grass tufts, from
 *     assets/camp/camp-props.png
 * Everything is drawn at 2 world px per art px. Used by ui/camp.js.
 */
G.CampArt = (() => {
  // ---------------- the camp's layout (Doofcraft's hub.json) ----------------
  const HUB = {
    width: 46, height: 30,
    terrain: ('##############################################,##############################################,##############################################,' +
      '##########...###...............###...#########,#####....................................#####,###........................................###,' +
      '###........................................###,###........................................###,###........................................###,' +
      '###........................................###,##...................:::::.................###,##...................:::::..................##,' +
      '##...................:::::..................##,##.................:::::::::................##,##.................:::::::::................##,' +
      '##...::::::::::::::::::::::::::::::::::::...##,##...::::::::::::::::::::::::::::::::::::...##,##...::::::::::::::::::::::::::::::::::::...##,' +
      '##.................:::::::::................##,##.................:::::::::................##,##...................:::::..................##,' +
      '###..................:::::..................##,###..........:::::::::::::::::::::..........##,###..........:::::::::::::::::::::..........##,' +
      '###..........:::::::::::::::::::::..........##,###.........................................##,########................................######,' +
      '##############################################,##############################################,##############################################').split(','),
    spawn: { x: 23.5, y: 18.6 },
    platform: { x: 23.5, y: 7.2, rx: 4.2, ry: 2.6 },
    props: [
      ['tree', 4.2, 5, 1], ['tree', 6.7, 5, 0], ['tree', 9.2, 5.5, 0], ['tree', 12.4, 5.5, 2], ['tree', 14.9, 5, 2], ['tree', 17.4, 5.5, 2],
      ['tree', 30, 5, 0], ['tree', 33.1, 5, 2], ['tree', 35.6, 5.5, 2], ['tree', 38.2, 5.5, 1], ['tree', 40.7, 5, 1],
      ['tree', 3.9, 8, 1], ['tree', 42.4, 8.6, 2], ['tree', 3.9, 10.4, 0], ['tree', 42.4, 11, 1], ['tree', 3.9, 12.8, 2], ['tree', 42.4, 13.4, 0],
      ['tree', 3.9, 15.2, 2], ['tree', 42.4, 15.8, 0], ['tree', 3.9, 17.6, 1], ['tree', 42.4, 18.2, 2], ['tree', 3.9, 20, 1], ['tree', 3.9, 22.4, 0],
      ['tree', 3.9, 24.8, 2], ['tree', 8.1, 26.6, 2], ['tree', 11.2, 26.6, 2], ['tree', 14.3, 26.6, 2], ['tree', 17.4, 26.6, 2], ['tree', 20.5, 26.6, 2],
      ['tree', 23.6, 26.6, 2], ['tree', 26.7, 26.6, 2], ['tree', 29.8, 26.6, 2], ['tree', 32.9, 26.6, 2],
      ['rock', 12, 9, 0], ['rock', 34, 9.5, 1], ['rock', 10, 24, 2],
      ['grass', 15, 12, 1], ['grass', 8, 22.5, 1], ['grass', 35, 26, 0]
    ].map(([type, x, y, variant]) => ({ type, x, y, variant }))
  };
  const TILE = { '#': 'wall', '.': 'grass', ':': 'dirt' };
  const tileAt = (x, y) => TILE[HUB.terrain[y] && HUB.terrain[y][x]] || 'wall';

  // ---------------- pixel helpers ----------------
  function V(w, h, fn) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h));
    const x = c.getContext('2d');
    if (x) fn((a, b, cw, ch, col) => { x.fillStyle = col; x.fillRect(Math.round(a), Math.round(b), Math.round(cw), Math.round(ch)); }, x);
    return c;
  }
  const cache = new Map();
  const U = (k, f) => { let v = cache.get(k); if (!v) cache.set(k, v = f()); return v; };

  // ---------------- the objects (ported from Doofcraft's camp code) ----------------
  const LIGHT = { idle: '#8d93a6', gold: '#ffd65c', green: '#6fd08a' };
  function platform(e, t, n) {
    const r = e + 3, i = t + 1;
    return {
      img: U(`platform/${e}/${t}/${n}`, () => V(r * 2, i + t + 8 + 6, a => {
        const o = (x, y, c) => a(r + x, i + y, 1, 1, c), s = (x, y) => x * x / (e * e) + y * y / (t * t) < 1;
        for (let y = -t; y <= t + 8 + 3; y++) for (let x = -e - 2; x <= e + 2; x++) {
          const top = s(x, y), face = !top && s(x, y - 8) && y > 0;
          if (!top && !face && s(x - 2, y - 8 - 2) && y > 0) o(x, y, 'rgba(0,0,0,.22)');
          if (face) { const c = (x + e) % 10 === 0 ? '#3c4150' : s(x, y - 1) ? '#2b2f3c' : '#565c70'; o(x, y, s(x, y - 8 + 1) ? c : '#2b2f3c'); }
          if (top) {
            const edge = !s(x - 1, y) || !s(x + 1, y) || !s(x, y - 1) || !s(x, y + 1), ring = Math.abs(Math.hypot(x / e, y / t) - 0.78) < 0.025,
              mid = y === 0 && Math.abs(x) > 9, dot = !(x * 7 + y * 13 & 7);
            o(x, y, edge ? '#2b2f3c' : ring ? LIGHT[n] : mid ? '#8d93a6' : dot ? '#b8bdcc' : y < -t * 0.55 ? '#d0d4e0' : '#c3c8d6');
          }
        }
        const ball = (x, y) => x * x / 90.25 + y * y / 42.25 < 1;
        for (let y = -6; y <= 6; y++) for (let x = -9; x <= 9; x++) {
          if (!ball(x, y)) continue;
          const edge = !ball(x - 1, y) || !ball(x + 1, y) || !ball(x, y - 1) || !ball(x, y + 1);
          o(x, y, edge || y === 0 ? '#2b2f3c' : y < 0 ? '#d8483a' : '#f2f0e0');
        }
        for (let y = -2; y <= 2; y++) for (let x = -3; x <= 3; x++) x * x + y * y * 2 > 9 || o(x, y, x * x + y * y * 2 > 5 ? '#2b2f3c' : '#f2f0e0');
        [[11, '#c3c8d6', '#8d93a6'], [13, '#a9aec0', '#6b7086'], [15, '#8d93a6', '#565c70']].forEach(([w, c1, c2], k) => {
          const y = t + k * 3;
          a(r - w, i + y, w * 2, 3, c1); a(r - w, i + y + 2, w * 2, 1, c2);
          a(r - w - 1, i + y, 1, 3, '#2b2f3c'); a(r + w, i + y, 1, 3, '#2b2f3c');
        });
        a(r - 16, i + t + 8 + 1, 32, 1, '#2b2f3c');
      })),
      ox: r, oy: i
    };
  }

  // Stall colours: goods on the counter, and the awning stripes.
  const GOODS = { mart: ['#5fc8ff', '#ff6b5a', '#ffd65c', '#7ee07a'], 'event-shop': ['#e8862c', '#5a3a7a', '#e8862c', '#ffd65c'], pokemart: ['#ff6b5a', '#f2f0e0', '#5fc8ff', '#ffd65c'] };
  const AWNING = { mart: ['#5fbf6a', '#f2f0e0'], 'event-shop': ['#e8862c', '#5a3a7a'], pokemart: ['#3a7ad0', '#f2f0e0'] };
  function stallBack(o) {
    const w = (o.w || 5) * 16, [c1, c2] = AWNING[o.id] || AWNING.mart;
    return {
      img: U(`stall-back/${o.id}/${w}`, () => V(w, 48, e => {
        e(2, 6, 3, 40, '#5a3a22'); e(w - 5, 6, 3, 40, '#5a3a22');
        for (let x = 0; x < w; x += 8) { const c = x / 8 % 2 ? c2 : c1; e(x, 0, 8, 10, c); e(x, 10, 8, 3, c); e(x + 2, 13, 4, 2, c); }
        e(0, 0, w, 1, '#2b1d18');
      })),
      ox: 0, oy: 14
    };
  }
  function stallFront(o) {
    const w = (o.w || 5) * 16, goods = GOODS[o.id] || GOODS.mart;
    return {
      img: U(`stall-front/${o.id}/${w}`, () => V(w, 34, e => {
        e(1, 24, w - 2, 10, '#a8693a'); e(1, 24, w - 2, 2, '#d08c4e'); e(1, 33, w - 2, 1, '#2b1d18');
        for (let k = 0; k < Math.floor((w - 10) / 9); k++) { e(6 + k * 9, 19, 6, 5, goods[k % goods.length]); e(6 + k * 9, 19, 6, 1, 'rgba(255,255,255,.5)'); }
      })),
      ox: 0, oy: 0
    };
  }
  function pc() {
    return {
      img: U('pc', () => V(36, 32, e => {
        e(0, 0, 36, 6, '#c94a3a'); e(0, 0, 36, 1, '#ff8a6a'); e(2, 6, 2, 26, '#5a3a22'); e(32, 6, 2, 26, '#5a3a22');
        e(4, 20, 28, 12, '#9a9fb0'); e(4, 20, 28, 2, '#d0d4e0'); e(8, 8, 20, 14, '#c8ccd8'); e(10, 10, 16, 9, '#3a7ad0');
        e(11, 11, 6, 1, '#9fd0ff'); e(11, 13, 10, 1, '#9fd0ff'); e(11, 15, 8, 1, '#9fd0ff'); e(7, 24, 10, 3, '#5b6074');
      })),
      ox: 2, oy: 6
    };
  }
  const FONT = { S: '111100111001111', L: '100100100100111', O: '111101101101111', T: '111010010010010' };
  function slots() {
    return {
      img: U('slots', () => V(46, 53, e => {
        const c = { body: '#c8323c', bodyD: '#8e1f2a', bodyL: '#ef6464', trim: '#ffd23f', trimD: '#c08a10', dark: '#1b1528', glass: '#0d1230', reel: '#f4efe2', chrome: '#c9d2de', chromeD: '#7d8899', bulb: '#ffe9a0' };
        e(2, 50, 40, 3, 'rgba(0,0,0,.25)'); e(0, 0, 40, 10, c.trimD); e(1, 1, 38, 8, c.dark);
        for (let k = 0; k < 9; k++) { e(2 + Math.round(k * 4.3), 1, 2, 1, c.bulb); e(2 + Math.round(k * 4.3), 8, 2, 1, c.bulb); }
        [...'SLOTS'].forEach((ch, r) => { const g = FONT[ch] || ''; for (let k = 0; k < 15; k++) if (g[k] === '1') e(11 + r * 4 + k % 3, 3 + Math.floor(k / 3) / 1, 1, 1, c.trim); });
        e(0, 10, 40, 40, c.bodyD); e(1, 10, 38, 39, c.body); e(1, 10, 38, 2, c.bodyL); e(1, 10, 2, 39, c.bodyL); e(4, 14, 32, 14, c.trimD); e(5, 15, 30, 12, c.trim);
        for (let k = 0; k < 3; k++) {
          const r = 6 + k * 10;
          e(r, 16, 8, 10, c.reel); e(r, 16, 8, 1, '#c9c1ad'); e(r + 1, 18, 6, 3, '#d8483a'); e(r + 1, 21, 6, 3, '#f2f0e0'); e(r + 1, 21, 6, 1, c.dark); e(r + 3, 20, 2, 2, c.dark);
        }
        e(6, 31, 28, 4, c.dark); e(8, 32, 24, 2, c.trimD); e(6, 38, 28, 9, c.glass); e(6, 38, 28, 1, c.dark);
        e(10, 42, 4, 4, '#5fc8ff'); e(17, 43, 4, 4, '#ffd65c'); e(40, 16, 3, 16, c.chromeD); e(41, 16, 1, 16, c.chrome);
        e(39, 11, 6, 6, '#ff4a4a'); e(40, 12, 2, 2, '#ffb0b0'); e(0, 49, 40, 2, c.dark);
      })),
      ox: 0, oy: 0
    };
  }
  function board() {
    return {
      img: U('board', () => V(48, 36, e => {
        e(2, 6, 3, 30, '#5a3a22'); e(43, 6, 3, 30, '#5a3a22'); e(0, 0, 48, 26, '#8a5a32'); e(2, 2, 44, 22, '#c08850');
        [[5, 5, '#f2f0e0'], [17, 4, '#ffe9a8'], [30, 6, '#f2f0e0'], [9, 14, '#d8f0ff'], [24, 14, '#f2f0e0'], [36, 15, '#ffe9a8']].forEach(([x, y, c]) => {
          e(x, y, 9, 8, c); e(x + 4, y, 1, 1, '#d8483a'); e(x + 2, y + 3, 5, 1, '#8a7a6a'); e(x + 2, y + 5, 4, 1, '#8a7a6a');
        });
      })),
      ox: 0, oy: 0
    };
  }
  function statue() {
    return {
      img: U('statue', () => V(28, 36, e => {
        e(0, 22, 28, 14, '#8d93a6'); e(0, 22, 28, 2, '#c3c8d6'); e(4, 16, 20, 6, '#6b7086'); e(8, 0, 12, 10, '#ffd65c');
        e(5, 2, 3, 5, '#e8aa3c'); e(20, 2, 3, 5, '#e8aa3c'); e(12, 10, 4, 4, '#e8aa3c'); e(9, 14, 10, 2, '#e8aa3c'); e(10, 2, 3, 3, '#fff4c0');
      })),
      ox: 0, oy: 2
    };
  }
  function dojo(o) {
    const t = o.w || 7, n = o.h || 6;
    return {
      img: U(`dojo/${t}/${n}`, () => V(t * 16 + 3, n * 16 + 4, e => {
        for (let r = 1; r < n - 1; r++) for (let c = 0; c < t; c++) e(c * 16 + 3, r * 16, 16, 16, (c + r) % 2 ? '#c9a06a' : '#d4ad78');
        const post = (x, y) => { e(x, y, 3, 12, '#5a3a22'); e(x, y, 3, 1, '#a06a3c'); };
        for (let k = 0; k <= t * 2; k++) { post(k * 8, 4); post(k * 8, (n - 1) * 16 - 10); }
        e(0, 7, t * 16 + 3, 2, '#7a4e2c'); e(0, (n - 1) * 16 - 7, t * 16 + 3, 2, '#7a4e2c');
        for (let k = 0; k < n * 2 - 2; k++) { post(0, k * 8); post(t * 16, k * 8); }
        [[1.4, 2.4], [4.4, 3.2], [5.4, 2.2]].forEach(([dx, dy]) => {
          const x = dx * 16, y = dy * 16;
          e(x + 6, y + 4, 3, 14, '#7a4e2c'); e(x + 1, y + 7, 13, 3, '#7a4e2c'); e(x + 3, y - 4, 9, 10, '#e8d8a8'); e(x + 5, y - 2, 5, 5, '#d8483a'); e(x + 6, y - 1, 3, 3, '#f2f0e0');
        });
      })),
      ox: 0, oy: 0
    };
  }
  function mailBubble() {
    return {
      img: U('mail-bubble', () => V(12, 16, e => {
        e(1, 0, 10, 12, '#ffffff'); e(2, 1, 8, 10, '#e0603e'); e(5, 2, 2, 5, '#ffffff'); e(5, 8, 2, 2, '#ffffff'); e(4, 12, 4, 2, '#ffffff'); e(5, 14, 2, 1, '#ffffff');
      })),
      ox: 6, oy: 16
    };
  }

  // ---------------- the ground (Doofcraft's tile painter, palette "Shady Forest") ----------------
  const PAL = {
    floor: ['#3e7a39', '#44813d', '#397134'], dirt: ['#7d6742', '#735e3b', '#86704a'], speck: '#2f5f2b', light: '#5f9d50',
    flowers: ['#f4d65c', '#f39ac0', '#eef2ff'], wallTop: ['#5d6e49', '#677a50', '#566544'], wallLight: '#88a06e', wallEdge: '#26301f',
    wallFace: ['#3e4934', '#363f2d'], wallFaceDark: '#232a1d'
  };
  const SEED = 89;
  function N(x, y, z = 0) {
    let r = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 2246822519);
    r = Math.imul(r ^ r >>> 13, 1274126177); r ^= r >>> 16;
    return (r >>> 0) / 4294967296;
  }
  const hex = h => { const v = parseInt(h.slice(1), 16); return [v >> 16 & 255, v >> 8 & 255, v & 255]; };
  const B = h => { const [r, g, b] = hex(h); return (255 << 24 | b << 16 | g << 8 | r) >>> 0; };
  function buf(w, h) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d'), img = x.createImageData(w, h), a = new Uint32Array(img.data.buffer);
    return { set(px, py, v) { if (px >= 0 && py >= 0 && px < w && py < h) a[py * w + px] = v; }, canvas() { x.putImageData(img, 0, 0); return c; } };
  }
  // Smooth dirt edges: the dirt mask sampled every 4 px, blended, plus a little noise.
  function dirtMask(e, t, n, r, i) {
    const a = n / 4 + 3, o = new Float32Array(a * a);
    for (let y = 0; y < a; y++) for (let x = 0; x < a; x++) o[y * a + x] = r(e + (x - 1) * 4, t + (y - 1) * 4);
    const s = new Uint8Array(n * (n + 1));
    for (let y = -1; y < n; y++) {
      const c = (y + 4) / 4, l = Math.floor(c), u = c - l;
      for (let x = 0; x < n; x++) {
        const d = (x + 4) / 4, f = Math.floor(d), p = d - f;
        const m = o[l * a + f] || 0, h = o[l * a + f + 1] || 0, g = o[(l + 1) * a + f] || 0, q = o[(l + 1) * a + f + 1] || 0;
        let v = (m + (h - m) * p) * (1 - u) + (g + (q - g) * p) * u;
        v += (N(e + x >> 1, t + y >> 1, i + 9) - 0.5) * 0.05;
        s[(y + 1) * n + x] = +(v > 0.64);
      }
    }
    return (x, y) => s[(y + 1) * n + x] === 1;
  }
  function floorTile(e, t, n, r, i, a, o, s) {
    let c = 0;
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const u = i * 16 + x, d = a * 16 + y, f = n + x, p = r + y, m = o(f, p);
      if (m) c++;
      const h = m ? t.dirt : t.floor, g = N(u >> 3, d >> 3, 11) * 0.7 + N(u, d, 12) * 0.5;
      let col = h[Math.min(h.length - 1, Math.floor(g * h.length / 1.2))] || 0;
      const v = N(u, d, 13);
      if (v < 0.035) col = t.speck; else if (v > 0.985) col = t.light;
      if (m && !o(f, p - 1)) col = t.speck; else if (!m && o(f, p - 1) && v < 0.5) col = t.light;
      e.set(n + x, r + y, col);
    }
    const dirty = c > 128;
    if (s(i, a - 1) === 'wall') for (let x = 0; x < 16; x++) { e.set(n + x, r, t.wallFaceDark); if ((x + a) % 2) e.set(n + x, r + 1, t.speck); }
    const u = N(i, a, 14), d = n + 3 + Math.floor(N(i, a, 15) * 10), f = r + 4 + Math.floor(N(i, a, 16) * 9);
    if (dirty) { if (u < 0.22) { e.set(d, f, t.light); e.set(d + 1, f, t.light); e.set(d, f + 1, t.speck); e.set(d + 1, f + 1, t.speck); } }
    else if (u < 0.18) { e.set(d, f, t.light); e.set(d - 1, f - 1, t.light); e.set(d + 1, f - 1, t.light); e.set(d, f - 2, t.light); e.set(d, f + 1, t.speck); }
    else if (u < 0.26) {
      const fl = t.flowers[Math.floor(N(i, a, 17) * t.flowers.length)] || t.light;
      e.set(d, f - 1, fl); e.set(d - 1, f, fl); e.set(d + 1, f, fl); e.set(d, f + 1, fl); e.set(d, f, t.light);
    } else if (u < 0.32) { e.set(d, f, t.light); e.set(d + 1, f, t.light); e.set(d, f + 1, t.speck); e.set(d + 1, f + 1, t.speck); }
  }
  function wallTile(e, t, n, r, i, a, o) {
    const s = (x, y) => o(x, y) === 'wall', c = s(i, a - 1), l = s(i, a + 1), u = s(i - 1, a), d = s(i + 1, a), f = l ? 0 : 6;
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      if (!c && !u && x + y < 3 || !c && !d && 15 - x + y < 3 || !l && !u && x + (15 - y) < 2 || !l && !d && 15 - x + (15 - y) < 2) continue;
      const p = i * 16 + x, m = a * 16 + y;
      let h;
      if (y >= 16 - f) {
        const k = y - (16 - f);
        h = t.wallFace[+((x + (N(p, 0, 21) < 0.5 ? 0 : 1)) % 3 === 0)] || 0;
        if (k === 0) h = t.wallEdge; else if (y === 15 || N(p, m, 22) < 0.08) h = t.wallFaceDark;
      } else {
        h = t.wallTop[Math.floor(N(p >> 1, m >> 1, 23) * 2.2 + N(p, m, 24) * 0.8) % t.wallTop.length] || 0;
        if (N(p, m, 25) < 0.05) h = t.wallLight;
        if (!c && y === 0) h = t.wallEdge; else if (!c && y === 1) h = t.wallLight;
        if (!u && x === 0) h = t.wallEdge;
        if (!d && x === 15) h = t.wallEdge;
      }
      e.set(n + x, r + y, h);
    }
  }
  function chunk(cx, cy, n, wall, dirt) {
    const c = buf(n * 16, n * 16), l = {};
    for (const k in PAL) l[k] = Array.isArray(PAL[k]) ? PAL[k].map(B) : B(PAL[k]);
    const u = cx * n, d = cy * n, f = dirtMask(u * 16, d * 16, n * 16, dirt, SEED);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const tx = u + x, ty = d + y, a = x * 16, o = y * 16;
      floorTile(c, l, a, o, tx, ty, f, wall);
      if (wall(tx, ty) === 'wall') wallTile(c, l, a, o, tx, ty, wall);
    }
    return c.canvas();
  }
  let ground = null;
  function paintGround() {
    const g = document.createElement('canvas');
    g.width = HUB.width * 16; g.height = HUB.height * 16;
    const x = g.getContext('2d');
    const wall = (a, b) => tileAt(a, b) === 'wall' ? 'wall' : 'floor';
    const dirt = (a, b) => +(tileAt(Math.floor(a / 16), Math.floor(b / 16)) === 'dirt');
    for (let cy = 0; cy * 16 < HUB.height; cy++) for (let cx = 0; cx * 16 < HUB.width; cx++) x.drawImage(chunk(cx, cy, 16, wall, dirt), cx * 256, cy * 256);
    return g;
  }

  // ---------------- the sprite sheet (campfire, benches, mailbox, trees, rocks, grass) ----------------
  const SHEET = {
    mailEmpty: [0, 0, 16, 16], mailFull: [16, 0, 16, 16], fireOff: [32, 0, 16, 16], benchL: [48, 0, 16, 32], benchR: [64, 0, 16, 32],
    fire: [0, 32, 64, 16],
    tree0: [64, 32, 30, 40], tree1: [94, 32, 30, 40], tree2: [0, 72, 30, 40],
    rock0: [30, 72, 22, 17], rock1: [52, 72, 22, 17], rock2: [74, 72, 22, 17],
    grass0: [96, 72, 20, 17], grass1: [0, 112, 20, 17]
  };
  const sheet = new Image();
  let sheetOk = false;
  sheet.onload = () => { sheetOk = true; };
  sheet.src = 'assets/camp/camp-props.png';

  /** Draws a sheet piece with its top-left at art px (x, y). */
  function piece(ctx, k, x, y, sx = 0) {
    const p = SHEET[k];
    if (!sheetOk || !p) return false;
    const w = k === 'fire' ? 16 : p[2];
    ctx.drawImage(sheet, p[0] + sx, p[1], w, p[3], x * 2, y * 2, w * 2, p[3] * 2);
    return true;
  }
  /** Draws generated art with its anchor at art px (x, y). */
  function art(ctx, a, x, y) { ctx.drawImage(a.img, (x - a.ox) * 2, (y - a.oy) * 2, a.img.width * 2, a.img.height * 2); }
  function drawGround(ctx) {
    if (!ground) ground = paintGround();
    ctx.drawImage(ground, 0, 0, ground.width * 2, ground.height * 2);
  }

  return {
    HUB, tileAt, platform, stallBack, stallFront, pc, slots, board, statue, dojo, mailBubble,
    piece, art, drawGround, paintGround, get sheetOk() { return sheetOk; }
  };
})();
