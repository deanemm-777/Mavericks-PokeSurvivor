/* ============ giratina.js — Giratina, the Halloween Waves boss (standalone build, Doofcraft update 42) ============
 *
 * Every 25th round of Halloween Waves (systems/waves.js), in place of Mega Darkrai.
 * The numbers follow Doofcraft's tuning for it.
 *
 *   ALTERED FORME   it fights on the ground first. Bring it down and it sinks
 *                   into the Distortion World (3.5 s, it can't be hurt) and
 *                   comes back in its ORIGIN FORME, far tougher.
 *   SHADOW FORCE    it vanishes and a shadow hunts you for 3 s (keep moving!),
 *                   stops for a second, then Giratina bursts out of it.
 *   TENDRILS        2-3 shadowy arms reach out of it, sweep round and back.
 *   TEARS           rifts open under and around you for 5 s: they pull you in
 *                   and hurt while you stand in them.
 *   SHADES          ghosts answer its call.
 *   DISTORTION      at 66 % and 33 % of its Origin health it can't be hurt:
 *                   break the 3 Griseous fragments (stand by each for 3 s).
 *                   When the last shatters it is STAGGERED for 5 s and takes
 *                   75 % more damage.
 * Each defeat makes the next one 25 % tougher and hit 40 % harder. Defeating it
 * gives 60 candy.
 */
