/* ============ emotes-ui.js — the Emotes screen (standalone build, update 40) ============ */
G.EmotesUI = (() => {
  const $ = G.UI.$;
  let filter = '';
  // Doofcraft v41: shiny and rarity filters ('' = all; rarity 1-5 = the Pokémon's gacha rarity).
  let fShiny = false, fRar = 0;

  function open() { G.UI.show('scr-emotes', true); render(); }

  function render(news) {
    const own = Object.keys(G.Emotes.owned()), w = G.Emotes.wheel(), s = G.DB.save;
    $('em-count').textContent = own.length.toLocaleString() + ' / ' + G.Emotes.total.toLocaleString();
    $('em-free').classList.toggle('hidden', !G.Emotes.freeLeft());
    $('em-buy').innerHTML = `Buy a pack (5) · <span class="coin"></span> ${G.Emotes.PRICE}`;
    $('em-buy').disabled = s.coins < G.Emotes.PRICE;
    $('em-wheel').innerHTML = Array.from({ length: 8 }, (_, i) => w[i]
      ? `<button class="em-slot" data-ek="${w[i]}" title="${G.Emotes.label(w[i])}"><img src="${G.Emotes.url(w[i])}" alt=""></button>`
      : '<span class="em-slot empty"></span>').join('');
    const q = filter.trim().toLowerCase();
    const rar = k => { const m = G.DEX_BY[+k.split(':')[0]]; return m ? m.rarity || 1 : 1; };
    const list = own.filter(k => (!q || G.Emotes.label(k).toLowerCase().includes(q)) && (!fShiny || k.endsWith(':1')) && (!fRar || rar(k) === fRar)).sort((a, b) => +a.split(':')[0] - +b.split(':')[0]);
    $('em-grid').innerHTML = list.length ? list.map(k =>
      `<button class="em-cell${w.includes(k) ? ' on' : ''}${news && news.includes(k) ? ' new' : ''}" data-ek="${k}" title="${G.Emotes.label(k)}"><img src="${G.Emotes.url(k)}" alt="" loading="lazy">${k.endsWith(':1') ? '<i>★</i>' : ''}</button>`).join('')
      : `<p class="sub" style="grid-column:1/-1">${own.length ? 'No emotes match these filters.' : 'No emotes yet: open your free pack.'}</p>`;
    $('scr-emotes').querySelectorAll('[data-ek]').forEach(b => {
      b.onclick = () => { if (!G.Emotes.toggleWheel(b.dataset.ek)) G.UI.toast('Your wheel holds 8: take one off first'); render(); };
    });
    if (news) G.UI.toast('New: ' + news.map(G.Emotes.label).join(', '), 4000);
    G.UI.refreshCoins && G.UI.refreshCoins();
  }

  function init() {
    $('em-free').onclick = () => { const r = G.Emotes.openFree(); if (r) { G.Audio.sfx('reveal'); render(r); } };
    $('em-buy').onclick = () => { const r = G.Emotes.buy(); if (r) { G.Audio.sfx('buy'); render(r); } else G.Audio.sfx('error'); };
    $('em-q').oninput = () => { filter = $('em-q').value; render(); };
    const bar = document.createElement('div');
    bar.className = 'em-filters chips'; bar.setAttribute('translate', 'no');
    bar.innerHTML = `<button class="chip" data-fs>★ Shiny</button>` + [1, 2, 3, 4, 5].map(r => `<button class="chip" data-fr="${r}">${'★'.repeat(r)}</button>`).join('');
    $('em-q').insertAdjacentElement('afterend', bar);
    const sync = () => {
      bar.querySelector('[data-fs]').classList.toggle('on', fShiny);
      bar.querySelectorAll('[data-fr]').forEach(b => b.classList.toggle('on', +b.dataset.fr === fRar));
    };
    bar.querySelector('[data-fs]').onclick = () => { fShiny = !fShiny; sync(); render(); };
    bar.querySelectorAll('[data-fr]').forEach(b => { b.onclick = () => { fRar = fRar === +b.dataset.fr ? 0 : +b.dataset.fr; sync(); render(); }; });
  }

  return { open, init, render };
})();
