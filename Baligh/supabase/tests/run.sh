#!/usr/bin/env bash
# Runs the schema + RLS tests against a THROWAWAY Postgres database (never Supabase prod).
# Usage: TEST_DATABASE_URL=postgres://postgres@localhost:5432/postgres npm run test:db
set -euo pipefail
: "${TEST_DATABASE_URL:?Set TEST_DATABASE_URL to a disposable Postgres database}"
DB="balligh_test_$$"
psql "$TEST_DATABASE_URL" -q -c "create database $DB"
trap 'psql "$TEST_DATABASE_URL" -q -c "drop database if exists $DB" >/dev/null' EXIT
URL="${TEST_DATABASE_URL%/*}/$DB"
for f in supabase/tests/supabase-stub.sql supabase/migrations/*.sql supabase/seed.sql supabase/tests/rls.test.sql; do
  psql "$URL" -q -v ON_ERROR_STOP=1 -f "$f"
done
