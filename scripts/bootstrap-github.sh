#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
repo=gsakinz/do-you-know
if ! gh auth status >/dev/null 2>&1; then
  echo 'BLOCKED: authenticate in your own Terminal with: gh auth login -h github.com' >&2
  exit 1
fi
if [ "${1:---check}" != --create ]; then
  echo "Authenticated. Intended private repository: $repo. No changes made."
  echo 'Review docs/07-operations/GITHUB-FTPS-SETUP.md before --create.'
  exit 0
fi
if git remote get-url origin >/dev/null 2>&1; then
  echo 'BLOCKED: origin already exists; inspect it before changing or creating a repository.' >&2
  exit 1
fi
if gh repo view "$repo" >/dev/null 2>&1; then
  echo 'BLOCKED: named repository already exists; verify ownership/content before attaching it.' >&2
  exit 1
fi
gh repo create "$repo" --private --source=. --remote=origin
echo 'Private repository created and origin attached. No files committed or pushed.'
