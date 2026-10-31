/* ============ dojo.js — the Training Dojo (standalone build, Doofcraft update 40) ============
 *
 * A practice run with no wild Pokémon: three training dummies stand in front of
 * you and never fight back, and you can't be hurt. From the DOJO button:
 *   - pick any of your Pokémon's moves (its natural ones and the TMs it was
 *     taught), at any upgrade level, up to 4 at once
 *   - put on any held item
 *   - fill the Mega / Z meters to try Mega Evolution and Z-moves
 * The DPS meter shows your damage per second over the last 5 seconds, the best
 * so far, and each move's share. Nothing is earned or saved.
 */
G.Dojo = (() => {
  const DUMMY_DEX = 202;          // Wobbuffet: built to take hits
  const WINDOW = 5;
  let on = false, dummies = [], hist = [], lastDealt = 0, best = 0, dps = 0, perMove = {};

  function start(pl) {
    on = true; dummies = []; hist = []; best = 0; dps = 0; perMove = {};
    lastDealt = pl ? pl.dmgDealt : 0;
    if (pl) placeDummies(pl);
    ensureUi();
    G.UI.$('dojo-btn').classList.remove('hidden');
  }
  function stop() {
    on = false; dummies = [];
    const b = G.UI.$('dojo-btn'), p = G.UI.$('dojo-panel');
    if (b) b.classList.add('hidden');
    if (p) p.classList.add('hidden');
  }

  function placeDummies(pl) {
    const mon = G.DEX_BY[DUMMY_DEX];
    if (!mon || !G.SPRITE_META[DUMMY_DEX]) return;
    G.Sprites.preload([DUMMY_DEX], 4000);
    const spots = [[0, -150], [-130, -90], [130, -90]];
    for (const [dx, dy] of spots) {
      let x = pl.x + dx, y = pl.y + dy;
      for (let i = 0; i < 10 && !G.World.isFree(x, y, 16); i++) { x += G.U.rand(-40, 40); y += G.U.rand(-40, 20); }
      const def = { dex: DUMMY_DEX, name: 'Training Dummy', hp: 1e9, spd: 0, dmg: 0, xp: 0, behavior: 'chase' };
      const e = new G.Enemy(def, x, y, { hp: 1, dmg: 0, spd: 0 });
      e.name = 'Training Dummy'; e.dummy = true; e.hx = x; e.hy = y;
      G.EnemyMgr.add(e);
      dummies.push(e);
    }
  }

  function update(dt, pl) {
    if (!on || !pl) return;
    pl.invuln = Math.max(pl.invuln, 0.5);
    pl.hp = pl.maxHp;
    for (const e of dummies) {
      e.x = e.hx; e.y = e.hy; e.kx = e.ky = 0;
      e.hp = e.maxHp; e.dead = false;
      e.touchCd = 99; e.shotCd = 99;
      e.slow = 0; e.slowT = 0;
    }
    // DPS over the last few seconds.
    const d = pl.dmgDealt - lastDealt;
    lastDealt = pl.dmgDealt;
    hist.push([performance.now() / 1000, d]);
    const now = performance.now() / 1000;
    while (hist.length && now - hist[0][0] > WINDOW) hist.shift();
    const span = Math.max(1, Math.min(WINDOW, now - (hist[0] ? hist[0][0] : now)));
    dps = hist.reduce((a, h) => a + h[1], 0) / span;
    best = Math.max(best, dps);
    for (const m of pl.moves) perMove[m.id] = m.dealt || 0;
  }

  /** DPS panel (hud.js). */
  function drawHud(ctx, w, h, pl, oy, F) {
    if (!on) return;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = F(800, 13);
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.6)';
    const line = 'DPS ' + Math.round(dps).toLocaleString() + '   ·   BEST ' + Math.round(best).toLocaleString();
    ctx.strokeText(line, w / 2, 76 + oy);
    ctx.fillStyle = '#ffd23f';
    G.I18n.rawCanvas(ctx, 'fillText', line, w / 2, 76 + oy);
    const total = Object.values(perMove).reduce((a, b) => a + b, 0) || 1;
    ctx.font = F(700, 10);
    let y = 94 + oy;
    for (const m of pl.moves) {
      const share = Math.round((perMove[m.id] || 0) / total * 100);
      const t = G.T(m.name, 'move') + ' Lv' + m.lvl + '  ' + share + '%';
      ctx.strokeText(t, w / 2, y);
      ctx.fillStyle = '#eaf2ff';
      G.I18n.rawCanvas(ctx, 'fillText', t, w / 2, y);
      y += 13;
    }
    ctx.restore();
  }

  // ---------------- the DOJO panel ----------------

  function ensureUi() {
    if (G.UI.$('dojo-btn')) return;
    const b = document.createElement('button');
    b.id = 'dojo-btn'; b.className = 'btn small gold dojo-btn hidden'; b.textContent = 'DOJO';
    b.onclick = () => { G.Audio.sfx('click'); openPanel(); };
    document.body.appendChild(b);
    const p = document.createElement('div');
    p.id = 'dojo-panel'; p.className = 'dojo-panel hidden';
    document.body.appendChild(p);
  }

  function openPanel() {
    const pl = G.Game.player, p = G.UI.$('dojo-panel');
    if (!pl) return;
    const mon = G.DEX_BY[pl.dex], base = G.FORM_BY[pl.dex] ? G.FORM_BY[pl.dex].base : pl.dex;
    const pool = [...new Set([...G.Moves.poolFor(mon), ...G.Mons.taught(pl.dex), ...G.Mons.taught(base)])].filter(id => G.Moves.BY_ID[id]);
    const have = id => pl.moves.find(m => m.id === id);
    const row = id => {
      const def = G.Moves.BY_ID[id], m = have(id);
      const lv = m ? m.lvl : 0;
      return `<div class="dojo-mv${m ? ' on' : ''}">
        ${G.Icons.html('move:' + id, 28)}
        <div class="dojo-mv-n"><b>${G.T(def.name, 'move')}</b><small>${G.U.TYPE_NAME[def.type]} · ${def.kind}</small></div>
        <div class="dojo-lv">${Array.from({ length: def.maxLvl }, (_, i) => `<button class="chip${lv === i + 1 ? ' on' : ''}" data-mv="${id}" data-lv="${i + 1}">${i + 1}</button>`).join('')}
          ${m ? `<button class="chip" data-rm="${id}">✕</button>` : ''}</div></div>`;
    };
    p.innerHTML = `<div class="box">
      <div class="row between"><h3 style="margin:0">Training Dojo</h3><button class="btn small ghost" id="dojo-close">Close</button></div>
      <p class="sub" style="margin:4px 0 8px">Tap a level to learn or upgrade a move (up to 4). Dummies never fight back.</p>
      <div class="dojo-list">${pool.map(row).join('')}</div>
      <h3 style="margin:10px 0 6px">Held item</h3>
      <div class="dojo-items"><button class="chip${!pl.item ? ' on' : ''}" data-item="">None</button>${G.Items.LIST.map(it =>
        `<button class="chip${pl.item === it.id ? ' on' : ''}" data-item="${it.id}">${G.Icons.html(it.id, 14)} ${G.T(it.name)}</button>`).join('')}</div>
      <div class="row" style="margin-top:10px;gap:6px">
        <button class="btn small" id="dojo-meters">Fill Mega + Z</button>
        <button class="btn small" id="dojo-reset">Reset DPS</button>
        <button class="btn small ghost" id="dojo-leave">Leave the Dojo</button>
      </div></div>`;
    p.classList.remove('hidden');
    p.querySelector('#dojo-close').onclick = () => p.classList.add('hidden');
    p.querySelectorAll('[data-lv]').forEach(b => {
      b.onclick = () => { setMove(pl, b.dataset.mv, +b.dataset.lv); openPanel(); };
    });
    p.querySelectorAll('[data-rm]').forEach(b => { b.onclick = () => { removeMove(pl, b.dataset.rm); openPanel(); }; });
    p.querySelectorAll('[data-item]').forEach(b => { b.onclick = () => { pl.equip(b.dataset.item || null); openPanel(); }; });
    p.querySelector('#dojo-meters').onclick = () => { G.Mega.fill(); G.Audio.sfx('levelup'); };
    p.querySelector('#dojo-reset').onclick = () => { hist = []; best = 0; dps = 0; for (const m of pl.moves) m.dealt = 0; perMove = {}; };
    p.querySelector('#dojo-leave').onclick = () => { p.classList.add('hidden'); G.Game.quit(); };
  }

  function setMove(pl, id, lv) {
    let m = pl.moves.find(x => x.id === id);
    if (!m) {
      if (pl.slots.length >= pl.maxMoves) { G.UI.toast('You can use 4 moves at once: remove one first'); return; }
      pl.addMove(id);
      m = pl.moves.find(x => x.id === id);
      if (!m) return;
    }
    // Rebuild at the chosen level (down or up).
    const fresh = G.Moves.instance(id, lv);
    for (const k of Object.keys(m)) if (!(k in fresh)) delete m[k];
    Object.assign(m, fresh, { since: m.since, dealt: 0 });
  }

  function removeMove(pl, id) {
    if (pl.moves.length <= 1) { G.UI.toast('Keep at least one move'); return; }
    pl.moves = pl.moves.filter(m => m.id !== id);
    pl.slots = pl.slots.map(g => g.filter(m => m.id !== id)).filter(g => g.length);
    pl.active = Math.min(pl.active, pl.slots.length - 1);
  }

  return { start, stop, update, drawHud, openPanel, get on() { return on; } };
})();
