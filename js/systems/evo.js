/* ============ evo.js — evolving during a run (standalone build) ============
 *
 * Every Pokémon that evolves starts a run as the FIRST form of its line
 * (Charmander, Pichu, Eevee...) and evolves as you level up:
 *   3-stage lines   2nd form at level 12, 3rd form at level 25
 *   2-stage lines   2nd form at level 15
 * Branching lines (Eevee, Oddish, Wurmple...): if your partner is one of the
 * branches it evolves towards it; otherwise you choose on a card.
 *
 * Your partner can still be any form you own: the run starts at the first form
 * and heads for that one (its upgrades, nature and stars are the partner's).
 * Evolving in a run adds that form to your collection.
 *
 * BALANCE: each form uses its own stats, but a first form is never below 80 %
 * of its line's strongest final form, and a middle form never below 90 %, so
 * every first form can hold its own until it evolves. Forms (Megas, regional,
 * Shadow: numbers over 10000) are left as they are.
 *
 * The gacha gives first forms (systems/gacha.js).
 */
G.Evo = (() => {
  const LV3 = [12, 25], LV2 = [15];
  const FLOOR = [0.8, 0.9];          // first form, middle form: share of the final form's stats
  const STATS = ['hp', 'spd', 'atk', 'pa', 'sa', 'df', 'sd'];

  let NEXT = null, PREV = null;
  function build() {
    if (NEXT) return;
    NEXT = {}; PREV = {};
    const ok = d => !!G.DEX_BY[d] && !!G.SPRITE_META[d];
    for (const pair of (G.EVO_EDGES || '').split(';')) {
      const [a, b] = pair.split('>').map(Number);
      if (!ok(a) || !ok(b)) continue;
      (NEXT[a] = NEXT[a] || []).push(b);
      PREV[b] = a;
    }
  }
  const next = dex => (build(), NEXT[dex] || []);
  const prev = dex => (build(), PREV[dex] || 0);

  /** The first form of a Pokémon's line (itself for forms over 10000 and Pokémon that don't evolve). */
  function base(dex) {
    if (!(dex < 10000)) return dex;
    let d = dex, guard = 0;
    while (prev(d) && guard++ < 4) d = prev(d);
    return d;
  }
  /** 0 = first form, 1 = second, 2 = third. */
  function stage(dex) { let s = 0, d = dex; while (dex < 10000 && prev(d) && s < 4) { d = prev(d); s++; } return s; }
  /** How many forms the longest path of its line has (1 = doesn't evolve). */
  function depth(dex) {
    const b = base(dex);
    const walk = d => 1 + Math.max(0, ...next(d).map(walk));
    return b < 10000 ? walk(b) : 1;
  }
  /** Every final form its line can reach from this one. */
  function finals(dex) {
    const n = next(dex);
    return n.length ? n.flatMap(finals) : [dex];
  }
  /** The levels this line evolves at. */
  const levels = dex => (depth(dex) >= 3 ? LV3 : depth(dex) === 2 ? LV2 : []);

  /** The next step from `dex` towards `target` (a later form of the same line), or 0. */
  function towards(dex, target) {
    for (const n of next(dex)) if (n === target || finals(n).includes(target) || pathHas(n, target)) return n;
    return 0;
  }
  function pathHas(from, target) { return next(from).some(n => n === target || pathHas(n, target)); }

  /** The Pokémon a run starts as when `partner` is your partner. */
  const startOf = partner => base(partner);

  /*
   * The player's copy of a Pokémon's stats: its nature (from your partner) and
   * the line's floor (80 % / 90 % of its strongest final form).
   */
  function playerMon(dex, natureDex = dex) {
    const own = G.DEX_BY[dex];
    if (!own) return own;
    const n = G.Mons.natureOf(natureDex), m = Object.assign({}, own);
    const fin = dex < 10000 && next(dex).length ? finals(dex).map(d => G.DEX_BY[d]).filter(Boolean).sort((a, b) => (b.bst || 0) - (a.bst || 0))[0] : null;
    if (fin) {
      const k = FLOOR[Math.min(stage(dex), 1)];
      for (const s of STATS) if (typeof fin[s] === 'number' && typeof m[s] === 'number') m[s] = Math.max(m[s], fin[s] * k);
      m.hp = Math.round(m.hp); m.spd = Math.round(m.spd);
    }
    if (n.up) m[n.up] = m[n.up] * 1.1;
    if (n.down) m[n.down] = m[n.down] * 0.9;
    m.atk = Math.max(m.pa || m.atk, m.sa || 0) || m.atk;
    m.nature = n.id;
    return m;
  }

  // ---------------- in a run ----------------

  /**
   * Called before each level-up pick (game.js). Evolves the player when it
   * reaches the level; on a branching line with no target, returns the cards
   * to choose from (they evolve it when picked), otherwise null.
   */
  function onLevel(pl) {
    if (!pl || pl.dex >= 10000 || pl.mega) return null;
    const opts = next(pl.dex);
    if (!opts.length) return null;
    const lv = levels(pl.dex)[stage(pl.dex)];
    if (!lv || pl.level < lv) return null;
    const target = pl.evoTarget && pl.evoTarget !== pl.dex ? towards(pl.dex, pl.evoTarget) : 0;
    if (target) { evolve(pl, target); return null; }
    if (opts.length === 1) { evolve(pl, opts[0]); return null; }
    // A choice: up to 3 of its branches.
    return G.U.pickN(opts, Math.min(3, opts.length)).map(d => {
      const m = G.DEX_BY[d];
      return {
        w: 99, type: 'pokevo', key: 'pokevo:' + d, icon: 'shiny', color: G.U.TYPE_COLOR[m.types[0]],
        tag: 'Evolution', title: m.name,
        desc: pl.mon.name + ' evolves into ' + m.name + ' (' + m.types.map(t => G.U.TYPE_NAME[t]).join(' / ') + ').',
        apply: p => evolve(p, d)
      };
    });
  }

  function evolve(pl, dex) {
    const from = pl.mon, to = playerMon(dex, pl.natureDex || pl.evoTarget || dex);
    if (!to) return;
    const hpK = from.hp ? to.hp / from.hp : 1, frac = pl.maxHp ? pl.hp / pl.maxHp : 1;
    pl.maxHp = Math.round(pl.maxHp * hpK);
    pl.hp = Math.max(1, Math.round(pl.maxHp * frac));
    pl.heal(pl.maxHp * 0.25);
    pl.baseSpd = to.spd; pl.baseAtk = to.atk;
    pl.mon = to; pl.dex = dex;
    pl.scale = G.Sprites.playerScale(dex);
    pl.r = G.Sprites.playerRadius(dex);
    pl.bodyH = G.Sprites.bodyHeight(dex, pl.scale);
    const shiny = pl.shiny && G.Sprites.hasShiny(dex);
    const anim = new G.Sprites.Animator(dex, pl.scale, shiny);
    anim.dir = pl.anim.dir; anim.skin = '';
    pl.anim = anim;
    G.Sprites.preload([dex], 4000, shiny);
    // Arceus-style plates and Megas follow the new form (mega.js looks at pl.dex).
    if (G.DB.save && !G.DB.owns(dex)) { G.DB.grant(dex, 'evolved'); G.DB.commit(); }
    pl.invuln = Math.max(pl.invuln, 1.2);
    G.Camera.kick(0.8);
    G.Audio.sfx('legend');
    G.Game.flash && G.Game.flash('#ffffff', 0.45);
    G.FX.ring(pl.x, pl.y, 10, 180, '#ffffff', 0.7, 6);
    G.FX.burst(pl.x, pl.y - pl.bodyH * 0.5, '#e8f6ff', 40, 260);
    G.Spawner.say(from.name + ' evolved into ' + to.name + '!', 3.2, true);
  }

  /** Text for menus: "Starts as Charmander · evolves at Lv 12 and 25". */
  function note(dex) {
    const b = base(dex);
    if (b === dex && !next(dex).length) return '';
    const lv = levels(b);
    return (b !== dex ? 'Starts runs as ' + G.DEX_BY[b].name + ' · ' : '') + 'Evolves at Lv ' + lv.join(' and ');
  }

  return { base, stage, depth, next, prev, finals, levels, towards, startOf, playerMon, onLevel, evolve, note };
})();
