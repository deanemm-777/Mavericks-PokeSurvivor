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
