/* ============ waves.js — Halloween Waves mode (standalone build) ============
 *
 * The Haunted Hollow at night (the Halloween maps, darkened, lit by pumpkins,
 * lanterns and your partner's glow). No timed waves and no Arceus: ROUNDS.
 *
 *   A round      a set number of wild Pokémon trickle in (mostly Ghost, Dark and
 *                Poison); defeat them all to clear it: a bonus level-up pick.
 *   Every 4th    GHOST SWARM: twice as many Ghost Pokémon, fast but frail.
 *   Every 5th    a legendary rift opens when it is cleared.
 *   Every 25th   BOSS: Mega Darkrai, stronger each time. Its Dark Void leaves
 *                circles on the ground (get out!) and it calls up ghosts.
 *                Defeating it gives 25 candy.
 *   Objectives   1 per round (2 from round 4; none on boss rounds), with a timer:
 *                  Free the caged Pokémon   stand by each cage (it ambushes you)
 *                  Light the lanterns       stand by each of 4 lanterns
 *                  Escort the lost Pokémon  walk it to the chapel
 *                  Trick-or-treat           knock on 3 doors: a treat or a trick
 *                Completing one gives a chest, 5 candy or 3 gacha tickets.
 *   Candy        5 % of defeated Pokémon drop one (Ghost-type 8 %).
 *
 * Numbers (count, health and damage by round, spawn time, swarm and boss
 * rhythm, objective rules) follow the Halloween Waves mode of the Doofcraft
 * Edition of PokéSurvivor.
 */
