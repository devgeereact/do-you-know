#!/usr/bin/env bash
# Delete branches that are already merged into main, locally and on origin, after showing
# the list and asking once. Never touches main, never force-deletes, never rewrites history.
#
#   bash scripts/cleanup-merged-branches.sh            # list, ask, delete
#   bash scripts/cleanup-merged-branches.sh --dry-run  # list only
set -euo pipefail

dry=0
case "${1:-}" in "") ;; --dry-run) dry=1 ;; *) echo "usage: $0 [--dry-run]" >&2; exit 64 ;; esac

cd "$(git rev-parse --show-toplevel)"
git fetch -q --prune origin
git switch -q main
git pull -q --ff-only

# git branch --merged only lists branches whose tip is an ancestor of main.
local_merged=$(git branch --merged main --format='%(refname:short)' | grep -vx main || true)
remote_merged=$(git branch -r --merged origin/main --format='%(refname:short)' \
  | grep -v -E '^origin(/HEAD|/main)?$' | sed 's#^origin/##' || true)

echo "Merged local branches:"; echo "${local_merged:-  none}"
echo "Merged remote branches:"; echo "${remote_merged:-  none}"
[ "$dry" = 0 ] || exit 0
[ -n "$local_merged$remote_merged" ] || exit 0

read -r -p "Delete these? [y/N] " answer
[ "$answer" = y ] || { echo "Nothing deleted."; exit 0; }

[ -z "$local_merged" ] || echo "$local_merged" | xargs git branch -d
[ -z "$remote_merged" ] || echo "$remote_merged" | xargs git push origin --delete
git fetch -q --prune origin
git worktree prune
git branch -a
