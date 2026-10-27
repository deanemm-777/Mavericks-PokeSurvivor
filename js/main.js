/* ============ main.js — arranque ============ */
(() => {
  // Si un archivo no llega a cargarse (conexión móvil que se corta), mejor
  // avisar que arrancar a medias.
  const NEED = ['U', 'I18n', 'Settings', 'DB', 'Audio', 'Input', 'Touch', 'Sprites', 'Camera', 'Moves', 'Enemies', 'Upgrades', 'Items',
                'World', 'FX', 'Projectiles', 'EnemyMgr', 'Pickups', 'Player', 'Combat', 'Spawner', 'LevelUp', 'Gacha',
                'Rift', 'Weather', 'Progress', 'Hazards', 'Social', 'NetCodec', 'Net', 'Coop', 'Ranking', 'Icons', 'UI', 'HUD',
                'MenuUI', 'RunUI', 'SettingsUI', 'Funding', 'SupportUI', 'Game', 'Flow'];
  function broken() {
    // (En la versión publicada G no está en window: va encerrado, ver tools/build.js.)
    const miss = NEED.filter(k => typeof G !== 'object' || !G[k]);
    if (!miss.length) return false;
    const el = document.getElementById('boot');
    el.innerHTML = 'No se pudo cargar todo el juego (¿se cortó la conexión?).<br><button class="btn gold" style="margin-top:12px">Recargar</button>';
    el.querySelector('button').onclick = () => location.reload();
    if (typeof G === 'object' && G.I18n) G.I18n.walk(el);
    console.warn('[Arranque] faltan:', miss.join(', '));
    return true;
  }

  // Mantenimiento (mudanza a servidores nuevos): no se entra ni se inicia
  // sesión, así no se escribe nada mientras se copian las cuentas y partidas.
  // Para probar en local: añade ?dev a la dirección.
  const MAINTENANCE = false;
  function maintenance() {
    if (!MAINTENANCE || /[?&]dev\b/.test(location.search)) return false;
    const en = typeof G === 'object' && G.I18n ? G.I18n.lang === 'en' : !/^es/i.test(navigator.language || '');
    const el = document.getElementById('boot');
    el.setAttribute('translate', 'no');
    el.innerHTML = '<div class="boot-in"><h1>PokéSurvivor</h1>' + (en
      ? '<p><b>We are under maintenance.</b></p><p>We are moving the game to new servers so it can stay free for everyone. ' +
        'Your account, your save and your Pokémon are safe. Please come back in a few hours!</p>'
      : '<p><b>Estamos en mantenimiento.</b></p><p>Estamos mudando el juego a servidores nuevos para que siga siendo gratis para todos. ' +
        'Tu cuenta, tu partida y tus Pokémon están a salvo. ¡Vuelve en unas horas!</p>') +
      '<button class="btn gold" style="margin-top:12px">' + (en ? 'Try again' : 'Volver a intentarlo') + '</button></div>';
    el.querySelector('button').onclick = () => location.reload();
    if (typeof G === 'object' && G.I18n && !en) { el.removeAttribute('translate'); G.I18n.walk(el); }
    return true;
  }

  function boot() {
    if (window.PS_FRAMED) return;            // dentro de otra web: ver noframe.js
    if (maintenance()) return;
    if (broken()) return;
    G.I18n.startDom();
    // Espera a la fuente pixel para que la UI no salte al cargarla.
    const ready = document.fonts && document.fonts.load ? document.fonts.load('16px Pixelify') : Promise.resolve();
    ready.catch(() => {}).then(() => G.Flow.boot());
  }
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', boot);
  else boot();

  // Instalable como app (PWA). Sólo con http(s): abierto con doble clic (file://) no hace falta.
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(e => console.warn('[PWA]', e.message)));
    // Standalone build: download the whole game (all 966 Pokémon) once, so it
    // runs with no connection afterwards. Progress shows in a small pill.
    const KEY = 'ps.offline.ready';
    let pill = null;
    const show = (txt, done) => {
      if (!pill) {
        pill = document.createElement('div');
        pill.id = 'offline-pill';
        document.body.appendChild(pill);
      }
      pill.textContent = txt;
      pill.classList.toggle('done', !!done);
      if (done) setTimeout(() => { pill && pill.remove(); pill = null; }, 4000);
    };
    navigator.serviceWorker.addEventListener('message', e => {
      const m = e.data || {};
      if (m.type === 'offline-progress' && m.done < m.total) show('Downloading for offline play: ' + Math.floor(m.done / m.total * 100) + '%');
      else if (m.type === 'offline-ready') {
        let first = true;
        try { first = !localStorage.getItem(KEY); localStorage.setItem(KEY, '1'); } catch (err) { /* nada */ }
        if (first) show('Ready to play offline', true); else if (pill) { pill.remove(); pill = null; }
      } else if (m.type === 'offline-partial') show('Offline download paused (' + Math.floor(m.done / m.total * 100) + '%), it resumes next time you open the game online', true);
    });
    navigator.serviceWorker.ready.then(reg => {
      const go = () => reg.active && reg.active.postMessage('offline-download');
      go();
      addEventListener('online', go);
      document.addEventListener('visibilitychange', () => { if (!document.hidden && navigator.onLine) go(); });
    });
  }
})();
