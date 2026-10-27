#!/bin/sh
# Rebuild the standalone offline game: edit dev.html / js / css, then run this.
set -e
cd "$(dirname "$0")/.."
node tools/build.js
node tools/make_offline_list.js
