#!/bin/bash
set -e

# =============================================================================
# ensure-cron.sh — install pg_cron + schedule jobs on every local DB bring-up
#
# WHY THIS EXISTS
# pg_cron can only be created by a SUPERUSER (the setup hook calls pg_read_file,
# which needs elevated privilege). Supabase applies migrations as the `postgres`
# role, which on current local images is NOT a superuser — so a migration-time
# `CREATE EXTENSION pg_cron` fails ("permission denied for function
# pg_read_file"), gets swallowed, and the cron schema/jobs never appear. The
# only local superuser is `supabase_admin`. This script runs the extension +
# scheduling AS supabase_admin, right after the DB boots, so a plain
#   clone → pnpm install → pnpm db:start → pnpm dev
# yields working cron with no extra step.
#
# Idempotent: schedules via cron.schedule(), which UPSERTs by (jobname, owner).
# Re-runs update jobs in place rather than duplicating — so we deliberately do
# NOT DELETE/unschedule first (a single owner = no duplicate jobnames). Reuses
# the import-tick migration file verbatim as the single source of truth.
# =============================================================================

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'

# Skip where there is no local DB (CI/preview build the DB differently).
if [ -n "$CI" ] || [ -n "$VERCEL" ] || [ -n "$GITHUB_ACTIONS" ] || [ -n "$SKIP_LOCAL_SUPABASE" ]; then
  exit 0
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SUPABASE_DIR="$(dirname "$SCRIPT_DIR")"
MIGRATION_FILE="$SUPABASE_DIR/supabase/migrations/20260611014924_schedule_import_tick_crons.sql"

CONTAINER="$(docker ps --format '{{.Names}}' | grep -E 'supabase_db' | head -n1)"
if [ -z "$CONTAINER" ]; then
  printf "${YELLOW}[ensure-cron] No local Supabase DB container — skipping.${NC}\n"
  exit 0
fi

# supabase_admin is the local superuser; postgres can't create pg_cron.
# Some local images (e.g. postgres:17.6.1.063) require a PASSWORD for
# supabase_admin instead of trust auth — without it the connection fails and the
# whole step silently no-ops. The local Supabase superuser password is the
# project's db password (default "postgres"); allow override via env for safety.
# Export PGPASSWORD and pass only the NAME to `docker exec -e` (Docker reads the
# value from this script's environment). Injecting `-e PGPASSWORD=$PGPASS`
# inline would split/break on a password containing spaces or shell-special chars.
export PGPASSWORD="${SUPABASE_DB_PASSWORD:-postgres}"
PSQL_ADMIN="docker exec -i -e PGPASSWORD $CONTAINER psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1"

# Read-only probes run as `postgres` (trust auth on every image, so they never
# fail to connect). Only the privileged CREATE EXTENSION needs supabase_admin.
PSQL_RO="docker exec $CONTAINER psql -U postgres -d postgres -tA"

# If the image doesn't even ship pg_cron, skip gracefully (no local cron).
AVAILABLE="$($PSQL_RO -c "SELECT 1 FROM pg_available_extensions WHERE name='pg_cron';")"
if [ -z "$AVAILABLE" ]; then
  printf "${YELLOW}[ensure-cron] pg_cron not available in this image — skipping (no local cron).${NC}\n"
  exit 0
fi

# supabase_admin is the local superuser — the ONLY role that can create pg_cron.
# But scheduling runs as `postgres` (the same role migrations use): cron.schedule()
# upserts by (jobname, username), so re-runs update in place and never duplicate.
# Mixing owners (admin + postgres) is the ONLY way to get duplicate jobnames, so we
# deliberately keep a single owner (postgres) and avoid DELETE on cron.job entirely
# (a cross-owner DELETE can raise "dependent privileges exist" on some images).
PSQL_PG="docker exec -i $CONTAINER psql -U postgres -d postgres -v ON_ERROR_STOP=1"

# Anything below failing should be LOUD but must not break `pnpm db:start`/`dev`.
# (cron is a dev convenience; a hiccup shouldn't block the whole stack coming up.)
run_install() {
  # 1. Create the extension AS the superuser (postgres cannot — the setup hook
  #    needs pg_read_file). Supabase's grant_pg_cron_access event trigger then
  #    grants postgres the cron access it needs to schedule in step 2/3.
  #
  #    Guard on absence: calling CREATE EXTENSION when pg_cron ALREADY exists
  #    re-runs Supabase's after-create hook, whose internal
  #    `revoke all on table cron.job from postgres` then fails with "dependent
  #    privileges exist" (the grants it's revoking now have grant-option deps).
  #    So only create when truly missing — otherwise skip straight to scheduling.
  # `|| return 1` on each psql step: run_install is called as `if run_install`,
  # which suspends `set -e` inside the function — without these guards an early
  # step's failure would neither abort nor fail the function (the function would
  # return the LAST step's status), silently masking it. Returning non-zero here
  # routes failures through the `else` branch that prints the diagnostics. The
  # psql errors themselves still surface on stderr.
  local has_ext
  has_ext="$($PSQL_RO -c "SELECT 1 FROM pg_extension WHERE extname='pg_cron';")"
  if [ -z "$has_ext" ]; then
    $PSQL_ADMIN -c "CREATE EXTENSION pg_cron;" || return 1
  fi

  # 2. Replay the import-tick schedule migration AS postgres (single source of
  #    truth for those three jobs). The extension now exists so the migration's
  #    pg_extension guard passes; cron.schedule upserts by (jobname, postgres).
  $PSQL_PG < "$MIGRATION_FILE" || return 1

  # 3. Schedule the no-show job AS postgres (function created by 20260220250000).
  #    Runs the same schedule (jobname, cron expr, function) the migration uses —
  #    cron.schedule upserts by (jobname, username), so re-runs update in place.
  $PSQL_PG -c \
    "SELECT cron.schedule('no-show-escalation','* * * * *',\$\$SELECT public.check_no_show_escalation()\$\$);" || return 1
}

if run_install; then
  printf "${GREEN}[ensure-cron] pg_cron ready — import-tick + no-show jobs scheduled.${NC}\n"
else
  printf "${RED}[ensure-cron] FAILED to install pg_cron (see error above).${NC}\n"
  printf "${RED}[ensure-cron] Boot continues; run 'pnpm db:cron-check' to inspect.${NC}\n"
  # Propagate the real failure status instead of masking it with exit 0. Callers
  # that want boot to continue regardless can ignore this exit code themselves;
  # silently reporting success hid genuine install failures (Error Visibility rule).
  exit 1
fi

# -----------------------------------------------------------------------------
# Revoke GraphQL EXECUTE from PUBLIC (local enforcement of 20260617142717)
# -----------------------------------------------------------------------------
# Like pg_cron, this is a supabase_admin operation migrations can't do locally:
# pg_graphql grants EXECUTE on graphql.resolve to PUBLIC, and the local migration
# role (non-superuser postgres) cannot revoke another role's PUBLIC grant. The
# migration is the hosted path; here we run the same REVOKE as supabase_admin so
# local matches prod (anon/authenticated lose EXECUTE; service_role keeps it).
# Loops over overloads by oid so no signature is hard-coded. Best-effort — a
# failure here must not block the stack coming up, so it does not affect exit 0.
$PSQL_ADMIN <<'SQL' || printf "${YELLOW}[ensure-cron] GraphQL EXECUTE revoke skipped (see error above) — continuing.${NC}\n"
DO $$
DECLARE
  fn regprocedure;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'graphql' AND p.proname = 'resolve'
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
  END LOOP;
END $$;
SQL

exit 0
