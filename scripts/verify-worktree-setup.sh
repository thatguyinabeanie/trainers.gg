#!/bin/bash
# Verification script for worktree port allocation system

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[verify]${NC} $1"; }
log_success() { echo -e "${GREEN}[verify]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[verify]${NC} $1"; }
log_error() { echo -e "${RED}[verify]${NC} $1"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

log_info "Verifying worktree setup implementation..."

# Check if required files exist
log_info "Checking required files..."
REQUIRED_FILES=(
  "packages/utils/src/ports.ts"
  "scripts/worktree-registry.ts"
  "scripts/setup-worktree-env.ts"
  "scripts/dev-with-ports.ts"
  "scripts/cleanup-worktree-ports.ts"
  "docs/worktree-setup.md"
)

for file in "${REQUIRED_FILES[@]}"; do
  if [ -f "$ROOT_DIR/$file" ]; then
    log_success "✓ $file"
  else
    log_error "✗ $file (missing)"
    exit 1
  fi
done

# Check if port utilities export correctly
log_info "Checking port utilities export..."
if grep -q "ports.ts" "$ROOT_DIR/packages/utils/src/index.ts"; then
  log_success "✓ Port utilities exported from @trainers/utils"
else
  log_error "✗ Port utilities not exported"
  exit 1
fi

# Check if tsx is installed
log_info "Checking tsx installation..."
if grep -q '"tsx"' "$ROOT_DIR/package.json"; then
  log_success "✓ tsx installed"
else
  log_error "✗ tsx not installed"
  exit 1
fi

# Check if dev scripts updated
log_info "Checking dev script updates..."
if grep -q "dev-with-ports.ts" "$ROOT_DIR/apps/web/package.json"; then
  log_success "✓ Web app dev script updated"
else
  log_warn "⚠ Web app dev script not updated"
fi

if grep -q "dev-with-ports.ts" "$ROOT_DIR/apps/mobile/package.json"; then
  log_success "✓ Mobile app dev script updated"
else
  log_warn "⚠ Mobile app dev script not updated"
fi

# Check if metro.config supports dynamic port
log_info "Checking Metro config..."
if grep -q "EXPO_PORT" "$ROOT_DIR/apps/mobile/metro.config.cjs"; then
  log_success "✓ Metro config supports dynamic ports"
else
  log_warn "⚠ Metro config not updated"
fi

# Check if PDS docker-compose supports dynamic port
log_info "Checking PDS docker-compose..."
if grep -q 'PDS_PORT:-' "$ROOT_DIR/infra/pds/docker-compose.yml"; then
  log_success "✓ PDS docker-compose supports dynamic ports"
else
  log_warn "⚠ PDS docker-compose not updated"
fi

# Check if .gitignore includes registry
log_info "Checking .gitignore..."
if grep -q "worktree-ports.json" "$ROOT_DIR/.gitignore"; then
  log_success "✓ Registry file gitignored"
else
  log_warn "⚠ Registry file not gitignored"
fi

# Check if package.json has new scripts
log_info "Checking package.json scripts..."
if grep -q '"dev:setup"' "$ROOT_DIR/package.json"; then
  log_success "✓ dev:setup script added"
else
  log_error "✗ dev:setup script missing"
  exit 1
fi

if grep -q '"cleanup-ports"' "$ROOT_DIR/package.json"; then
  log_success "✓ cleanup-ports script added"
else
  log_error "✗ cleanup-ports script missing"
  exit 1
fi

# Try running the setup script
log_info "Testing setup script..."
if pnpm exec tsx "$ROOT_DIR/scripts/setup-worktree-env.ts" > /dev/null 2>&1; then
  log_success "✓ setup-worktree-env.ts runs successfully"
else
  log_error "✗ setup-worktree-env.ts failed"
  exit 1
fi

# Try running the cleanup script
log_info "Testing cleanup script..."
if pnpm exec tsx "$ROOT_DIR/scripts/cleanup-worktree-ports.ts" > /dev/null 2>&1; then
  log_success "✓ cleanup-worktree-ports.ts runs successfully"
else
  log_error "✗ cleanup-worktree-ports.ts failed"
  exit 1
fi

# Check if registry exists
if [ -f "$ROOT_DIR/scripts/worktree-ports.json" ]; then
  log_success "✓ Port registry created"
  log_info "Registry contents:"
  cat "$ROOT_DIR/scripts/worktree-ports.json" | head -20
else
  log_warn "⚠ Port registry not created (will be created on first run)"
fi

echo ""
log_success "✅ All verification checks passed!"
log_info "Worktree port allocation system is ready to use."
echo ""
log_info "Next steps:"
echo "  1. Create a test worktree: git worktree add ../test-worktree main"
echo "  2. Install dependencies: cd ../test-worktree && pnpm install"
echo "  3. Start dev server: pnpm dev"
echo "  4. Verify unique ports are allocated"
echo ""
