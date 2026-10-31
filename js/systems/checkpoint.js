/* ============ checkpoint.js — save a run and continue it later (standalone build) ============
 *
 * The run is saved as a CHECKPOINT in the save file (save.suspended): your
 * Pokémon's whole build (level, experience, moves with their levels and
 * evolutions, fusions, stat cards, item, orbs...), the clock, the mode and
 * its round, the map and where you stood. Coins and tickets you picked up
 * stay with it. The Pokémon on the field are not saved: when you continue,
 * the waves start again around you at the difficulty of that minute.
 *
 * It is written every 20 s of play, when you pause, when the app goes to the
 * background, and with "Save & quit" in the pause menu. Ending the run in any
 * other way (falling, "Quit run") removes it. Not saved inside a rift arena or
 * during the Judgment: the last checkpoint before them is kept.
 */
G.Checkpoint = (() => {
  // Player fields that are rebuilt, not copied.
  const SKIP = new Set(['mon', 'anim', 'abil', 'power', 'target', 'net', 'moves', 'slots', 'banned', 'mega', 'remote',
    'frozen', 'dead', 'invuln', 'flash', 'sumT', 'sashT', 'sturdyAt', 'reviveT', 'svx', 'svy', '_vx', '_vy', 'buffs',
    'manualAim', 'walking', 'attackFace', 'inLiquid', 'lavaTick', 'slowT', 'bellHeal', 'uid', 'tag', 'tagColor',
    'revLabel', 'coopHost', 'dex', 'shiny', 'scale', 'r', 'bodyH', 'abilId']);

  function plain(v) {
    if (v == null || typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean') return true;
    if (Array.isArray(v)) return v.every(plain);
    if (typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype) return Object.values(v).every(plain);
    return false;
  }

  /** Snapshot of a run in progress. */
  function snapshot(g) {
    const pl = g.pl;
    const p = {};
    for (const k of Object.keys(pl)) {
      if (SKIP.has(k)) continue;
      const v = pl[k];
      if (typeof v === 'number' && !Number.isFinite(v)) continue;
      if (plain(v)) p[k] = JSON.parse(JSON.stringify(v === undefined ? null : v));
    }
    // A Mega Evolution in progress is not kept: save the stats it had before.
    if (pl.mega) { p.atkMul = pl.atkMul / 1.4; p.spdMul = pl.spdMul / 1.15; p.cdMul = pl.cdMul / 0.85; }
    const ids = new Map(pl.moves.map((m, i) => [m, i]));
    return {
      v: 1, at: Date.now(),
      mode: G.Modes.id, ms: G.Modes.state(), mega: G.Mega.state(),
      time: g.time, seed: g.seed, dex: pl.dex, shiny: !!pl.shiny, skin: pl.anim.skin || '',
      p,
      moves: pl.moves.map(m => ({ id: m.id, lvl: m.lvl, ev: m.evolved ? 1 : 0, dealt: Math.round(m.dealt || 0), since: m.since || 0 })),
      slots: pl.slots.map(gr => gr.map(m => ids.get(m))),
      active: pl.active,
      plates: pl.plates ? [...pl.plates] : null, plate: pl.plate || null,
      eterna: G.Eternatus.state()
    };
  }

  /** Puts the saved build back on a freshly made player. */
  function apply(pl, snap) {
    Object.assign(pl, snap.p);
    pl.moves = snap.moves.filter(m => G.Moves.BY_ID[m.id]).map(m => {
      const inst = G.Moves.instance(m.id, Math.max(1, m.lvl | 0));
      if (m.ev) G.Moves.evolve(inst);
      inst.dealt = m.dealt || 0; inst.since = m.since || 0;
      return inst;
    });
    pl.slots = (snap.slots || []).map(gr => gr.map(i => pl.moves[i]).filter(Boolean)).filter(gr => gr.length);
    if (!pl.slots.length && pl.moves.length) pl.slots = [[pl.moves[0]]];
    pl.active = Math.min(Math.max(0, snap.active | 0), pl.slots.length - 1);
    pl.hp = Math.max(1, Math.min(pl.maxHp, pl.hp || pl.maxHp));
    pl.invuln = 2;
    if (snap.plates && snap.plates.length) { pl.plates = new Set(snap.plates); if (snap.plate) G.Plates.equip(pl, snap.plate, true); }
  }

  const saved = () => (G.DB.save && G.DB.save.suspended) || null;

  function store(snap) {
    const s = G.DB.save;
    if (!s || !snap) return;
    s.suspended = snap;
    G.DB.commit('run');
  }

  function clear() {
    const s = G.DB.save;
    if (s && s.suspended) { delete s.suspended; G.DB.commit('run'); }
  }

  /** One line about the saved run, for the menu. */
  function describe(snap = saved()) {
    if (!snap) return '';
    const mode = (G.Modes.BY[snap.mode] || G.Modes.BY.normal).name;
    const mon = G.DEX_BY[snap.dex];
    const round = snap.mode === 'endless' && snap.ms ? ' · Round ' + snap.ms.round : snap.mode === 'waves' && snap.ms && snap.ms.waves ? ' · Round ' + snap.ms.waves.round : '';
    return `${mon ? mon.name : '?'} · ${mode} · ${G.U.mmss(snap.time)} · Lv ${snap.p.level || 1}${round}`;
  }

  return { snapshot, apply, store, clear, describe, get saved() { return saved(); } };
})();
