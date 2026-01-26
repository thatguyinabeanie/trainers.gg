#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SUPABASE_DIR="$(dirname "$SCRIPT_DIR")"
ROOT_DIR="$SUPABASE_DIR/../.."
ENV_FILE="$ROOT_DIR/.env.local"

# =============================================================================
# Skip in CI/Production environments
# =============================================================================
if [ -n "$CI" ] || [ -n "$VERCEL" ] || [ -n "$NETLIFY" ] || [ -n "$GITHUB_ACTIONS" ]; then
  echo -e "${BLUE}CI/Production environment detected - skipping local Supabase setup${NC}"
  exit 0
fi

# =============================================================================
# Skip if SKIP_LOCAL_SUPABASE is set (for devs who want to use remote)
# =============================================================================
if [ -n "$SKIP_LOCAL_SUPABASE" ]; then
  echo -e "${BLUE}SKIP_LOCAL_SUPABASE is set - skipping local Supabase setup${NC}"
  exit 0
fi

# =============================================================================
# Skip if .env.local already exists and points to a remote Supabase
# =============================================================================
if [ -f "$ENV_FILE" ]; then
  if grep -q "NEXT_PUBLIC_SUPABASE_URL=" "$ENV_FILE"; then
    SUPABASE_URL=$(grep "NEXT_PUBLIC_SUPABASE_URL=" "$ENV_FILE" | cut -d'=' -f2)
    # If URL is not localhost, assume they want to use remote
    if [[ "$SUPABASE_URL" != *"127.0.0.1"* ]] && [[ "$SUPABASE_URL" != *"localhost"* ]]; then
      echo -e "${GREEN}.env.local exists with remote Supabase URL - skipping local setup${NC}"
      echo -e "${BLUE}To use local Supabase, delete .env.local or set URL to http://127.0.0.1:54321${NC}"
      exit 0
    fi
  fi
fi

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Setting up Local Supabase            ${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# =============================================================================
# Check Docker
# =============================================================================
check_docker() {
  echo -e "${YELLOW}Checking Docker...${NC}"
  if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker is not installed.${NC}"
    echo ""
    echo -e "${YELLOW}Options:${NC}"
    echo "  1. Install Docker Desktop: https://www.docker.com/products/docker-desktop"
    echo "  2. Use remote Supabase by creating apps/web/.env.local with:"
    echo ""
    echo "     NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co"
    echo "     NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key"
    echo "     SUPABASE_SERVICE_ROLE_KEY=your-service-role-key"
    echo ""
    exit 1
  fi
  
  if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Docker is not running.${NC}"
    echo ""
    echo -e "${YELLOW}Options:${NC}"
    echo "  1. Start Docker Desktop and run 'pnpm dev' again"
    echo "  2. Use remote Supabase by creating apps/web/.env.local with your project credentials"
    echo ""
    exit 1
  fi
  echo -e "${GREEN}Docker is running${NC}"
}

# =============================================================================
# Check Supabase CLI
# =============================================================================
check_supabase_cli() {
  echo -e "${YELLOW}Checking Supabase CLI...${NC}"
  if ! command -v supabase &> /dev/null; then
    echo -e "${YELLOW}Supabase CLI not found. Using npx...${NC}"
    SUPABASE_CMD="npx supabase@latest"
  else
    SUPABASE_CMD="supabase"
    echo -e "${GREEN}Supabase CLI found${NC}"
  fi
}

# =============================================================================
# Check if Supabase is already running
# =============================================================================
check_supabase_status() {
  cd "$SUPABASE_DIR"
  if $SUPABASE_CMD status > /dev/null 2>&1; then
    return 0
  else
    return 1
  fi
}

# =============================================================================
# Start Supabase
# =============================================================================
start_supabase() {
  echo -e "${YELLOW}Starting Supabase (this may take a minute on first run)...${NC}"
  cd "$SUPABASE_DIR"
  
  $SUPABASE_CMD start
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}Supabase started successfully${NC}"
  else
    echo -e "${RED}Failed to start Supabase${NC}"
    exit 1
  fi
}

