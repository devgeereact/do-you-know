#!/bin/sh
# Rebuilds a throwaway database from every migration, then runs the behaviour tests.
# Needs: a local Postgres 15+ you can create databases on, Python 3 + psycopg 3.
#   pip install "psycopg[binary]"
#   PGHOST=localhost PGPORT=5432 PGUSER=postgres ./supabase/tests/run_tests.sh
# NEVER point this at your real Supabase project: it drops the test database.
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
DB=${DYK_TEST_DB:-dyk_test}
case "$DB" in
  dyk_test|dyk_test_[a-zA-Z0-9_]*) ;;
  *) echo 'Use dyk_test or a dyk_test_ prefixed scratch database.' >&2; exit 1 ;;
esac
case "$DB" in *[!a-zA-Z0-9_]*) echo 'Invalid scratch database name.' >&2; exit 1 ;; esac
case "${PGHOST:-localhost}" in
  localhost|127.0.0.1|::1|/*) ;;
  *) echo 'The test runner only accepts a local scratch Postgres.' >&2; exit 1 ;;
esac
export PGHOST=${PGHOST:-localhost}
export PGPORT=${PGPORT:-5432}
export PGUSER=${PGUSER:-postgres}
# Do not let libpq service/host overrides redirect a disposable test run.
unset PGHOSTADDR PGSERVICE PGSERVICEFILE PGDATABASE
P="psql -v ON_ERROR_STOP=1 -q"
$P -d postgres -c "drop database if exists \"$DB\"" -c "create database \"$DB\""
$P -d "$DB" -f "$HERE/supabase_shim.sql"
for f in "$HERE"/../migrations/0*.sql; do
  $P -d "$DB" -f "$f"
done
DYK_TEST_DSN="host=${PGHOST:-localhost} port=${PGPORT:-5432} user=${PGUSER:-postgres} dbname=$DB" \
  python3 "$HERE/test_game.py"
