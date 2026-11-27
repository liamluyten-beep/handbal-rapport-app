#!/usr/bin/env bash
# Zet een kopie van de app in een submap voor een andere ploeg (bv. heren1/ of test/heren1/).
# De code herkent de ploeg zelf aan het pad; enkel het manifest (app-naam) verschilt.
# Gebruik: bash tools/bouw-ploeg.sh BRONMAP DOELMAP PLOEG [TEST]
set -euo pipefail
BRON="$1"; DOEL="$2"; PLOEG="$3"; TEST="${4:-}"
rm -rf "$DOEL" && mkdir -p "$DOEL"
cp "$BRON/index.html" "$BRON/sw.js" "$DOEL/"
cp -r "$BRON/css" "$BRON/js" "$BRON/img" "$DOEL/"
cp "$BRON/ploegen/$PLOEG.webmanifest" "$DOEL/manifest.webmanifest"
if [ -n "$TEST" ]; then
  sed -i 's/"name": "\([^"]*\)"/"name": "TEST \1"/; s/"short_name": "\([^"]*\)"/"short_name": "TEST \1"/' "$DOEL/manifest.webmanifest"
fi