G.Waves = (() => {
  const curve = (tab, r) => {
    if (r <= tab[0][0]) return tab[0][1];
    for (let i = 1; i < tab.length; i++) {
      const [r1, v1] = tab[i], [r0, v0] = tab[i - 1];
      if (r <= r1) return v0 + (v1 - v0) * (r - r0) / (r1 - r0);
    }
    const [ra, va] = tab[tab.length - 2], [rb, vb] = tab[tab.length - 1];
    return vb + (vb - va) * (r - rb) / (rb - ra);
  };
  const COUNT = [[1, 20], [5, 36], [10, 55], [20, 85], [25, 100], [40, 130], [60, 175], [100, 260]];
  const HP = [[1, 1], [10, 1.1], [25, 1.25], [40, 1.6], [60, 2.4], [100, 4.5]];
  const DMG = [[1, 1], [25, 1.15], [40, 1.4], [60, 1.8], [100, 2.6]];
  const SPAWN = [[1, 25], [10, 40], [25, 50]];
  const ALIVE_CAP = 45, GRACE = 3, SWARM_EVERY = 4, RIFT_EVERY = 5, BOSS_EVERY = 25;
  const CANDY_RATE = 0.05, GHOST_CANDY = 0.08, BOSS_CANDY = 25;
  const OBJ_TIME = 75, ESCORT_TIME = 120;
  /** Difficulty time of a round: which Pokémon come and how tough they are underneath. */
  const tRound = r => 20 + (r - 1) * 42;

  let on = false, round = 1, phase = 'grace', graceT = 0, toSpawn = 0, spawned = 0, acc = 0, spawnDur = 25;
  let bag = null, swarm = false, boss = null, bossNo = 0, bossT = { summon: 6, voidT: 4 };
  let objs = [];

  // ---------------- rounds ----------------

  function start(restore = null) {
    on = true;
    round = (restore && restore.round) || 1;
    bossNo = (restore && restore.bossNo) || 0;
    phase = 'grace'; graceT = restore ? 2 : 2.5;
    toSpawn = spawned = 0; acc = 0; boss = null; objs = [];
  }
  function stop() { on = false; objs = []; boss = null; }

  const isBossRound = r => r % BOSS_EVERY === 0;
  const isSwarm = r => r % SWARM_EVERY === 0 && !isBossRound(r);
  const alive = () => G.EnemyMgr.all().filter(e => !e.dead && e.waveR === round);

  function makeBag() {
    const t = tRound(round), E = G.Enemies;
    if (swarm) { const g = E.hordeDefs('ghost', t); if (g.length) return g; }
    const spooky = [...E.hordeDefs('ghost', t), ...E.hordeDefs('dark', t), ...E.hordeDefs('poison', t)];
    const normal = [...new Set(E.bagAt(t))];
    return spooky.concat(spooky, normal);
  }

  function beginRound() {
    swarm = isSwarm(round);
    const pl = G.Game.player;
    if (isBossRound(round)) {
      phase = 'boss'; toSpawn = 0;
      spawnDarkrai();
      G.Spawner.say('Round ' + round + ': Mega Darkrai!', 3.6);
    } else {
      phase = 'spawn';
      toSpawn = Math.round(curve(COUNT, round) * (swarm ? 2.2 : 1));
      spawnDur = curve(SPAWN, round) * (swarm ? 0.7 : 1);
      spawned = 0; acc = 0;
      bag = makeBag();
      G.Sprites.preload(bag.map(d => d.dex), 6000);
      G.Spawner.say(swarm ? 'Round ' + round + ': Ghost swarm!' : 'Round ' + round, swarm ? 3 : 2.2);
      G.Audio.sfx(swarm ? 'surge' : 'biome');
      // Objectives (none on boss rounds), at most 2 going at once.
      const want = round >= 4 ? 2 : 1;
      const kinds = ['cage', 'lanterns', 'escort', 'doors'].filter(k => !objs.some(o => o.kind === k));
      for (let i = objs.length; i < want && kinds.length && pl; i++) {
        const k = kinds.splice(Math.floor(Math.random() * kinds.length), 1)[0];
        const o = makeObjective(k, pl);
        if (o) { objs.push(o); G.Spawner.say(o.intro, 3.4, true); }
      }
    }
  }

  function clearRound() {
    const done = round;
    G.Spawner.say('Round ' + done + ' cleared!', 2.6);
    G.Audio.sfx('levelup');
    const pl = G.Game.player;
    if (pl) G.FX.ring(pl.x, pl.y, 10, G.Camera.outerRadius(), '#ff9a3c', 0.6, 5);
    G.Game.bonusLevel();
    if (done % RIFT_EVERY === 0 && !isBossRound(done)) {
      setTimeout(() => { if (on) { G.Rift.debugOpen(); G.Spawner.say('A legendary rift opened!', 3, true); } }, 2800);
    }
    round++;
    phase = 'grace'; graceT = isBossRound(done) ? 6 : GRACE;
  }

  function update(dt, pl) {
    if (!on || !pl || G.Rift.inArena) return;
    updateObjectives(dt, pl);
    if (phase === 'grace') {
      if ((graceT -= dt) <= 0) beginRound();
    } else if (phase === 'spawn') {
      acc += toSpawn / spawnDur * dt;
      const t = tRound(round), hp = curve(HP, round) * (swarm ? 0.3 : 1), dmg = curve(DMG, round) * (swarm ? 0.6 : 1);
      while (acc >= 1 && spawned < toSpawn) {
        if (alive().length >= ALIVE_CAP) { acc = Math.min(acc, 1); break; }
        acc -= 1;
        const e = G.Spawner.spawnCustom(t, { bag, hpMul: hp, dmgMul: dmg, spdMul: swarm ? 1.45 : 1 });
        if (e) { e.waveR = round; spawned++; } else break;
      }
      if (spawned >= toSpawn) phase = 'fight';
    } else if (phase === 'fight') {
      if (!alive().length) clearRound();
    } else if (phase === 'boss') {
      bossTick(dt, pl);
      if (!boss || boss.dead) {
        if (boss) G.Pickups.drop('candy', boss.x, boss.y - 10, BOSS_CANDY);
        G.Spawner.say('Mega Darkrai defeated! +' + BOSS_CANDY + ' candy', 3.6);
        boss = null;
        // Its ghosts go with it.
        for (const e of alive()) if (!e.dead) e.hurt(e.hp + 1, '#9b6bff');
        clearRound();
      }
    }
  }

  // ---------------- Mega Darkrai ----------------

  function spawnDarkrai() {
    bossNo++;
    const pl = G.Game.player, t = tRound(round);
    const k = Math.pow(1.6, bossNo - 1);
    const def = { dex: 491, name: 'Mega Darkrai', hp: Math.round(9000 * k), spd: 64, dmg: Math.round(44 * Math.sqrt(k)),
                  xp: 1600, behavior: 'ranged', shotDmg: Math.round(26 * Math.sqrt(k)), shotCd: 1.15, range: 270 };
    const [x, y] = G.Spawner.ringPoint(pl, Math.random() * 6.2832);
    const e = new G.Enemy(def, x, y, { hp: 1 + t / 600, dmg: 1 + t / 1200, spd: 1 }, true);
    if (G.SPRITE_META[20491]) e.anim.dex = 20491;
    e.name = 'Mega Darkrai'; e.waveBoss = true; e.waveR = round;
    G.EnemyMgr.add(e);
    G.Sprites.preload([20491], 4000);
    G.Camera.kick(1.2); G.Audio.sfx('boss');
    boss = e; bossT = { summon: 6, voidT: 4 };
  }

  function bossTick(dt, pl) {
    if (!boss || boss.dead) return;
    // Dark Void: circles on the ground under and around you (get out before they burst).
    if ((bossT.voidT -= dt) <= 0) {
      bossT.voidT = 8;
      const n = 3 + Math.min(4, bossNo);
      for (let i = 0; i < n; i++) {
        const a = Math.random() * 6.2832, d = i ? G.U.rand(40, 170) : 0;
        G.Hazards.add({ kind: 'zone', x: pl.x + Math.cos(a) * d, y: pl.y + Math.sin(a) * d * 0.8, r: 46, delay: 1.5,
                        dmg: Math.round(boss.dmg * 1.3), type: 'dark', color: '#7a2fd0' });
      }
      G.Spawner.say('DARK VOID: get out of the circles!', 2, true);
    }
    // Ghosts answer its call.
    if ((bossT.summon -= dt) <= 0) {
      bossT.summon = 9;
      const g = G.Enemies.hordeDefs('ghost', tRound(round));
      for (let i = 0; i < 5 && g.length; i++) {
        const a = Math.random() * 6.2832;
        const e = G.Spawner.spawnCustom(tRound(round), { bag: g, at: [boss.x + Math.cos(a) * 60, boss.y + Math.sin(a) * 45], hpMul: 0.5, spdMul: 1.3 });
        if (e) e.waveR = round;
      }
      G.FX.ring(boss.x, boss.y, 8, 120, '#7a2fd0', 0.6, 4);
    }
  }

  // ---------------- objectives ----------------

  function spot(from, minD, maxD, r = 24) {
    for (let i = 0; i < 60; i++) {
      const a = Math.random() * 6.2832, d = G.U.rand(minD, maxD);
      const x = from.x + Math.cos(a) * d, y = from.y + Math.sin(a) * d * 0.85;
      if (G.World.isFree(x, y, r) && G.World.isFree(x, y - r, r * 0.8) && G.World.isFree(x - r, y, r * 0.6) && G.World.isFree(x + r, y, r * 0.6)) return { x, y };
    }
    return null;
  }
  const smallMons = () => G.DEX.filter(p => p.rarity <= 2 && G.SPRITE_META[p.dex] && !G.Sprites.hovers(p.dex));
  const animFor = dex => { const a = new G.Sprites.Animator(dex, 1); a.loop('Idle'); return a; };

  function makeObjective(kind, pl) {
    if (kind === 'cage') {
      const n = Math.random() < 0.5 ? 1 : 2, items = [];
      for (let i = 0; i < n; i++) {
        const s = spot(pl, 220, 420, 26);
        if (!s) continue;
        const dex = G.U.pick(smallMons()).dex;
        G.Sprites.preload([dex], 4000);
        items.push(Object.assign(s, { prog: 0, done: false, ambushed: false, dex, anim: animFor(dex), hop: 0 }));
      }
      if (!items.length) return null;
      return { kind, t: OBJ_TIME, items, intro: 'Pokémon are caged! Stand by a cage to free them',
               title: () => 'Free the caged Pokémon ' + items.filter(c => c.done).length + '/' + items.length };
    }
    if (kind === 'lanterns') {
      const c = spot(pl, 250, 420, 60);
      if (!c) return null;
      const items = [];
      for (let i = 0; i < 4 && items.length < 4; i++) {
        const a = i * Math.PI / 2 + G.U.rand(-0.3, 0.3);
        for (let tries = 0; tries < 10; tries++) {
          const d = G.U.rand(70, 110), x = c.x + Math.cos(a) * d, y = c.y + Math.sin(a) * d * 0.8;
          if (G.World.isFree(x, y, 14)) { items.push({ x, y, prog: 0, done: false, wig: Math.random() * 10 }); break; }
        }
      }
      if (items.length < 2) return null;
      return { kind, t: OBJ_TIME, items, intro: 'The lanterns went out! Light them again',
               title: () => 'Light the lanterns ' + items.filter(l => l.done).length + '/' + items.length };
    }
    if (kind === 'escort') {
      const lost = spot(pl, 200, 330, 18);
      if (!lost) return null;
      let chapel = null;
      for (let i = 0; i < 6 && !chapel; i++) {
        const c = spot(lost, 520, 760, 90);
        if (c && G.U.dist(c.x, c.y, pl.x, pl.y) > 380) chapel = c;
      }
      if (!chapel) return null;
      const mon = G.U.pick(smallMons());
      G.Sprites.preload([mon.dex], 4000);
      const o = { kind, t: ESCORT_TIME, intro: 'A ' + mon.name + ' is lost! Take it to the chapel',
                  lost: Object.assign(lost, { dex: mon.dex, name: mon.name, anim: animFor(mon.dex), following: false, r: 8 }),
                  chapel: Object.assign(chapel, { done: false }) };
      o.items = [o.lost, o.chapel];
      o.title = () => (o.lost.following ? 'Take ' + mon.name + ' to the chapel' : 'Find the lost ' + mon.name);
      return o;
    }
    if (kind === 'doors') {
      const items = [];
      for (let i = 0; i < 14 && items.length < 3; i++) {
        const s = spot(pl, 220, 480, 48);
        if (s && !items.some(d => G.U.dist(d.x, d.y, s.x, s.y) < 170)) items.push(Object.assign(s, { prog: 0, done: false, res: '', v: Math.floor(Math.random() * 3) }));
      }
      if (items.length < 2) return null;
      return { kind, t: OBJ_TIME, items, intro: 'Doors creak open… knock for a trick or a treat!',
               title: () => 'Trick-or-treat ' + items.filter(d => d.done).length + '/' + items.length };
    }
    return null;
  }

  function near(pl, it, r) { return !pl.dead && G.U.dist2(pl.x, pl.y, it.x, it.y) < (r + pl.r) ** 2; }

  function updateObjectives(dt, pl) {
    for (const o of objs) {
      if (o.status) { o.fade = (o.fade || 0) + dt; continue; }
      o.t -= dt;
      if (o.kind === 'cage') {
        for (const c of o.items) {
          c.anim.update(dt);
          if (c.done) { c.hop += dt; continue; }
          if (near(pl, c, 56)) {
            if (!c.ambushed) {
              c.ambushed = true;
              for (let i = 0; i < 4; i++) {
                const a = Math.random() * 6.2832;
                const e = G.Spawner.spawnCustom(tRound(round), { bag: bag || undefined, at: [c.x + Math.cos(a) * 140, c.y + Math.sin(a) * 110],
                                                                  hpMul: curve(HP, round), dmgMul: curve(DMG, round) });
                if (e) e.waveR = round;
              }
              G.Spawner.say('Ambush!', 1.6, true); G.Audio.sfx('surge');
            }
            c.prog += dt / 6;
          } else c.prog = Math.max(0, c.prog - 0.12 * dt);
          if (c.prog >= 1) {
            c.done = true;
            for (let i = 0; i < 4; i++) G.Pickups.drop('coin', c.x + G.U.rand(-20, 20), c.y + G.U.rand(-14, 10), 2);
            G.FX.burst(c.x, c.y - 14, '#ffd23f', 18, 160); G.Audio.sfx('shinyGet');
            G.Spawner.say(G.DEX_BY[c.dex].name + ' is free!', 1.8, true);
          }
        }
        if (o.items.every(c => c.done)) complete(o, pl);
      } else if (o.kind === 'lanterns') {
        for (const l of o.items) {
          if (l.done) continue;
          if (near(pl, l, 48)) l.prog += dt / 1.5; else l.prog = Math.max(0, l.prog - 0.6 * dt);
          if (l.prog >= 1) {
            l.done = true; G.Audio.sfx('select');
            G.FX.burst(l.x, l.y - 30, '#ffb347', 12, 90);
            G.Spawner.say('Lantern lit (' + o.items.filter(x => x.done).length + '/' + o.items.length + ')', 1.4, true);
          }
        }
        if (o.items.every(l => l.done)) complete(o, pl);
      } else if (o.kind === 'escort') {
        const L = o.lost;
        L.anim.update(dt);
        const d = G.U.dist(pl.x, pl.y, L.x, L.y);
        if (!L.following) {
          if (near(pl, L, 34)) { L.following = true; G.Audio.sfx('confirm'); G.Spawner.say(L.name + ' follows you: take it to the chapel!', 2.6, true); }
        } else if (d > 34 && d < 320 && !pl.dead) {
          const sp = Math.min(130, Math.max(70, pl.spd)) * dt, ang = Math.atan2(pl.y - L.y, pl.x - L.x);
          L.x += Math.cos(ang) * sp; L.y += Math.sin(ang) * sp;
          G.World.collide(L);
          L.anim.dir = G.Sprites.dirFromAngle(ang);
          L.anim.loop('Walk');
        } else L.anim.loop('Idle');
        if (L.following && G.U.dist2(L.x, L.y, o.chapel.x, o.chapel.y) < 64 * 64) {
          o.chapel.done = true;
          G.Spawner.say(L.name + ' is safe!', 2, true);
          complete(o, pl);
        }
      } else if (o.kind === 'doors') {
        for (const dr of o.items) {
          if (dr.done) continue;
          if (near(pl, dr, 44)) dr.prog += dt; else dr.prog = Math.max(0, dr.prog - dt);
          if (dr.prog >= 1) knock(dr, pl);
        }
        if (o.items.every(dr => dr.done)) complete(o, pl);
      }
      if (!o.status && o.t <= 0) { o.status = 'failed'; G.Spawner.say('Objective failed', 2, true); G.Audio.sfx('back'); }
    }
    objs = objs.filter(o => !o.status || o.fade < 2.5);
  }

  function knock(dr, pl) {
    dr.done = true;
    G.Audio.sfx('select');
    if (Math.random() < 0.6) {
      const r = Math.random();
      if (r < 0.4) {
        const pw = G.U.pick(G.Interact.POWERS);
        pl.addPower(pw, 15);
        dr.res = 'treat'; G.Spawner.say('Treat! ' + pw.name + ': ' + pw.desc + ' for 15 s', 2.6, true);
        G.FX.ring(pl.x, pl.y, 8, 90, pw.color, 0.5, 4);
      } else if (r < 0.75) {
        G.Pickups.drop('candy', dr.x, dr.y + 10, 3);
        dr.res = 'treat'; G.Spawner.say('Treat! 3 candy', 2.2, true);
      } else {
        for (let i = 0; i < 8; i++) G.Pickups.drop('coin', dr.x + G.U.rand(-26, 26), dr.y + G.U.rand(4, 24), 3);
        G.Pickups.dropXp(dr.x, dr.y + 12, Math.round(G.Game.levelXp() * 0.4));
        dr.res = 'treat'; G.Spawner.say('Treat! A chest of goodies', 2.2, true);
      }
      G.Audio.sfx('coin');
    } else {
      dr.res = 'trick';
      if (Math.random() < 0.6) {
        for (let i = 0; i < 4; i++) {
          const a = Math.random() * 6.2832;
          const e = G.Spawner.spawnCustom(tRound(round), { bag: bag || undefined, at: [dr.x + Math.cos(a) * 90, dr.y + 20 + Math.sin(a) * 60],
                                                            hpMul: curve(HP, round), dmgMul: curve(DMG, round) });
          if (e) e.waveR = round;
        }
        G.Spawner.say('Trick! It was an ambush', 2.2, true); G.Audio.sfx('surge');
      } else {
        pl.slowT = 5;
        G.Spawner.say('Trick! You are slowed for 5 s', 2.2, true);
        G.FX.burst(pl.x, pl.y - pl.bodyH * 0.5, '#8bd94a', 14, 100);
      }
    }
  }

  function complete(o, pl) {
    o.status = 'done';
    const r = Math.random();
    let msg;
    if (r < 0.45) {
      for (let i = 0; i < 12; i++) G.Pickups.drop('coin', pl.x + G.U.rand(-40, 40), pl.y + G.U.rand(-30, 30), 3);
      G.Pickups.dropXp(pl.x, pl.y - 20, Math.round(G.Game.levelXp() * 0.5));
      if (Math.random() < 0.3) G.Pickups.drop('item', pl.x + 28, pl.y - 6, G.Items.roll());
      msg = 'a chest of goodies';
    } else if (r < 0.8) { G.Pickups.drop('candy', pl.x, pl.y - 16, 5); msg = '5 candy'; }
    else { for (let i = 0; i < 3; i++) G.Pickups.drop('ticket', pl.x + (i - 1) * 16, pl.y - 18, 1); msg = '3 gacha tickets'; }
    G.Spawner.say('Objective complete! ' + msg, 3, true);
    G.Audio.sfx('legend');
    G.FX.ring(pl.x, pl.y, 10, 140, '#ff9a3c', 0.6, 5);
  }

  /** Candy from a defeated Pokémon (enemy.js). */
  function candyFor(e) {
    if (e.waveBoss) return 0;
    if (e.boss) return 5;
    return Math.random() < ((e.types || []).includes('ghost') ? GHOST_CANDY : CANDY_RATE) ? 1 : 0;
  }

  // ---------------- drawing ----------------

  function ring(ctx, x, y, prog, col) {
    if (prog <= 0) return;
    ctx.save();
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.5)';
    ctx.beginPath(); ctx.ellipse(x, y, 22, 9, 0, 0, 6.2832); ctx.stroke();
    ctx.strokeStyle = col;
    ctx.beginPath(); ctx.ellipse(x, y, 22, 9, 0, -Math.PI / 2, -Math.PI / 2 + 6.2832 * Math.min(1, prog)); ctx.stroke();
    ctx.restore();
  }
  const rect = (ctx, c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
  function groundShadow(ctx, x, y, rx) { ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(x, y, rx, rx * 0.35, 0, 0, 6.2832); ctx.fill(); }

  /*
   * Doofcraft's Haunted Hollow props (assets/halloween/hh-props.png, one sheet,
   * drawn ×2 like the map's other props). The hand-drawn versions below are only
   * used until the sheet has loaded.
   */
  const SHEET = {
    chapel: [0, 0, 180, 186], crypt0: [181, 0, 48, 52], crypt1: [0, 187, 48, 52], crypt2: [49, 187, 48, 52],
    cageLocked: [98, 187, 24, 28], cageBars: [123, 187, 24, 28], cageOpen: [148, 187, 24, 28],
    lanternLit: [173, 187, 8, 23], lanternOut: [182, 187, 8, 23]
  };
  const sheet = new Image();
  let sheetOk = false;
  sheet.onload = () => { sheetOk = true; };
  sheet.src = 'assets/halloween/hh-props.png';
  /** Draws a sheet piece ×2, bottom-centred on (x, y). */
  function piece(ctx, name, x, y, k = 2) {
    const [sx, sy, w, h] = SHEET[name];
    ctx.drawImage(sheet, sx, sy, w, h, Math.round(x - w * k / 2), Math.round(y - h * k + 2), w * k, h * k);
  }

  function drawCageImg(ctx, c) {
    groundShadow(ctx, c.x, c.y, 24);
    if (c.done) {
      piece(ctx, 'cageOpen', c.x, c.y);
      if (c.hop < 1.2) {
        ctx.save(); ctx.globalAlpha = Math.max(0, 1 - c.hop / 1.2);
        c.anim.draw(ctx, c.x, c.y - Math.abs(Math.sin(c.hop * 9)) * 10 - c.hop * 20, {});
        ctx.restore();
      }
      return;
    }
    c.anim.draw(ctx, c.x, c.y - 4, {});
    piece(ctx, 'cageLocked', c.x, c.y);
    ring(ctx, c.x, c.y, c.prog, '#ffd23f');
  }

  function drawLanternImg(ctx, l, t) {
    piece(ctx, l.done ? 'lanternLit' : 'lanternOut', l.x, l.y);
    if (l.done) {
      const f = 0.8 + Math.sin(t * 9 + l.wig) * 0.12 + Math.sin(t * 17 + l.wig * 2) * 0.08;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(l.x, l.y - 34, 1, l.x, l.y - 34, 28 * f);
      g.addColorStop(0, 'rgba(255,170,60,.5)'); g.addColorStop(1, 'rgba(255,120,40,0)');
      ctx.fillStyle = g; ctx.fillRect(l.x - 32, l.y - 66, 64, 64);
      ctx.restore();
    } else ring(ctx, l.x, l.y, l.prog, '#ffb347');
  }

  function drawChapelImg(ctx, c, t) {
    piece(ctx, 'chapel', c.x, c.y);
    if (!c.done) {
      const b = Math.sin(t * 4) * 3;
      ctx.fillStyle = '#ffd23f'; ctx.font = '700 14px Pixelify, monospace'; ctx.textAlign = 'center';
      ctx.fillText('▼', c.x, c.y - 92 + b);
    }
  }

  function drawDoorImg(ctx, d, t) {
    piece(ctx, 'crypt' + d.v, d.x, d.y);
    if (!d.done) {
      // A jack-o'-lantern on the step, so the knockable crypts stand out.
      const px = d.x + 30, py = d.y - 2, f = 0.8 + Math.sin(t * 8 + d.x) * 0.15;
      ctx.fillStyle = '#e8721c'; ctx.beginPath(); ctx.ellipse(px, py - 5, 7, 5.5, 0, 0, 6.2832); ctx.fill();
      rect(ctx, '#3f6b22', px - 1, py - 12, 2, 3);
      const c = `rgba(255,${Math.round(220 * f)},80,1)`;
      rect(ctx, c, px - 4, py - 7, 2, 2); rect(ctx, c, px + 2, py - 7, 2, 2); rect(ctx, c, px - 3, py - 4, 6, 1);
      ring(ctx, d.x, d.y, d.prog, '#ff9a3c');
    } else {
      ctx.font = '800 10px Pixelify, monospace'; ctx.textAlign = 'center';
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.7)';
      const txt = d.res === 'treat' ? 'TREAT' : 'TRICK';
      ctx.strokeText(txt, d.x, d.y - 110);
      ctx.fillStyle = d.res === 'treat' ? '#ffd23f' : '#b77dff';
      ctx.fillText(txt, d.x, d.y - 110);
    }
  }

  function drawCage(ctx, c, t) {
    if (sheetOk) return drawCageImg(ctx, c);
    groundShadow(ctx, c.x, c.y, 22);
    const W = 34, H = 40, x0 = c.x - W / 2, y0 = c.y - H;
    if (!c.done || c.hop < 1.2) {
      ctx.save();
      if (c.done) { ctx.globalAlpha = Math.max(0, 1 - c.hop / 1.2); }
      c.anim.draw(ctx, c.x, c.y - (c.done ? Math.abs(Math.sin(c.hop * 9)) * 10 + c.hop * 20 : 0), {});
      ctx.restore();
    }
    rect(ctx, '#1b1822', x0 - 2, y0 - 4, W + 4, 5);       // top
    rect(ctx, '#3d3848', x0 - 2, y0 - 4, W + 4, 2);
    rect(ctx, '#1b1822', x0 - 2, c.y - 3, W + 4, 4);     // base
    const bars = 6;
    for (let i = 0; i <= bars; i++) {
      if (c.done && i > 1 && i < bars - 1) continue;      // the door swings open
      const bx = x0 + i * W / bars;
      rect(ctx, '#2a2632', bx - 1, y0, 3, H - 3);
      rect(ctx, '#6a6378', bx, y0, 1, H - 3);
    }
    if (!c.done) {
      rect(ctx, '#c9a227', c.x - 3, y0 + H * 0.45, 6, 6);  // padlock
      rect(ctx, '#7a5d10', c.x - 1, y0 + H * 0.45 + 2, 2, 3);
      ring(ctx, c.x, c.y, c.prog, '#ffd23f');
    }
  }

  function drawLantern(ctx, l, t) {
    if (sheetOk) return drawLanternImg(ctx, l, t);
    groundShadow(ctx, l.x, l.y, 8);
    rect(ctx, '#2a1d14', l.x - 1.5, l.y - 30, 3, 30);   // post
    rect(ctx, '#4a3526', l.x - 1, l.y - 30, 1, 30);
    rect(ctx, '#1b1822', l.x - 6, l.y - 44, 12, 2);     // lantern
    rect(ctx, '#1b1822', l.x - 6, l.y - 31, 12, 2);
    const f = 0.8 + Math.sin(t * 9 + l.wig) * 0.12 + Math.sin(t * 17 + l.wig * 2) * 0.08;
    rect(ctx, l.done ? `rgba(255,${Math.round(150 + 60 * f)},60,1)` : '#2f2b3d', l.x - 5, l.y - 42, 10, 11);
    rect(ctx, '#1b1822', l.x - 6, l.y - 42, 1, 11); rect(ctx, '#1b1822', l.x + 5, l.y - 42, 1, 11);
    rect(ctx, '#1b1822', l.x - 1, l.y - 48, 2, 4);
    if (l.done) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(l.x, l.y - 37, 1, l.x, l.y - 37, 26 * f);
      g.addColorStop(0, 'rgba(255,170,60,.55)'); g.addColorStop(1, 'rgba(255,120,40,0)');
      ctx.fillStyle = g; ctx.fillRect(l.x - 30, l.y - 67, 60, 60);
      ctx.restore();
    } else ring(ctx, l.x, l.y, l.prog, '#ffb347');
  }

  function drawChapel(ctx, c, t) {
    if (sheetOk) return drawChapelImg(ctx, c, t);
    groundShadow(ctx, c.x, c.y, 40);
    const W = 64, H = 38, x0 = c.x - W / 2, y0 = c.y - H;
    rect(ctx, '#3a3646', x0, y0, W, H);                   // walls
    for (let r = 0; r < H; r += 6) for (let k = (r / 6) % 2 ? 0 : 8; k < W; k += 16) rect(ctx, '#2c2938', x0 + k, y0 + r, 1, 6);
    for (let r = 6; r < H; r += 6) rect(ctx, '#2c2938', x0, y0 + r, W, 1);
    // Roof
    ctx.fillStyle = '#2a1f3d';
    ctx.beginPath(); ctx.moveTo(x0 - 6, y0 + 2); ctx.lineTo(c.x, y0 - 22); ctx.lineTo(x0 + W + 6, y0 + 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#3d2d58';
    ctx.beginPath(); ctx.moveTo(x0 - 6, y0 + 2); ctx.lineTo(c.x, y0 - 22); ctx.lineTo(c.x, y0 - 18); ctx.lineTo(x0 - 2, y0 + 2); ctx.closePath(); ctx.fill();
    // Bell tower
    rect(ctx, '#3a3646', c.x - 8, y0 - 40, 16, 22);
    rect(ctx, '#140f1c', c.x - 4, y0 - 36, 8, 9);
    rect(ctx, '#c9a227', c.x - 2, y0 - 32, 4, 4);
    ctx.fillStyle = '#2a1f3d';
    ctx.beginPath(); ctx.moveTo(c.x - 10, y0 - 40); ctx.lineTo(c.x, y0 - 56); ctx.lineTo(c.x + 10, y0 - 40); ctx.closePath(); ctx.fill();
    // Windows (glowing) and door
    const f = 0.85 + Math.sin(t * 6) * 0.1;
    for (const wx of [x0 + 10, x0 + W - 18]) { rect(ctx, '#1b1822', wx - 1, y0 + 9, 10, 14); rect(ctx, `rgba(255,${Math.round(190 * f)},90,1)`, wx, y0 + 10, 8, 12); }
    rect(ctx, '#1b1822', c.x - 9, c.y - 22, 18, 22);
    rect(ctx, c.done ? '#ffcf6b' : '#5a3a28', c.x - 7, c.y - 20, 14, 20);
    rect(ctx, '#3d2618', c.x - 0.5, c.y - 20, 1, 20);
    if (!c.done) {
      const b = Math.sin(t * 4) * 3;
      ctx.fillStyle = '#ffd23f'; ctx.font = '700 12px Pixelify, monospace'; ctx.textAlign = 'center';
      ctx.fillText('▼', c.x, y0 - 62 + b);
    }
  }

  function drawLost(ctx, L, t) {
    groundShadow(ctx, L.x, L.y, 10);
    L.anim.draw(ctx, L.x, L.y, {});
    if (!L.following) {
      const b = Math.sin(t * 5) * 2;
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#1b1822'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(L.x, L.y - 36 + b, 7, 0, 6.2832); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#e04848'; ctx.font = '800 10px Pixelify, monospace'; ctx.textAlign = 'center';
      ctx.fillText('?', L.x, L.y - 32 + b);
    }
  }

  function drawDoor(ctx, d, t) {
    if (sheetOk) return drawDoorImg(ctx, d, t);
    groundShadow(ctx, d.x, d.y, 28);
    const W = 44, H = 30, x0 = d.x - W / 2, y0 = d.y - H;
    rect(ctx, '#3b2a1e', x0, y0, W, H);                   // planks
    for (let k = 4; k < W; k += 6) rect(ctx, '#2a1d14', x0 + k, y0, 1, H);
    ctx.fillStyle = '#1f1828';
    ctx.beginPath(); ctx.moveTo(x0 - 5, y0 + 2); ctx.lineTo(d.x, y0 - 20); ctx.lineTo(x0 + W + 5, y0 + 2); ctx.closePath(); ctx.fill();
    rect(ctx, '#140f1c', d.x - 8, d.y - 22, 16, 22);
    if (d.done) rect(ctx, d.res === 'treat' ? '#3a2a10' : '#1a0d1f', d.x - 6, d.y - 20, 12, 20);
    else { rect(ctx, '#6a4128', d.x - 6, d.y - 20, 12, 20); rect(ctx, '#c9a227', d.x + 2, d.y - 11, 2, 2); }
    // Jack-o'-lantern by the door
    const px = x0 + W - 4, py = d.y - 2, f = 0.8 + Math.sin(t * 8 + d.x) * 0.15;
    ctx.fillStyle = '#e8721c'; ctx.beginPath(); ctx.ellipse(px, py - 5, 7, 5.5, 0, 0, 6.2832); ctx.fill();
    rect(ctx, '#3f6b22', px - 1, py - 12, 2, 3);
    rect(ctx, `rgba(255,${Math.round(220 * f)},80,1)`, px - 4, py - 7, 2, 2); rect(ctx, `rgba(255,${Math.round(220 * f)},80,1)`, px + 2, py - 7, 2, 2);
    rect(ctx, `rgba(255,${Math.round(220 * f)},80,1)`, px - 3, py - 4, 6, 1);
    if (!d.done) ring(ctx, d.x, d.y, d.prog, '#ff9a3c');
    else {
      ctx.font = '800 9px Pixelify, monospace'; ctx.textAlign = 'center';
      ctx.fillStyle = d.res === 'treat' ? '#ffd23f' : '#b77dff';
      ctx.fillText(d.res === 'treat' ? 'TREAT' : 'TRICK', d.x, y0 - 24);
    }
  }

  /** Things with feet, for the Y-sorted scene (game.js drawScene). */
  function drawables() {
    if (!on) return [];
    const t = performance.now() / 1000, out = [];
    for (const o of objs) {
      if (o.status === 'failed') continue;
      if (o.kind === 'cage') for (const c of o.items) out.push({ y: c.y, draw: ctx => drawCage(ctx, c, t) });
      if (o.kind === 'lanterns') for (const l of o.items) out.push({ y: l.y, draw: ctx => drawLantern(ctx, l, t) });
      if (o.kind === 'doors') for (const d of o.items) out.push({ y: d.y, draw: ctx => drawDoor(ctx, d, t) });
      if (o.kind === 'escort') {
        out.push({ y: o.chapel.y, draw: ctx => drawChapel(ctx, o.chapel, t) });
        if (!o.status) out.push({ y: o.lost.y, draw: ctx => drawLost(ctx, o.lost, t) });
      }
    }
    return out;
  }

  /** Light sources for the night (world coords): { x, y, r, col }. */
  function lights() {
    const out = [];
    for (const o of objs) {
      if (o.status === 'failed') continue;
      if (o.kind === 'lanterns') for (const l of o.items) out.push({ x: l.x, y: l.y - 37, r: l.done ? 150 : 50, col: l.done ? 'rgba(255,160,60,.3)' : null });
      if (o.kind === 'cage') for (const c of o.items) out.push({ x: c.x, y: c.y - 20, r: 70 });
      if (o.kind === 'doors') for (const d of o.items) out.push({ x: d.x + 30, y: d.y - 8, r: 90, col: 'rgba(255,138,42,.22)' });
      if (o.kind === 'escort') { out.push({ x: o.chapel.x, y: o.chapel.y - 20, r: 160, col: 'rgba(255,190,90,.18)' }); out.push({ x: o.lost.x, y: o.lost.y - 10, r: 60 }); }
    }
    return out;
  }

  /** Points the HUD arrows to (objectives off screen). */
  function targets() {
    const out = [];
    for (const o of objs) {
      if (o.status) continue;
      if (o.kind === 'escort') out.push(o.lost.following ? o.chapel : o.lost);
      else for (const it of o.items) if (!it.done) out.push(it);
    }
    return out;
  }

  return {
    start, stop, update, drawables, lights, targets, candyFor,
    get on() { return on; },
    get round() { return round; },
    get phase() { return phase; },
    get swarm() { return swarm; },
    get bossRound() { return isBossRound(round); },
    get left() { return phase === 'spawn' || phase === 'fight' ? Math.max(0, toSpawn - spawned) + alive().length : phase === 'boss' ? 1 : 0; },
    get objectives() { return objs; },
    /** Difficulty time of the current round (modes.js → G.Game.st.ft). */
    ft() { return tRound(round); },
    state() { return { round, bossNo }; },
    /** Testing: start one objective of this kind now. */
    debugObjective(kind) { const o = makeObjective(kind, G.Game.player); if (o) objs.push(o); return !!o; }
  };
})();
