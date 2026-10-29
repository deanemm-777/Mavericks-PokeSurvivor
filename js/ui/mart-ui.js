/* ============ mart-ui.js — Poké Mart and Halloween Shop (standalone build) ============
 *
 * POKÉ MART (coins): choose any of your Pokémon and teach it any TM it can
 * learn, any day (the Kecleon Shop only has 8 a day, cheaper). Taught moves
 * stay with that Pokémon for good and join its level-up cards (save.ptm).
 *
 * HALLOWEEN SHOP (candy, data in save.bag.candy): the witch skins, Ghost-type
 * Pokémon you don't have yet, shiny versions of Ghost Pokémon you have, and
 * gacha tickets. Open during Halloween (30 Oct to 2 Nov, Spain time), shown
 * with a countdown in the two weeks before, and afterwards for as long as
 * you still have candy to spend.
 */
G.MartUI = (() => {
  const $ = G.UI.$;
  let which = 'mart', dex = null, ghostAll = false;

  const coinHtml = n => `<span class="coin"></span> ${n.toLocaleString()}`;
  const candyHtml = n => `${G.Icons.html('candy', 14)} ${n.toLocaleString()}`;
  const row = (ic, title, desc, btn) => `<div class="panel upg-item"><div class="ic">${ic}</div><div><b>${title}</b><div class="note" style="margin:2px 0 0">${desc}</div></div><div class="upg-btns">${btn}</div></div>`;
  const moveName = id => G.T(G.Moves.BY_ID[id].name, 'move');

  // ---------------- Poké Mart ----------------

  const martPrice = id => Math.round(G.Shop.tmPrice(id) * 1.5 / 10) * 10;

  function martHtml() {
    const s = G.DB.save;
    if (!dex || !s.owned[dex]) dex = s.partner;
    const mons = Object.keys(s.owned).map(Number).filter(d => G.DEX_BY[d])
      .sort((a, b) => (b === s.partner) - (a === s.partner) || a - b);
    const learn = G.Mons.learnable(dex).sort((a, b) => {
      const A = G.Moves.BY_ID[a], B = G.Moves.BY_ID[b];
      return A.type.localeCompare(B.type) || moveName(a).localeCompare(moveName(b));
    });
    const taught = G.Mons.taught(dex);
    let h = `<p class="sub" style="margin:4px 0 8px">Every TM, any day. A taught move stays with that Pokémon for good and can show up in its level-up cards. ${coinHtml(s.coins)}</p>
      <div class="row" style="margin-bottom:8px"><label for="mart-mon" style="margin:0">Pokémon</label>
      <select id="mart-mon" class="field" style="width:auto;flex:1;min-width:0">${mons.map(d => `<option value="${d}"${d === dex ? ' selected' : ''}>${G.DEX_BY[d].name}${d === s.partner ? ' (partner)' : ''}</option>`).join('')}</select></div>`;
    if (taught.length) h += `<p class="note" style="margin:0 0 8px">Already taught: ${taught.map(moveName).join(', ')}</p>`;
    if (!learn.length) return h + `<p class="sub center" style="margin:20px 0">${G.DEX_BY[dex].name} has no more TM moves to learn.</p>`;
    h += '<div class="upg">';
    for (const id of learn) {
      const m = G.Moves.BY_ID[id], price = martPrice(id);
      const cat = G.Stats.NAME[m.cat || (m.stat === 'patk' ? 'physical' : m.stat === 'satk' ? 'special' : '')];
      const tag = `<span class="tag-chip" style="background:${G.U.TYPE_COLOR[m.type]}">${G.U.TYPE_NAME[m.type]}</span>${cat ? `<span class="tag-chip cat">${cat}</span>` : ''}`;
      h += row(G.Icons.html('move:' + id, 32), `TM ${moveName(id)} ${tag}`, G.T(m.desc),
        `<button class="btn small gold" data-teach="${id}" data-sfx="none" ${s.coins < price ? 'disabled' : ''}>Teach · ${coinHtml(price)}</button>`);
    }
    return h + '</div>';
  }

  function teach(id) {
    const s = G.DB.save, price = martPrice(id);
    if (!G.Mons.canLearn(dex, id) || s.coins < price) { render(); return; }
    s.coins -= price;
    s.ptm = s.ptm || {};
    s.ptm[dex] = G.Mons.taught(dex).concat([id]);
    G.DB.commit(true);
    G.Audio.sfx('buy');
    G.UI.refreshCoins();
    G.UI.toast(`${G.DEX_BY[dex].name} learned ${moveName(id)}!`, 2600);
    render();
  }

  // ---------------- Halloween Shop ----------------

  const candy = () => G.Shop.count('candy');
  const GHOST_PRICE = [0, 40, 70, 120, 200, 400];
  const ghostPrice = d => GHOST_PRICE[Math.max(1, Math.min(5, G.DEX_BY[d].rarity || 1))];
  const TICKETS = [{ id: 't1', n: 1, price: 15, name: 'Gacha ticket ×1' }, { id: 't10', n: 1, price: 120, name: 'Gacha ticket ×10' }];

  function hwState() {
    const c = G.Halloween.countdown();
    if (c && c.on) return { open: true, text: 'Halloween ends in ' + span(c.ms) + '.' };
    if (c && !c.on) return { open: false, soon: true, text: 'Halloween starts in ' + span(c.ms) + ' (30 October to 2 November). Candy drops in runs while it is on.' };
    if (candy() > 0) return { open: true, text: 'Halloween is over: spend the candy you have left.' };
    return { open: false, text: 'Halloween is over until next year.' };
  }
  function span(ms) {
    const m = Math.floor(ms / 60000), d = Math.floor(m / 1440), h = Math.floor(m % 1440 / 60);
    return d ? `${d} d ${h} h` : h ? `${h} h ${m % 60} min` : `${m % 60} min`;
  }
  /** Shown in the main menu? */
  function hwVisible() { const c = G.Halloween.countdown(); return !!c || candy() > 0; }

  function ghosts() {
    return G.DEX.filter(p => p.types.includes('ghost') && G.SPRITE_META[p.dex] && !G.DB.owns(p.dex))
      .sort((a, b) => ghostPrice(a.dex) - ghostPrice(b.dex) || a.dex - b.dex);
  }
  function shinyGhosts() {
    return G.DEX.filter(p => p.types.includes('ghost') && G.DB.owns(p.dex) && !G.DB.ownsShiny(p.dex) && G.Sprites.hasShiny(p.dex));
  }

  function hwHtml() {
    const st = hwState(), have = candy(), s = G.DB.save;
    const btn = (attr, price) => st.open ? `<button class="btn small gold" ${attr} data-sfx="none" ${have < price ? 'disabled' : ''}>${candyHtml(price)}</button>` : `<span class="note">${candyHtml(price)}</span>`;
    let h = `<p class="sub" style="margin:4px 0 8px">${st.text} <b class="gold">You have ${candyHtml(have)} candy</b></p>`;
    // Witch skins
    h += `<h3 style="margin:10px 0 6px">${G.Icons.html('witch', 18)} Witch skins</h3><div class="upg">`;
    for (const id of G.Skins.LIST) {
      const sk = G.Skins.SKINS[id], got = G.Skins.owns(s, id), name = G.DEX_BY[sk.dex].name;
      h += row(`<canvas data-skin-pv="${id}" width="64" height="72"></canvas>`, G.T(sk.name),
        got ? 'Bought. Put it on or take it off on the Pokémon\'s page in your collection.' : `A witch hat${sk.dex === 94 ? ' and cape' : ''} for ${name}. Yours for good.`,
        got ? '<b class="gold">Bought</b>' : btn(`data-hskin="${id}"`, G.Halloween.SKIN_PRICE));
    }
    h += '</div>';
    // Tickets
    h += `<h3 style="margin:12px 0 6px">${G.Icons.html('ball4', 18)} Gacha tickets</h3><div class="upg">`;
    for (const t of TICKETS) h += row(G.Icons.html('ball4', 32), t.name, t.id === 't1' ? 'One pull in the gacha.' : 'Ten pulls at once (the ×10 tickets from bosses).', btn(`data-hticket="${t.id}"`, t.price));
    h += '</div>';
    // Shiny ghosts you own
    const sg = shinyGhosts();
    if (sg.length) {
      h += `<h3 style="margin:12px 0 6px">★ Shiny Ghost Pokémon</h3><p class="note" style="margin:0 0 6px">Shiny versions of Ghost Pokémon you already have.</p><div class="upg">`;
      for (const p of sg) h += row(`<canvas data-pv="${p.dex}" data-shiny="1" width="64" height="64"></canvas>`, p.name + ' ★', G.UI.typeChips(p.types), btn(`data-hshiny="${p.dex}"`, ghostPrice(p.dex) * 3));
      h += '</div>';
    }
    // Ghost Pokémon you don't have
    const gl = ghosts(), shown = ghostAll ? gl : gl.slice(0, 10);
    h += `<h3 style="margin:12px 0 6px">${G.Icons.html('ball', 18)} Ghost Pokémon</h3>`;
    if (!gl.length) h += '<p class="note">You have every Ghost Pokémon!</p>';
    else {
      h += '<div class="upg">';
      for (const p of shown) h += row(`<canvas data-pv="${p.dex}" width="64" height="64"></canvas>`, p.name, G.UI.typeChips(p.types) + ' ' + G.UI.stars(p.rarity), btn(`data-hghost="${p.dex}"`, ghostPrice(p.dex)));
      h += '</div>';
      if (gl.length > shown.length) h += `<p class="center"><button class="btn small" id="hw-more">Show all ${gl.length}</button></p>`;
    }
    return h;
  }

  function spendCandy(price) {
    const s = G.DB.save;
    if (!hwState().open || candy() < price) return false;
    s.bag.candy -= price;
    if (s.bag.candy <= 0) delete s.bag.candy;
    return true;
  }
  function hwBuy(kind, id) {
    const s = G.DB.save;
    let msg = '';
    if (kind === 'skin') {
      const sk = G.Skins.SKINS[id];
      if (!sk || G.Skins.owns(s, id) || !spendCandy(G.Halloween.SKIN_PRICE)) return render();
      s.skins = s.skins || {}; s.skins[id] = Date.now();
      if (G.DB.owns(sk.dex)) G.Skins.wear(s, sk.dex, id);
      msg = 'Happy Halloween! ' + G.T(sk.name) + ' is yours';
    } else if (kind === 'ticket') {
      const t = TICKETS.find(x => x.id === id);
      if (!t || !spendCandy(t.price)) return render();
      s.tickets = s.tickets || { t1: 0, t10: 0 };
      s.tickets[t.id] += t.n;
      msg = '+1 ' + t.name.toLowerCase();
    } else if (kind === 'ghost') {
      const d = +id;
      if (G.DB.owns(d) || !spendCandy(ghostPrice(d))) return render();
      G.DB.grant(d, 'halloween');
      msg = G.DEX_BY[d].name + ' joined your team!';
    } else if (kind === 'shiny') {
      const d = +id;
      if (!G.DB.owns(d) || G.DB.ownsShiny(d) || !spendCandy(ghostPrice(d) * 3)) return render();
      G.DB.grantShiny(d, 'halloween');
      msg = 'Shiny ' + G.DEX_BY[d].name + ' is yours!';
    }
    G.DB.commit(true);
    G.Audio.sfx(kind === 'ghost' || kind === 'shiny' ? 'shinyGet' : 'buy');
    G.UI.refreshCoins();
    G.UI.toast(msg, 2800);
    render();
  }

  // ---------------- screen ----------------

  function render() {
    const body = $('mart-body');
    $('mart-title').textContent = which === 'mart' ? 'Poké Mart' : 'Halloween Shop';
    body.innerHTML = which === 'mart' ? martHtml() : hwHtml();
    if (which === 'mart') {
      $('mart-mon').onchange = e => { dex = +e.target.value; G.Audio.sfx('select'); render(); };
      body.querySelectorAll('[data-teach]').forEach(b => { b.onclick = () => teach(b.dataset.teach); });
    } else {
      body.querySelectorAll('[data-hskin]').forEach(b => { b.onclick = () => hwBuy('skin', b.dataset.hskin); });
      body.querySelectorAll('[data-hticket]').forEach(b => { b.onclick = () => hwBuy('ticket', b.dataset.hticket); });
      body.querySelectorAll('[data-hghost]').forEach(b => { b.onclick = () => hwBuy('ghost', b.dataset.hghost); });
      body.querySelectorAll('[data-hshiny]').forEach(b => { b.onclick = () => hwBuy('shiny', b.dataset.hshiny); });
      const more = $('hw-more');
      if (more) more.onclick = () => { ghostAll = true; render(); };
      body.querySelectorAll('canvas[data-skin-pv]').forEach(cv => {
        const sk = G.Skins.SKINS[cv.dataset.skinPv];
        G.UI.sprite(cv, sk.dex, { skin: cv.dataset.skinPv, scale: 2 });
      });
      body.querySelectorAll('canvas[data-pv]').forEach(cv => G.UI.sprite(cv, +cv.dataset.pv, { scale: 2, shiny: !!cv.dataset.shiny }));
    }
  }

  function open(kind) {
    which = kind === 'halloween' ? 'halloween' : 'mart';
    ghostAll = false;
    G.UI.show('scr-mart', true);
    render();
    $('mart-body').scrollTop = 0;
  }

  return { open, render, hwVisible };
})();
