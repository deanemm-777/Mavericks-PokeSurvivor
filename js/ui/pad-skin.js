/* ============ pad-skin.js — on-screen controller (portrait) ============
 * The bottom half of the "Atomic Advance WaveBlue" Delta skin, used as a
 * real controller. Its buttons feed a virtual gamepad (core/gamepad.js), so
 * every screen that already works with a controller works with this too.
 *
 *   In a run:   D-pad        move (8 directions)
 *               L / R        previous / next move
 *               A            use the selected orb
 *               B            switch orb
 *               START, Home  pause / resume
 *               SELECT       skip the Arceus cutscene
 *   In menus:   D-pad        move the gold selection box
 *               A            press      B  back
 *               L / R        scroll the list      SELECT  reroll the cards
 *               START        start a run (main menu), resume (pause), close (other screens)
 * Tapping the screen directly still works everywhere.
 *
 * Layout numbers come from the skin's info.json (assets/skin/waveblue-info.json),
 * in its 414-wide mapping space. The skin is drawn in two parts so it fits any
 * screen shape:
 *   controls.png   everything below CROP, full width, never stretched
 *   shell-top.png  the shell and bezel above it, drawn as a stretchable frame
 *                  (CSS border-image, BEZEL widths); its open middle is the
 *                  game's screen window, which gets whatever height is left.
 */
G.PadSkin = (() => {
  const MAP_W = 414, MAP_H = 898, CROP = 492;
  const BEZEL = { top: 54, right: 14, bottom: 6, left: 14 };    // frame widths of shell-top.png (its window is 14..400 x 54..486; LOAD/SAVE painted out)
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
  let root = null, shell = null, img = null, pad = null, glows = {}, k = 1, active = false;

  function build() {
    // root: the whole skin over the page (lets touches through); pad: the controls, which take them.
    root = document.createElement('div');
    root.id = 'pad-skin';
    root.setAttribute('aria-label', 'Controller');
    shell = document.createElement('div');
    shell.className = 'pad-shell';
    root.appendChild(shell);
    img = document.createElement('img');
    img.src = 'assets/skin/controls.png';
    img.alt = '';
    img.draggable = false;
    root.appendChild(img);
    pad = document.createElement('div');
    pad.className = 'pad-hit';
    root.appendChild(pad);
    for (const it of ITEMS) {
      const g = document.createElement('div');
      g.className = 'pad-glow pad-' + it.id;
      pad.appendChild(g);
      glows[it.id] = g;
    }
    document.body.appendChild(root);
    for (const ev of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'lostpointercapture']) pad.addEventListener(ev, onPointer);
    // No long-press menus, zoom or text selection on the controller.
    pad.addEventListener('contextmenu', e => e.preventDefault());
    pad.addEventListener('touchstart', e => e.preventDefault(), { passive: false });
  }

  /** Where a control sits in CSS pixels inside the controls layer. */
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
    const W = innerWidth, H = innerHeight;
    // Full width, unless that leaves the screen under ~42% of the height (short
    // phones, or inside the Claude app): then the whole device shrinks a little
    // and sits centered with black at the sides, as Delta does.
    k = Math.min(W / MAP_W, 0.58 * H / (MAP_H - CROP + BEZEL.top + BEZEL.bottom));
    const dw = MAP_W * k, ox = Math.round((W - dw) / 2);
    for (const el of [shell, img, pad]) { el.style.left = ox + 'px'; el.style.width = dw + 'px'; }
    const ch = (MAP_H - CROP) * k, ctop = H - ch;
    img.style.top = ctop + 'px';
    img.style.height = ch + 'px';
    pad.style.top = ctop + 'px';
    pad.style.height = ch + 'px';
    // The shell frame fills everything above the controls. Its top band grows
    // when needed so the window always starts below the status bar / Dynamic Island.
    const safeTop = G.Touch.safeArea().top;
    const bt = Math.max(BEZEL.top * k, safeTop + 6), br = BEZEL.right * k, bb = BEZEL.bottom * k, bl = BEZEL.left * k;
    shell.style.height = ctop + 'px';
    shell.style.borderWidth = `${bt}px ${br}px ${bb}px ${bl}px`;
    const css = document.documentElement.style;
    css.setProperty('--sx', ox + bl + 'px');
    css.setProperty('--sy', bt + 'px');
    css.setProperty('--sw', (dw - bl - br) + 'px');
    css.setProperty('--sh', Math.max(100, ctop - bt - bb) + 'px');
    css.setProperty('--sr', 12 * k + 'px');
    css.setProperty('--ctrl-h', ch + 'px');
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
    const box = pad.getBoundingClientRect();
    const px = e.clientX - box.left, py = e.clientY - box.top;
    if (e.type === 'pointerdown') {
      try { pad.setPointerCapture(e.pointerId); } catch (err) { /* nada */ }
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
