#!/bin/sh
# Rebuilds a throwaway database from every migration, then runs the behaviour tests.
# Needs: a local Postgres 15+ you can create databases on, Python 3 + psycopg 3.
#   pip install "psycopg[binary]"
#   PGHOST=localhost PGPORT=5432 PGUSER=postgres ./supabase/tests/run_tests.sh
# NEVER point this at your real Supabase project: it drops the test database.
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
DB=${DYK_TEST_DB:-dyk_test}
P="psql -v ON_ERROR_STOP=1 -q"
$P -d postgres -c "drop database if exists $DB" -c "create database $DB" >/dev/null 2>&1
$P -d "$DB" -f "$HERE/supabase_shim.sql"
for f in "$HERE"/../migrations/0*.sql; do $P -d "$DB" -f "$f" 2>&1 | grep -v NOTICE || true; done
DYK_TEST_DSN="host=${PGHOST:-localhost} port=${PGPORT:-5432} user=${PGUSER:-postgres} dbname=$DB" \
  python3 "$HERE/test_game.py"
