#!/usr/bin/env bash
# Retired inherited operational helper. Source preserved; never target an old account by default.
echo "BLOCKED: use docs/07-operations/GITHUB-FTPS-SETUP.md for the new domain." >&2
exit 64

# A3: turn the report-only Content-Security-Policy into an enforced one. Run this ONLY after the
# owner has signed in with a real adult account on /account with the console open and seen no
# "[Report Only] Refused to" lines (O4 in docs/00-foundation/PROJECT-MEMORY.md).
#
#   bash scripts/enforce-csp.sh
#
# It edits the root .htaccess, rebuilds and runs the Apache check. It does not deploy: review the
# diff, commit it on a branch, open a PR, then run scripts/deploy-by-hand.sh from main.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

grep -q 'Content-Security-Policy-Report-Only' .htaccess || { echo "Already enforced or header missing."; exit 1; }
sed -i.bak 's/Content-Security-Policy-Report-Only/Content-Security-Policy/' .htaccess
rm -f .htaccess.bak
# The Apache check asserts the header by name; keep it in step.
sed -i.bak -e 's/content-security-policy-report-only:/content-security-policy:/' -e 's/CSP report-only sent/CSP enforced header sent/' scripts/check-htaccess.sh
rm -f scripts/check-htaccess.sh.bak
pnpm build
pnpm check:htaccess
git diff --stat -- .htaccess scripts/check-htaccess.sh
echo "Also update the CSP paragraph in docs/07-operations/DEPLOYMENT.md before you commit."
