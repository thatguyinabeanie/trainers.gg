#!/bin/bash
# Setup script for trainers.gg PDS on Fly.io
# Run this once to initialize the PDS

set -e

echo "🚀 Setting up trainers.gg PDS on Fly.io"
echo ""

# Check if fly CLI is installed
if ! command -v fly &> /dev/null; then
    echo "❌ Fly CLI not found. Install with: brew install flyctl"
    exit 1
fi

# Check if logged in
if ! fly auth whoami &> /dev/null; then
    echo "📝 Not logged in to Fly.io. Running fly auth login..."
    fly auth login
fi

echo "✅ Fly CLI ready"
echo ""

# Check if app exists
if fly apps list | grep -q "trainers-pds"; then
    echo "⚠️  App 'trainers-pds' already exists. Skipping app creation."
else
    echo "📦 Creating Fly app..."
    fly apps create trainers-pds
fi

echo ""

# Check if volume exists
if fly volumes list --app trainers-pds 2>/dev/null | grep -q "pds_data"; then
    echo "⚠️  Volume 'pds_data' already exists. Skipping volume creation."
else
    echo "💾 Creating persistent volume (10GB)..."
    fly volumes create pds_data --size 10 --region sjc --app trainers-pds
fi

echo ""

# Generate secrets
echo "🔐 Generating secrets..."

# Check if secrets already exist
EXISTING_SECRETS=$(fly secrets list --app trainers-pds 2>/dev/null || echo "")

if echo "$EXISTING_SECRETS" | grep -q "PDS_ADMIN_PASSWORD"; then
    echo "⚠️  PDS_ADMIN_PASSWORD already set. Skipping."
else
    ADMIN_PASS=$(openssl rand -hex 16)
    echo "   Setting PDS_ADMIN_PASSWORD..."
    fly secrets set PDS_ADMIN_PASSWORD="$ADMIN_PASS" --app trainers-pds
    echo "   📋 Admin password: $ADMIN_PASS (save this!)"
fi

if echo "$EXISTING_SECRETS" | grep -q "PDS_JWT_SECRET"; then
    echo "⚠️  PDS_JWT_SECRET already set. Skipping."
else
    echo "   Setting PDS_JWT_SECRET..."
    fly secrets set PDS_JWT_SECRET="$(openssl rand -hex 32)" --app trainers-pds
fi

if echo "$EXISTING_SECRETS" | grep -q "PDS_PLC_ROTATION_KEY"; then
    echo "⚠️  PDS_PLC_ROTATION_KEY already set. Skipping."
else
    echo "   Setting PDS_PLC_ROTATION_KEY_K256_PRIVATE_KEY_HEX..."
    fly secrets set PDS_PLC_ROTATION_KEY_K256_PRIVATE_KEY_HEX="$(openssl rand -hex 32)" --app trainers-pds
fi

echo ""
echo "✅ Secrets configured"
echo ""

# Deploy
echo "🚀 Deploying PDS..."
fly deploy --app trainers-pds

echo ""
echo "✅ Deployment complete!"
echo ""

# Get app info
echo "📊 App Status:"
fly status --app trainers-pds

echo ""
echo "🌐 Next Steps:"
echo ""
echo "1. Configure DNS records:"
echo "   pds.trainers.gg.     CNAME  trainers-pds.fly.dev."
echo "   *.trainers.gg.       CNAME  trainers-pds.fly.dev."
echo ""
echo "2. Add SSL certificates:"
echo "   fly certs add pds.trainers.gg --app trainers-pds"
echo "   fly certs add '*.trainers.gg' --app trainers-pds"
echo ""
echo "3. Verify health:"
echo "   curl https://pds.trainers.gg/xrpc/_health"
echo ""
echo "4. View logs:"
echo "   fly logs --app trainers-pds"
echo ""
