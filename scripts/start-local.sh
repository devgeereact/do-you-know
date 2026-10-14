#!/bin/sh
# Development only. Keep every published service on loopback; use SSH from the Mac.
set -eu
cd "$(dirname "$0")/.."
NETWORK=dyk-local-loopback
if docker network inspect "$NETWORK" >/dev/null 2>&1; then
  BIND=$(docker network inspect --format '{{index .Options "com.docker.network.bridge.host_binding_ipv4"}}' "$NETWORK")
  [ "$BIND" = '127.0.0.1' ] || { echo 'Local network must bind to loopback.' >&2; exit 1; }
else
  docker network create --driver bridge --opt com.docker.network.bridge.host_binding_ipv4=127.0.0.1 "$NETWORK" >/dev/null
fi
# The CLI prints credentials on success. Keep its output out of terminal logs.
START_OUTPUT=$(mktemp)
trap 'rm -f "$START_OUTPUT"' EXIT HUP INT TERM
if ! npx --yes supabase@2.121.0 start --network-id "$NETWORK" >"$START_OUTPUT" 2>&1; then
  echo 'Local Supabase failed to start. Inspect its containers locally; do not share credential output.' >&2
  exit 1
fi
for CONTAINER in supabase_kong_do-you-know supabase_db_do-you-know; do
  BINDINGS=$(docker inspect --format '{{range .NetworkSettings.Ports}}{{range .}}{{println .HostIp}}{{end}}{{end}}' "$CONTAINER")
  [ "$BINDINGS" = '127.0.0.1' ] || { echo 'Unexpected service binding; stop the local stack and inspect.' >&2; exit 1; }
done
node scripts/configure-local-env.mjs
echo 'Local backend ready: API http://127.0.0.1:55321, database 127.0.0.1:55322.'
