/* ============ camp.js — the camp main menu (standalone build, Doofcraft update 40) ============
 *
 * The main menu is a camp you walk around as your partner. Walk up to something
 * and interact (A, Enter / Space, or tap the prompt) to open its menu, or just
 * tap it. Every menu is still one tap away in the dock along the bottom, and
 * "☰" switches back to the classic list menu (the choice is remembered).
 *
 *   Campfire          Play                Kecleon's stall    Kecleon Shop
 *   PC                Pokémon             Poké Mart counter  Poké Mart
 *   Training post     Upgrades            Capsule machine    Gacha
 *   Hitmonlee         Training Dojo       Notice board       Missions
 *   Tent              Bag                 Book stand         Move Dex
 *   Pumpkin stand     Halloween Shop (while it's open)
 *
 * Moving: the d-pad / stick / arrow keys / WASD, or tap the ground to walk there.
 */
G.Camp = (() => {
  const R = 300;                  // walkable radius around the campfire
  const SPEED = 125;
  const OBJ = [
    { go: 'play', name: 'Play', x: 0, y: 10, r: 34, draw: drawFire },
    { go: 'dex', name: 'Pokémon', x: -170, y: -120, r: 30, draw: drawPC },
    { go: 'upgrades', name: 'Upgrades', x: 170, y: -120, r: 28, draw: drawPost },
    { go: 'shop', name: 'Kecleon Shop', x: -250, y: 40, r: 34, draw: drawKecleon, npc: 352 },
    { go: 'mart', name: 'Poké Mart', x: 250, y: 40, r: 34, draw: drawMart },
    { go: 'gacha', name: 'Gacha', x: -150, y: 175, r: 28, draw: drawGacha },
    { go: 'dojo', name: 'Training Dojo', x: 150, y: 175, r: 30, draw: drawDojo, npc: 106 },
    { go: 'goals', name: 'Missions', x: 0, y: -205, r: 30, draw: drawBoard },
    { go: 'bag', name: 'Bag', x: -280, y: -170, r: 34, draw: drawTent },
    { go: 'movedex', name: 'Move Dex', x: 280, y: -170, r: 26, draw: drawBooks },
    { go: 'emotes', name: 'Emotes', x: -88, y: -178, r: 22, draw: drawEmotes },
    { go: 'halloween', name: 'Halloween Shop', x: 0, y: 245, r: 30, draw: drawPumpkins, hw: true }
  ];
  let stick = [0, 0];         // on-screen joystick (full-screen theme)
  let on = false, mate = null, px = 0, py = 90, tx = null, ty = null, pendingGo = null, near = null, t = 0;
  const npcs = {};

  const view = () => (G.Settings.get('menuView') || 'camp');
  const objs = () => OBJ.filter(o => !o.hw || (G.MartUI && G.MartUI.hwVisible()));

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
    for (const o of OBJ) if (o.npc && !npcs[o.npc] && G.SPRITE_META[o.npc]) {
      npcs[o.npc] = new G.Sprites.Animator(o.npc, 1); npcs[o.npc].loop('Idle'); npcs[o.npc].dir = 0;
    }
    applyView();
  }

  function applyView() {
    document.body.classList.toggle('camp', view() === 'camp');
    const d = document.getElementById('camp-dock');
    if (d && !d.dataset.built) buildDock(d);
    const p = document.getElementById('camp-prompt');
    if (p) p.onclick = interact;
    wireStick();
    if (d) d.querySelectorAll('[data-dgo=halloween]').forEach(b => b.classList.toggle('hidden', !(G.MartUI && G.MartUI.hwVisible())));
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
    d.querySelectorAll('[data-dgo]').forEach(b => {
      b.onclick = () => { const src = document.querySelector(`#scr-menu .menu-list [data-go="${b.dataset.dgo}"]`); if (src) src.click(); };
    });
    d.querySelector('#camp-list').onclick = () => setView('list');
    const back = document.getElementById('camp-back');
    if (back) back.onclick = () => setView('camp');
  }

  function open(o) {
    const src = document.querySelector(`#scr-menu .menu-list [data-go="${o.go}"]`);
    if (src) src.click();
  }
  function interact() { if (near) open(near); }

  /** Each frame while the menu backdrop runs (game.js Backdrop). */
  function update(dt) {
    if (!on) return;
    t += dt;
    const walk = walking();
    let vx = 0, vy = 0;
    if (walk) {
      const a = stick[0] || stick[1] ? stick : G.Input.axis();
      if (a[0] || a[1]) { vx = a[0]; vy = a[1]; tx = ty = null; pendingGo = null; }
      else if (tx != null) {
        const dx = tx - px, dy = ty - py, d = Math.hypot(dx, dy);
        if (d < 6) { tx = ty = null; if (pendingGo) { const o = pendingGo; pendingGo = null; open(o); } }
        else { vx = dx / d; vy = dy / d; }
      }
      if (G.Input.tap('enter') || G.Input.tap('space')) interact();
      if (G.Input.tap('keyg')) G.Emotes.openWheel();
    }
    px += vx * SPEED * dt; py += vy * SPEED * dt;
    const d = Math.hypot(px, py);
    if (d > R) { px *= R / d; py *= R / d; }
    // Bump around the objects.
    for (const o of objs()) {
      const ox = px - o.x, oy = py - o.y, od = Math.hypot(ox, oy), min = o.r * 0.8;
      if (od < min && od > 0.01) { px = o.x + ox / od * min; py = o.y + oy / od * min; }
    }
    if (mate) {
      const moving = vx || vy;
      if (moving) mate.dir = G.Sprites.dirFromAngle(Math.atan2(vy, vx));
      mate.loop(moving ? 'Walk' : 'Idle');
      mate.update(dt);
    }
    for (const k in npcs) npcs[k].update(dt);
    // Camera on the partner.
    G.Camera.follow(px, py - 20, dt);
    // The nearest thing you can use.
    let best = null, bd = Infinity;
    for (const o of objs()) { const dd = Math.hypot(px - o.x, py - o.y) - o.r; if (dd < 46 && dd < bd) { bd = dd; best = o; } }
    if (best !== near) {
      near = best;
      const p = document.getElementById('camp-prompt');
      if (p) {
        p.classList.toggle('hidden', !near);
        if (near) p.innerHTML = `<b>A</b> ${near.name}`;
      }
      const act = document.getElementById('camp-act');
      if (act) act.classList.toggle('ready', !!near);
    }
  }

  /*
   * The on-screen joystick and A button (full-screen theme; the Game Boy skin
   * has its own d-pad and A). Drag anywhere in the stick's circle.
   */
  function wireStick() {
    const el = document.getElementById('camp-stick'), act = document.getElementById('camp-act');
    if (!el || el.dataset.wired) return;
    el.dataset.wired = '1';
    const knob = el.querySelector('i');
    let id = null;
    const set = (cx, cy) => {
      const r = el.getBoundingClientRect(), R0 = r.width / 2;
      let dx = cx - (r.left + R0), dy = cy - (r.top + R0);
      const d = Math.hypot(dx, dy), max = R0 * 0.6;
      if (d > max) { dx *= max / d; dy *= max / d; }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      const m = Math.hypot(dx, dy) / max;
      stick = m < 0.18 ? [0, 0] : [dx / max, dy / max];
    };
    const end = e => { if (e.pointerId !== id) return; id = null; stick = [0, 0]; knob.style.transform = ''; el.classList.remove('on'); };
    el.addEventListener('pointerdown', e => { e.preventDefault(); id = e.pointerId; el.setPointerCapture(id); el.classList.add('on'); tx = ty = null; pendingGo = null; set(e.clientX, e.clientY); });
    el.addEventListener('pointermove', e => { if (e.pointerId === id) set(e.clientX, e.clientY); });
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
    if (act) act.addEventListener('pointerdown', e => { e.preventDefault(); if (near) { G.Audio.sfx('click'); interact(); } });
  }

  /** Tap on the world: walk there; tap on something: walk to it and open it. */
  function onTap(e) {
    if (!walking() || e.target.id !== 'game') return;
    const cv = e.target, r = cv.getBoundingClientRect(), cam = G.Camera;
    const wx = cam.left() + (e.clientX - r.left) / cam.scale, wy = cam.top() + (e.clientY - r.top) / cam.scale;
    let hit = null;
    for (const o of objs()) if (Math.hypot(wx - o.x, wy - (o.y - 20)) < o.r + 26) hit = o;
    if (hit) {
      if (Math.hypot(px - hit.x, py - hit.y) < hit.r + 50) { open(hit); return; }
      const a = Math.atan2(py - hit.y, px - hit.x);
      tx = hit.x + Math.cos(a) * (hit.r + 18); ty = hit.y + Math.sin(a) * (hit.r + 18); pendingGo = hit;
    } else { tx = wx; ty = wy; pendingGo = null; }
  }
  addEventListener('pointerdown', onTap);

  /** World props under the camp are hidden (game.js drawScene). */
  function hides(p) { return on && view() === 'camp' && Math.hypot(p.x, p.y) < R + 70; }

  // ---------------- drawing ----------------

  function drawables() {
    if (!on || view() !== 'camp') return [];
    const out = [{ y: -1e6, draw: drawGround }];
    for (const o of objs()) out.push({ y: o.y, draw: ctx => { o.draw(ctx, o); label(ctx, o); } });
    if (mate) out.push({ y: py, draw: ctx => { G.Sprites.drawShadow(ctx, mate.dex, px, py); mate.draw(ctx, px, py); G.Emotes.drawAt(ctx, px, py - 46); } });
    return out;
  }
  /** Lights for the Halloween night (World.drawNight): the campfire. */
  function lights() {
    return on && view() === 'camp' ? [{ x: 0, y: -8, r: 230 + Math.sin(t * 9) * 8, col: 'rgba(255,150,60,.35)' }, { x: px, y: py - 12, r: 90 }] : null;
  }

  const rect = (ctx, c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
  function shadow(ctx, x, y, rx) { ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(x, y, rx, rx * 0.35, 0, 0, 6.2832); ctx.fill(); }

  function drawGround(ctx) {
    ctx.save();
    const g = ctx.createRadialGradient(0, 0, 40, 0, 0, R + 60);
    g.addColorStop(0, 'rgba(150,110,70,.55)'); g.addColorStop(0.75, 'rgba(120,90,60,.35)'); g.addColorStop(1, 'rgba(120,90,60,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(0, 0, R + 60, (R + 60) * 0.82, 0, 0, 6.2832); ctx.fill();
    ctx.restore();
  }

  function label(ctx, o) {
    const isNear = o === near;
    ctx.save();
    ctx.font = (isNear ? '800 11px' : '700 9px') + ' Pixelify, monospace'; ctx.textAlign = 'center';
    const y = o.y - (o.top || 64);
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.strokeText(o.name, o.x, y);
    ctx.fillStyle = isNear ? '#ffd23f' : 'rgba(240,244,255,.9)'; ctx.fillText(o.name, o.x, y);
    if (isNear) { ctx.fillText('▼', o.x, y + 10 + Math.sin(t * 6) * 2); }
    ctx.restore();
  }

  function drawFire(ctx, o) {
    o.top = 58;
    const { x, y } = o;
    // Stones and logs.
    for (let i = 0; i < 9; i++) {
      const a = i / 9 * 6.2832, sx = x + Math.cos(a) * 24, sy = y + Math.sin(a) * 10;
      ctx.fillStyle = i % 2 ? '#6f6a72' : '#857f88'; ctx.beginPath(); ctx.ellipse(sx, sy, 7, 5, 0, 0, 6.2832); ctx.fill();
    }
    ctx.save(); ctx.translate(x, y - 2);
    for (const r of [-0.4, 0.4]) { ctx.save(); ctx.rotate(r); rect(ctx, '#5a3a22', -18, -3, 36, 6); rect(ctx, '#7a5232', -18, -3, 36, 2); ctx.restore(); }
    ctx.restore();
    // Flames.
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 6; i++) {
      const k = 0.7 + 0.3 * Math.sin(t * 9 + i * 1.7), fx = x + (i - 2.5) * 5 + Math.sin(t * 5 + i) * 2, fh = (24 + (i % 3) * 8) * k;
      const gr = ctx.createLinearGradient(fx, y - 4, fx, y - 4 - fh);
      gr.addColorStop(0, 'rgba(255,90,20,.9)'); gr.addColorStop(0.5, 'rgba(255,180,40,.8)'); gr.addColorStop(1, 'rgba(255,240,150,0)');
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.moveTo(fx - 6, y - 4); ctx.quadraticCurveTo(fx - 5, y - 4 - fh * 0.6, fx, y - 4 - fh); ctx.quadraticCurveTo(fx + 5, y - 4 - fh * 0.6, fx + 6, y - 4); ctx.fill();
    }
    const gl = ctx.createRadialGradient(x, y - 14, 2, x, y - 14, 70);
    gl.addColorStop(0, 'rgba(255,160,60,.35)'); gl.addColorStop(1, 'rgba(255,120,40,0)');
    ctx.fillStyle = gl; ctx.fillRect(x - 70, y - 84, 140, 140);
    // Sparks.
    for (let i = 0; i < 5; i++) {
      const ph = ((t * 0.7 + i * 0.23) % 1);
      rect(ctx, 'rgba(255,200,90,' + (1 - ph) + ')', x + Math.sin(i * 7 + t) * 10, y - 20 - ph * 50, 2, 2);
    }
    ctx.restore();
  }

  function drawPC(ctx, o) {
    o.top = 66;
    const { x, y } = o;
    shadow(ctx, x, y, 26);
    rect(ctx, '#5b4a3a', x - 26, y - 22, 52, 22);          // desk
    rect(ctx, '#3f3226', x - 26, y - 4, 52, 4);
    rect(ctx, '#c8ccd6', x - 18, y - 50, 36, 28);          // monitor
    rect(ctx, '#8a90a0', x - 18, y - 24, 36, 2);
    const glow = 0.75 + Math.sin(t * 3) * 0.15;
    rect(ctx, `rgba(80,${Math.round(170 * glow)},255,1)`, x - 14, y - 46, 28, 18);
    rect(ctx, 'rgba(255,255,255,.35)', x - 12, y - 44, 10, 2);
    rect(ctx, '#ff5f6d', x - 4, y - 40, 8, 3); rect(ctx, '#fff', x - 4, y - 37, 8, 3);   // a Poké Ball on screen
    rect(ctx, '#8a90a0', x - 4, y - 22, 8, 2);
  }

  function drawPost(ctx, o) {
    o.top = 64;
    const { x, y } = o;
    shadow(ctx, x, y, 18);
    rect(ctx, '#6b4a2e', x - 4, y - 46, 8, 46);            // post
    rect(ctx, '#8a6240', x - 4, y - 46, 3, 46);
    rect(ctx, '#d9b25c', x - 14, y - 34, 28, 6);           // straw bands
    rect(ctx, '#d9b25c', x - 14, y - 18, 28, 6);
    ctx.fillStyle = '#7fe08a'; ctx.font = '800 14px Pixelify, monospace'; ctx.textAlign = 'center';
    ctx.fillText('▲', x, y - 50 + Math.sin(t * 3) * 2);
  }

  function drawKecleon(ctx, o) {
    o.top = 78;
    const { x, y } = o;
    shadow(ctx, x, y, 34);
    rect(ctx, '#6b4a2e', x - 32, y - 20, 64, 20);         // counter
    rect(ctx, '#8a6240', x - 32, y - 20, 64, 4);
    rect(ctx, '#4a3220', x - 30, y - 56, 4, 36); rect(ctx, '#4a3220', x + 26, y - 56, 4, 36);
    for (let i = 0; i < 8; i++) rect(ctx, i % 2 ? '#f2f2f2' : '#3fb24a', x - 36 + i * 9, y - 64, 9, 10);   // awning
    const k = npcs[352];
    if (k) k.draw(ctx, x, y - 14);
  }

  function drawMart(ctx, o) {
    o.top = 78;
    const { x, y } = o;
    shadow(ctx, x, y, 34);
    rect(ctx, '#d8dde6', x - 32, y - 22, 64, 22);
    rect(ctx, '#b8bfcc', x - 32, y - 4, 64, 4);
    rect(ctx, '#3a6fd8', x - 36, y - 64, 72, 12);          // blue roof
    rect(ctx, '#2a52a8', x - 36, y - 54, 72, 3);
    rect(ctx, '#4a3220', x - 32, y - 52, 4, 30); rect(ctx, '#4a3220', x + 28, y - 52, 4, 30);
    ctx.fillStyle = '#fff'; ctx.font = '800 9px Pixelify, monospace'; ctx.textAlign = 'center'; ctx.fillText('MART', x, y - 56);
    // Goods on the counter.
    rect(ctx, '#ff5f6d', x - 20, y - 28, 8, 6); rect(ctx, '#fff', x - 20, y - 25, 8, 3);
    rect(ctx, '#7f6bff', x - 4, y - 30, 7, 8); rect(ctx, '#ffd23f', x + 10, y - 29, 8, 7);
  }

  function drawGacha(ctx, o) {
    o.top = 70;
    const { x, y } = o;
    shadow(ctx, x, y, 20);
    rect(ctx, '#c0303e', x - 16, y - 24, 32, 24);           // base
    rect(ctx, '#e04858', x - 16, y - 24, 32, 4);
    rect(ctx, '#222', x - 4, y - 14, 8, 8);                 // slot
    ctx.fillStyle = 'rgba(200,230,255,.55)';                // dome
    ctx.beginPath(); ctx.arc(x, y - 36, 16, Math.PI, 0); ctx.lineTo(x + 16, y - 24); ctx.lineTo(x - 16, y - 24); ctx.fill();
    const cols = ['#ff5f6d', '#ffd23f', '#5fd4ff', '#7fe08a', '#ff9ed8'];
    for (let i = 0; i < 7; i++) {
      const a = i * 0.9 + Math.sin(t * 2 + i) * 0.08, r = 6 + (i % 3) * 3;
      ctx.fillStyle = cols[i % cols.length];
      ctx.beginPath(); ctx.arc(x + Math.cos(a) * r, y - 30 - Math.abs(Math.sin(a)) * r * 0.7, 3, 0, 6.2832); ctx.fill();
    }
    rect(ctx, 'rgba(255,255,255,.6)', x - 9, y - 46, 4, 6);
  }

  function drawDojo(ctx, o) {
    o.top = 80;
    const { x, y } = o;
    ctx.fillStyle = '#c9b48a'; ctx.beginPath(); ctx.ellipse(x, y, 34, 13, 0, 0, 6.2832); ctx.fill();   // mat
    ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 2; ctx.stroke();
    const h = npcs[106];
    if (h) h.draw(ctx, x, y);
  }

  function drawBoard(ctx, o) {
    o.top = 72;
    const { x, y } = o;
    shadow(ctx, x, y, 26);
    rect(ctx, '#4a3220', x - 22, y - 50, 4, 50); rect(ctx, '#4a3220', x + 18, y - 50, 4, 50);
    rect(ctx, '#7a5232', x - 28, y - 54, 56, 32);
    rect(ctx, '#5a3a22', x - 28, y - 24, 56, 2);
    const papers = [['#fff8e0', -22, -50], ['#ffe0e0', -4, -48], ['#e0f0ff', 12, -50], ['#fff8e0', -14, -38], ['#e8ffe0', 6, -37]];
    for (const [c, dx, dy] of papers) { rect(ctx, c, x + dx, y + dy, 12, 10); rect(ctx, '#c0303e', x + dx + 5, y + dy, 2, 2); }
  }

  function drawTent(ctx, o) {
    o.top = 70;
    const { x, y } = o;
    shadow(ctx, x, y, 36);
    ctx.fillStyle = '#3a8a5a';
    ctx.beginPath(); ctx.moveTo(x - 36, y); ctx.lineTo(x, y - 52); ctx.lineTo(x + 36, y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#2a6a44';
    ctx.beginPath(); ctx.moveTo(x, y - 52); ctx.lineTo(x + 36, y); ctx.lineTo(x + 8, y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#1a2a22';
    ctx.beginPath(); ctx.moveTo(x - 10, y); ctx.lineTo(x, y - 30); ctx.lineTo(x + 6, y); ctx.closePath(); ctx.fill();
    rect(ctx, '#6b4a2e', x - 1, y - 58, 2, 8);
  }

  function drawBooks(ctx, o) {
    o.top = 62;
    const { x, y } = o;
    shadow(ctx, x, y, 18);
    rect(ctx, '#6b4a2e', x - 3, y - 28, 6, 28);            // stand
    rect(ctx, '#7a5232', x - 18, y - 36, 36, 8);
    rect(ctx, '#f2ead8', x - 16, y - 44, 15, 10); rect(ctx, '#f2ead8', x + 1, y - 44, 15, 10);   // open book
    rect(ctx, '#c0303e', x - 1, y - 44, 2, 10);
    for (let i = 0; i < 3; i++) { rect(ctx, '#b0a890', x - 14, y - 42 + i * 3, 11, 1); rect(ctx, '#b0a890', x + 3, y - 42 + i * 3, 11, 1); }
  }

  function drawEmotes(ctx, o) {
    o.top = 66;
    const { x, y } = o;
    shadow(ctx, x, y, 16);
    rect(ctx, '#4a3220', x - 2, y - 30, 4, 30);
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#1b1822'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y - 40, 14, 0, 6.2832); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(x, y - 40, 10, 0, 6.2832); ctx.fill();
    rect(ctx, '#1b1822', x - 5, y - 44, 2, 3); rect(ctx, '#1b1822', x + 3, y - 44, 2, 3);
    ctx.strokeStyle = '#1b1822'; ctx.beginPath(); ctx.arc(x, y - 40, 5, 0.3, Math.PI - 0.3); ctx.stroke();
  }

  function drawPumpkins(ctx, o) {
    o.top = 64;
    const { x, y } = o;
    shadow(ctx, x, y, 30);
    rect(ctx, '#5a3a22', x - 28, y - 18, 56, 18);
    rect(ctx, '#7a5232', x - 28, y - 18, 56, 3);
    if (G.HHDecor && G.HHDecor.ok) {
      G.HHDecor.piece(ctx, 'pumpkin0', x - 14, y - 16); G.HHDecor.piece(ctx, 'pumpkin1', x + 14, y - 16); G.HHDecor.piece(ctx, 'pumpkin2', x, y - 30);
    }
    ctx.fillStyle = '#ff9a3c'; ctx.font = '800 9px Pixelify, monospace'; ctx.textAlign = 'center'; ctx.fillText('CANDY', x, y - 46);
  }

  return { enter, update, drawables, lights, hides, interact, walking, setView, get active() { return on && view() === 'camp'; } };
})();
