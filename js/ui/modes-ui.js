/* ============ modes-ui.js — Play: choose a mode or continue a saved run (standalone build) ============ */
G.ModesUI = (() => {
  const $ = G.UI.$;
  const ICON = { normal: 'ball', fast: 'boot', endless: 'clock', waves: 'candy' };

  function record(id) {
    const st = (G.DB.save && G.DB.save.stats) || {};
    const m = (st.modes || {})[id] || {};
    if (id === 'normal') return st.bestTime ? 'Best ' + G.U.mmss(st.bestTime) : 'No runs yet';
    if (id === 'endless' || id === 'waves') return m.round ? 'Best round ' + m.round + ' · ' + G.U.mmss(m.best || 0) : 'No runs yet';
    return m.best ? 'Best ' + G.U.mmss(m.best) : 'No runs yet';
  }

  function open() {
    const snap = G.Checkpoint.saved;
    $('modes-saved').classList.toggle('hidden', !snap);
    $('modes-list').classList.toggle('hidden', !!snap);
    $('modes-diff').classList.toggle('hidden', !!snap);
    $('modes-diff-info').classList.toggle('hidden', !!snap);
    if (snap) {
      $('modes-saved-desc').textContent = G.Checkpoint.describe(snap);
      $('modes-continue').onclick = () => { G.Audio.sfx('confirm'); G.Game.startRun(null, { restore: snap }); };
      // Ends it with the rewards it had earned: continue it for a moment, then quit (the summary shows what you got).
      $('modes-end').onclick = () => {
        G.Game.startRun(null, { restore: snap });
        setTimeout(() => G.Game.quit(), 60);
      };
    } else {
      // Difficulty (update 40): Easy / Medium / Hard, on top of the mode.
      const INFO = { easy: 'Easy: gentler enemies (15 % slower), 20 % lower rewards.', medium: 'Medium: the normal game.',
                     hard: 'Hard: enemies 30 % tougher and 15 % faster, 15 % less XP, 25 % higher rewards.' };
      const paint = () => {
        const d = G.Settings.get('difficulty') || 'medium';
        $('modes-diff').querySelectorAll('[data-diff]').forEach(b => b.classList.toggle('on', b.dataset.diff === d));
        $('modes-diff-info').textContent = INFO[d];
      };
      $('modes-diff').querySelectorAll('[data-diff]').forEach(b => {
        b.onclick = () => { G.Settings.set('difficulty', b.dataset.diff); G.Audio.sfx('click'); paint(); };
      });
      paint();
      const last = (G.Settings.get('lastMode')) || 'normal';
      $('modes-list').innerHTML = G.Modes.LIST.map(m => `
        <button class="menu-item mode-item${m.id === last ? ' last' : ''}" data-mode="${m.id}">
          <span class="mi-ico">${G.Icons.html(ICON[m.id], 26)}</span>${m.name}
          <small>${m.desc}</small><small class="mode-rec">${record(m.id)}</small>
        </button>`).join('');
      $('modes-list').querySelectorAll('[data-mode]').forEach(b => {
        b.onclick = () => {
          G.Settings.set('lastMode', b.dataset.mode);
          G.Audio.sfx('confirm');
          G.Game.startRun(null, { mode: b.dataset.mode });
        };
      });
    }
    G.UI.show('scr-modes');
  }

  return { open };
})();
