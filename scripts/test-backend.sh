#!/usr/bin/env bash
# Run every backend test against the throwaway local MariaDB in .local-test/ (port 33999, db dyk_test).
# Starts MariaDB and the PHP API if they are not running, migrates, runs the suites, then stops what it started.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LT="$ROOT/.local-test"
export DYK_CONFIG="$LT/test-env.php"
export DYK_TEST_API="http://127.0.0.1:55438/api/v1"
[ -f "$DYK_CONFIG" ] || { echo "Missing $DYK_CONFIG (see backend/README.md)"; exit 1; }

started_db=0; started_api=0
cleanup() {
  [ "$started_api" = 1 ] && kill "$api_pid" 2>/dev/null || true
  [ "$started_db" = 1 ] && kill "$db_pid" 2>/dev/null || true
}
trap cleanup EXIT

if ! nc -z 127.0.0.1 33999 2>/dev/null; then
  mariadbd --datadir="$LT/db" --port=33999 --bind-address=127.0.0.1 \
    --character-set-collations=utf8mb4=uca1400_ai_ci \
    --socket="$LT/mariadb.sock" --pid-file="$LT/mariadb.pid" > "$LT/mariadb.log" 2>&1 &
  db_pid=$!; started_db=1
  for _ in $(seq 1 50); do nc -z 127.0.0.1 33999 2>/dev/null && break; sleep 0.2; done
fi

php "$ROOT/backend/bin/migrate.php"

if ! curl --silent --fail "$DYK_TEST_API/health" > /dev/null 2>&1; then
  PHP_CLI_SERVER_WORKERS=4 php -S 127.0.0.1:55438 -t "$ROOT/backend/public" "$ROOT/backend/public/api.php" > "$LT/php-test.log" 2>&1 &
  api_pid=$!; started_api=1
  for _ in $(seq 1 50); do curl --silent --fail "$DYK_TEST_API/health" > /dev/null 2>&1 && break; sleep 0.2; done
fi

suites="${*:-unit integration competition daily concurrency feeds content cleanup seo admin feedback cms}"
for s in $suites; do
  echo "== $s"
  php "$ROOT/backend/tests/$s.php" | tail -n 3
done
echo "ALL BACKEND SUITES PASSED"
