#!/bin/bash
# =============================================================================
# cron-diagnose.sh — TEMPORARY deep-dive for the pg_cron "ghost schema" case
#
# Read-only diagnostic (the one CREATE EXTENSION attempt is harmless/idempotent
# — if it succeeds it actually repairs the machine; if it fails it prints the
# real error that the migration's EXCEPTION WHEN OTHERS was swallowing).
#
# No DROP / destructive action here on purpose. Run it, paste the whole output.
# Intended to be deleted once the root cause is settled.
# =============================================================================

# Intentionally NOT using `set -e`: several queries are EXPECTED to error on a
# broken machine, and those errors ARE the diagnostic — we want every section to
# run and print, not abort on the first failure.

YELLOW='\033[1;33m'
NC='\033[0m'

CONTAINER="$(docker ps --format '{{.Names}}' | grep -E 'supabase_db' | head -n1)"

if [ -z "$CONTAINER" ]; then
  printf "No running Supabase Postgres container found. Start it: pnpm db:start\n"
  exit 1
fi

PSQL="docker exec $CONTAINER psql -U postgres -d postgres"

section() { printf "\n${YELLOW}=== %s ===${NC}\n" "$1"; }

section "0. Container + image tag"
docker inspect --format 'Container: {{.Name}}
Image:     {{.Config.Image}}' "$CONTAINER"

section "1. shared_preload_libraries (should include pg_cron)"
$PSQL -c "SHOW shared_preload_libraries;"

section "2. cron.database_name (should be 'postgres')"
$PSQL -c "SHOW cron.database_name;"

section "3. Is a 'cron' schema present, and who owns it? (ghost check)"
$PSQL -c "\dn cron"

section "4. Is the pg_cron extension registered? (expect a row if healthy)"
$PSQL -c "\dx pg_cron"

section "5. Is pg_cron available to install, and at what version?"
$PSQL -c "SELECT name, default_version, installed_version FROM pg_available_extensions WHERE name='pg_cron';"

section "6. Objects living inside the cron schema (empty = ghost schema)"
$PSQL -c "SELECT relname, relkind FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'cron' ORDER BY relname;"

section "7. THE error — attempt CREATE EXTENSION directly (full text)"
$PSQL -c "CREATE EXTENSION pg_cron;"

printf "\n${YELLOW}--- done. paste everything above ---${NC}\n"
