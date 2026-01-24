#!/bin/bash
# =============================================================================
# trainers.gg PDS Full Deployment Script
# =============================================================================
# This script deploys the Bluesky PDS to Fly.io, configures DNS via Vercel,
# sets up SSL certificates, and configures Supabase edge functions.
#
# Prerequisites:
#   - fly CLI installed and logged in (brew install flyctl && fly auth login)
#   - vercel CLI installed and logged in (npm i -g vercel && vercel login)
#   - supabase CLI installed and logged in (brew install supabase/tap/supabase && supabase login)
#   - jq installed (brew install jq)
#
# Usage:
#   ./deploy.sh [--skip-fly] [--skip-dns] [--skip-supabase]
#
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
FLY_APP_NAME="trainers-pds"
FLY_REGION="sjc"
DOMAIN="trainers.gg"
PDS_HOSTNAME="pds.${DOMAIN}"
VOLUME_SIZE_GB=10

# Parse arguments
SKIP_FLY=false
SKIP_DNS=false
SKIP_SUPABASE=false

for arg in "$@"; do
  case $arg in
    --skip-fly) SKIP_FLY=true ;;
    --skip-dns) SKIP_DNS=true ;;
    --skip-supabase) SKIP_SUPABASE=true ;;
    --help|-h)
      echo "Usage: ./deploy.sh [--skip-fly] [--skip-dns] [--skip-supabase]"
      exit 0
      ;;
  esac
done

# -----------------------------------------------------------------------------
# Helper Functions
# -----------------------------------------------------------------------------

log_step() {
  echo -e "\n${BLUE}==>${NC} ${1}"
}

log_success() {
  echo -e "${GREEN}✓${NC} ${1}"
}

log_warning() {
  echo -e "${YELLOW}⚠${NC} ${1}"
}

log_error() {
  echo -e "${RED}✗${NC} ${1}"
}

check_command() {
  if ! command -v "$1" &> /dev/null; then
    log_error "$1 is not installed. Please install it first."
    exit 1
  fi
}

# -----------------------------------------------------------------------------
# Preflight Checks
# -----------------------------------------------------------------------------

log_step "Running preflight checks..."

check_command "fly"
check_command "jq"

if [ "$SKIP_DNS" = false ]; then
  check_command "vercel"
fi

if [ "$SKIP_SUPABASE" = false ]; then
  check_command "supabase"
fi

# Check fly auth
if ! fly auth whoami &> /dev/null; then
  log_error "Not logged into Fly.io. Run: fly auth login"
  exit 1
fi
log_success "Fly.io authenticated"

# Check vercel auth
if [ "$SKIP_DNS" = false ]; then
  if ! vercel whoami &> /dev/null 2>&1; then
    log_error "Not logged into Vercel. Run: vercel login"
    exit 1
  fi
  log_success "Vercel authenticated"
fi

# Check supabase auth
if [ "$SKIP_SUPABASE" = false ]; then
  if ! supabase projects list &> /dev/null 2>&1; then
    log_warning "Supabase CLI not linked. Will skip Supabase configuration."
    SKIP_SUPABASE=true
  else
    log_success "Supabase authenticated"
  fi
fi

# -----------------------------------------------------------------------------
# Fly.io Deployment
# -----------------------------------------------------------------------------

