#!/usr/bin/env bash
#
# ci-local.sh — run the locally-reproducible CI checks in parallel.
#
# WHY THIS EXISTS
#   GitHub Actions can be unavailable (e.g. an org billing/spending-limit block
#   fails every run in ~6s before any job starts). This script reproduces every
#   CI check that does NOT require the Vercel preview + Supabase branch + repo
#   secrets, so you can verify a branch is green locally and merge with
#   confidence while Actions is down.
#
# WHAT IT RUNS  (mirrors .github/workflows/ci.yml)
#   • Lint + Typecheck + Tests (web, mobile, packages)  — one `turbo run`
#       invocation; turbo schedules them across the whole package graph in
#       parallel and caches results, so re-runs only redo what changed.
#   • Deno check (edge functions)                        — not a turbo task, so
#       it runs concurrently in the background alongside the turbo run.
#
# SUPABASE DB-INTEGRATION TESTS
#   @trainers/supabase has tests guarded by isSupabaseRunning() that need a live
#   local Supabase DB. CI's unit-test jobs have no DB, so those tests SKIP there.
#   By default this script reproduces that: it points the Supabase env at a
#   non-local sentinel so the same tests skip (jest.setup keeps existing env
#   values, and isSupabaseRunning() only treats 127.0.0.1/localhost as "running").
#   Pass --with-db to instead run them against your live local DB (`pnpm dev`).
#
# WHAT IT CANNOT RUN  (needs a live Vercel preview + Supabase branch + secrets)
#   • E2E Tests, Lighthouse, Bundle Analysis, Wait-for-Preview — reported SKIPPED.
#
# USAGE
#   pnpm ci:local                      # everything (DB-integration tests skip, like CI)
#   pnpm ci:local --with-db            # also run supabase DB tests vs your local DB
#   CI=true pnpm ci:local              # also enforce jest coverage like CI does
#   pnpm ci:local --filter=@trainers/web   # scope the turbo run to one package
#
# Non-flag args are forwarded to the `turbo run` invocation (e.g. --filter=...).

set -uo pipefail

# --- repo root (script lives in <root>/scripts) ----------------------------
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# --- parse our own flags; forward the rest to turbo ------------------------
WITH_DB=0
TURBO_ARGS=()
for arg in "$@"; do
  case "$arg" in
    --with-db) WITH_DB=1 ;;
    *) TURBO_ARGS+=("$arg") ;;
  esac
done

# --- pretty output (degrade gracefully when not a TTY) ----------------------
if [ -t 1 ] && command -v tput >/dev/null 2>&1; then
  BOLD="$(tput bold)"; RED="$(tput setaf 1)"; GREEN="$(tput setaf 2)"
  YELLOW="$(tput setaf 3)"; DIM="$(tput dim)"; RESET="$(tput sgr0)"
else
  BOLD=""; RED=""; GREEN=""; YELLOW=""; DIM=""; RESET=""
fi

LOG_DIR="$(mktemp -d)"
trap 'rm -rf "$LOG_DIR"' EXIT

echo "${BOLD}▶ Local CI — reproducing GitHub Actions checks (parallel)${RESET}"
echo "${DIM}  repo: $ROOT${RESET}"

# --- mirror CI's "no local Supabase" so DB-integration tests skip ----------
if [ "$WITH_DB" -eq 0 ]; then
  # jest.setup parses .env but existing env values win; a non-local URL makes
  # isSupabaseRunning() false → the DB-guarded supabase tests describe.skip,
  # exactly as in CI. Other suites mock the supabase client, so the value is inert.
  export NEXT_PUBLIC_SUPABASE_URL="https://ci-local.invalid"
  export SUPABASE_SERVICE_ROLE_KEY="ci-local-skip"
  DB_NOTE="skipped — mirrors CI (pass --with-db to run vs your local DB)"
else
  DB_NOTE="ran against your live local Supabase (--with-db)"
fi
echo "${DIM}  supabase DB-integration tests: $DB_NOTE${RESET}"
echo

# --- 1) Deno edge-function check (background; not a turbo task) -------------
# Mirrors ci.yml deno-check exactly. Skips (does not fail) when deno is absent.
DENO_STATUS="skip"
DENO_PID=""
if command -v deno >/dev/null 2>&1; then
  echo "${DIM}  starting: deno check (edge functions) in background…${RESET}"
  (
    find packages/supabase/supabase/functions \
      -mindepth 2 -maxdepth 2 -name index.ts -not -path '*/api-*' \
      -exec deno check \
        --config packages/supabase/supabase/functions/deno.json \
        --sloppy-imports {} +
  ) >"$LOG_DIR/deno.log" 2>&1 &
  DENO_PID=$!
else
  echo "${YELLOW}  deno not installed — skipping edge-function check${RESET}"
fi

# --- 2) Lint + Typecheck + Tests via turbo (foreground, live output) --------
# One invocation so turbo's scheduler parallelizes across the full graph and
# shares its cache — running separate concurrent `turbo run` calls would
# contend on the daemon/cache, so we let turbo do the fan-out itself.
echo "${BOLD}── turbo run lint typecheck test ──${RESET}"
# `${arr[@]+"${arr[@]}"}` is the set -u-safe empty-array expansion — macOS ships
# bash 3.2, where a bare "${arr[@]}" on an empty array aborts with "unbound variable".
pnpm turbo run lint typecheck test ${TURBO_ARGS[@]+"${TURBO_ARGS[@]}"}
TURBO_STATUS=$?

# --- collect the backgrounded deno result ----------------------------------
if [ -n "$DENO_PID" ]; then
  wait "$DENO_PID"
  if [ $? -eq 0 ]; then DENO_STATUS="pass"; else DENO_STATUS="fail"; fi
fi

# --- summary ----------------------------------------------------------------
pass() { echo "  ${GREEN}✓${RESET} $1"; }
fail() { echo "  ${RED}✗${RESET} $1"; }
skip() { echo "  ${YELLOW}–${RESET} $1 ${DIM}($2)${RESET}"; }

echo
echo "${BOLD}── summary ──${RESET}"

if [ "$TURBO_STATUS" -eq 0 ]; then
  pass "Lint, Typecheck, Test (web · mobile · packages) ${DIM}[turbo]${RESET}"
else
  fail "Lint / Typecheck / Test — see the failing ${BOLD}package:task${RESET} in the turbo output above"
fi

case "$DENO_STATUS" in
  pass) pass "Deno Check (edge functions)" ;;
  fail) fail "Deno Check (edge functions) — see output:"; sed 's/^/      /' "$LOG_DIR/deno.log" ;;
  skip) skip "Deno Check (edge functions)" "deno not installed" ;;
esac

skip "Supabase DB-integration tests" "$DB_NOTE"
skip "E2E Tests"       "needs Vercel preview + Supabase branch + secrets"
skip "Lighthouse"      "needs Vercel preview + secrets"
skip "Bundle Analysis" "needs Vercel remote cache + secrets"

echo
# Overall: fail if any check that actually ran failed (deno=skip does not fail).
if [ "$TURBO_STATUS" -ne 0 ] || [ "$DENO_STATUS" = "fail" ]; then
  echo "${RED}${BOLD}✗ Local CI FAILED${RESET}"
  exit 1
fi
echo "${GREEN}${BOLD}✓ Local CI passed${RESET} ${DIM}(E2E/Lighthouse/Bundle still need real CI)${RESET}"
