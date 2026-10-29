/* ============ modes.js — game modes (standalone build) ============
 *
 *   normal   the original game: survive until Arceus's Judgment at 30:00
 *   fast     the difficulty clock runs at double speed: waves, bosses, rifts,
 *            biomes and the Judgment (at 15:00) all come twice as soon.
 *            Pays ×1.5 coins. Its own best time.
 *   endless  no Judgment: the run only ends when you fall. On top of the
 *            normal waves, ROUNDS: defeat the round's quota of Pokémon to
 *            clear it and get a bonus level-up pick. Every 5 rounds a
 *            legendary rift opens; every 25 rounds a boss battle, stronger
 *            each time. Best round and best time are kept.
 *
 * game.js asks for the "difficulty time" (G.Modes.ft(time)) instead of the
 * real run time wherever the game scales with time.
 */
G.Modes = (() => {
  const LIST = [
    { id: 'normal',  name: 'Classic',  desc: 'Survive until Arceus\'s Judgment at 30:00.' },
    { id: 'fast',    name: 'Fast',     desc: 'Everything scales twice as fast. Arceus comes at 15:00. ×1.5 coins.' },
    { id: 'endless', name: 'Endless',  desc: 'No Judgment. Clear rounds for bonus picks, a legendary rift every 5 rounds and a boss every 25.' }
  ];
  const BY = {};
  for (const m of LIST) BY[m.id] = m;

  let mode = 'normal';
  // Endless rounds
  let round = 1, roundKills = 0, killsAtStart = 0, bossNo = 0, clearT = 0;

  const quota = r => Math.round(30 + r * 12 + Math.pow(r, 1.35) * 2);

  function start(id, restore = null) {
    mode = BY[id] ? id : 'normal';
    round = 1; roundKills = 0; killsAtStart = 0; bossNo = 0; clearT = 0;
    if (restore) { round = restore.round || 1; roundKills = restore.roundKills || 0; bossNo = restore.bossNo || 0; }
    if (G.Rift.setAuto) G.Rift.setAuto(mode !== 'endless');
  }

  /** Difficulty time: Fast runs the clock at double speed. */
  function ft(time) { return mode === 'fast' ? time * 2 : time; }

  /** Endless: count defeats toward the round (game.js passes the player's total kills). */
  function tick(dt, pl) {
    if (mode !== 'endless' || !pl) return;
    if (clearT > 0) clearT -= dt;
    roundKills = Math.max(0, pl.kills - killsAtStart);
    if (roundKills >= quota(round)) clear(pl);
  }

  function clear(pl) {
    const done = round;
    round++;
    killsAtStart = pl.kills; roundKills = 0; clearT = 3;
    G.Audio.sfx('levelup');
    G.FX.ring(pl.x, pl.y, 10, G.Camera.outerRadius(), '#ffd23f', 0.6, 5);
    G.Game.bonusLevel('Round ' + done + ' clear!');
    if (round % 25 === 1 && round > 1) {
      bossNo++;
      G.Spawner.say('Round ' + round + ': BOSS BATTLE!', 3.4);
      G.Spawner.spawnBossNow(1.6 * Math.pow(1.5, bossNo - 1));
    } else if (done % 5 === 0) {
      G.Spawner.say('Round ' + done + ' clear! A legendary rift opened', 3.4);
      G.Rift.debugOpen();
    } else {
      G.Spawner.say('Round ' + done + ' clear!', 2.4);
    }
  }

  return {
    LIST, BY, start, ft, tick, quota,
    /** After restoring a run: line the round's count up with the player's total. */
    syncKills(total) { killsAtStart = Math.max(0, total - roundKills); },
    get id() { return mode; },
    get name() { return BY[mode].name; },
    get endless() { return mode === 'endless'; },
    get fast() { return mode === 'fast'; },
    get coinMul() { return mode === 'fast' ? 1.5 : 1; },
    get round() { return round; },
    get roundKills() { return roundKills; },
    get clearT() { return clearT; },
    state() { return { round, roundKills, bossNo }; }
  };
})();