if [ "$SKIP_FLY" = false ]; then
  log_step "Setting up Fly.io..."

  # Check if app exists
  if fly apps list 2>/dev/null | grep -q "$FLY_APP_NAME"; then
    log_warning "App '$FLY_APP_NAME' already exists. Skipping app creation."
  else
    log_step "Creating Fly app..."
    fly apps create "$FLY_APP_NAME"
    log_success "App created"
  fi

  # Check if volume exists
  if fly volumes list --app "$FLY_APP_NAME" 2>/dev/null | grep -q "pds_data"; then
    log_warning "Volume 'pds_data' already exists. Skipping volume creation."
  else
    log_step "Creating persistent volume (${VOLUME_SIZE_GB}GB)..."
    fly volumes create pds_data --size "$VOLUME_SIZE_GB" --region "$FLY_REGION" --app "$FLY_APP_NAME" --yes
    log_success "Volume created"
  fi

  # Generate and set secrets
  log_step "Configuring secrets..."
  
  EXISTING_SECRETS=$(fly secrets list --app "$FLY_APP_NAME" 2>/dev/null || echo "")
  
  if echo "$EXISTING_SECRETS" | grep -q "PDS_ADMIN_PASSWORD"; then
    log_warning "PDS_ADMIN_PASSWORD already set. Skipping."
  else
    ADMIN_PASS=$(openssl rand -hex 16)
    fly secrets set PDS_ADMIN_PASSWORD="$ADMIN_PASS" --app "$FLY_APP_NAME"
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  SAVE THIS ADMIN PASSWORD:${NC}"
    echo -e "${GREEN}  ${ADMIN_PASS}${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    # Save to local file (gitignored)
    echo "$ADMIN_PASS" > .admin-password
    log_success "Admin password saved to .admin-password"
  fi

  if echo "$EXISTING_SECRETS" | grep -q "PDS_JWT_SECRET"; then
    log_warning "PDS_JWT_SECRET already set. Skipping."
  else
    fly secrets set PDS_JWT_SECRET="$(openssl rand -hex 32)" --app "$FLY_APP_NAME"
    log_success "JWT secret configured"
  fi

  if echo "$EXISTING_SECRETS" | grep -q "PDS_PLC_ROTATION_KEY"; then
    log_warning "PDS_PLC_ROTATION_KEY already set. Skipping."
  else
    fly secrets set PDS_PLC_ROTATION_KEY_K256_PRIVATE_KEY_HEX="$(openssl rand -hex 32)" --app "$FLY_APP_NAME"
    log_success "PLC rotation key configured"
  fi

  # Deploy
  log_step "Deploying PDS..."
  fly deploy --app "$FLY_APP_NAME"
  log_success "PDS deployed"

else
  log_warning "Skipping Fly.io deployment (--skip-fly)"
fi

# -----------------------------------------------------------------------------
# DNS Configuration (Vercel)
# -----------------------------------------------------------------------------

if [ "$SKIP_DNS" = false ]; then
  log_step "Configuring DNS via Vercel..."

  # Get existing DNS records
  EXISTING_DNS=$(vercel dns ls "$DOMAIN" 2>&1)

  # Add PDS subdomain if not exists
  if echo "$EXISTING_DNS" | grep -q "pds.*CNAME.*trainers-pds.fly.dev"; then
    log_warning "pds CNAME already exists. Skipping."
  else
    vercel dns add "$DOMAIN" pds CNAME trainers-pds.fly.dev
    log_success "Added pds.${DOMAIN} -> trainers-pds.fly.dev"
  fi

  # Add wildcard if not exists
  if echo "$EXISTING_DNS" | grep -q '^\s*rec_.*\*.*CNAME.*trainers-pds.fly.dev'; then
    log_warning "Wildcard CNAME already exists. Skipping."
  else
    vercel dns add "$DOMAIN" '*' CNAME trainers-pds.fly.dev
    log_success "Added *.${DOMAIN} -> trainers-pds.fly.dev"
  fi

  # Wait for DNS propagation
  log_step "Waiting for DNS propagation..."
  for i in {1..30}; do
    if dig +short "pds.${DOMAIN}" | grep -q "fly.dev\|66.241"; then
      log_success "DNS propagated"
      break
    fi
    if [ $i -eq 30 ]; then
      log_warning "DNS propagation taking longer than expected. Continuing anyway."
    fi
    sleep 2
  done

  # Add SSL certificates
  log_step "Adding SSL certificates..."
  
  # Check existing certs
  EXISTING_CERTS=$(fly certs list --app "$FLY_APP_NAME" 2>/dev/null || echo "")

  if echo "$EXISTING_CERTS" | grep -q "pds.${DOMAIN}"; then
    log_warning "Certificate for pds.${DOMAIN} already exists."
  else
    fly certs add "pds.${DOMAIN}" --app "$FLY_APP_NAME"
    log_success "Added certificate for pds.${DOMAIN}"
  fi

  if echo "$EXISTING_CERTS" | grep -q "\*.${DOMAIN}"; then
    log_warning "Wildcard certificate already exists."
  else
    fly certs add "*.${DOMAIN}" --app "$FLY_APP_NAME"
    log_success "Added wildcard certificate request"
    
    # Add ACME challenge for wildcard
    log_step "Adding ACME challenge DNS record..."
    
    # Get the ACME challenge target from fly
    FLY_APP_ID=$(fly status --app "$FLY_APP_NAME" --json 2>/dev/null | jq -r '.ID // empty' || echo "")
    
    # Use a predictable format based on the app
    ACME_TARGET="${DOMAIN}.knxk1zo.flydns.net"
    
    if ! echo "$EXISTING_DNS" | grep -q "_acme-challenge.*CNAME"; then
      vercel dns add "$DOMAIN" _acme-challenge CNAME "$ACME_TARGET" 2>/dev/null || true
      log_success "Added ACME challenge record"
    fi
  fi

  # Wait for certificates
  log_step "Waiting for SSL certificates..."
  for i in {1..60}; do
    CERT_STATUS=$(fly certs check "*.${DOMAIN}" --app "$FLY_APP_NAME" 2>&1 || echo "")
    if echo "$CERT_STATUS" | grep -q "Ready"; then
      log_success "Wildcard certificate issued"
      break
    fi
    if [ $i -eq 60 ]; then
      log_warning "Certificate issuance taking longer than expected. Check with: fly certs check '*.${DOMAIN}' --app $FLY_APP_NAME"
    fi
    sleep 5
  done

