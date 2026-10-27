#!/usr/bin/env bash
# Runs a command with temp folders inside the gitignored .local-test/ folder.
# Only TMPDIR/TMP/TEMP change; HOME and every other variable are left alone.
set -euo pipefail
root=$(cd "$(dirname "$0")/.." && pwd)
mkdir -p "$root/.local-test/tmp"
export TMPDIR="$root/.local-test/tmp" TMP="$root/.local-test/tmp" TEMP="$root/.local-test/tmp"
exec "$@"
