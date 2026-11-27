#!/usr/bin/env bash
# Zet de huidige stand van de branch "dev" op de testversie (/test/) van de site.
# De echte app (bovenaan de site) verandert niet. Gebruik: bash tools/naar-test.sh "korte omschrijving"
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
[ "$(git rev-parse --abbrev-ref HEAD)" = "dev" ] || { echo "Eerst naar de branch dev (git checkout dev)."; exit 1; }
[ -z "$(git status --porcelain)" ] || { echo "Eerst alles committen op dev."; exit 1; }
BRON="$PWD"
WT="$(mktemp -d)/main"
git fetch -q origin main
git worktree add -q "$WT" main
trap 'git -C "$BRON" worktree remove --force "$WT" >/dev/null 2>&1 || true' EXIT
cd "$WT"
git pull -q --rebase origin main
rm -rf test && mkdir test
cp "$BRON/index.html" "$BRON/manifest.webmanifest" "$BRON/sw.js" test/
cp -r "$BRON/css" "$BRON/js" "$BRON/img" test/
# Eigen naam voor de geïnstalleerde test-app, zodat hij niet verward wordt met de echte
sed -i 's/"name": "\([^"]*\)"/"name": "TEST \1"/; s/"short_name": "\([^"]*\)"/"short_name": "TEST Uilenspiegel"/' test/manifest.webmanifest
git add -A test
git commit -q -m "test: ${1:-nieuwe testversie} ($(git -C "$BRON" rev-parse --short HEAD))" || { echo "Testversie was al up-to-date."; exit 0; }
git push -q origin main
echo "Testversie bijgewerkt: https://uilenspiegelu16handbal.github.io/test/"