G.Giratina = (() => {
  const ALT_HP = 2.4, ORIGIN_HP = 6, BASE_HP = 2500;     // health in Doofcraft's units × BASE_HP
  const SHIFT_S = 3.5, MOVE_GAP = 0.9, FIRST_MOVE = 1.5;
  const STAGE_CADENCE = [1, 1.15, 1.3];
  const SF = { every: 10, chase: 3.2, lock: 1, speed: 75, r0: 34, r1: 76, dmg: 0.25, chain: [1, 1, 2] };
  const TEN = { every: 10, windup: 1.4, arms: [2, 3, 3], len: 340, w: 34, dps: 60, sweep: 1.25, pause: 0.45, back: 1.25, dmg: 0.2, knock: 90 };
  const TEAR = { every: 9, windup: 1.3, extra: [1, 2, 2], spread: [90, 220], r: 40, pull: 160, pullSpd: 36, open: 5, tick: 0.5, dmg: 0.06 };
  const DIST = { at: [0.66, 0.33], n: 3, dist: [170, 280], range: 56, charge: 3, drain: 0.25, stagger: 5, taken: 1.75 };
  const SHADES = { every: 8, n: 3, max: 8 };
  const CANDY = 60;
  const PURPLE = '#9b5cff', GOLD = '#ffcf5c';

  let boss = null, st = null;

  const DEG = Math.PI / 180;

  function spawn(round, bossNo, t) {
    const pl = G.Game.player;
    const k = Math.pow(1.25, bossNo - 1), dk = Math.min(3, Math.pow(1.4, bossNo - 1));
    const hp = Math.round(BASE_HP * (ALT_HP + ORIGIN_HP) * k);
    const def = { dex: 487, name: 'Giratina (Altered Forme)', hp, spd: 60, dmg: Math.round(40 * Math.sqrt(dk)), xp: 1800, behavior: 'chase' };
    const [x, y] = G.Spawner.ringPoint(pl, Math.random() * 6.2832);
    const e = new G.Enemy(def, x, y, { hp: 1 + t / 600, dmg: 1 + t / 1200, spd: 1 }, true);
    e.name = 'Giratina (Altered Forme)'; e.waveBoss = true; e.waveR = round;
    G.EnemyMgr.add(e);
    G.Sprites.preload([487, 28487], 4000);
    G.Camera.kick(1.3); G.Audio.sfx('boss');
    boss = e;
    const originHp = e.maxHp * ORIGIN_HP / (ALT_HP + ORIGIN_HP);
    st = {
      form: 'altered', stage: 0, dk, round, originHp, tr: t,
      busy: FIRST_MOVE, cd: { sf: 4, ten: 2.5, tear: 5, shade: 6 },
      sf: null, arms: null, tears: [], frags: null, distN: 0, shiftT: 0, staggerT: 0, parked: null, t: 0
    };
    G.Spawner.say('Reality tears open… Giratina rises!', 3.6);
    return e;
  }

  function stop() {
    if (boss) { boss.untouchable = false; boss.takenMul = 0; }
    boss = null; st = null;
  }

  // ---------------- each frame ----------------

  function tick(dt, pl) {
    if (!boss || !st) return;
    st.t += dt;
    if (boss.dead) return;
    const hurt = (frac, type = 'ghost') => { if (!pl.dead) pl.hurt(pl.maxHp * frac * st.dk, type, true); };

    // Altered Forme down: it sinks into the Distortion World and comes back in its Origin Forme.
    if (st.form === 'altered' && boss.hp <= st.originHp) {
      boss.hp = st.originHp;
      st.form = 'shift'; st.shiftT = SHIFT_S; boss.untouchable = true;
      cancelMoves();
      G.Spawner.say('Giratina sinks into the Distortion World…', 3);
      G.FX.ring(boss.x, boss.y, 10, 200, PURPLE, 0.8, 6);
    }
    if (st.form === 'shift') {
      if ((st.shiftT -= dt) <= 0) {
        st.form = 'origin'; st.stage = 1; boss.untouchable = false;
        if (G.SPRITE_META[28487]) boss.anim.dex = 28487;
        boss.name = 'Giratina (Origin Forme)';
        G.Spawner.say('Giratina returns in its Origin Forme!', 3);
        G.Camera.kick(1.2); G.Audio.sfx('legend');
        G.FX.ring(boss.x, boss.y, 12, 260, PURPLE, 0.9, 7);
        st.busy = 1.2;
      }
      return;
    }
    // Distortion World at 66 % and 33 % of its Origin health.
    if (st.form === 'origin' && !st.frags && st.distN < DIST.at.length && boss.hp <= st.originHp * DIST.at[st.distN]) {
      boss.hp = st.originHp * DIST.at[st.distN];
      startDistortion(pl);
    }
    if (st.frags) updateFragments(dt, pl);
    if (st.staggerT > 0 && (st.staggerT -= dt) <= 0) { boss.takenMul = 0; }

    updateShadowForce(dt, pl, hurt);
    updateArms(dt, pl, hurt);
    updateTears(dt, pl, hurt);

    // Its moves, one at a time, quicker as it goes on (and while you break fragments).
    if (st.staggerT > 0) return;
    const cad = STAGE_CADENCE[st.stage] * (st.frags ? 1.2 : 1);
    for (const k in st.cd) st.cd[k] -= dt * cad;
    if (st.sf || st.arms) return;
    if ((st.busy -= dt) > 0) return;
    if (st.cd.shade <= 0) { st.cd.shade = SHADES.every; shades(); }
    if (st.cd.sf <= 0) { st.cd.sf = SF.every; startShadowForce(pl, SF.chain[st.stage]); st.busy = MOVE_GAP; return; }
    if (st.cd.ten <= 0) { st.cd.ten = TEN.every; startArms(pl); st.busy = MOVE_GAP; return; }
    if (st.cd.tear <= 0) { st.cd.tear = TEAR.every; startTears(pl); st.busy = MOVE_GAP; }
  }

  function cancelMoves() {
    if (st.sf) unpark(st.sf.x, st.sf.y);
    st.sf = null; st.arms = null;
  }

  // Giratina "vanishes" by stepping far away for a moment (out of reach and out of sight).
  function park() {
    if (st.parked) return;
    st.parked = { x: boss.x, y: boss.y };
    boss.untouchable = true;
  }
  function holdParked() { if (st.parked) { boss.x = st.parked.x + 9000; boss.y = st.parked.y; boss.kx = boss.ky = 0; } }
  function unpark(x, y) {
    if (!st.parked) return;
    st.parked = null;
    boss.x = x; boss.y = y; boss.kx = boss.ky = 0;
    boss.untouchable = !!st.frags;
  }

  // ---------------- Shadow Force ----------------

  function startShadowForce(pl, chain) {
    park();
    st.sf = { x: st.parked.x, y: st.parked.y, t: 0, phase: 'chase', chain };
    G.Spawner.say('Shadow Force! Giratina is hunting you: keep moving!', 2.6, true);
    G.Audio.sfx('rift');
  }
  function updateShadowForce(dt, pl, hurt) {
    const s = st.sf;
    if (!s) return;
    holdParked();
    s.t += dt;
    if (s.phase === 'chase') {
      const [nx, ny] = G.U.norm(pl.x - s.x, pl.y - s.y), d = G.U.dist(pl.x, pl.y, s.x, s.y);
      const v = Math.min(d, SF.speed * (1 + st.stage * 0.15) * dt);
      s.x += nx * v; s.y += ny * v;
      if (s.t >= SF.chase) { s.phase = 'lock'; s.t = 0; }
    } else if (s.t >= SF.lock) {
      const r = SF.r1;
      G.FX.ring(s.x, s.y, 10, r * 1.4, PURPLE, 0.6, 6);
      G.FX.burst(s.x, s.y - 20, '#2a1240', 30, 220);
      G.Camera.kick(0.9);
      if (G.U.dist2(pl.x, pl.y, s.x, s.y) < (r + pl.r * 0.6) ** 2) hurt(SF.dmg);
      if (--s.chain > 0) { s.phase = 'chase'; s.t = 0; return; }
      unpark(s.x, s.y);
      st.sf = null;
    }
  }
  function sfRadius(s) { return s.phase === 'chase' ? SF.r0 + (SF.r1 - SF.r0) * Math.min(1, s.t / SF.chase) : SF.r1; }

  // ---------------- Tendrils ----------------

  function startArms(pl) {
    const n = st.form === 'altered' ? 2 : TEN.arms[st.stage];
    const a0 = Math.atan2(pl.y - boss.y, pl.x - boss.x) - (TEN.dps * TEN.sweep / 2) * DEG;
    const dir = Math.random() < 0.5 ? 1 : -1;
    st.arms = { t: 0, n, a0, dir, hit: new Set() };
    G.Audio.sfx('surge');
  }
  // The arms' angle offset over time: wind-up, sweep, pause, sweep back.
  function armOffset(a) {
    const T = TEN, sw = T.dps * DEG * T.sweep;
    let t = a.t - T.windup;
    if (t < 0) return { off: 0, live: false, pass: 0 };
    if (t < T.sweep) return { off: a.dir * T.dps * DEG * t, live: true, pass: 1 };
    t -= T.sweep;
    if (t < T.pause) return { off: a.dir * sw, live: false, pass: 1 };
    t -= T.pause;
    if (t < T.back) return { off: a.dir * (sw - T.dps * DEG * t * (T.sweep / T.back)), live: true, pass: 2 };
    return null;
  }
  function updateArms(dt, pl, hurt) {
    const a = st.arms;
    if (!a) return;
    a.t += dt;
    const o = armOffset(a);
    if (!o) { st.arms = null; return; }
    if (!o.live || pl.dead) return;
    for (let i = 0; i < a.n; i++) {
      const ang = a.a0 + o.off + i * 6.2832 / a.n, key = i + ':' + o.pass;
      if (a.hit.has(key)) continue;
      const ca = Math.cos(ang), sa = Math.sin(ang), px = pl.x - boss.x, py = pl.y - boss.y;
      const along = px * ca + py * sa, across = Math.abs(-px * sa + py * ca);
      if (along > 0 && along < TEN.len && across < TEN.w / 2 + pl.r * 0.6) {
        a.hit.add(key);
        hurt(TEN.dmg);
        // Knocked back along the arm.
        for (let k = 0; k < 6; k++) { const x = pl.x + ca * TEN.knock / 6, y = pl.y + sa * TEN.knock / 6; if (!G.World.isFree(x, y, pl.r * 0.6)) break; pl.x = x; pl.y = y; }
      }
    }
  }

  // ---------------- Tears ----------------

  function startTears(pl) {
    const n = 1 + TEAR.extra[st.stage];
    for (let i = 0; i < n; i++) {
      let x = pl.x, y = pl.y;
      if (i) {
        for (let j = 0; j < 10; j++) {
          const a = Math.random() * 6.2832, d = G.U.rand(TEAR.spread[0], TEAR.spread[1]);
          x = pl.x + Math.cos(a) * d; y = pl.y + Math.sin(a) * d * 0.85;
          if (st.tears.every(o => G.U.dist(o.x, o.y, x, y) > 110)) break;
        }
      }
      st.tears.push({ x, y, t: 0, tick: 0 });
    }
    G.Audio.sfx('rift');
  }
  function updateTears(dt, pl, hurt) {
    for (const o of st.tears) {
      o.t += dt;
      if (o.t < TEAR.windup || pl.dead) continue;
      const d = G.U.dist(pl.x, pl.y, o.x, o.y);
      if (d < TEAR.pull && d > 2) {
        const [nx, ny] = G.U.norm(o.x - pl.x, o.y - pl.y), v = TEAR.pullSpd * dt;
        const x = pl.x + nx * v, y = pl.y + ny * v;
        if (G.World.isFree(x, y, pl.r * 0.6)) { pl.x = x; pl.y = y; }
      }
      if (d < TEAR.r + pl.r * 0.6 && (o.tick -= dt) <= 0) { o.tick = TEAR.tick; hurt(TEAR.dmg); }
    }
    st.tears = st.tears.filter(o => o.t < TEAR.windup + TEAR.open);
  }

  // ---------------- Shades ----------------

  function shades() {
    const mine = G.EnemyMgr.all().filter(e => !e.dead && e.giratinaShade).length;
    const g = G.Enemies.hordeDefs('ghost', st.tr);
    for (let i = 0; i < SHADES.n && mine + i < SHADES.max && g.length; i++) {
      const a = Math.random() * 6.2832;
      const e = G.Spawner.spawnCustom(st.tr, { bag: g, at: [boss.x + Math.cos(a) * 70, boss.y + Math.sin(a) * 50], dmgMul: 2, spdMul: 1.2 });
      if (e) { e.waveR = st.round; e.giratinaShade = true; }
    }
    G.FX.ring(boss.x, boss.y, 8, 130, PURPLE, 0.6, 4);
  }

  // ---------------- Distortion World ----------------

  function startDistortion(pl) {
    st.distN++;
    boss.untouchable = true;
    st.frags = [];
    for (let i = 0; i < DIST.n; i++) {
      let x = pl.x, y = pl.y;
      for (let j = 0; j < 30; j++) {
        const a = i * 6.2832 / DIST.n + G.U.rand(-0.5, 0.5), d = G.U.rand(DIST.dist[0], DIST.dist[1]);
        x = pl.x + Math.cos(a) * d; y = pl.y + Math.sin(a) * d * 0.85;
        if (G.World.isFree(x, y, 26)) break;
      }
      st.frags.push({ x, y, p: 0, done: false });
    }
    G.Spawner.say('The Distortion World! Break the ' + DIST.n + ' Griseous fragments!', 3.4);
    G.Audio.sfx('surge');
    G.FX.ring(boss.x, boss.y, 12, 320, PURPLE, 0.9, 7);
  }
  function updateFragments(dt, pl) {
    for (const f of st.frags) {
      if (f.done) continue;
      const near = !pl.dead && G.U.dist2(pl.x, pl.y, f.x, f.y) < (DIST.range + pl.r) ** 2;
      f.p = G.U.clamp(f.p + (near ? dt / DIST.charge : -dt * DIST.drain), 0, 1);
      if (f.p >= 1) {
        f.done = true;
        const left = st.frags.filter(o => !o.done).length;
        G.FX.burst(f.x, f.y - 16, GOLD, 30, 220);
        G.Audio.sfx('shiny');
        if (left) G.Spawner.say('A Griseous fragment shattered! ' + left + ' left', 2.4, true);
      }
    }
    if (st.frags.every(f => f.done)) {
      st.frags = null;
      boss.untouchable = !!st.parked;
      boss.takenMul = DIST.taken; st.staggerT = DIST.stagger;
      st.stage = Math.min(2, st.stage + 1);
      cancelMoves();
      G.Spawner.say('Back to the real world: Giratina is staggered!', 3);
      G.Camera.kick(1.1);
    }
  }

  // ---------------- what the HUD and the night need ----------------

  /** The Waves HUD line while it's out. */
  function hudLine() {
    if (!st) return '';
    if (st.form === 'shift') return 'GIRATINA  ·  TRANSFORMING';
    if (st.frags) return 'DISTORTION WORLD  ·  FRAGMENTS ' + st.frags.filter(f => f.done).length + '/' + st.frags.length;
    if (st.staggerT > 0) return 'GIRATINA  ·  STAGGERED ' + Math.ceil(st.staggerT);
    return st.form === 'altered' ? 'GIRATINA (ALTERED FORME)' : 'GIRATINA  ·  ORIGIN FORME';
  }
  function targets() { return st && st.frags ? st.frags.filter(f => !f.done) : []; }
  function lights() {
    if (!st) return [];
    const out = [];
    if (boss && !boss.dead && !st.parked) out.push({ x: boss.x, y: boss.y - 30, r: 120, col: 'rgba(155,92,255,.25)' });
    if (st.frags) for (const f of st.frags) if (!f.done) out.push({ x: f.x, y: f.y - 16, r: 80, col: 'rgba(255,207,92,.25)' });
    for (const o of st.tears) out.push({ x: o.x, y: o.y, r: 70, col: 'rgba(155,92,255,.2)' });
    return out;
  }

  // ---------------- drawing ----------------

  function drawables() {
    if (!st || !boss) return [];
    const t = st.t, out = [];
    // On the ground (under everything with feet).
    out.push({ y: -1e6, draw: ctx => {
      ctx.save();
      for (const o of st.tears) {
        const open = o.t >= TEAR.windup, k = open ? 1 : o.t / TEAR.windup;
        ctx.globalAlpha = open ? 0.85 : 0.5;
        ctx.fillStyle = open ? 'rgba(40,10,70,.75)' : 'rgba(155,92,255,.18)';
        ctx.beginPath(); ctx.ellipse(o.x, o.y, TEAR.r * (open ? 1 + Math.sin(t * 8) * 0.05 : k), TEAR.r * 0.6 * (open ? 1 : k), 0, 0, 6.2832); ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = PURPLE; ctx.stroke();
        if (open) { ctx.globalAlpha = 0.25; ctx.beginPath(); ctx.ellipse(o.x, o.y, TEAR.pull, TEAR.pull * 0.6, 0, 0, 6.2832); ctx.stroke(); }
      }
      const s = st.sf;
      if (s) {
        const r = sfRadius(s), lock = s.phase === 'lock';
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = lock ? 'rgba(120,40,200,.45)' : 'rgba(20,0,30,.55)';
        ctx.beginPath(); ctx.ellipse(s.x, s.y, r, r * 0.6, 0, 0, 6.2832); ctx.fill();
        ctx.lineWidth = lock ? 3 : 2; ctx.strokeStyle = lock ? '#ff6bd5' : PURPLE; ctx.stroke();
        if (lock) { ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.ellipse(s.x, s.y, r * Math.min(1, s.t / SF.lock), r * 0.6 * Math.min(1, s.t / SF.lock), 0, 0, 6.2832); ctx.fill(); }
      }
      const a = st.arms;
      if (a && !st.parked) {
        const o = armOffset(a);
        if (o) for (let i = 0; i < a.n; i++) {
          const ang = a.a0 + o.off + i * 6.2832 / a.n;
          ctx.globalAlpha = o.live ? 0.9 : 0.35 + 0.2 * Math.sin(t * 12);
          ctx.strokeStyle = o.live ? '#2a0b3d' : PURPLE; ctx.lineCap = 'round';
          ctx.lineWidth = o.live ? TEN.w : TEN.w * 0.5;
          ctx.beginPath(); ctx.moveTo(boss.x, boss.y - 10); ctx.lineTo(boss.x + Math.cos(ang) * TEN.len, boss.y - 10 + Math.sin(ang) * TEN.len); ctx.stroke();
          if (o.live) { ctx.lineWidth = 4; ctx.strokeStyle = '#d23a3a'; ctx.stroke(); }
        }
      }
      ctx.restore();
    } });
    // Griseous fragments (things with feet).
    if (st.frags) for (const f of st.frags) if (!f.done) out.push({ y: f.y, draw: ctx => drawFragment(ctx, f, t) });
    return out;
  }
  function drawFragment(ctx, f, t) {
    const bob = Math.sin(t * 3 + f.x) * 3;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(f.x, f.y, 14, 5, 0, 0, 6.2832); ctx.fill();
    ctx.translate(f.x, f.y - 26 + bob);
    ctx.fillStyle = GOLD; ctx.strokeStyle = '#6b3a00'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(9, -2); ctx.lineTo(5, 12); ctx.lineTo(-5, 12); ctx.lineTo(-9, -2); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillRect(-3, -8, 3, 8);
    ctx.restore();
    // Its progress ring.
    if (f.p > 0) {
      ctx.save(); ctx.lineWidth = 4; ctx.strokeStyle = GOLD;
      ctx.beginPath(); ctx.arc(f.x, f.y - 26, 22, -Math.PI / 2, -Math.PI / 2 + f.p * 6.2832); ctx.stroke(); ctx.restore();
    }
  }

  return {
    spawn, stop, tick, drawables, lights, targets, hudLine, CANDY,
    get boss() { return boss; },
    get on() { return !!boss; }
  };
})();
