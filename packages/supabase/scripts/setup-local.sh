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

echo -e "${BLUE}Setting up local Supabase...${NC}"

# Check if Docker is running
check_docker() {
  echo -e "${YELLOW}Checking Docker...${NC}"
  if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Docker is not running. Please start Docker Desktop and try again.${NC}"
    exit 1
  fi
  echo -e "${GREEN}Docker is running${NC}"
}

# Check if Supabase CLI is installed
check_supabase_cli() {
  echo -e "${YELLOW}Checking Supabase CLI...${NC}"
  if ! command -v supabase &> /dev/null; then
    echo -e "${YELLOW}Supabase CLI not found. Using npx...${NC}"
    SUPABASE_CMD="npx supabase"
  else
    SUPABASE_CMD="supabase"
    echo -e "${GREEN}Supabase CLI found${NC}"
  fi
}

# Check if Supabase is already running
check_supabase_status() {
  cd "$SUPABASE_DIR"
  
  if $SUPABASE_CMD status > /dev/null 2>&1; then
    return 0
  else
    return 1
  fi
}

# Start Supabase
start_supabase() {
  echo -e "${YELLOW}Starting Supabase...${NC}"
  cd "$SUPABASE_DIR"
  
  $SUPABASE_CMD start
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}Supabase started successfully${NC}"
  else
    echo -e "${RED}Failed to start Supabase${NC}"
    exit 1
  fi
}

# Apply migrations
apply_migrations() {
  echo -e "${YELLOW}Applying migrations...${NC}"
  cd "$SUPABASE_DIR"
  
  $SUPABASE_CMD migration up --local
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}Migrations applied successfully${NC}"
  else
    echo -e "${RED}Failed to apply migrations${NC}"
    exit 1
  fi
}

# Run seed file if it exists
run_seed() {
  cd "$SUPABASE_DIR"
  
  if [ -f "supabase/seed.sql" ]; then
    echo -e "${YELLOW}Running seed file...${NC}"
    $SUPABASE_CMD db execute --file supabase/seed.sql --local
    
    if [ $? -eq 0 ]; then
      echo -e "${GREEN}Seed data applied successfully${NC}"
    else
      echo -e "${YELLOW}Warning: Failed to apply seed data (non-fatal)${NC}"
    fi
  fi
}

# Generate TypeScript types
generate_types() {
  echo -e "${YELLOW}Generating TypeScript types...${NC}"
  cd "$SUPABASE_DIR"
  
  $SUPABASE_CMD gen types typescript --local > src/types.ts
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}Types generated successfully${NC}"
  else
    echo -e "${YELLOW}Warning: Failed to generate types (non-fatal)${NC}"
  fi
}

# Create .env.local if it doesn't exist
create_env_file() {
  cd "$SUPABASE_DIR"
  WEB_DIR="$SUPABASE_DIR/../../apps/web"
  ENV_FILE="$WEB_DIR/.env.local"
  
  if [ ! -f "$ENV_FILE" ]; then
    echo -e "${YELLOW}Creating .env.local for web app...${NC}"
    
    # Get keys from supabase status
    ANON_KEY=$($SUPABASE_CMD status --output json 2>/dev/null | grep -o '"anon_key":"[^"]*"' | cut -d'"' -f4 || echo "")
    SERVICE_KEY=$($SUPABASE_CMD status --output json 2>/dev/null | grep -o '"service_role_key":"[^"]*"' | cut -d'"' -f4 || echo "")
    
    if [ -n "$ANON_KEY" ] && [ -n "$SERVICE_KEY" ]; then
      cat > "$ENV_FILE" << EOF
# Supabase Local Development
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=$SERVICE_KEY
EOF
      echo -e "${GREEN}Created $ENV_FILE${NC}"
    else
      echo -e "${YELLOW}Could not auto-generate .env.local - please create it manually${NC}"
    fi
  else
    echo -e "${GREEN}.env.local already exists${NC}"
  fi
}

# Print connection info
print_connection_info() {
  echo ""
  echo -e "${BLUE}========================================${NC}"
  echo -e "${GREEN}Local Supabase is ready!${NC}"
  echo -e "${BLUE}========================================${NC}"
  echo ""
  cd "$SUPABASE_DIR"
  $SUPABASE_CMD status
  echo ""
}

# Main execution
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
  print_connection_info
}

main "$@"
