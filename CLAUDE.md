# Standalone offline PokéSurvivor (personal fork)

Forked from JPTER78/pokesurvivor (PolyForm Noncommercial; sprites CC BY-NC 4.0).
Personal, non-commercial build: no accounts, no cloud, no co-op, no ranking.

## How to change the game
1. Edit `dev.html`, `js/**`, `css/style.css` (never `index.html` or `js/app.min.js`, they are generated).
2. Run `tools/build_offline.sh` (builds index.html + app.min.js, then regenerates `offline-files.js`).
3. Commit and push; GitHub Pages serves the repo root. Phones pick up the new version the next time they open the game online.

## What was changed from upstream
- `js/core/db.js` ready(): local save only, one profile created automatically (no login screen).
- `js/game.js` / `js/core/camera.js` / `js/ui/hud.js` / `css/style.css` (end of file): portrait support.
- `sw.js` + `offline-files.js` + `tools/make_offline_list.js`: downloads every file once, then runs fully offline.
- Updater, YouTube live banner, Friends/Ranking/Support/Log out buttons disabled or hidden (`.offline-hide`).
- Halloween event uses the phone clock when offline.
- `js/ui/pad-skin.js` + `assets/skin/`: on-screen controller from the WaveBlue Delta skin, fed into `js/core/gamepad.js` as a virtual pad. Portrait only (landscape shows a "turn your phone upright" notice).
- Theme item in the main menu (`theme` setting: 'gameboy' | 'full'): WaveBlue skin, or full screen with the touch joystick (`body.fullp` styles in portrait).
- Game modes (`js/systems/modes.js`, picker `js/ui/modes-ui.js`): Classic, Fast (difficulty clock x2, x1.5 coins), Endless (no Judgment, rounds; rift every 5, boss every 25). Systems get the difficulty time `G.Game.st.ft`.
- Mega Evolution and Z-moves (`js/systems/mega.js`): forms from SpriteCollab via `tools/fetch_megas.py` → `js/data/megas.js`, sprites under `assets/pokemon/{20000+dex}/`. L+R / M = Mega, SELECT / Z / Space = Z-move.
- Save & resume (`js/systems/checkpoint.js`): checkpoint in `save.suspended` every 20 s, on pause, on backgrounding and with Save & quit.
- Prestige (`js/data/upgrades.js`): stars in `save.pstar[dex]`, panel at the top of each Pokémon's Upgrades.
- Poké Mart and Halloween Shop (`js/ui/mart-ui.js`, screen `scr-mart`): any TM any day for coins (1.5x the daily Kecleon price); skins, Ghost Pokémon, shiny Ghosts and tickets for candy. Menu is 3 columns on phones.
- Special and regional forms (`tools/fetch_forms.py` → `js/data/forms.js`, set up in `js/data/forms-setup.js`): ids 30000+ (regional/Bloodmoon) and 31000+ (Shadow), in G.DEX_BY/G.FORMS but not G.DEX; Special tab in the Pokédex; sold in the Halloween Shop.
- Shadow look: `tools/shadow_recolor.py` repaints the base sprites (charcoal body, purple accents, magenta eyes) for Shadow forms without their own drawing; `G.drawShadowAura` (forms-setup.js) draws the purple flame aura and embers in runs (player.js).
- Halloween Waves mode (`js/systems/waves.js`, id 'waves'): Halloween maps at night, rounds of mostly Ghost/Dark/Poison Pokémon spawned via `G.Spawner.spawnCustom`, ghost swarm every 4, rift every 5, Mega Darkrai every 25 (Dark Void zones, summons ghosts, 25 candy), objectives (cages, lanterns, escort to chapel, trick-or-treat doors), 5% candy drops. No Spawner waves, Judgment or Events in this mode; extra night lights via `G.World.drawNight(..., lights)`.
- iOS 26 home-screen strip: `fullViewport()` in pad-skin.js sets html min-height to the screen height in standalone portrait (iOS then gives the full viewport; undone after 700 ms if it did not help). `pad-skin.js` backdrop() paints html/body/theme-color the colour next to the strip (shell blue with the skin, dark with full screen) plus a `.pad-bleed` under the controls; the build label also shows screen sizes (inner, s=screen, l=100lvh, h=height used, safe top/bottom) for diagnosing fit.
- Halloween Waves props: `assets/halloween/hh-props.png` is Doofcraft's Haunted Hollow prop art (chapel, 3 crypts, cages, lanterns, graves, pumpkins, fences) rendered from their generator code; `waves.js` SHEET maps the pieces, drawn ×2 bottom-centred (trick-or-treat doors are crypts, escort ends at the chapel).
- Haunted Hollow decor and night (`js/world/hh-decor.js`, G.HHDecor): on Halloween maps (G.Halloween.inRun) Doofcraft graves/fences/pumpkins/lanterns are scattered per 160/288 px cell from the run seed; the in-run night (game.js render) is Doofcraft's darkness grid (42% by lit lanterns, 90% by ones that are out, lights carve it) plus drifting fog. The lanterns objective puts out 4 of these map lanterns.
