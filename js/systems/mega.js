/* ============ mega.js — Mega Evolution and Z-moves (standalone build) ============
 *
 * MEGA EVOLUTION (Pokémon in data/megas.js: 88 species, 42 with their own
 * sprites from SpriteCollab; the rest keep their sprite with a Mega aura):
 *   The Mega meter fills as you defeat Pokémon. When it is full, Mega Evolve
 *   (L + R together, the M key, or the MEGA button): for 30 s the form uses its
 *   own Attack and Speed (Doofcraft v42), with at least +20 % attack, and you
 *   heal 30 %. Then you change back and the meter starts again.
 *
 * Z-MOVES (every Pokémon):
 *   The Z meter fills as you defeat Pokémon. When it is full, unleash the
 *   Z-move of your active move's type (SELECT, the Z key, or the Z button):
 *   every Pokémon on screen faints, bosses and legendaries lose 18 % of their
 *   health, and Arceus takes a hit to its damage tally.
 *
 * Neither meter charges in a rift arena or during the Judgment cutscene, and
 * neither can be used while fainted.
 */
G.Mega = (() => {
  const MEGA_KILLS = 140, MEGA_TIME = 30;
  const Z_KILLS = 220;
  const Z_NAMES = {
    normal: 'Breakneck Blitz', fire: 'Inferno Overdrive', water: 'Hydro Vortex', electric: 'Gigavolt Havoc',
    grass: 'Bloom Doom', ice: 'Subzero Slammer', fighting: 'All-Out Pummeling', poison: 'Acid Downpour',
    ground: 'Tectonic Rage', flying: 'Supersonic Skystrike', psychic: 'Shattered Psyche', bug: 'Savage Spin-Out',
    rock: 'Continental Crush', ghost: 'Never-Ending Nightmare', dragon: 'Devastating Drake', dark: 'Black Hole Eclipse',
    steel: 'Corkscrew Crash', fairy: 'Twinkle Tackle'
  };

  let pl = null, megaCharge = 0, zCharge = 0, megaT = 0, lastKills = 0, megaUses = 0, zUses = 0;
  let zFx = null;         // { name, col, t }

  const info = dex => (G.MEGAS || {})[dex] || null;

  /*
   * Doofcraft v42: Mega Evolutions and other forms use their own stats (game
   * Attack and Speed, worked out from the form's base stats like data/pokedex.js:
   * atk = 0.70 + max(Atk, SpA) / 100 x 0.55, spd = 78 + Spe x 0.42), with at
   * least +20 % attack, instead of a flat boost. Forms not listed: +20 % attack.
   */
  const FORM_STATS = {"Black Kyurem":[1.64,118],"Mega Abomasnow":[1.43,91],"Mega Absol":[1.52,126],"Mega Aerodactyl":[1.44,141],"Mega Aggron":[1.47,99],"Mega Alakazam":[1.66,141],"Mega Altaria":[1.31,112],"Mega Ampharos":[1.61,97],"Mega Audino":[1.14,99],"Mega Banette":[1.61,110],"Mega Barbaracle":[1.47,115],"Mega Baxcalibur":[1.66,115],"Mega Beedrill":[1.52,139],"Mega Blastoise":[1.44,111],"Mega Blaziken":[1.58,120],"Mega Camerupt":[1.5,86],"Mega Chandelure":[1.66,116],"Mega Charizard X":[1.42,120],"Mega Charizard Y":[1.57,120],"Mega Chesnaught":[1.45,96],"Mega Chimecho":[1.44,105],"Mega Clefable":[1.44,107],"Mega Crabominable":[1.56,92],"Mega Darkrai":[1.61,114],"Mega Delphox":[1.57,134],"Mega Diancie":[1.58,124],"Mega Dragalge":[1.43,96],"Mega Dragonite":[1.5,120],"Mega Drampa":[1.58,93],"Mega Eelektross":[1.5,112],"Mega Emboar":[1.51,110],"Mega Excadrill":[1.61,121],"Mega Feraligatr":[1.58,111],"Mega Floette":[1.55,121],"Mega Froslass":[1.47,128],"Mega Gallade":[1.61,124],"Mega Garchomp":[1.64,117],"Mega Gardevoir":[1.61,120],"Mega Gengar":[1.64,133],"Mega Glalie":[1.36,120],"Mega Glimmora":[1.52,120],"Mega Golisopod":[1.52,95],"Mega Golurk":[1.57,101],"Mega Greninja":[1.43,138],"Mega Gyarados":[1.55,112],"Mega Hawlucha":[1.45,128],"Mega Heatran":[1.66,106],"Mega Heracross":[1.72,110],"Mega Houndoom":[1.47,126],"Mega Kangaskhan":[1.39,120],"Mega Latias":[1.47,124],"Mega Latios":[1.58,124],"Mega Lopunny":[1.45,135],"Mega Lucario":[1.5,125],"Mega Magearna":[1.64,118],"Mega Malamar":[1.26,115],"Mega Manectric":[1.44,135],"Mega Mawile":[1.28,99],"Mega Medicham":[1.25,120],"Mega Meganium":[1.49,112],"Mega Metagross":[1.5,124],"Mega Mewtwo Y":[1.77,137],"Mega Pidgeot":[1.44,129],"Mega Pinsir":[1.55,122],"Mega Raichu X":[1.44,124],"Mega Rayquaza":[1.69,126],"Mega Sableye":[1.17,86],"Mega Salamence":[1.5,128],"Mega Sceptile":[1.5,139],"Mega Scizor":[1.52,110],"Mega Scolipede":[1.47,104],"Mega Scovillain":[1.46,110],"Mega Scrafty":[1.42,107],"Mega Sharpedo":[1.47,122],"Mega Skarmory":[1.47,124],"Mega Slowbro":[1.42,91],"Mega Staraptor":[1.47,124],"Mega Starmie":[1.42,128],"Mega Steelix":[1.39,91],"Mega Swampert":[1.52,107],"Mega Tatsugiri":[1.44,117],"Mega Tyranitar":[1.6,108],"Mega Venusaur":[1.37,112],"Mega Victreebel":[1.44,107],"Mega Zeraora":[1.56,142],"Mega Zygarde":[1.89,120],"Primal Groudon":[1.69,116],"Primal Kyogre":[1.69,116],"Shadow Black Kyurem":[1.8,118],"Shadow Mega Mewtwo Y":[1.95,137],"Shadow Mega Rayquaza":[1.86,126],"Shadow Mega Tyranitar":[1.76,108],"Shadow White Kyurem":[1.8,118],"White Kyurem":[1.64,118]};
  /** What a form gives the Pokémon it comes from: { atk, spd } multipliers. */
  function boostOf(m, mon) {
    const f = m && FORM_STATS[m.n];
    if (!f || !mon) return { atk: 1.2, spd: 1 };
    return { atk: Math.max(1.2, f[0] / (mon.atk || f[0])), spd: Math.max(1, f[1] / (mon.spd || f[1])) };
  }

  function reset(p, restore = null) {
    pl = p; megaT = 0; zFx = null;
    megaCharge = restore ? restore.mc || 0 : 0;
    zCharge = restore ? restore.zc || 0 : 0;
    megaUses = restore ? restore.mu || 0 : 0;
    zUses = restore ? restore.zu || 0 : 0;
    lastKills = p ? p.kills : 0;
  }

  const can = () => !!pl && !!info(pl.dex);
  const blocked = () => !pl || pl.dead || G.Rift.inArena || G.Judgment.cinematic;

  function update(dt) {
    if (!pl) return;
    const k = pl.kills - lastKills;
    lastKills = pl.kills;
    if (k > 0 && !G.Rift.inArena) {
      if (can() && megaT <= 0) megaCharge = Math.min(1, megaCharge + k / MEGA_KILLS);
      zCharge = Math.min(1, zCharge + k / Z_KILLS);
    }
    if (megaT > 0 && (megaT -= dt) <= 0) revert();
    if (zFx && (zFx.t -= dt) <= 0) zFx = null;
  }

  // ---------------- Mega Evolution ----------------

  function megaReady() { return can() && megaT <= 0 && megaCharge >= 1 && !blocked(); }

  function megaEvolve() {
    if (!megaReady()) return false;
    // Two forms (Mega Charizard X / Y, Black / White Kyurem): they take turns.
    const base = info(pl.dex), m = base.alt && megaUses % 2 === 1 ? Object.assign({}, base, base.alt, { alt: null }) : base;
    megaCharge = 0; megaT = base.fusion ? Infinity : MEGA_TIME; megaUses++;
    const b = boostOf(m, pl.mon);
    pl.atkMul *= b.atk; pl.spdMul *= b.spd; pl.megaBoost = b;
    pl.mega = m;
    if (m.spr && G.SPRITE_META[m.spr]) {
      pl.anim.dex = m.spr;
      pl.anim.shiny = pl.shiny && G.Sprites.hasShiny(m.spr);
      G.Sprites.preload([m.spr], 4000, pl.anim.shiny);
    }
    pl.heal(pl.maxHp * 0.3);
    pl.invuln = Math.max(pl.invuln, 1);
    G.Camera.kick(0.9);
    G.Audio.sfx('legend');
    G.Game.flash('#ffffff', 0.35);
    G.FX.ring(pl.x, pl.y, 10, 160, '#ff9df5', 0.7, 6);
    G.FX.burst(pl.x, pl.y - pl.bodyH * 0.5, '#ffd6ff', 40, 260);
    G.Spawner.say(base.fusion ? pl.mon.name + ' fused into ' + m.n + '!' : pl.mon.name + ' Mega Evolved into ' + m.n + '!', 3, true);
    return true;
  }

  function revert() {
    megaT = 0;
    if (!pl || !pl.mega) return;
    const b = pl.megaBoost || { atk: 1.2, spd: 1 };
    pl.atkMul /= b.atk; pl.spdMul /= b.spd; pl.megaBoost = null;
    pl.mega = null;
    pl.anim.dex = pl.dex;
    pl.anim.shiny = pl.shiny;
    G.FX.ring(pl.x, pl.y, 8, 90, '#c9b8ff', 0.5, 4);
    G.Spawner.say(pl.mon.name + ' returned to normal', 2, true);
  }

  // ---------------- Z-moves ----------------

  function zReady() { return zCharge >= 1 && !blocked() && !!pl.activeMove(); }

  function zMove() {
    if (!zReady()) return false;
    const mv = pl.activeMove(), type = mv.type, col = G.U.TYPE_COLOR[type] || '#ffd23f';
    const name = Z_NAMES[type] || 'Z-Move';
    zCharge = 0; zUses++;
    zFx = { name, col, t: 1.6 };
    G.Camera.kick(1.4);
    G.Audio.sfx('legend');
    G.Game.flash(col, 0.5);
    const R = G.Camera.outerRadius();
    G.FX.ring(pl.x, pl.y, 20, R, col, 0.7, 8);
    G.FX.ring(pl.x, pl.y, 10, R * 0.6, '#ffffff', 0.5, 5);
    G.FX.burst(pl.x, pl.y - pl.bodyH * 0.5, col, 60, 380);
    const scale = pl.atkFor(mv) / Math.max(1, pl.baseAtk);
    for (const e of G.EnemyMgr.all()) {
      if (e.dead || !G.Camera.sees(e.x, e.y, 40)) continue;
      const big = e.boss || e.leg || e.arceus;
      // Update 40: 50 % stronger, up to 40 % of a boss's health.
      const dmg = big ? Math.min(e.maxHp * 0.4, e.maxHp * 0.18 * Math.min(2, Math.max(1, scale))) : e.hp + e.maxHp;
      e.hurt(dmg, col, e.x - pl.x, e.y - pl.y, 220);
    }
    return true;
  }

  // ---------------- drawing ----------------

  /** Mega aura under the player (for forms without their own sprite it is the only sign). */
  function drawAura(ctx, p) {
    if (!p || !p.mega || p.dead) return;
    const t = performance.now() / 1000;
    ctx.save();
    for (let i = 0; i < 3; i++) {
      const hue = (t * 120 + i * 120) % 360;
      ctx.globalAlpha = 0.35 + Math.sin(t * 6 + i) * 0.1;
      ctx.strokeStyle = `hsl(${hue},90%,70%)`;
      ctx.lineWidth = 2;
      const r = p.r * (2 + i * 0.35) + Math.sin(t * 4 + i) * 2;
      ctx.beginPath(); ctx.ellipse(p.x, p.y, r, r * 0.42, 0, 0, 6.2832); ctx.stroke();
    }
    ctx.restore();
  }

  return {
    reset, update, megaEvolve, zMove, drawAura, MEGA_TIME, Z_NAMES, boostOf,
    get can() { return can(); },
    get megaCharge() { return megaCharge; },
    get zCharge() { return zCharge; },
    /** Training Dojo: both meters full. */
    fill() { if (can()) megaCharge = 1; zCharge = 1; },
    get megaT() { return megaT; },
    get active() { return megaT > 0; },
    get megaReady() { return megaReady(); },
    get zReady() { return zReady(); },
    get zFx() { return zFx; },
    info,
    state() { return { mc: megaT > 0 ? 0 : megaCharge, zc: zCharge, mu: megaUses, zu: zUses }; }
  };
})();
