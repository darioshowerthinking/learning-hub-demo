#!/usr/bin/env bash
# Refuses any tracked or staged file that names a real client, prospect or product.
# Zenetic Pharma and Derolad are invented; everything in this repo must stay that way.
# A hit is fixed, never excepted. Never pipe this script before && (the exit status is the point).
set -u
PATTERN='\b(LEO|Kern|Anzupgo|Gestagyn|Adbry|delgocitinib|tralokinumab|Humira|Cosentyx|Bimzelx|adalimumab|secukinumab|bimekizumab)\b'
MODE="${1:-}"
if [ "$MODE" = "--staged" ]; then FILES=$(git diff --cached --name-only --diff-filter=ACM); else FILES=$(git ls-files -co --exclude-standard); fi
HITS=0
for f in $FILES; do
  case "$f" in scripts/scrub-check.sh|*/node_modules/*|node_modules/*) continue;; esac
  [ -f "$f" ] || continue
  # -I: binary files (images, video) are skipped; their compressed bytes can match short names by chance.
  if grep -InEi "$PATTERN" "$f" >/dev/null 2>&1; then grep -InEiH "$PATTERN" "$f"; HITS=1; fi
done
if [ $HITS -ne 0 ]; then echo "scrub-check: FAILED: remove the names above." >&2; exit 1; fi
echo "scrub-check: clean"
