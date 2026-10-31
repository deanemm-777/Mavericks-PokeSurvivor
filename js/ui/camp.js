/* ============ camp.js — the camp main menu (standalone build, Doofcraft update 40) ============
 *
 * The main menu is Doofcraft's camp, walked around as your partner, with
 * Doofcraft's own art and layout (world/camp-art.js). Walk up to something and
 * interact (A, Enter / Space, or tap the prompt) to open its menu, or just tap
 * it. Every menu is still one tap away in the dock along the bottom, and "☰"
 * switches back to the classic list menu (the choice is remembered).
 *
 *   Platform               Play (step on it)
 *   Campfire and benches   Emotes
 *   Kecleon's stall        Kecleon Shop
 *   Blue stall             Poké Mart
 *   Pumpkaboo's stall      Halloween Shop (while it's open)
 *   PC (Porygon)           Pokémon, or the Move Dex
 *   Mailbox                Bag
 *   Slot machine (Meowth)  Gacha
 *   Job board              Missions
 *   Hall of Fame statue    Upgrades
 *   Dojo (Hitmonchan)      Training Dojo
 *
 * Coordinates: Doofcraft's camp units (2 per art px, 32 per tile); the camp is
 * drawn shifted by (OX, OY) so the campfire sits at the world's origin.
 * Moving: the d-pad / controller / arrow keys / WASD, or the floating touch
 * joystick from a run (core/touch.js): put a finger down anywhere and drag.
 */
