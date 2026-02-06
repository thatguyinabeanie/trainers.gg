#!/bin/bash
# Verify E2E test infrastructure and run tests
# Usage: ./scripts/verify-e2e-tests.sh [options]
#
# Options:
#   --local          Run tests against local dev server
#   --preview URL    Run tests against preview deployment URL
#   --check-only     Only check configuration, don't run tests

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
MODE="check"
PREVIEW_URL=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --local)
      MODE="local"
      shift
      ;;
    --preview)
      MODE="preview"
      PREVIEW_URL="$2"
      shift 2
      ;;
    --check-only)
      MODE="check"
      shift
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  E2E Test Infrastructure Verification${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# ── Check 1: Playwright installed ───────────────────────────────
echo -e "${YELLOW}[1/6]${NC} Checking Playwright installation..."
if pnpm --filter=@trainers/web exec playwright --version &>/dev/null; then
  PLAYWRIGHT_VERSION=$(pnpm --filter=@trainers/web exec playwright --version)
  echo -e "  ${GREEN}✓${NC} Playwright installed: $PLAYWRIGHT_VERSION"
else
  echo -e "  ${RED}✗${NC} Playwright not installed"
  echo "      Run: pnpm install"
  exit 1
fi
echo ""

# ── Check 2: Playwright browsers installed ──────────────────────
echo -e "${YELLOW}[2/6]${NC} Checking Playwright browsers..."
if [ -d "$HOME/.cache/ms-playwright" ]; then
  echo -e "  ${GREEN}✓${NC} Playwright browsers installed"
else
  echo -e "  ${YELLOW}⚠${NC} Playwright browsers not found"
  echo "      Run: pnpm --filter=@trainers/web exec playwright install chromium"
  exit 1
fi
echo ""

# ── Check 3: E2E test files ──────────────────────────────────────
echo -e "${YELLOW}[3/6]${NC} Checking E2E test files..."
TEST_COUNT=$(find apps/web/e2e/tests -name "*.spec.ts" 2>/dev/null | wc -l | tr -d ' ')
if [ "$TEST_COUNT" -gt 0 ]; then
  echo -e "  ${GREEN}✓${NC} Found $TEST_COUNT E2E test files"
  echo "      Files:"
  find apps/web/e2e/tests -name "*.spec.ts" 2>/dev/null | sed 's/^/        - /'
else
  echo -e "  ${RED}✗${NC} No E2E test files found"
  exit 1
fi
echo ""

# ── Check 4: Auth fixtures ───────────────────────────────────────
echo -e "${YELLOW}[4/6]${NC} Checking auth fixtures..."
if [ -f "apps/web/e2e/fixtures/auth.ts" ] && [ -f "apps/web/e2e/fixtures/auth-bypass.ts" ]; then
  echo -e "  ${GREEN}✓${NC} Auth fixtures present"
  echo "      - auth.ts (real auth)"
  echo "      - auth-bypass.ts (mock auth)"
else
  echo -e "  ${RED}✗${NC} Auth fixtures missing"
  exit 1
fi
echo ""

# ── Check 5: Proxy E2E bypass ────────────────────────────────────
echo -e "${YELLOW}[5/6]${NC} Checking proxy E2E bypass..."
if grep -q "E2E_AUTH_BYPASS_SECRET" apps/web/src/proxy.ts 2>/dev/null; then
  echo -e "  ${GREEN}✓${NC} Proxy has E2E bypass support"

  # Check if bypass secret is set
  if [ -n "$E2E_AUTH_BYPASS_SECRET" ]; then
    echo -e "      ${GREEN}✓${NC} E2E_AUTH_BYPASS_SECRET is set"
  else
    echo -e "      ${YELLOW}⚠${NC} E2E_AUTH_BYPASS_SECRET not set (tests will use real auth)"
  fi
else
  echo -e "  ${RED}✗${NC} Proxy E2E bypass not found"
  exit 1
fi
echo ""

# ── Check 6: Supabase configuration ──────────────────────────────
echo -e "${YELLOW}[6/6]${NC} Checking Supabase configuration..."
if [ -n "$NEXT_PUBLIC_SUPABASE_URL" ]; then
  echo -e "  ${GREEN}✓${NC} NEXT_PUBLIC_SUPABASE_URL is set"
  echo "      URL: $NEXT_PUBLIC_SUPABASE_URL"
else
  echo -e "  ${YELLOW}⚠${NC} NEXT_PUBLIC_SUPABASE_URL not set"
fi

if [ -n "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
  echo -e "  ${GREEN}✓${NC} NEXT_PUBLIC_SUPABASE_ANON_KEY is set"
else
  echo -e "  ${YELLOW}⚠${NC} NEXT_PUBLIC_SUPABASE_ANON_KEY not set"
fi
echo ""

# ── Summary ───────────────────────────────────────────────────────
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓ All checks passed!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# ── Run tests if requested ────────────────────────────────────────
if [ "$MODE" = "check" ]; then
  echo "Configuration check complete. Use --local or --preview to run tests."
  exit 0
fi

if [ "$MODE" = "local" ]; then
  echo -e "${BLUE}Running E2E tests against local dev server...${NC}"
  echo ""

  # Check if dev server is running
  if ! curl -s http://localhost:3000 >/dev/null 2>&1; then
    echo -e "${RED}✗ Local dev server not running${NC}"
    echo "  Start dev server in another terminal:"
    echo "    pnpm dev:web+backend"
    exit 1
  fi

  echo -e "${GREEN}✓ Dev server is running${NC}"
  echo ""

  # Run tests
  export PLAYWRIGHT_BASE_URL="http://localhost:3000"
  pnpm --filter=@trainers/web exec playwright test "$@"

elif [ "$MODE" = "preview" ]; then
  if [ -z "$PREVIEW_URL" ]; then
    echo -e "${RED}✗ Preview URL required${NC}"
    echo "  Usage: $0 --preview <URL>"
    exit 1
  fi

  echo -e "${BLUE}Running E2E tests against preview deployment...${NC}"
  echo "  URL: $PREVIEW_URL"
  echo ""

  # Check if preview is accessible
  if ! curl -s "$PREVIEW_URL" >/dev/null 2>&1; then
    echo -e "${RED}✗ Preview deployment not accessible${NC}"
    exit 1
  fi

  echo -e "${GREEN}✓ Preview deployment is accessible${NC}"
  echo ""

  # Run tests
  export PLAYWRIGHT_BASE_URL="$PREVIEW_URL"
  pnpm --filter=@trainers/web exec playwright test "$@"
fi

echo ""
echo -e "${GREEN}✓ Tests complete!${NC}"
