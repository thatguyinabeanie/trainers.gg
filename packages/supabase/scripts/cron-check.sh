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
#
# It also probes for the "ghost schema" case (a bare `cron` schema with no
# objects) that arises when pg_cron's setup hook aborted mid-way, leaving the
# namespace registered but the extension itself absent.
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_lib.sh
source "$SCRIPT_DIR/_lib.sh"

# Discover the running Supabase Postgres container by name (project-ref agnostic).
CONTAINER="$(discover_supabase_container)"

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
PRELOAD="$($PSQL -c "SHOW shared_preload_libraries;" || echo '<err>')"
EXT="$($PSQL -c "SELECT extversion FROM pg_extension WHERE extname='pg_cron';" || echo '<err>')"
CRON_DB="$($PSQL -c "SHOW cron.database_name;" || echo '<unset>')"
JOBS="$($PSQL -c "SELECT count(*) FROM cron.job;" || echo 'n/a')"

echo "Checks:"

case "$PRELOAD" in
  *pg_cron*) printf "  ${GREEN}✓${NC} shared_preload_libraries includes pg_cron\n" ;;
  '<err>')   printf "  ${RED}✗${NC} could not read shared_preload_libraries\n" ;;
  *)         printf "  ${RED}✗${NC} shared_preload_libraries is MISSING pg_cron  <- root cause\n" ;;
esac

if [ -n "$EXT" ] && [ "$EXT" != '<err>' ]; then
  printf "  ${GREEN}✓${NC} pg_cron extension installed (v%s)\n" "$EXT"
elif [ "$EXT" = '<err>' ]; then
  printf "  ${RED}✗${NC} could not query pg_extension\n"
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

# Ghost-schema probe: a bare `cron` namespace can exist even when the extension
# is absent (setup hook aborted mid-way). Show who owns it and what (if
# anything) lives inside — empty object list confirms the ghost case.
GHOST_OWNER="$($PSQL -c "SELECT n.nspowner::regrole::text FROM pg_namespace n WHERE n.nspname='cron';" || echo '')"
if [ -n "$GHOST_OWNER" ] && [ -z "$EXT" ]; then
  printf "  ${YELLOW}!${NC} 'cron' schema exists (owner: %s) but pg_cron extension is absent — ghost schema\n" "$GHOST_OWNER"
  CRON_OBJS="$($PSQL -c "SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='cron';" || echo '?')"
  printf "      objects in cron schema: %s\n" "$CRON_OBJS"
fi

# pg_available_extensions: show whether this image ships pg_cron at all.
AVAIL_VER="$($PSQL -c "SELECT default_version FROM pg_available_extensions WHERE name='pg_cron';" || echo '')"
if [ -n "$AVAIL_VER" ]; then
  printf "  ${GREEN}✓${NC} pg_cron available in this image (version %s)\n" "$AVAIL_VER"
else
  printf "  ${RED}✗${NC} pg_cron is NOT available in this image — update the CLI\n"
fi

echo ""
# Verdict: healthy ONLY when the extension is actually installed AND jobs exist.
# shared_preload_libraries containing pg_cron is necessary but NOT sufficient —
# the extension still has to be created during migration, which fails on older
# images whose migration role lacks EXECUTE on pg_read_file (the extension hook
# needs it), leaving the library preloaded but the extension uninstalled.
case "$PRELOAD" in
  *pg_cron*) PRELOADED=1 ;;
  *)         PRELOADED=0 ;;
esac

if [ -n "$EXT" ] && [ "$EXT" != '<err>' ] && [ "$JOBS" != "n/a" ]; then
  printf "${GREEN}Verdict: pg_cron is configured correctly.${NC}\n"
elif [ "$PRELOADED" = "1" ] && { [ -z "$EXT" ] || [ "$EXT" = '<err>' ]; }; then
  printf "${RED}Verdict: pg_cron is preloaded but the extension is NOT installed.${NC}\n"
  printf "  Cause: this image's migration role can't run the pg_cron setup hook\n"
  printf "         (permission denied for pg_read_file) — fixed in newer images.\n"
  printf "  Fix:   update the CLI (${YELLOW}pnpm supabase:update${NC}), then\n"
  printf "         ${YELLOW}pnpm db:stop && pnpm db:start && pnpm db:reset${NC}\n"
  exit 1
else
  printf "${RED}Verdict: this image does NOT preload pg_cron.${NC}\n"
  printf "  Fix: update the CLI (${YELLOW}pnpm supabase:update${NC}), then\n"
  printf "       ${YELLOW}pnpm db:stop && pnpm db:start && pnpm db:reset${NC}\n"
  exit 1
fi
