#!/usr/bin/env bash
# Retired inherited operational helper. Source preserved; never target an old account by default.
echo "BLOCKED: use docs/07-operations/GITHUB-FTPS-SETUP.md for the new domain." >&2
exit 64

# Helpers for the owner-only items in docs/00-foundation/PROJECT-MEMORY.md. Each subcommand does
# one thing, prints what it will do first, and never prints a secret.
#
#   bash scripts/owner-tasks.sh actions-status        # O1: why GitHub Actions does not run
#   bash scripts/owner-tasks.sh sentry-ip ORG PROJECT # O8: scrub IP addresses (needs SENTRY_AUTH_TOKEN in env)
#   bash scripts/owner-tasks.sh mailbox [FORWARD_TO]  # O7: hello@ forwarder on cPanel (default: git user email)
#   bash scripts/owner-tasks.sh supabase-check        # O13: list hosted Supabase projects (read only)
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

cmd=${1:-}
shift || true

case "$cmd" in
  actions-status)
    # Read only. A flagged account shows queued runs that never start, or a billing message.
    gh auth status 2>&1 | grep -E 'Logged in|account' || true
    gh api repos/gsakinz/do-you-know/actions/permissions
    gh workflow list
    gh run list --limit 5
    echo "If runs never start: open https://github.com/settings/billing and"
    echo "https://github.com/settings/actions, clear any spending or flag notice, then run:"
    echo "  gh workflow run <workflow file> && gh run watch"
    ;;

  sentry-ip)
    org=${1:?usage: sentry-ip ORG PROJECT}
    project=${2:?usage: sentry-ip ORG PROJECT}
    : "${SENTRY_AUTH_TOKEN:?export SENTRY_AUTH_TOKEN first (project:write scope); it is never printed}"
    echo "Setting scrubIPAddresses=true on $org/$project"
    curl --fail --silent --show-error -X PUT \
      -H "Authorization: Bearer $SENTRY_AUTH_TOKEN" -H 'Content-Type: application/json' \
      -d '{"scrubIPAddresses": true}' \
      "https://sentry.io/api/0/projects/$org/$project/" \
      | python3 -c 'import json,sys; d=json.load(sys.stdin); print("scrubIPAddresses =", d.get("scrubIPAddresses"))'
    ;;

  mailbox)
    to=${1:-$(git config user.email)}
    : "${to:?no forward address}"
    # A forwarder needs no password. If the domain is not a cPanel email domain this fails and
    # the owner must add it in cPanel > Email > Domains first.
    echo "Forwarding hello@doyouknow.space to $to"
    ssh cpanel "uapi Email add_forwarder domain=doyouknow.space email=hello@doyouknow.space fwdopt=fwd fwdemail=$to" 2>&1 \
      | grep -E 'status|errors|messages' || true
    ssh cpanel "uapi Email list_forwarders domain=doyouknow.space" 2>&1 | grep -E 'dest|forward' || true
    ;;

  supabase-check)
    # Read only. ADR-003: deletion needs an explicit owner yes, so this never deletes.
    command -v supabase >/dev/null || { echo "Install the Supabase CLI first (brew install supabase/tap/supabase)"; exit 1; }
    supabase projects list
    echo "To delete one, run it yourself after confirming it holds nothing you need:"
    echo "  supabase projects delete <ref>"
    ;;

  *)
    sed -n '2,10p' "$0"
    exit 64
    ;;
esac