# =============================================================================
# Apply migrations
# =============================================================================
apply_migrations() {
  echo -e "${YELLOW}Applying migrations...${NC}"
  cd "$SUPABASE_DIR"
  
  # Use db push which applies all migrations
  $SUPABASE_CMD db push --local 2>/dev/null || $SUPABASE_CMD migration up --local 2>/dev/null || true
  
  echo -e "${GREEN}Migrations applied${NC}"
}

# =============================================================================
# Run seed file if it exists
# =============================================================================
run_seed() {
  cd "$SUPABASE_DIR"
  
  if [ -f "supabase/seed.sql" ]; then
    echo -e "${YELLOW}Running seed file...${NC}"
    $SUPABASE_CMD db execute --file supabase/seed.sql --local 2>/dev/null || true
    echo -e "${GREEN}Seed data applied${NC}"
  fi
}

# =============================================================================
# Generate TypeScript types from local database
# =============================================================================
generate_types() {
  echo -e "${YELLOW}Generating TypeScript types...${NC}"
  cd "$SUPABASE_DIR"
  
  # Redirect stderr to suppress debug output
  $SUPABASE_CMD gen types typescript --local 2>/dev/null > src/types.ts
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}Types generated successfully${NC}"
  else
    echo -e "${YELLOW}Warning: Failed to generate types (non-fatal)${NC}"
  fi
}

# =============================================================================
# Get local IP address for mobile device testing
# =============================================================================
get_local_ip() {
  # Try various methods to get the local IP address
  LOCAL_IP=""
  
  # macOS: Try ipconfig (most reliable on Mac)
  if command -v ipconfig &> /dev/null; then
    LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "")
  fi
  
  # macOS/Linux: Try ifconfig (may be in /sbin)
  if [ -z "$LOCAL_IP" ]; then
    if command -v ifconfig &> /dev/null; then
      LOCAL_IP=$(ifconfig 2>/dev/null | grep "inet " | grep -v 127.0.0.1 | head -1 | awk '{print $2}')
    elif [ -x /sbin/ifconfig ]; then
      LOCAL_IP=$(/sbin/ifconfig 2>/dev/null | grep "inet " | grep -v 127.0.0.1 | head -1 | awk '{print $2}')
    fi
  fi
  
  # Linux: Try hostname -I
  if [ -z "$LOCAL_IP" ] && command -v hostname &> /dev/null; then
    LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "")
  fi
  
  # Fallback: Try ip command (Linux)
  if [ -z "$LOCAL_IP" ] && command -v ip &> /dev/null; then
    LOCAL_IP=$(ip route get 1 2>/dev/null | awk '{print $7; exit}' || echo "")
  fi
  
  # If still empty, fall back to localhost
  if [ -z "$LOCAL_IP" ]; then
    LOCAL_IP="127.0.0.1"
    echo -e "${YELLOW}Could not detect local IP, using 127.0.0.1${NC}"
    echo -e "${YELLOW}For physical device testing, manually update EXPO_PUBLIC_SUPABASE_URL in .env.local${NC}"
  else
    echo -e "${GREEN}Detected local IP: $LOCAL_IP${NC}"
  fi
}

