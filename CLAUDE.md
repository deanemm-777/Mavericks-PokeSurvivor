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
