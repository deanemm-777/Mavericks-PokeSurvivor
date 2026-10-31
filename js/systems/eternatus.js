/* ============ eternatus.js — Eternatus (standalone build, Doofcraft update 40) ============
 *
 * In Endless runs, Eternatus comes at 30:00 and again every 30 minutes, stronger
 * each time: the sky turns red and Eternamax Eternatus drops in. It fires
 * Dynamax Cannon (a line of blasts aimed at you: step out of it) and
 * Eternabeam rings, and calls wild Pokémon. Defeat it for PokéCoins and ×10
 * tickets; the first time you beat it with each Pokémon species you get an
 * extra bonus (3 more ×10 tickets: this build has no rainbow tickets).
 */
G.Eternatus = (() => {
  const FIRST = 1800, EVERY = 1800;
  let next = FIRST, boss = null, n = 0, cannonT = 0, beamT = 0, callT = 0, tint = 0;

  function reset(restore) { next = (restore && restore.next) || FIRST; n = (restore && restore.n) || 0; boss = null; tint = 0; }
  // (Saved during the fight: it comes back when the run is continued.)
  const state = () => (boss ? { next: next - EVERY, n: n - 1 } : { next, n });

  function spawn(pl) {
    n++;
    const k = Math.pow(1.7, n - 1);
    const def = { dex: 890, name: 'Eternatus', hp: Math.round(60000 * k), spd: 46, dmg: Math.round(60 * Math.sqrt(k)), xp: 4000,
                  behavior: 'ranged', shotDmg: Math.round(34 * Math.sqrt(k)), shotCd: 1.4, range: 320 };
    const [x, y] = G.Spawner.ringPoint(pl, -Math.PI / 2);
    const t = G.Game.st.ft || G.Game.st.time;
    const e = new G.Enemy(def, x, y, { hp: 1 + t / 900, dmg: 1 + t / 1500, spd: 1 }, true);
    if (G.SPRITE_META[27890]) e.anim.dex = 27890;
    e.name = 'Eternamax Eternatus'; e.eterna = true;
    G.EnemyMgr.add(e);
    G.Sprites.preload([27890], 4000);
    boss = e; cannonT = 4; beamT = 9; callT = 6;
    G.Camera.kick(1.6); G.Audio.sfx('boss');
    G.Game.flash('#ff2a4a', 0.5);
    G.Spawner.say('Eternatus has appeared! The sky turns red…', 4);
  }

  function update(dt, pl) {
    if (!G.Modes.endless || !pl || G.Rift.inArena) return;
    const time = G.Game.st.time;
    tint = boss ? Math.min(1, tint + dt) : Math.max(0, tint - dt * 0.5);
    if (!boss && time >= next) { next += EVERY; spawn(pl); }
    if (!boss) return;
    if (boss.dead) { reward(pl); boss = null; return; }
    // Dynamax Cannon: a line of blasts from Eternatus toward you.
    if ((cannonT -= dt) <= 0) {
      cannonT = Math.max(3.2, 6 - n * 0.4);
      const a = Math.atan2(pl.y - boss.y, pl.x - boss.x), steps = 9;
      for (let i = 1; i <= steps; i++) {
        const d = i * 52;
        G.Hazards.add({ kind: 'zone', x: boss.x + Math.cos(a) * d, y: boss.y + Math.sin(a) * d, r: 34, delay: 1.1 + i * 0.05,
                        dmg: Math.round(boss.dmg * 1.4), type: 'dragon', color: '#ff2a6a' });
      }
      G.Spawner.say('DYNAMAX CANNON: step out of the line!', 1.6, true);
    }
    // Eternabeam: a ring of blasts around you.
    if ((beamT -= dt) <= 0) {
      beamT = 11;
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * 6.2832;
        G.Hazards.add({ kind: 'zone', x: pl.x + Math.cos(a) * 110, y: pl.y + Math.sin(a) * 90, r: 44, delay: 1.4,
                        dmg: Math.round(boss.dmg * 1.2), type: 'poison', color: '#c03aff' });
      }
    }
    // It calls wild Pokémon.
    if ((callT -= dt) <= 0) { callT = 12; G.Spawner.burst(8); }
  }

  function reward(pl) {
    const s = G.DB.save, base = G.FORM_BY[pl.dex] ? G.FORM_BY[pl.dex].base : pl.dex;
    s.eternaFirst = s.eternaFirst || {};
    const first = !s.eternaFirst[base];
    s.eternaFirst[base] = 1;
    const x = boss.x, y = boss.y;
    for (let i = 0; i < 2 + (first ? 3 : 0); i++) G.Pickups.drop('ticket10', x + (i - 2) * 18, y - 14, 1);
    for (let i = 0; i < 16; i++) G.Pickups.drop('coin', x + G.U.rand(-60, 60), y + G.U.rand(-40, 40), 10);
    G.Spawner.say(first ? 'Eternatus defeated! First time with ' + pl.mon.name + ': bonus ×10 tickets!' : 'Eternatus defeated!', 4);
    G.Audio.sfx('legend');
    G.DB.commit();
  }

  /** The red sky while it's out (game.js render, screen pixels). */
  function drawTint(ctx, w, h) {
    if (tint <= 0) return;
    ctx.save();
    ctx.globalAlpha = 0.28 * tint;
    const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.2, w / 2, h / 2, Math.max(w, h) * 0.75);
    g.addColorStop(0, 'rgba(255,40,80,.25)'); g.addColorStop(1, 'rgba(160,0,60,1)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  return { reset, update, drawTint, state, get active() { return !!boss; } };
})();
