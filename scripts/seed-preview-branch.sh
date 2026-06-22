#!/bin/bash
# Seed a Supabase preview branch with test data
# Usage: ./scripts/seed-preview-branch.sh <branch-name>

set -e

BRANCH_NAME="${1:-feat/mvp-tickets}"

echo "🔍 Getting credentials for preview branch: $BRANCH_NAME"

# Get preview branch credentials
BRANCH_INFO=$(pnpm supabase branches get "$BRANCH_NAME" --output json 2>&1)

if [ $? -ne 0 ]; then
  echo "❌ Failed to get branch info"
  echo "$BRANCH_INFO"
  exit 1
fi

DB_URL=$(echo "$BRANCH_INFO" | jq -r '.POSTGRES_URL_NON_POOLING')

if [ -z "$DB_URL" ] || [ "$DB_URL" = "null" ]; then
  echo "❌ Failed to extract database URL"
  exit 1
fi

echo "✅ Connected to preview branch"
echo ""

# Navigate to supabase directory
cd "$(dirname "$0")/../packages/supabase/supabase"

# Execute each seed file in order
SEED_FILES=(
  "seeds/01_extensions.sql"
  "seeds/02_roles.sql"
  "seeds/03_users.sql"
  "seeds/04_organizations.sql"
  "seeds/05_invitations.sql"
  "seeds/09_teams.sql"
  "seeds/10_tournaments.sql"
  "seeds/11_matches.sql"
  "seeds/12_standings.sql"
)

for seed_file in "${SEED_FILES[@]}"; do
  if [ -f "$seed_file" ]; then
    echo "📝 Executing $seed_file..."
    # Use docker to run psql since it's not installed locally
    docker run --rm -i postgres:17 psql "$DB_URL" < "$seed_file" 2>&1 | grep -v "^$" || true
    echo "✅ Completed $seed_file"
  else
    echo "⚠️  Seed file not found: $seed_file"
  fi
done

echo ""
echo "✅ Preview branch seeded successfully!"
echo ""
echo "Test users available:"
echo "  - player@trainers.local (Password123!)"
echo "  - admin@trainers.local (Password123!)"
echo "  - champion@trainers.local (Password123!)"
echo "  - gymleader@trainers.local (Password123!)"
