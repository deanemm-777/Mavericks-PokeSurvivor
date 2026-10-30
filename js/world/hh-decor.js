/* ============ hh-decor.js — Haunted Hollow decorations and night (standalone build) ============
 *
 * On the Halloween maps (Halloween Waves, and runs during the Halloween event):
 *
 *   Decorations  Doofcraft's gravestones, fences, pumpkins and lanterns
 *                (assets/halloween/hh-props.png), scattered over the map. They
 *                are placed from the run's seed, cell by cell, on free ground,
 *                so the same spot always has the same things. You walk through them.
 *   Night        Doofcraft's lighting: every patch of ground is as dark as its
 *                nearest lantern says: a normal night (42 %) by a lit lantern,
 *                almost black (90 %) by one that has gone out. Lit lanterns,
 *                your Pokémon, the lost Pokémon and pumpkins light the dark
 *                around them, and a faint fog drifts over everything.
 *                "The lanterns went out!" (systems/waves.js) puts out four of
 *                these lanterns, so their part of the map goes dark until you
 *                light them again.
 */
G.HHDecor = (() => {
  // Pieces of the sheet: [x, y, w, h]
  const SHEET = {
    chapel: [0, 0, 180, 186], crypt0: [181, 0, 48, 52], crypt1: [0, 187, 48, 52], crypt2: [49, 187, 48, 52],
    cageLocked: [98, 187, 24, 28], cageBars: [123, 187, 24, 28], cageOpen: [148, 187, 24, 28],
    lanternLit: [173, 187, 8, 23], lanternOut: [182, 187, 8, 23],
    grave0: [191, 187, 12, 15], grave1: [204, 187, 11, 16], grave2: [216, 187, 13, 12], grave3: [230, 187, 10, 10],
    pumpkin0: [241, 187, 14, 11], pumpkin1: [0, 240, 14, 11], pumpkin2: [15, 240, 10, 7],
    fence: [26, 240, 16, 14], post: [43, 240, 6, 20]
  };
  const sheet = new Image();
  let ok = false;
  sheet.onload = () => { ok = true; };
  sheet.src = 'assets/halloween/hh-props.png';

  /** Draws a piece ×2 (like the map's other props), bottom-centred on (x, y). */
  function piece(ctx, name, x, y, k = 2) {
    const [sx, sy, w, h] = SHEET[name];
    ctx.drawImage(sheet, sx, sy, w, h, Math.round(x - w * k / 2), Math.round(y - h * k + 2), w * k, h * k);
  }

  // ---------------- placement ----------------

  const DC = 160;           // decoration cell (world px)
  const LC = 288;           // lantern cell
  let seed = 1;
  const cells = new Map(), lcells = new Map();

  function reset(s) { seed = (s | 0) || 1; cells.clear(); lcells.clear(); }
  const on = () => !!(G.Halloween && G.Halloween.inRun) && !(G.Rift && G.Rift.inArena);
  const free = (x, y, r) => G.World.isFree(x, y, r) && G.World.isFree(x - r, y - r, r * 0.5) && G.World.isFree(x + r, y - r, r * 0.5);

  function decoCell(cx, cy) {
    const key = cx + ',' + cy;
    let c = cells.get(key);
    if (c) return c;
    c = [];
    const H = k => G.U.hash(cx, cy, seed * 31 + k);
    const r = H(1), x0 = cx * DC + 24 + H(2) * (DC - 48), y0 = cy * DC + 30 + H(3) * (DC - 60);
    if (r < 0.075) {
      // A little graveyard: 2-5 stones in a row or two.
      const n = 2 + Math.floor(H(4) * 4), cols = n > 3 ? 3 : n;
      for (let i = 0; i < n; i++) {
        const x = x0 + (i % cols) * 28 + (H(10 + i) - 0.5) * 6, y = y0 + Math.floor(i / cols) * 30 + (H(20 + i) - 0.5) * 4;
        if (free(x, y, 10)) c.push({ kind: 'grave', v: Math.floor(H(30 + i) * 4), x, y, r: 10 });
      }
    } else if (r < 0.115) {
      // A run of fence with posts at the ends.
      const n = 3 + Math.floor(H(5) * 3);
      let okRun = true;
      for (let i = 0; i < n; i++) if (!free(x0 + i * 32, y0, 12)) okRun = false;
      if (okRun) {
        for (let i = 0; i < n; i++) c.push({ kind: 'fence', x: x0 + i * 32, y: y0, r: 11 });
        c.push({ kind: 'post', x: x0 - 16, y: y0 + 1, r: 6 });
        c.push({ kind: 'post', x: x0 + (n - 1) * 32 + 16, y: y0 + 1, r: 6 });
      }
    } else if (r < 0.15) {
      const n = 1 + (H(6) < 0.35 ? 1 : 0);
      for (let i = 0; i < n; i++) {
        const x = x0 + i * 24, y = y0 + i * 10;
        if (free(x, y, 10)) c.push({ kind: 'pumpkin', v: Math.floor(H(40 + i) * 3), x, y, r: 10 });
      }
    }
    cells.set(key, c);
    return c;
  }

  function lanternCell(cx, cy) {
    const key = cx + ',' + cy;
    let l = lcells.get(key);
    if (l !== undefined) return l;
    l = null;
    const H = k => G.U.hash(cx, cy, seed * 53 + k);
    if (H(1) < 0.62) {
      for (let tries = 0; tries < 4 && !l; tries++) {
        const x = cx * LC + 30 + H(2 + tries) * (LC - 60), y = cy * LC + 40 + H(8 + tries) * (LC - 80);
        if (free(x, y, 12)) l = { kind: 'lantern', x, y, r: 8, out: false, wig: H(20) * 10 };
      }
    }
    lcells.set(key, l);
    return l;
  }

  function lanternsIn(x0, y0, x1, y1) {
    const out = [];
    for (let cy = Math.floor(y0 / LC); cy <= Math.floor(y1 / LC); cy++)
      for (let cx = Math.floor(x0 / LC); cx <= Math.floor(x1 / LC); cx++) {
        const l = lanternCell(cx, cy);
        if (l) out.push(l);
      }
    return out;
  }

  /** Lanterns within `r` of (x, y) (for the lanterns objective). */
  function lanternsNear(x, y, r) {
    return lanternsIn(x - r, y - r, x + r, y + r).filter(l => G.U.dist2(l.x, l.y, x, y) < r * r);
  }

  /** Decorations with feet, for the Y-sorted scene (game.js drawScene). */
  function drawables(cam) {
    if (!ok || !on()) return [];
    const pad = 60, x0 = cam.left() - pad, y0 = cam.top() - pad, x1 = cam.left() + cam.w + pad, y1 = cam.top() + cam.h + pad + 40;
    const out = [], t = performance.now() / 1000;
    for (let cy = Math.floor(y0 / DC); cy <= Math.floor(y1 / DC); cy++)
      for (let cx = Math.floor(x0 / DC); cx <= Math.floor(x1 / DC); cx++)
        for (const d of decoCell(cx, cy)) out.push({ y: d.y, draw: ctx => drawOne(ctx, d) });
    for (const l of lanternsIn(x0, y0, x1, y1)) out.push({ y: l.y, draw: ctx => drawLantern(ctx, l, t) });
    return out;
  }

  function shadow(ctx, x, y, r) {
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.beginPath(); ctx.ellipse(x, y, r * 1.1, r * 0.38, 0, 0, 6.2832); ctx.fill();
  }
  function drawOne(ctx, d) {
    if (d.kind === 'grave') { shadow(ctx, d.x, d.y, d.r); piece(ctx, 'grave' + d.v, d.x, d.y); }
    else if (d.kind === 'pumpkin') { shadow(ctx, d.x, d.y, d.r); piece(ctx, 'pumpkin' + d.v, d.x, d.y); }
    else if (d.kind === 'fence') piece(ctx, 'fence', d.x, d.y);
    else if (d.kind === 'post') piece(ctx, 'post', d.x, d.y);
  }
  function drawLantern(ctx, l, t) {
    shadow(ctx, l.x, l.y, l.r);
    piece(ctx, l.out ? 'lanternOut' : 'lanternLit', l.x, l.y);
    if (!l.out) {
      const f = 0.85 + Math.sin(t * 9 + l.wig) * 0.1 + Math.sin(t * 17 + l.wig * 2) * 0.05;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(l.x, l.y - 34, 1, l.x, l.y - 34, 24 * f);
      g.addColorStop(0, 'rgba(255,190,90,.45)'); g.addColorStop(1, 'rgba(255,150,60,0)');
      ctx.fillStyle = g; ctx.fillRect(l.x - 28, l.y - 62, 56, 56);
      ctx.restore();
    }
  }

  // ---------------- night ----------------

  const NIGHT = 0.42, OUT = 0.9, COL = [8, 10, 26];
  let dc = null, dctx = null, img = null, dark = null, fog = null;

  function fogTex() {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d'), d = g.createImageData(64, 64);
    const r = (x, y) => G.U.hash(((x % 8) + 8) % 8, ((y % 8) + 8) % 8, 4242);
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
      const fx = x / 64 * 8, fy = y / 64 * 8, ix = Math.floor(fx), iy = Math.floor(fy), u = fx - ix, v = fy - iy;
      const su = u * u * (3 - 2 * u), sv = v * v * (3 - 2 * v);
      const a = r(ix, iy) + (r(ix + 1, iy) - r(ix, iy)) * su, b = r(ix, iy + 1) + (r(ix + 1, iy + 1) - r(ix, iy + 1)) * su;
      const p = a + (b - a) * sv, i = (y * 64 + x) * 4;
      d.data[i] = 190; d.data[i + 1] = 205; d.data[i + 2] = 200; d.data[i + 3] = Math.round(Math.max(0, p - 0.35) * 1.6 * 255);
    }
    g.putImageData(d, 0, 0);
    return c;
  }

  /**
   * Draws the night over the screen (after the scene, in screen pixels).
   * @param extra  more lights in world coords [{ x, y, r }] (players, objectives)
   */
  function drawNight(ctx, w, h, cam, t, extra) {
    const k = cam.scale, left = cam.left(), top = cam.top();
    const cell = Math.max(12, w / 160), gw = Math.max(1, Math.ceil(w / cell)), gh = Math.max(1, Math.ceil(h / cell));
    if (!dc || dc.width !== gw || dc.height !== gh) {
      dc = document.createElement('canvas'); dc.width = gw; dc.height = gh;
      dctx = dc.getContext('2d'); img = dctx.createImageData(gw, gh); dark = new Float32Array(gw * gh);
    }
    const vw = w / k, vh = h / k;
    const lanterns = on() ? lanternsIn(left - 900, top - 900, left + vw + 900, top + vh + 900) : [];
    const lights = [];
    const near = (x, y, r) => x > left - r && x < left + vw + r && y > top - r && y < top + vh + r;
    for (const l of lanterns) if (!l.out && near(l.x, l.y - 30, 180)) lights.push({ x: l.x, y: l.y - 30, r: 180 });
    for (const p of G.World.visibleProps(cam)) if (p.type === 'pumpkin') lights.push({ x: p.x, y: p.y - 14, r: 100 });
    for (const e of extra || []) if (near(e.x, e.y, e.r)) lights.push(e);
    const step = cell / k;
    for (let gy = 0; gy < gh; gy++) {
      const wy = top + (gy + 0.5) * step;
      for (let gx = 0; gx < gw; gx++) {
        const wx = left + (gx + 0.5) * step;
        let best = Infinity, f = NIGHT;
        for (const l of lanterns) {
          const d = (l.x - wx) ** 2 + (l.y - 30 - wy) ** 2;
          if (d < best) { best = d; f = l.out ? OUT : NIGHT; }
        }
        for (const L of lights) {
          const dx = L.x - wx, dy = L.y - wy, d2 = dx * dx + dy * dy;
          if (d2 >= L.r * L.r) continue;
          const a = (Math.sqrt(d2) / L.r - 0.4) / 0.6;
          f *= a <= 0 ? 0 : a * a * (3 - 2 * a);
          if (f <= 0) break;
        }
        dark[gy * gw + gx] = f;
      }
    }
    const px = img.data;
    for (let i = 0; i < dark.length; i++) {
      const j = i * 4;
      px[j] = COL[0]; px[j + 1] = COL[1]; px[j + 2] = COL[2]; px[j + 3] = Math.round(dark[i] * 255);
    }
    dctx.putImageData(img, 0, 0);
    // Fog drifting with the world and the wind.
    fog = fog || fogTex();
    const ox = -((left * k + t * 14) % 512 + 512) % 512, oy = -((top * k + t * 5) % 512 + 512) % 512;
    ctx.save();
    ctx.globalAlpha = 0.22; ctx.imageSmoothingEnabled = true;
    for (let y = oy; y < h; y += 512) for (let x = ox; x < w; x += 512) ctx.drawImage(fog, x, y, 512, 512);
    ctx.globalAlpha = 1;
    ctx.drawImage(dc, 0, 0, gw * cell, gh * cell);
    ctx.restore();
  }

  return { reset, piece, drawables, drawNight, lanternsNear, get ok() { return ok; }, get on() { return on(); } };
})();
