#!/bin/bash
set -e

# =============================================================================
# cron-check.sh — verify pg_cron is configured correctly in the local DB
#
# pg_cron must be preloaded via shared_preload_libraries at server startup —
# you cannot enable it at runtime. Different supabase/postgres image tags differ
# in whether they preload it, so a machine whose CLI resolved an older image can
# end up without the `cron` schema, which aborts the cron migrations on db:reset
# ("schema cron does not exist"). This script reports the ground truth.
# =============================================================================

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Discover the running Supabase Postgres container by name (project-ref agnostic).
CONTAINER="$(docker ps --format '{{.Names}}' | grep -E 'supabase_db' | head -n1)"

if [ -z "$CONTAINER" ]; then
  printf "${RED}✗ No running Supabase Postgres container found.${NC}\n"
  printf "  Start it first: ${YELLOW}pnpm db:start${NC}\n"
  exit 1
fi

IMAGE="$(docker inspect --format '{{.Config.Image}}' "$CONTAINER")"
printf "Container: %s\n" "$CONTAINER"
printf "Image:     %s\n\n" "$IMAGE"

PSQL="docker exec $CONTAINER psql -U postgres -d postgres -tA"

# Capture each check. The cron.database_name and cron.job reads ERROR when
# pg_cron is absent — that error is the diagnostic, so fall back to a marker
# value (psql still prints its error to stderr, which we keep visible).
PRELOAD="$($PSQL -c "SHOW shared_preload_libraries;")"
EXT="$($PSQL -c "SELECT extversion FROM pg_extension WHERE extname='pg_cron';")"
CRON_DB="$($PSQL -c "SHOW cron.database_name;" || echo '<unset>')"
JOBS="$($PSQL -c "SELECT count(*) FROM cron.job;" || echo 'n/a')"

echo "Checks:"

case "$PRELOAD" in
  *pg_cron*) printf "  ${GREEN}✓${NC} shared_preload_libraries includes pg_cron\n" ;;
  *)         printf "  ${RED}✗${NC} shared_preload_libraries is MISSING pg_cron  <- root cause\n" ;;
esac

if [ -n "$EXT" ]; then
  printf "  ${GREEN}✓${NC} pg_cron extension installed (v%s)\n" "$EXT"
else
  printf "  ${RED}✗${NC} pg_cron extension NOT installed\n"
fi

printf "      cron.database_name = %s\n" "$CRON_DB"

if [ "$JOBS" = "n/a" ]; then
  printf "  ${RED}✗${NC} cron schema absent — no jobs scheduled\n"
else
  printf "  ${GREEN}✓${NC} %s cron job(s) scheduled:\n" "$JOBS"
  $PSQL -c "SELECT '      ' || jobname || '  ' || schedule || '  active=' || active FROM cron.job ORDER BY jobname;"
fi

echo ""
case "$PRELOAD" in
  *pg_cron*)
    printf "${GREEN}Verdict: pg_cron is configured correctly.${NC}\n"
    ;;
  *)
    printf "${RED}Verdict: this image does NOT preload pg_cron.${NC}\n"
    printf "  Fix: get this machine onto an image that preloads it —\n"
    printf "       update the CLI (${YELLOW}pnpm supabase:update${NC}), then\n"
    printf "       ${YELLOW}pnpm db:stop && pnpm db:start && pnpm db:reset${NC}\n"
    exit 1
    ;;
esac
