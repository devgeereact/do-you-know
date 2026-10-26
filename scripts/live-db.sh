#!/usr/bin/env bash
# On-demand, read-only access to the LIVE doyouknow.space database from this Mac.
# Opens an SSH tunnel (no cPanel Remote MySQL, nothing opened on the server) and uses the
# SELECT-only account in ~/.config/do-you-know/live-db-readonly.cnf (chmod 600, never in Git).
#
#   bash scripts/live-db.sh open      # start the tunnel on 127.0.0.1:33061
#   bash scripts/live-db.sh shell     # open a read-only mariadb prompt (starts the tunnel if needed)
#   bash scripts/live-db.sh status
#   bash scripts/live-db.sh close
#
# Port 33061 is deliberately not 3306/3307: those belong to local disposable test databases.
# Never point local tests, migrations or importers at this tunnel.
set -euo pipefail
PORT=33061
CNF="$HOME/.config/do-you-know/live-db-readonly.cnf"
FORWARD="127.0.0.1:${PORT}:127.0.0.1:3306"

listening() { lsof -nP -iTCP:"${PORT}" -sTCP:LISTEN >/dev/null 2>&1; }

open_tunnel() {
  if listening; then echo "Tunnel already open on 127.0.0.1:${PORT}"; return; fi
  ssh -o BatchMode=yes -o ExitOnForwardFailure=yes -f -N -L "$FORWARD" cpanel
  echo "Tunnel open on 127.0.0.1:${PORT} (live database, read-only account). Close it with: bash scripts/live-db.sh close"
}

case "${1:-}" in
  open) open_tunnel ;;
  shell)
    [ -f "$CNF" ] || { echo "Missing $CNF" >&2; exit 1; }
    open_tunnel
    exec mariadb --defaults-file="$CNF" ;;
  status) if listening; then echo "open on 127.0.0.1:${PORT}"; else echo "closed"; fi ;;
  close) pkill -f -- "-L ${FORWARD} cpanel" && echo "Tunnel closed" || echo "No tunnel running" ;;
  *) echo "usage: $0 open|shell|status|close" >&2; exit 64 ;;
esac
