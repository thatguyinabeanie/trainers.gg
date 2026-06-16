#!/bin/bash
set -euo pipefail

# =============================================================================
# db-advisor.sh — run Supabase's Security Advisor lints against the LOCAL DB.
#
# Supabase's dashboard "Security Advisor" / "Performance Advisor" is powered by
# the open-source `splinter` lint ruleset — a single SQL query that UNION ALLs
# ~27 checks (RLS disabled, SECURITY DEFINER views, mutable function
# search_path, exposed auth.users, sensitive columns, etc.). The Supabase CLI
# has NO command for this: `supabase db lint` (pnpm db:lint) is a *schema
# typing* linter, not the advisor. So we vendor splinter.sql and run it here.
#
# Vendored pristine from https://github.com/supabase/splinter (splinter.sql).
# To update: re-fetch scripts/splinter.sql from that source.
# =============================================================================

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SPLINTER_SQL="$SCRIPT_DIR/splinter.sql"

if [ ! -f "$SPLINTER_SQL" ]; then
  printf "${RED}✗ Missing %s — re-fetch from https://github.com/supabase/splinter${NC}\n" "$SPLINTER_SQL"
  exit 1
fi

CONTAINER="$(docker ps --format '{{.Names}}' | grep -E 'supabase_db' | head -n1)"
if [ -z "$CONTAINER" ]; then
  printf "${RED}✗ No running Supabase Postgres container found.${NC}\n"
  printf "  Start it first: ${YELLOW}pnpm db:start${NC}\n"
  exit 1
fi

# Schemas exposed through the API. Several lints are scoped to pgrst.db_schemas
# (read via current_setting); without it they silently return zero rows.
SCHEMAS="${ADVISOR_SCHEMAS:-public}"

printf "Running Supabase Security Advisor lints (splinter) on %s [schemas: %s]\n\n" "$CONTAINER" "$SCHEMAS"

# splinter.sql is a parenthesized `( with ... select ... )` CTE expression
# prefixed by its own `set local search_path = ''`. `set local` requires a
# transaction, so we open one and set the required GUCs (search_path + the
# pgrst.db_schemas custom GUC that several lints read via current_setting).
#
# The splinter query is a top-level CTE — it cannot be wrapped in a
# FROM (...) AS s subquery (PostgreSQL forbids WITH inside subquery
# expressions), so we materialize it into a temp view instead. That lets us
# project just the columns worth scanning and order findings ERROR > WARN >
# INFO (splinter's own column dump includes noisy metadata/cache_key JSON and
# leads with INFO performance rows). `\pset format wrapped` keeps `detail`
# readable in a terminal.
{
  echo "begin;"
  echo "set local search_path = '';"
  echo "set local pgrst.db_schemas = '${SCHEMAS}';"
  echo "create temp view _advisor_lints as"
  grep -v '^set local search_path' "$SPLINTER_SQL"
  echo ";"
  echo "\\pset format wrapped"
  echo "select level, name, detail, remediation from _advisor_lints"
  echo "  order by array_position(array['ERROR','WARN','INFO']::text[], level), name;"
  echo "\\echo '— summary —'"
  echo "select level, count(*) as findings from _advisor_lints"
  echo "  group by level order by array_position(array['ERROR','WARN','INFO']::text[], level);"
  echo "commit;"
} | docker exec -i "$CONTAINER" psql -U postgres -d postgres -P pager=off
