/* ============ bonus.js — bonus events (standalone build, Doofcraft update 40) ============
 *
 * Doofcraft's admins start bonus events by hand; offline there is nobody to do
 * that, so this build has a weekly rotation instead: every weekend (Friday
 * 18:00 to Sunday 23:59, phone time) one boost is on:
 *     week 1  Shiny weekend    ×2 shiny odds (wild Pokémon and the gacha)
 *     week 2  Coin weekend     ×1.5 PokéCoins
 *     week 3  XP weekend       ×1.25 experience
 *     week 4  Candy weekend    ×2 candy (Halloween)
 * The main menu shows it at the top left with a countdown. A run that starts
 * during one keeps its bonus to the end, and gacha pulls get the shiny boost
 * while it's on.
 */
G.Bonus = (() => {
  const LIST = [
    { id: 'shiny', name: 'Shiny weekend', desc: '×2 shiny odds', shiny: 2 },
    { id: 'coins', name: 'Coin weekend', desc: '×1.5 PokéCoins', coins: 1.5 },
    { id: 'xp', name: 'XP weekend', desc: '×1.25 experience', xp: 1.25 },
    { id: 'candy', name: 'Candy weekend', desc: '×2 candy', candy: 2 }
  ];
  const NONE = { id: '', shiny: 1, coins: 1, xp: 1, candy: 1 };
  let run = NONE;

  /** The event on now (or null) and when it ends. */
  function current(now = new Date()) {
    const d = now.getDay(), h = now.getHours();
    const on = d === 6 || d === 0 || (d === 5 && h >= 18);
    if (!on) return null;
    const end = new Date(now); end.setHours(23, 59, 59, 999);
    end.setDate(end.getDate() + (d === 5 ? 2 : d === 6 ? 1 : 0));
    // Which week of the year (Mondays), for the rotation.
    const start = new Date(now.getFullYear(), 0, 1);
    const week = Math.floor(((now - start) / 864e5 + start.getDay()) / 7);
    return Object.assign({}, NONE, LIST[week % LIST.length], { ends: end.getTime() });
  }

  function runStart() { run = current() || NONE; }
  function runEnd() { run = NONE; }
  const v = k => (run[k] || 1);

  function countdown() {
    const c = current();
    if (!c) return '';
    const s = Math.max(0, Math.floor((c.ends - Date.now()) / 1000));
    const d = Math.floor(s / 86400), hh = Math.floor(s / 3600) % 24, mm = Math.floor(s / 60) % 60;
    return c.name + ': ' + c.desc + ' · ' + (d ? d + 'd ' : '') + hh + 'h ' + String(mm).padStart(2, '0') + 'm left';
  }

  return {
    LIST, current, runStart, runEnd, countdown,
    get run() { return run; },
    get shiny() { return v('shiny'); },
    get coins() { return v('coins'); },
    get xp() { return v('xp'); },
    get candy() { return v('candy'); },
    /** Gacha shiny boost while an event is on (not just in runs). */
    get gachaShiny() { const c = current(); return c ? c.shiny || 1 : 1; }
  };
})();
