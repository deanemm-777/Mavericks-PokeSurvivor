/* ============ plates.js — Arceus's plates (standalone build, Doofcraft update 40) ============
 *
 * With Arceus as your partner, level-ups can offer a Plate card: it changes
 * Arceus (its type, its form, and the type of its moves of its old type) to
 * that plate's type. Once Arceus holds a plate, the PLATE button (hotbar,
 * ) swaps between the plates you've found this run, once a minute (T on a keyboard).
 */
G.Plates = (() => {
  const CD = 60;
  let cd = 0;

  const isArceus = pl => !!pl && (pl.dex === 493 || (G.FORM_BY[pl.dex] && G.FORM_BY[pl.dex].base === 493));
  const byType = t => (G.PLATES || []).find(p => p.type === t);

  function reset() { cd = 0; }
  function update(dt) { if (cd > 0) cd -= dt; }

  /** Level-up cards (levelup.js): one plate you haven't found yet, now and then. */
  function cards(pl) {
    if (!isArceus(pl) || !G.PLATES) return [];
    const have = pl.plates || new Set();
    const left = G.PLATES.filter(p => !have.has(p.type));
    if (!left.length) return [];
    const p = G.U.pick(left);
    return [{
      w: have.size ? 4 : 7, type: 'plate', key: 'plate:' + p.type,
      icon: 'gem', color: G.U.TYPE_COLOR[p.type], tag: 'Plate',
      title: p.name, desc: 'Changes Arceus and its Judgment to ' + G.U.TYPE_NAME[p.type] + ' type until you choose another plate. Replaces the previous plate.',
      apply: q => { q.plates = q.plates || new Set(); q.plates.add(p.type); equip(q, p.type, true); }
    }];
  }

  function equip(pl, type, free = false) {
    const p = byType(type);
    if (!p || !isArceus(pl)) return false;
    if (!free && cd > 0) return false;
    const old = pl.plate || pl.mon.types[0];
    pl.plate = type;
    pl.mon.types = [type];
    // Its moves of its old type (Judgment and the like) change with it.
    for (const m of pl.moves) if (m.type === old || m.plated) { m.type = type; m.plated = true; }
    if (p.spr && G.SPRITE_META[p.spr]) {
      pl.anim.dex = p.spr;
      G.Sprites.preload([p.spr], 4000, pl.shiny);
    }
    if (!free) cd = CD;
    G.FX.ring(pl.x, pl.y, 10, 140, G.U.TYPE_COLOR[type], 0.6, 5);
    G.Audio.sfx('legend');
    G.Spawner.say('Arceus took up the ' + p.name + '!', 2.4, true);
    return true;
  }

  /** The plate picker (PLATE button). */
  function openPicker() {
    const pl = G.Game.player;
    if (!pl || !pl.plates || !pl.plates.size) return;
    let el = document.getElementById('plate-panel');
    if (!el) { el = document.createElement('div'); el.id = 'plate-panel'; el.className = 'dojo-panel'; document.body.appendChild(el); }
    const wait = cd > 0 ? `<p class="sub">Next change in ${Math.ceil(cd)} s</p>` : '';
    el.innerHTML = `<div class="box"><div class="row between"><h3 style="margin:0">Plates</h3><button class="btn small ghost" id="plate-close">Close</button></div>${wait}
      <div class="dojo-items">${[...pl.plates].map(t => {
        const p = byType(t);
        return `<button class="chip${pl.plate === t ? ' on' : ''}" data-plate="${t}" ${cd > 0 ? 'disabled' : ''} style="border-color:${G.U.TYPE_COLOR[t]}">${p.name}</button>`;
      }).join('')}</div></div>`;
    el.classList.remove('hidden');
    el.querySelector('#plate-close').onclick = () => el.classList.add('hidden');
    el.querySelectorAll('[data-plate]').forEach(b => { b.onclick = () => { equip(pl, b.dataset.plate); el.classList.add('hidden'); }; });
  }

  return {
    reset, update, cards, equip, openPicker, isArceus, CD,
    get cd() { return cd; },
    /** The PLATE button shows once Arceus holds a plate. */
    shown(pl) { return isArceus(pl) && !!pl.plate; }
  };
})();
