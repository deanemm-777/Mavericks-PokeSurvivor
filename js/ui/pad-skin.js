/* ============ pad-skin.js — on-screen controller (portrait) ============
 * The bottom half of the "Atomic Advance WaveBlue" Delta skin, used as a
 * real controller. Its buttons feed a virtual gamepad (core/gamepad.js), so
 * every screen that already works with a controller works with this too.
 *
 *   In a run:   D-pad        move (8 directions)
 *               L / R        previous / next move
 *               A            use the selected orb
 *               B            switch orb
 *               START, Home  pause
 *               SELECT       skip the Arceus cutscene
 *   In menus:   D-pad        move the gold selection box
 *               A            press      B  back
 *               L / R        scroll the list      SELECT  reroll the cards
 *               START        pause / close
 * Tapping the screen directly still works everywhere.
 *
 * Layout numbers come from the skin's info.json (assets/skin/waveblue-info.json),
 * in its 414-wide mapping space. CROP is where the image is cut: everything above
 * it is the game screen.
 */
G.PadSkin = (() => {
  const MAP_W = 414, MAP_H = 898, CROP = 492;
  // frame = [x, y, w, h], ext = extra touch margin [top, right, bottom, left]
  const ITEMS = [
    { id: 'dpad',   f: [35, 612, 142, 142], e: [12, 12, 12, 12] },
    { id: 'a',      f: [306, 611, 72, 72],  e: [12, 12, 10, 10] },
    { id: 'b',      f: [236, 680, 72, 72],  e: [10, 10, 12, 12] },
    { id: 'l',      f: [17, 533, 93, 38],   e: [12, 18, 12, 18] },
    { id: 'r',      f: [304, 533, 93, 38],  e: [10, 18, 10, 18] },
    { id: 'start',  f: [225, 544, 21, 21],  e: [10, 10, 18, 8] },
    { id: 'select', f: [168, 544, 21, 21],  e: [10, 8, 18, 10] },
    { id: 'menu',   f: [182, 814, 50, 27],  e: [8, 8, 8, 8] }
  ];
  const state = { up: false, down: false, left: false, right: false, a: false, b: false, l: false, r: false, start: false, select: false, menu: false };
  const pointers = new Map();        // pointerId -> control id (or 'dpad')
  let root = null, glows = {}, k = 1, active = false;

  function build() {
    root = document.createElement('div');
    root.id = 'pad-skin';
    root.setAttribute('aria-label', 'Controller');
    const img = document.createElement('img');
    img.src = 'assets/skin/controller.png';
    img.alt = '';
    img.draggable = false;
    root.appendChild(img);
    for (const it of ITEMS) {
      const g = document.createElement('div');
      g.className = 'pad-glow pad-' + it.id;
      root.appendChild(g);
      glows[it.id] = g;
    }
    document.body.appendChild(root);
    for (const ev of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'lostpointercapture']) root.addEventListener(ev, onPointer);
    // No long-press menus, zoom or text selection on the controller.
    root.addEventListener('contextmenu', e => e.preventDefault());
    root.addEventListener('touchstart', e => e.preventDefault(), { passive: false });
  }

  /** Where a control sits in CSS pixels inside #pad-skin. */
  function rect(it, withExt) {
    const [x, y, w, h] = it.f, [t, r, b, l] = withExt ? it.e : [0, 0, 0, 0];
    return { x: (x - l) * k, y: (y - CROP - t) * k, w: (w + l + r) * k, h: (h + t + b) * k };
  }

  function layout() {
    const portrait = innerHeight >= innerWidth;
    const want = portrait && (G.Touch.active || innerWidth < 700);
    if (want !== active) {
      active = want;
      document.body.classList.toggle('skin', active);
      if (!active) release();
    }
    if (!root) return;
    k = innerWidth / MAP_W;
    const h = Math.round((MAP_H - CROP) * k);
    document.documentElement.style.setProperty('--ctrl-h', h + 'px');
    root.style.height = h + 'px';
    for (const it of ITEMS) {
      const r = rect(it, false), g = glows[it.id];
      g.style.left = r.x + 'px'; g.style.top = r.y + 'px';
      g.style.width = r.w + 'px'; g.style.height = r.h + 'px';
    }
  }

  function hit(px, py) {
    for (const it of ITEMS) {
      const r = rect(it, true);
      if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) return it;
    }
    return null;
  }

  /** D-pad: 8 directions from where the finger is relative to its center. */
  function dpadDirs(px, py) {
    const r = rect(ITEMS[0], false);
    const dx = (px - (r.x + r.w / 2)) / (r.w / 2), dy = (py - (r.y + r.h / 2)) / (r.h / 2);
    const out = { up: false, down: false, left: false, right: false };
    if (Math.hypot(dx, dy) < 0.18) return out;              // dead center: nothing
    const a = Math.atan2(dy, dx), s = Math.round(a / (Math.PI / 4));   // -4..4, 0 = right
    const dir = ((s % 8) + 8) % 8;
    if (dir === 7 || dir === 0 || dir === 1) out.right = true;
    if (dir === 3 || dir === 4 || dir === 5) out.left = true;
    if (dir === 1 || dir === 2 || dir === 3) out.down = true;
    if (dir === 5 || dir === 6 || dir === 7) out.up = true;
    return out;
  }

  function recompute() {
    for (const key in state) state[key] = false;
    for (const p of pointers.values()) {
      if (!p) continue;
      if (p.id === 'dpad') { for (const d of ['up', 'down', 'left', 'right']) if (p.dirs[d]) state[d] = true; }
      else state[p.id] = true;
    }
    for (const it of ITEMS) {
      const on = it.id === 'dpad' ? (state.up || state.down || state.left || state.right) : state[it.id];
      glows[it.id].classList.toggle('on', !!on);
    }
    const dp = glows.dpad;
    const ox = (state.right ? 1 : 0) - (state.left ? 1 : 0), oy = (state.down ? 1 : 0) - (state.up ? 1 : 0);
    dp.style.setProperty('--ox', ox * 28 + '%');
    dp.style.setProperty('--oy', oy * 28 + '%');
  }

  function onPointer(e) {
    e.preventDefault();
    const box = root.getBoundingClientRect();
    const px = e.clientX - box.left, py = e.clientY - box.top;
    if (e.type === 'pointerdown') {
      try { root.setPointerCapture(e.pointerId); } catch (err) { /* nada */ }
      G.Audio && G.Audio.unlock && G.Audio.unlock();
      const it = hit(px, py);
      pointers.set(e.pointerId, it ? { id: it.id, dirs: it.id === 'dpad' ? dpadDirs(px, py) : null } : null);
    } else if (e.type === 'pointermove') {
      const p = pointers.get(e.pointerId);
      if (!p) return;
      if (p.id === 'dpad') p.dirs = dpadDirs(px, py);      // slide around the cross freely
      else {
        // Sliding a thumb off a button onto another (A -> B) switches to it, like a real pad.
        const it = hit(px, py);
        if (it && it.id !== 'dpad' && it.id !== p.id) p.id = it.id;
      }
    } else {
      pointers.delete(e.pointerId);
    }
    recompute();
  }

  function release() { pointers.clear(); recompute(); }

  function init() {
    build();
    layout();
    addEventListener('resize', layout);
    addEventListener('orientationchange', () => setTimeout(layout, 150));
    if (window.visualViewport) visualViewport.addEventListener('resize', layout);
    addEventListener('blur', release);
    document.addEventListener('visibilitychange', () => { if (document.hidden) release(); });
  }

  return {
    init,
    get active() { return active; },
    state() { return state; },
    /** Is this element part of the controller? (taps on it must not hide the gold selection box) */
    owns(el) { return !!(root && el && root.contains(el)); }
  };
})();