else
  log_warning "Skipping DNS configuration (--skip-dns)"
fi

# -----------------------------------------------------------------------------
# Supabase Configuration
# -----------------------------------------------------------------------------

if [ "$SKIP_SUPABASE" = false ]; then
  log_step "Configuring Supabase..."

  # Get project ref from linked project
  SUPABASE_PROJECT_REF=$(supabase projects list --json 2>/dev/null | jq -r '.[0].id // empty')
  
  if [ -z "$SUPABASE_PROJECT_REF" ]; then
    log_warning "Could not determine Supabase project. Skipping Supabase configuration."
    log_warning "Manually set secrets with:"
    echo "  supabase secrets set PDS_HOST=https://pds.${DOMAIN} --project-ref <ref>"
    echo "  supabase secrets set PDS_ADMIN_PASSWORD=<password> --project-ref <ref>"
  else
    log_step "Found Supabase project: $SUPABASE_PROJECT_REF"

    # Get admin password
    ADMIN_PASS=""
    if [ -f ".admin-password" ]; then
      ADMIN_PASS=$(cat .admin-password)
    fi

    if [ -z "$ADMIN_PASS" ]; then
      log_warning "Admin password not found. Please set manually:"
      echo "  supabase secrets set PDS_HOST=https://pds.${DOMAIN} --project-ref $SUPABASE_PROJECT_REF"
      echo "  supabase secrets set PDS_ADMIN_PASSWORD=<password> --project-ref $SUPABASE_PROJECT_REF"
    else
      # Set secrets
      supabase secrets set PDS_HOST="https://pds.${DOMAIN}" --project-ref "$SUPABASE_PROJECT_REF" 2>/dev/null || true
      supabase secrets set PDS_ADMIN_PASSWORD="$ADMIN_PASS" --project-ref "$SUPABASE_PROJECT_REF" 2>/dev/null || true
      log_success "Supabase secrets configured"
    fi

    # Deploy edge function
    log_step "Deploying signup edge function..."
    FUNCTIONS_DIR="$(dirname "$0")/../../packages/supabase/supabase/functions"
    if [ -d "$FUNCTIONS_DIR/signup" ]; then
      (cd "$(dirname "$0")/../../packages/supabase" && supabase functions deploy signup --project-ref "$SUPABASE_PROJECT_REF" 2>/dev/null) || true
      log_success "Edge function deployed"
    else
      log_warning "Edge function not found at $FUNCTIONS_DIR/signup"
    fi
  fi

else
  log_warning "Skipping Supabase configuration (--skip-supabase)"
fi

# -----------------------------------------------------------------------------
# Verification
# -----------------------------------------------------------------------------

log_step "Verifying deployment..."

# Check PDS health
if curl -s "https://pds.${DOMAIN}/xrpc/_health" | grep -q "version"; then
  log_success "PDS is healthy"
  PDS_VERSION=$(curl -s "https://pds.${DOMAIN}/xrpc/_health" | jq -r '.version')
  echo "  Version: $PDS_VERSION"
else
  log_warning "PDS health check failed. It may still be starting up."
fi

# Check certificates
fly certs list --app "$FLY_APP_NAME" 2>/dev/null | head -10

# -----------------------------------------------------------------------------
# Summary
# -----------------------------------------------------------------------------

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  PDS Deployment Complete!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo "  PDS URL:        https://pds.${DOMAIN}"
echo "  User handles:   @username.${DOMAIN}"
echo "  Fly app:        $FLY_APP_NAME"
echo ""
echo "  Next steps:"
echo "    1. Create a test account:"
echo "       export PDS_ADMIN_PASSWORD=\$(cat .admin-password)"
echo "       ./create-account.sh testuser test@example.com password123"
echo ""
echo "    2. Login at bsky.app with:"
echo "       Hosting provider: pds.${DOMAIN}"
echo "       Handle: testuser.${DOMAIN}"
echo ""
if [ -f ".admin-password" ]; then
  echo "  Admin password saved to: .admin-password"
  echo ""
fi
