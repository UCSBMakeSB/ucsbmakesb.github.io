#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
build_dir="$project_dir/dist"

rm -rf "$build_dir"
mkdir -p "$build_dir/server" "$build_dir/client/assets/team" "$build_dir/client/team"

cp "$project_dir/worker/index.js" "$build_dir/server/index.js"
cp "$project_dir/index.html" "$build_dir/client/index.html"
cp "$project_dir/styles.css" "$build_dir/client/styles.css"
cp "$project_dir/team.css" "$build_dir/client/team.css"
cp "$project_dir/team.js" "$build_dir/client/team.js"
cp "$project_dir/team/index.html" "$build_dir/client/team/index.html"
cp "$project_dir/favicon.svg" "$build_dir/client/favicon.svg"
cp "$project_dir/assets/makesb-storke-golden-hour.webp" "$build_dir/client/assets/makesb-storke-golden-hour.webp"
cp "$project_dir/assets/makesb-social-card.jpg" "$build_dir/client/assets/makesb-social-card.jpg"
cp "$project_dir/assets/team/"*.jpg "$build_dir/client/assets/team/"
cp "$project_dir/assets/team/"*.png "$build_dir/client/assets/team/"

printf 'Built MakeSB site in %s\n' "$build_dir"