G.Camp = (() => {
  const A = G.CampArt, HUB = A.HUB;
  const OX = -752, OY = -500;
  const SPEED = 230, BODY = 10;
  const OBJ = [
    { id: 'campfire', kind: 'campfire', go: 'emotes', name: 'Emotes', x: 23.5, y: 15.6 },
    { id: 'mart', kind: 'stall', go: 'shop', name: 'Kecleon Shop', x: 5, y: 12, w: 5, npc: { dex: 352, x: 7.5, y: 13.45, dir: 0 } },
    { id: 'event-shop', kind: 'stall', go: 'halloween', name: 'Halloween Shop', x: 6, y: 18.2, w: 4, hw: true, npc: { dex: 710, x: 8, y: 19.65, dir: 0 } },
    { id: 'pokemart', kind: 'stall', go: 'mart', name: 'Poké Mart', x: 36.8, y: 11.8, w: 5 },
    { id: 'pc', kind: 'pc', go: 'dex', name: 'Pokémon', alt: { go: 'movedex', name: 'Move Dex' }, x: 32, y: 12.4, npc: { dex: 137, x: 34.6, y: 14.3, dir: 6 } },
    { id: 'mailbox', kind: 'mailbox', go: 'bag', name: 'Bag', x: 18.3, y: 11.6 },
    { id: 'gacha', kind: 'gacha', go: 'gacha', name: 'Gacha', x: 13.5, y: 19.4, npc: { dex: 52, x: 12.7, y: 22.3, dir: 2 } },
    { id: 'board', kind: 'board', go: 'goals', name: 'Missions', x: 17.6, y: 20.4 },
    { id: 'statue', kind: 'statue', go: 'upgrades', name: 'Upgrades', x: 27.6, y: 20.6 },
    { id: 'dojo', kind: 'dojo', go: 'dojo', name: 'Training Dojo', x: 36, y: 20, w: 7, h: 6, npc: { dex: 107, x: 39, y: 23.2, dir: 0 } }
  ];
  const PLAY = { id: 'platform', go: 'play', name: 'Play' };
  const PL = { cx: Math.round(HUB.platform.x * 16), cy: Math.round(HUB.platform.y * 16), rx: Math.round(HUB.platform.rx * 16), ry: Math.round(HUB.platform.ry * 16) };
  let on = false, mate = null, px = HUB.spawn.x * 32, py = HUB.spawn.y * 32, near = null, t = 0;
  const npcs = {};

  const view = () => (G.Settings.get('menuView') || 'camp');
  const hwOpen = () => !!(G.MartUI && G.MartUI.hwVisible());
  const objs = () => OBJ.filter(o => !o.hw || hwOpen());

  // ---------------- shapes (Doofcraft's, in art px relative to the object) ----------------
  const rects = (o, list) => list.map(([x, y, w, h]) => ({ x: (o.x * 16 + x) * 2, y: (o.y * 16 + y) * 2, w: w * 2, h: h * 2 }));
  function solids(o) {
    const w = (o.w || 1) * 16, h = (o.h || 1) * 16;
    switch (o.kind) {
      case 'campfire': return rects(o, [[-7, -3, 14, 8], [-38, -12, 16, 26], [22, -12, 16, 26]]);
      case 'stall': return rects(o, [[0, -14, w, 60]]);
      case 'pc': return rects(o, [[-2, 12, 36, 14]]);
      case 'mailbox': return rects(o, [[5, 10, 6, 5]]);
      case 'gacha': return rects(o, [[0, 34, 44, 16]]);
      case 'board': return rects(o, [[2, 24, 44, 10]]);
      case 'statue': return rects(o, [[0, 20, 28, 14]]);
      case 'dojo': return rects(o, [[-16, 4, w + 35, h]]);
    }
    return [];
  }
  function reach(o) {
    switch (o.kind) {
      case 'campfire': return rects(o, [[-22, -16, 44, 32]])[0];
      case 'mailbox': return rects(o, [[2, 2, 12, 13]])[0];
      case 'pc': return rects(o, [[-10, 0, 52, 34]])[0];
      case 'gacha': return rects(o, [[-8, 20, 60, 38]])[0];
      default: return solids(o)[0];
    }
  }
  const rectDist = (r, x, y) => Math.hypot(Math.max(r.x - x, 0, x - (r.x + r.w)), Math.max(r.y - y, 0, y - (r.y + r.h)));
  function artOf(o) {
    switch (o.kind) {
      case 'pc': return A.pc();
      case 'gacha': return A.slots();
      case 'board': return A.board();
      case 'statue': return A.statue();
      case 'dojo': return A.dojo(o);
      case 'stall': return A.stallFront(o);
    }
    return null;
  }
  /** Where the object is on screen (for taps and labels), in camp units. */
  function bounds(o) {
    const a = artOf(o), w = a ? a.img.width : 16, h = a ? a.img.height : 16, ox = a ? a.ox : 0, oy = a ? a.oy : 0;
    if (o.kind === 'campfire') return { x: (o.x * 16 - 38) * 2, y: (o.y * 16 - 16) * 2, w: 152, h: 64 };
    if (o.kind === 'stall') return { x: o.x * 32, y: (o.y * 16 - 14) * 2, w: (o.w || 5) * 32, h: 120 };
    return { x: (o.x * 16 - ox) * 2, y: (o.y * 16 - oy) * 2, w: w * 2, h: h * 2 };
  }

  // ---------------- collisions (Doofcraft's) ----------------
  const platTop = (x, y) => x * x / (PL.rx * PL.rx) + y * y / (PL.ry * PL.ry) < 1;
  const onPlatform = (x, y) => platTop(x / 2 - PL.cx, y / 2 - PL.cy);
  function inFace(x, y) {
    const a = x / 2 - PL.cx, b = y / 2 - PL.cy;
    return b > 0 && Math.abs(a) > 30 && !platTop(a, b) && platTop(a, b - 8);
  }
  let solidList = [], circles = [], solidHw = null;
  function buildSolids() {
    const hw = hwOpen();
    if (hw === solidHw) return;
    solidHw = hw;
    solidList = []; circles = [];
    for (const o of objs()) { solidList.push(...solids(o)); if (o.npc) circles.push({ x: o.npc.x * 32, y: o.npc.y * 32, r: 14 }); }
    for (const p of HUB.props) if (p.type !== 'grass') circles.push({ x: p.x * 32, y: p.y * 32 - 4, r: (p.type === 'rock' ? 8 : 6) * 2 });
  }
  function blocked(x, y, r = BODY) {
    for (let i = 0; i < 9; i++) {
      const a = i / 8 * Math.PI * 2, sx = i === 8 ? x : x + Math.cos(a) * r, sy = i === 8 ? y : y + Math.sin(a) * r;
      if (A.tileAt(Math.floor(sx / 32), Math.floor(sy / 32)) === 'wall' || inFace(sx, sy)) return true;
    }
    for (const s of solidList) if (rectDist(s, x, y) < r) return true;
    for (const c of circles) if (Math.hypot(c.x - x, c.y - y) < c.r + r) return true;
    return false;
  }
  const SLIDE = [0.35, -0.35, 0.7, -0.7, 1.05, -1.05];
  function move(dx, dy) {
    const n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 4)), sx = dx / n, sy = dy / n;
    for (let k = 0; k < n; k++) {
      const ox = px, oy = py;
      if (!blocked(px + sx, py)) px += sx;
      if (!blocked(px, py + sy)) py += sy;
      if (px === ox && py === oy) {
        for (const a of SLIDE) {
          const c = Math.cos(a), rx = (sx * Math.cos(a) - sy * Math.sin(a)) * c, ry = (sx * Math.sin(a) + sy * Math.cos(a)) * c;
          if (!blocked(px + rx, py + ry)) { px += rx; py += ry; break; }
        }
      }
    }
  }
  function nearest() {
    if (onPlatform(px, py)) return PLAY;
    let best = null, bd = 28;
    for (const o of objs()) { const d = rectDist(reach(o), px, py); if (d <= bd) { bd = d; best = o; } }
    return best;
  }

  /** The menu is showing the camp (not the list) and nothing is open over it. */
  function walking() {
    if (!on || view() !== 'camp' || !G.UI.isOpen('scr-menu')) return false;
    const tap = document.getElementById('tap-start');
    if (tap && !tap.classList.contains('hidden')) return false;
    for (const s of document.querySelectorAll('.scr:not(.hidden)')) if (s.id !== 'scr-menu') return false;
    const fx = document.getElementById('pull-fx');
    return !(fx && !fx.classList.contains('hidden'));
  }

  /** Called by the menu when it opens. */
  function enter() {
    on = true;
    const s = G.DB.save;
    if (s && (!mate || mate.dex !== s.partner || mate.shiny !== !!s.partnerShiny)) {
      const shiny = !!s.partnerShiny && G.DB.ownsShiny(s.partner);
      mate = new G.Sprites.Animator(s.partner, 1, shiny);
      mate.loop('Idle');
      G.Sprites.preload([s.partner], 4000, shiny);
    }
    const want = OBJ.filter(o => o.npc && G.SPRITE_META[o.npc.dex]).map(o => o.npc.dex);
    G.Sprites.preload(want, 4000);
    for (const o of OBJ) if (o.npc && !npcs[o.id] && G.SPRITE_META[o.npc.dex]) {
      const a = new G.Sprites.Animator(o.npc.dex, 1); a.loop('Idle'); a.dir = o.npc.dir; npcs[o.id] = a;
    }
    applyView();
  }

  function applyView() {
    document.body.classList.toggle('camp', view() === 'camp');
    const d = document.getElementById('camp-dock');
    if (d && !d.dataset.built) buildDock(d);
    wireStick();
    if (d) d.querySelectorAll('[data-dgo=halloween]').forEach(b => b.classList.toggle('hidden', !hwOpen()));
  }

  function setView(v) { G.Settings.set('menuView', v); applyView(); G.Audio.sfx('click'); }

  function buildDock(d) {
    d.dataset.built = '1';
    const items = [...document.querySelectorAll('#scr-menu .menu-list [data-go]')];
    d.innerHTML = items.map(b => {
      const go = b.dataset.go, ico = b.querySelector('.mi-ico');
      const label = (b.childNodes[1] && b.childNodes[1].nodeType === 3 ? b.childNodes[1].textContent : b.textContent).trim();
      return `<button class="dock-btn${go === 'play' ? ' play' : ''}${b.classList.contains('offline-hide') ? ' offline-hide' : ''}" data-dgo="${go}" title="${label}">
        ${ico ? ico.innerHTML : ''}<small>${label}</small></button>`;
    }).join('') + `<button class="dock-btn" id="camp-list" title="List menu">☰<small>List</small></button>`;
    d.querySelectorAll('[data-dgo]').forEach(b => { b.onclick = () => openGo(b.dataset.dgo); });
    d.querySelector('#camp-list').onclick = () => setView('list');
    const back = document.getElementById('camp-back');
    if (back) back.onclick = () => setView('camp');
  }

  function openGo(go) {
    const src = document.querySelector(`#scr-menu .menu-list [data-go="${go}"]`);
    if (src) src.click();
  }
  const open = o => openGo(o.go);
  function interact() { if (near) open(near); }

  /** The "A Pokémon" prompt; the PC also offers the Move Dex. */
  function showPrompt() {
    const p = document.getElementById('camp-prompt');
    if (p) {
      p.classList.toggle('hidden', !near);
      if (near) {
        p.innerHTML = `<span data-pgo="${near.go}"><b>A</b> ${near.name}</span>` +
          (near.alt ? ` <span class="camp-alt" data-pgo="${near.alt.go}">· ${near.alt.name}</span>` : '');
        p.querySelectorAll('[data-pgo]').forEach(s => { s.onclick = e => { e.stopPropagation(); G.Audio.sfx('click'); openGo(s.dataset.pgo); }; });
      }
    }
    const act = document.getElementById('camp-act');
    if (act) act.classList.toggle('ready', !!near);
  }

  /** Each frame while the menu backdrop runs (game.js Backdrop). */
  function update(dt) {
    if (!on) return;
    t += dt;
    buildSolids();
    G.Touch.clearButtons();          // no run HUD buttons to press in the camp
    const walk = walking();
    let vx = 0, vy = 0;
    if (walk) {
      // Keys, the controller and the touch joystick (core/touch.js) all come through here.
      const a = G.Input.axis();
      if (a[0] || a[1]) { vx = a[0]; vy = a[1]; }
      if (G.Input.tap('enter') || G.Input.tap('space')) interact();
      if (G.Input.tap('keyg')) G.Emotes.openWheel();
    }
    const m = Math.hypot(vx, vy);
    if (m > 0.15) {
      const k = Math.min(1, m) / m;
      move(vx * k * SPEED * dt, vy * k * SPEED * dt);
    }
    if (mate) {
      const moving = m > 0.15;
      if (moving) mate.dir = G.Sprites.dirFromAngle(Math.atan2(vy, vx));
      mate.loop(moving ? 'Walk' : 'Idle');
      mate.update(dt);
    }
    for (const k in npcs) npcs[k].update(dt);
    // Camera on the partner, kept inside the camp.
    const cam = G.Camera, mw = HUB.width * 32, mh = HUB.height * 32;
    // (A little room above the top, so the HUD doesn't cover you up there.)
    const clamp = (v, lo, hi) => (hi < lo ? (lo + hi) / 2 : Math.max(lo, Math.min(hi, v)));
    G.Camera.follow(clamp(px, cam.w / 2, mw - cam.w / 2) + OX, clamp(py - 20, cam.h / 2 - 90, mh - cam.h / 2) + OY, dt);
    // The nearest thing you can use.
    const best = walk ? nearest() : near;
    if (best !== near) { near = best; showPrompt(); }
  }

  /*
   * The A button (full-screen theme; the Game Boy skin has its own A). Moving
   * uses the same floating joystick as a run (core/touch.js): put a finger
   * down anywhere on the camp and drag.
   */
  function wireStick() {
    const act = document.getElementById('camp-act');
    if (!act || act.dataset.wired) return;
    act.dataset.wired = '1';
    act.addEventListener('pointerdown', e => { e.preventDefault(); if (near) { G.Audio.sfx('click'); interact(); } });
  }

  /** The touch joystick, drawn over the camp (game.js Backdrop render, screen px). */
  function drawStick(ctx) { if (on && view() === 'camp' && G.Touch.active) G.Touch.draw(ctx); }

  /** World props are hidden while the camp covers the screen (game.js drawScene). */
  function hides() { return on && view() === 'camp'; }

  // ---------------- drawing ----------------

  function platformLight() { return onPlatform(px, py) ? 'gold' : 'idle'; }

  /** Things to draw, y-sorted with the rest of the scene (world y). */
  function drawables() {
    if (!on || view() !== 'camp') return [];
    const W = (y, draw) => ({ y: y + OY, draw: ctx => { ctx.save(); ctx.translate(OX, OY); draw(ctx); ctx.restore(); } });
    const out = [W(-1e7, ctx => {
      ctx.fillStyle = '#1d2a1c'; ctx.fillRect(-4000, -4000, HUB.width * 32 + 8000, HUB.height * 32 + 8000);
      A.drawGround(ctx);
      A.art(ctx, A.platform(PL.rx, PL.ry, platformLight()), PL.cx, PL.cy);
    })];
    for (const o of objs()) queueObject(o, out, W);
    for (const p of HUB.props) {
      const k = p.type + p.variant, s = SHEETSZ[k];
      if (!s) continue;
      const x = p.x * 16, y = p.y * 16;
      out.push(W(y * 2, ctx => A.piece(ctx, k, x - s[0] / 2, y - s[1] + 2)));
    }
    for (const o of objs()) {
      const a = npcs[o.id];
      if (a) out.push(W(o.npc.y * 32, ctx => { G.Sprites.drawShadow(ctx, a.dex, o.npc.x * 32, o.npc.y * 32); a.draw(ctx, o.npc.x * 32, o.npc.y * 32); }));
    }
    if (mate) out.push(W(py, ctx => { G.Sprites.drawShadow(ctx, mate.dex, px, py); mate.draw(ctx, px, py); G.Emotes.drawAt(ctx, px, py - 46); }));
    return out;
  }
  const SHEETSZ = { tree0: [30, 40], tree1: [30, 40], tree2: [30, 40], rock0: [22, 17], rock1: [22, 17], rock2: [22, 17], grass0: [20, 17], grass1: [20, 17] };

  function queueObject(o, out, W) {
    const x = o.x * 16, y = o.y * 16;
    switch (o.kind) {
      case 'dojo':
        out.push(W(-1e6, ctx => A.art(ctx, A.dojo(o), x, y)));
        return;
      case 'stall':
        out.push(W((y - 20) * 2, ctx => A.art(ctx, A.stallBack(o), x, y)));
        out.push(W((y + 34) * 2, ctx => A.art(ctx, A.stallFront(o), x, y)));
        return;
      case 'campfire':
        out.push(W((y + 12) * 2, ctx => { A.piece(ctx, 'benchL', x - 38, y - 16); A.piece(ctx, 'benchR', x + 22, y - 16); }));
        out.push(W((y - 3) * 2, ctx => {
          const g = ctx.createRadialGradient(x * 2, y * 2, 2, x * 2, y * 2, 88);
          g.addColorStop(0, 'rgba(255,190,90,.38)'); g.addColorStop(1, 'rgba(255,190,90,0)');
          ctx.fillStyle = g; ctx.fillRect((x - 44) * 2, (y - 44) * 2, 176, 176);
          if (!A.piece(ctx, 'fire', x - 8, y - 8, (Math.floor(t * 8) % 4) * 16)) A.piece(ctx, 'fireOff', x - 8, y - 8);
        }));
        return;
      case 'mailbox':
        out.push(W((y + 15) * 2, ctx => { A.piece(ctx, 'mailEmpty', x, y); }));
        return;
      default: {
        const a = artOf(o);
        if (a) out.push(W((y - a.oy + a.img.height - 2) * 2, ctx => A.art(ctx, a, x, y)));
      }
    }
  }

  function anchor(o) { const b = bounds(o); return [o.kind === 'gacha' ? b.x + 40 : b.x + b.w / 2, b.y - 6]; }

  function tag(ctx, text, x, y, hot, big) {
    ctx.font = (hot || big ? '700 ' : '400 ') + (big ? 14 : 12) + 'px Pixelify, "Segoe UI", system-ui, sans-serif';
    const w = Math.ceil(ctx.measureText(text).width) + 12, l = Math.round(x - w / 2), tp = Math.round(y - 18);
    ctx.fillStyle = hot ? '#ffd65c' : 'rgba(20,16,18,.8)'; ctx.fillRect(l, tp, w, 18);
    ctx.fillStyle = hot ? '#141012' : big ? '#ffd65c' : '#f2e9d8';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, Math.round(x), tp + 10);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }
  function drawLabels(ctx) {
    if (!on || view() !== 'camp') return;
    ctx.save(); ctx.translate(OX, OY);
    // Labels stay the same size on screen whatever the zoom.
    const s = 1 / G.Camera.scale * Math.min(1.4, Math.max(0.8, G.Camera.scale));
    const at = (text, x, y, hot, big) => { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); tag(ctx, text, 0, 0, hot, big); ctx.restore(); };
    at('Play', PL.cx * 2, (PL.cy - PL.ry - 4) * 2, near === PLAY, true);
    for (const o of objs()) {
      const [ax, ay] = anchor(o), hot = o === near;
      if (!hot && Math.hypot(ax - px, ay - py) > 352) continue;
      at(o.name, ax, ay, hot, false);
    }
    ctx.restore();
  }

  /** Lights for the Halloween night (World.drawNight): the campfire and you. */
  function lights() {
    if (!on || view() !== 'camp') return null;
    const f = OBJ[0];
    return [{ x: f.x * 32 + OX, y: f.y * 32 + OY, r: 230 + Math.sin(t * 9) * 8, col: 'rgba(255,150,60,.35)' }, { x: px + OX, y: py + OY - 12, r: 90 }];
  }

  return { enter, update, drawables, drawLabels, drawStick, lights, hides, interact, walking, setView, get active() { return on && view() === 'camp'; } };
})();