# =============================================================================
# Create .env.local for web app
# =============================================================================
create_env_file() {
  cd "$SUPABASE_DIR"
  
  # Always update .env.local with local credentials when using local Supabase
  echo -e "${YELLOW}Configuring web app environment...${NC}"
  
  # Get local IP for mobile device testing
  get_local_ip
  
  # Get keys from supabase status using JSON output
  STATUS_JSON=$($SUPABASE_CMD status --output json 2>/dev/null || echo "{}")
  
  # Extract keys - JSON format has spaces: "KEY": "value"
  ANON_KEY=$(echo "$STATUS_JSON" | grep '"ANON_KEY"' | sed 's/.*"ANON_KEY": *"\([^"]*\)".*/\1/')
  SERVICE_KEY=$(echo "$STATUS_JSON" | grep '"SERVICE_ROLE_KEY"' | sed 's/.*"SERVICE_ROLE_KEY": *"\([^"]*\)".*/\1/')
  
  if [ -n "$ANON_KEY" ] && [ -n "$SERVICE_KEY" ]; then
    cat > "$ENV_FILE" << EOF
# =============================================================================
# Supabase Local Development (auto-generated by setup-local.sh)
# =============================================================================
# To use a remote Supabase instance instead, replace these values with your
# project credentials from https://app.supabase.com/project/_/settings/api
# =============================================================================

# Web app (Next.js) - uses localhost for browser access
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON_KEY

# Mobile app (Expo) - uses local IP for physical device access
# If testing on physical device, ensure your device is on the same network
EXPO_PUBLIC_SUPABASE_URL=http://$LOCAL_IP:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=$ANON_KEY

# Server-side only (never expose to client)
SUPABASE_SERVICE_ROLE_KEY=$SERVICE_KEY
EOF
    echo -e "${GREEN}Created $ENV_FILE${NC}"
  else
    echo -e "${YELLOW}Could not auto-generate .env.local${NC}"
    echo -e "${YELLOW}Please create it manually with your Supabase credentials${NC}"
  fi
}

# =============================================================================
# Create symlinks to .env.local in apps/web and apps/mobile
# =============================================================================
create_env_symlinks() {
  echo -e "${YELLOW}Creating .env.local symlinks...${NC}"
  
  # Define app directories that need symlinks
  APP_DIRS=(
    "$ROOT_DIR/apps/web"
    "$ROOT_DIR/apps/mobile"
    "$ROOT_DIR/packages/backend"
  )
  
  for APP_DIR in "${APP_DIRS[@]}"; do
    if [ -d "$APP_DIR" ]; then
      APP_ENV="$APP_DIR/.env.local"
      
      # Remove existing file or symlink
      if [ -L "$APP_ENV" ]; then
        rm "$APP_ENV"
        echo -e "${YELLOW}  Removed existing symlink: $APP_ENV${NC}"
      elif [ -f "$APP_ENV" ]; then
        # Backup existing file if it's not a symlink
        mv "$APP_ENV" "$APP_ENV.backup"
        echo -e "${YELLOW}  Backed up existing file: $APP_ENV -> $APP_ENV.backup${NC}"
      fi
      
      # Create symlink (relative path for portability)
      cd "$APP_DIR"
      ln -s "../../.env.local" ".env.local"
      echo -e "${GREEN}  Created symlink: $APP_ENV -> $ENV_FILE${NC}"
    fi
  done
}

# =============================================================================
# Print success message
# =============================================================================
print_success() {
  echo ""
  echo -e "${GREEN}========================================${NC}"
  echo -e "${GREEN}  Local Supabase is ready!             ${NC}"
  echo -e "${GREEN}========================================${NC}"
  echo ""
  echo -e "${BLUE}Supabase Studio:${NC} http://127.0.0.1:54323"
  echo -e "${BLUE}API URL (web):${NC}   http://127.0.0.1:54321"
  echo -e "${BLUE}API URL (mobile):${NC} http://$LOCAL_IP:54321"
  echo -e "${BLUE}Database:${NC}        postgresql://postgres:postgres@127.0.0.1:54322/postgres"
  echo ""
}

# =============================================================================
# Main
# =============================================================================
main() {
  check_docker
  check_supabase_cli
  
  if check_supabase_status; then
    echo -e "${GREEN}Supabase is already running${NC}"
  else
    start_supabase
  fi
  
  apply_migrations
  run_seed
  generate_types
  create_env_file
  create_env_symlinks
  print_success
}

main "$@"
