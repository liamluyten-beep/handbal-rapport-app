#!/usr/bin/env bash
# Zet wat op dev staat op de echte app (na "publiceer maar" van de trainer), en houdt de testversie gelijk.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
[ "$(git rev-parse --abbrev-ref HEAD)" = "dev" ] || { echo "Eerst naar de branch dev."; exit 1; }
[ -z "$(git status --porcelain)" ] || { echo "Eerst alles committen op dev."; exit 1; }
git fetch -q origin main
git checkout -q main
git pull -q --rebase origin main
# Bij een conflict wint main (dat zijn de Clubee-gegevens die de dagelijkse taak bijwerkt)
git merge -q --no-edit -X ours dev -m "publiceer: dev naar de echte app"
git push -q origin main
git checkout -q dev
git merge -q --no-edit main      # Clubee-gegevens van main ook op dev
bash tools/naar-test.sh "gelijk met de echte app"
echo "Gepubliceerd: https://uilenspiegelu16handbal.github.io/"
