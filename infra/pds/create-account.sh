#!/bin/bash
# Create a new account on the trainers.gg PDS
# Usage: ./create-account.sh <handle> <email> <password>

set -e

if [ "$#" -lt 3 ]; then
    echo "Usage: $0 <handle> <email> <password>"
    echo ""
    echo "Examples:"
    echo "  $0 ash ash@example.com MySecurePassword123"
    echo "  $0 cynthia.trainers.gg cynthia@example.com MySecurePassword123"
    echo ""
    echo "Note: If handle doesn't include a domain, .trainers.gg will be added"
    exit 1
fi

HANDLE=$1
EMAIL=$2
PASSWORD=$3

# Add domain if not present
if [[ "$HANDLE" != *.* ]]; then
    HANDLE="${HANDLE}.trainers.gg"
fi

PDS_HOST="${PDS_HOST:-https://pds.trainers.gg}"

echo "📝 Creating account..."
echo "   Handle: $HANDLE"
echo "   Email:  $EMAIL"
echo "   PDS:    $PDS_HOST"
echo ""

# Get admin password from environment
if [ -z "$PDS_ADMIN_PASSWORD" ]; then
    echo "❌ PDS_ADMIN_PASSWORD environment variable is required."
    echo ""
    echo "Set it with:"
    echo "  export PDS_ADMIN_PASSWORD=<your-admin-password>"
    echo ""
    echo "The admin password was displayed when you ran setup.sh."
    echo "If you lost it, you can reset it with:"
    echo "  fly secrets set PDS_ADMIN_PASSWORD=\$(openssl rand -hex 16) --app trainers-pds"
    exit 1
fi

# Create invite code first (required for account creation)
echo "🎟️  Creating invite code..."
INVITE_RESPONSE=$(curl -s -X POST "${PDS_HOST}/xrpc/com.atproto.server.createInviteCode" \
    -H "Content-Type: application/json" \
    -H "Authorization: Basic $(echo -n "admin:${PDS_ADMIN_PASSWORD}" | base64)" \
    -d '{
        "useCount": 1
    }')

INVITE_CODE=$(echo "$INVITE_RESPONSE" | jq -r '.code // empty')

if [ -z "$INVITE_CODE" ]; then
    echo "❌ Failed to create invite code:"
    echo "$INVITE_RESPONSE"
    exit 1
fi

echo "   Invite code: $INVITE_CODE"

# Create the account
echo "👤 Creating account..."
ACCOUNT_RESPONSE=$(curl -s -X POST "${PDS_HOST}/xrpc/com.atproto.server.createAccount" \
    -H "Content-Type: application/json" \
    -d "{
        \"email\": \"${EMAIL}\",
        \"handle\": \"${HANDLE}\",
        \"password\": \"${PASSWORD}\",
        \"inviteCode\": \"${INVITE_CODE}\"
    }")

DID=$(echo "$ACCOUNT_RESPONSE" | jq -r '.did // empty')
HANDLE_RESULT=$(echo "$ACCOUNT_RESPONSE" | jq -r '.handle // empty')

if [ -z "$DID" ]; then
    echo "❌ Failed to create account:"
    echo "$ACCOUNT_RESPONSE" | jq .
    exit 1
fi

echo ""
echo "✅ Account created successfully!"
echo ""
echo "   DID:    $DID"
echo "   Handle: $HANDLE_RESULT"
echo "   Email:  $EMAIL"
echo ""
echo "The user can now log in with:"
echo "   Handle: $HANDLE_RESULT"
echo "   Password: (the password you provided)"
echo ""
echo "On Bluesky app or any AT Protocol client!"
