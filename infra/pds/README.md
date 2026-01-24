# trainers.gg PDS (Personal Data Server)

This directory contains the configuration and scripts for running the trainers.gg AT Protocol PDS.

## Overview

The PDS enables:

- Custom Bluesky handles: `@username.trainers.gg`
- Full account creation and management
- Federation with the Bluesky network
- Complete data sovereignty

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Bluesky Network                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────────┐  │
│  │ bsky.social │    │ Relay (BGS) │    │ Other PDS Servers       │  │
│  │    PDS      │◄──►│             │◄──►│ (federated network)     │  │
│  └─────────────┘    └──────▲──────┘    └─────────────────────────┘  │
│                            │                                         │
│                            │ Federation                              │
│                            │                                         │
│  ┌─────────────────────────┴─────────────────────────────────────┐  │
│  │                   trainers.gg PDS                              │  │
│  │  ┌──────────────────────────────────────────────────────────┐ │  │
│  │  │  Fly.io Container                                        │ │  │
│  │  │  ┌────────────┐  ┌────────────┐  ┌────────────────────┐  │ │  │
│  │  │  │ PDS Server │  │  SQLite    │  │  Blob Storage      │  │ │  │
│  │  │  │ (Node.js)  │  │  (users,   │  │  (images, videos)  │  │ │  │
│  │  │  │            │  │   posts)   │  │                    │  │ │  │
│  │  │  └────────────┘  └────────────┘  └────────────────────┘  │ │  │
│  │  └──────────────────────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘

                                ▲
                                │ HTTPS
                                │
┌───────────────────────────────┴───────────────────────────────────┐
│                        trainers.gg                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌───────────────────┐  │
│  │   Next.js Web   │  │   Expo Mobile   │  │   Supabase        │  │
│  │   (OAuth +      │  │   (OAuth +      │  │   (tournaments,   │  │
│  │    feed UI)     │  │    feed UI)     │  │    teams, etc)    │  │
│  └─────────────────┘  └─────────────────┘  └───────────────────┘  │
└───────────────────────────────────────────────────────────────────┘
```

## Prerequisites

1. **Fly.io Account**: https://fly.io
2. **Fly CLI**: `brew install flyctl` or `curl -L https://fly.io/install.sh | sh`
3. **Domain**: `trainers.gg` with DNS access

## DNS Configuration

Add these records to your DNS provider:

```
# A Records (point to Fly.io - get IP after deployment)
trainers.gg.             A      <fly-app-ip>
*.trainers.gg.           A      <fly-app-ip>

# OR use CNAME for Fly.io (recommended)
pds.trainers.gg.         CNAME  trainers-pds.fly.dev.

# IMPORTANT: Wildcard for user handles
*.trainers.gg.           CNAME  trainers-pds.fly.dev.
```

## Deployment Steps

### 1. Install Fly CLI and Login

```bash
# Install
brew install flyctl

# Login
fly auth login
```

### 2. Create Fly App

```bash
cd infra/pds
fly apps create trainers-pds
```

### 3. Create Persistent Volume

```bash
# Create a 10GB volume for SQLite + blobs
fly volumes create pds_data --size 10 --region sjc
```

### 4. Set Secrets

```bash
# Generate a secure admin password
fly secrets set PDS_ADMIN_PASSWORD=$(openssl rand -hex 16)

# Generate JWT secret
fly secrets set PDS_JWT_SECRET=$(openssl rand -hex 32)

# Set PLC rotation key (generate once, never change!)
fly secrets set PDS_PLC_ROTATION_KEY_K256_PRIVATE_KEY_HEX=$(openssl rand -hex 32)
```

### 5. Deploy

```bash
fly deploy
```

### 6. Configure SSL

Fly.io handles SSL automatically. Verify with:

```bash
fly certs list
fly certs add trainers.gg
fly certs add "*.trainers.gg"
```

### 7. Connect to Bluesky Relay

Your PDS needs to connect to the Bluesky relay (BGS) to federate:

```bash
# This happens automatically when PDS starts
# Verify connection in logs:
fly logs
```

## Creating User Accounts

### Via Admin API

```bash
# Get the admin password
fly secrets list

# Create account via API
curl -X POST https://pds.trainers.gg/xrpc/com.atproto.server.createAccount \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin-token>" \
  -d '{
    "email": "user@example.com",
    "handle": "username.trainers.gg",
    "password": "secure-password"
  }'
```

### Via trainers.gg App (Recommended)

The web/mobile apps will have an account creation flow that:

1. Collects user info (email, username, password)
2. Calls PDS to create account
3. Links to Supabase user record
4. Returns session tokens

## Environment Variables

| Variable                                    | Description                        | Required |
| ------------------------------------------- | ---------------------------------- | -------- |
| `PDS_HOSTNAME`                              | `pds.trainers.gg`                  | Yes      |
| `PDS_DATA_DIRECTORY`                        | `/data`                            | Yes      |
| `PDS_BLOBSTORE_DISK_LOCATION`               | `/data/blobs`                      | Yes      |
| `PDS_DID_PLC_URL`                           | `https://plc.directory`            | Yes      |
| `PDS_BSKY_APP_VIEW_URL`                     | `https://api.bsky.app`             | Yes      |
| `PDS_BSKY_APP_VIEW_DID`                     | `did:web:api.bsky.app`             | Yes      |
| `PDS_REPORT_SERVICE_URL`                    | `https://mod.bsky.app`             | Yes      |
| `PDS_REPORT_SERVICE_DID`                    | `did:plc:ar7c4by46qjdydhdevvrndac` | Yes      |
| `PDS_CRAWLERS`                              | `https://bsky.network`             | Yes      |
| `PDS_JWT_SECRET`                            | (secret)                           | Yes      |
| `PDS_ADMIN_PASSWORD`                        | (secret)                           | Yes      |
| `PDS_PLC_ROTATION_KEY_K256_PRIVATE_KEY_HEX` | (secret)                           | Yes      |

## Monitoring

```bash
# View logs
fly logs

# SSH into container
fly ssh console

# Check status
fly status
```

## Backup

The SQLite database and blobs are stored in `/data`. Back up regularly:

```bash
# Create snapshot
fly volumes snapshots create <volume-id>

# List snapshots
fly volumes snapshots list <volume-id>
```

## Cost Estimate

| Resource    | Size                   | Monthly Cost  |
| ----------- | ---------------------- | ------------- |
| Fly Machine | shared-cpu-1x, 1GB RAM | ~$5           |
| Volume      | 10GB SSD               | ~$1.50        |
| Bandwidth   | 100GB outbound         | Free tier     |
| **Total**   |                        | **~$7/month** |

Scale up as needed:

- More RAM for more concurrent users
- More storage for media uploads
- Multiple regions for lower latency

## Troubleshooting

### PDS not federating

- Check `fly logs` for relay connection errors
- Verify `PDS_CRAWLERS` is set correctly
- Ensure SSL certificates are valid

### Handle resolution failing

- Verify DNS wildcard record exists
- Check `_atproto` TXT record
- Test with: `curl https://plc.directory/did:plc:your-did`

### Account creation failing

- Check admin password is set
- Verify PLC rotation key is configured
- Check logs for validation errors

## Resources

- [AT Protocol Docs](https://atproto.com/docs)
- [PDS GitHub](https://github.com/bluesky-social/pds)
- [Fly.io Docs](https://fly.io/docs)
- [Bluesky Community](https://github.com/bluesky-social/atproto/discussions)
