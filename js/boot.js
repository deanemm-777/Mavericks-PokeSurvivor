/* ============ boot.js — lo primero que corre (antes estaba dentro del HTML) ============
 * Fuera del HTML para que la política de seguridad (CSP, en dev.html) pueda
 * prohibir todo el código metido en la página: así, aunque algún día se
 * colara texto con código en algo que se pinta, el navegador no lo ejecuta.
 *   - PS_PAGES: hay guía y Pokédex (no con --sin-seo, ver tools/build.js).
 *   - El idioma de la pantalla de carga, antes de que cargue el juego.
 */
window.PS_PAGES = !!document.querySelector('meta[name="ps-pages"]');
(function () {
  // El idioma lo elige locales.js (en el <head>).
  var copy = {
    es: ['Juego de supervivencia con Pokémon, gratis en el navegador y en el móvil.', 'Cargando…'],
    en: ['A Pokémon survival game, free in your browser and on mobile.', 'Loading…'],
    fr: ['Un jeu de survie Pokémon gratuit sur navigateur et mobile.', 'Chargement…'],
    it: ['Un gioco di sopravvivenza Pokémon gratuito su browser e cellulare.', 'Caricamento…'],
    'pt-BR': ['Um jogo de sobrevivência Pokémon grátis no navegador e no celular.', 'Carregando…'],
    'zh-Hans': ['免费的宝可梦生存游戏，可在浏览器和手机上游玩。', '加载中…'],
    'zh-Hant': ['免費的寶可夢生存遊戲，可在瀏覽器與手機上遊玩。', '載入中…']
  }[window.PS_LOCALES && window.PS_LOCALES.lang];
  if (!copy) return;
  var p = document.querySelectorAll('#boot p');
  p[0].textContent = copy[0]; p[1].textContent = copy[1];
})();

// Standalone build: iOS 26 home-screen app, portrait. Make the page as tall as the
// screen right away, so iOS hands over the whole screen (no black strip at the
// bottom). ui/pad-skin.js checks it worked and undoes it if it didn't.
(function () {
  try {
    var st = navigator.standalone || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);
    if (!st || !window.screen) return;
    var sw = Math.min(screen.width, screen.height), sh = Math.max(screen.width, screen.height);
    if (innerWidth > innerHeight || Math.abs(sw - innerWidth) > 2) return;
    if (sh - innerHeight > 1 && sh - innerHeight < 130) document.documentElement.style.minHeight = sh + 'px';
  } catch (e) { /* nada */ }
})();
