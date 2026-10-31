/* ============ movedex-ui.js — Move Dex (standalone build, Doofcraft update 40) ============
 * Every move in the game: search it, filter by type and kind, and open one to
 * see its numbers at every upgrade level (data/moves.js instance()).
 */
G.MoveDexUI = (() => {
  const $ = G.UI.$;
  let q = '', type = '', kind = '', open1 = '';
  const STATS = [['dmg', 'Damage'], ['cd', 'Cooldown (s)'], ['count', 'Count'], ['radius', 'Range'], ['speed', 'Speed'],
                 ['pierce', 'Pierce'], ['dur', 'Duration (s)'], ['amount', 'Power'], ['stacks', 'Stacks'], ['bounce', 'Bounces'], ['stun', 'Stun (s)']];
  const fmt = v => (typeof v !== 'number' ? '' : Math.abs(v) >= 10 ? String(Math.round(v)) : String(Math.round(v * 100) / 100));

  function open() {
    G.UI.show('scr-movedex', true);
    const ts = $('md-type'), ks = $('md-kind');
    ts.innerHTML = '<option value="">All types</option>' + Object.keys(G.U.TYPE_NAME).map(t => `<option value="${t}">${G.U.TYPE_NAME[t]}</option>`).join('');
    const kinds = [...new Set(G.Moves.ALL.map(m => m.kind))].sort();
    ks.innerHTML = '<option value="">All kinds</option>' + kinds.map(k => `<option value="${k}">${k}</option>`).join('');
    ts.value = type; ks.value = kind; $('md-q').value = q;
    ts.onchange = () => { type = ts.value; render(); };
    ks.onchange = () => { kind = ks.value; render(); };
    $('md-q').oninput = () => { q = $('md-q').value; render(); };
    render();
  }

  function render() {
    const s = q.trim().toLowerCase();
    const list = G.Moves.ALL.filter(m => (!type || m.type === type) && (!kind || m.kind === kind) &&
      (!s || G.T(m.name, 'move').toLowerCase().includes(s) || m.id.includes(s)));
    $('md-count').textContent = list.length + ' moves';
    $('md-list').innerHTML = list.map(m => {
      const def = G.Moves.BY_ID[m.id], on = open1 === m.id;
      let table = '';
      if (on) {
        const lv = Array.from({ length: def.maxLvl }, (_, i) => G.Moves.instance(m.id, i + 1));
        const rows = STATS.filter(([k]) => lv[0][k] != null && typeof lv[0][k] === 'number');
        table = `<table class="md-table"><tr><th></th>${lv.map((_, i) => `<th>Lv${i + 1}</th>`).join('')}</tr>` +
          rows.map(([k, n]) => `<tr><td>${n}</td>${lv.map(x => `<td>${fmt(x[k])}</td>`).join('')}</tr>`).join('') + '</table>' +
          `<ol class="md-ups">${(def.ups || []).map(u => `<li>${G.T(u.t)}</li>`).join('')}</ol>`;
      }
      const cat = G.Stats.NAME[m.cat || (m.stat === 'patk' ? 'physical' : m.stat === 'satk' ? 'special' : '')] || '';
      return `<div class="md-row${on ? ' on' : ''}" data-id="${m.id}">
        ${G.Icons.html('move:' + m.id, 32)}
        <div><b>${G.T(m.name, 'move')}</b>
          <div class="md-tags"><span class="tag-chip" style="background:${G.U.TYPE_COLOR[m.type]}">${G.U.TYPE_NAME[m.type]}</span>
          <span class="tag-chip cat">${m.kind}</span>${cat ? `<span class="tag-chip cat">${cat}</span>` : ''}</div>
          <div class="sub">${G.T(m.desc)}</div>${table}</div></div>`;
    }).join('');
    $('md-list').querySelectorAll('.md-row').forEach(r => {
      r.onclick = () => { open1 = open1 === r.dataset.id ? '' : r.dataset.id; render(); };
    });
  }

  return { open };
})();
