# trainers.gg PDS (Personal Data Server)

This directory contains the configuration and scripts for running the trainers.gg AT Protocol PDS.

**Status:** ✅ Live at `https://pds.trainers.gg`

## Overview

The PDS enables:

- Custom Bluesky handles: `@username.trainers.gg`
- Full account creation and management
- Federation with the Bluesky network
- Complete data sovereignty

## Quick Start

```bash
# Full deployment (creates app, volume, secrets, deploys, configures DNS)
./deploy.sh

# Or use the Makefile
make deploy       # Deploy to Fly.io
make status       # Check PDS status
make logs         # Stream logs
make health       # Check health endpoint
```

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

DNS is managed via **Vercel DNS** (dashboard: Vercel → Domains → trainers.gg → DNS Records).

### Required DNS Records

| Type  | Name  | Value                  | Purpose                               |
| ----- | ----- | ---------------------- | ------------------------------------- |
| A     | `@`   | (Vercel IPs)           | Web app apex domain                   |
| CNAME | `www` | `cname.vercel-dns.com` | Web app www subdomain                 |
| CNAME | `pds` | `trainers-pds.fly.dev` | PDS API endpoint                      |
| CNAME | `*`   | `trainers-pds.fly.dev` | Handle resolution (@user.trainers.gg) |

### Vercel Domain Configuration

**CRITICAL:** The apex domain (`trainers.gg`) must be set as the **primary domain** in Vercel, NOT `www.trainers.gg`.

AT Protocol OAuth requires that `https://trainers.gg/oauth/client-metadata.json` returns HTTP 200 directly. If `www` is primary, the apex will 308 redirect to www, which breaks OAuth per the AT Protocol spec.

To fix:

1. Vercel Dashboard → Project → Settings → Domains
2. Set `trainers.gg` as primary (not `www.trainers.gg`)

### Fly.io SSL Certificates

The PDS requires SSL certificates for both the subdomain and wildcard:

```bash
fly certs add pds.trainers.gg -a trainers-pds
fly certs add "*.trainers.gg" -a trainers-pds
```

Fly.io may require DNS validation. Check `fly certs list -a trainers-pds` for status.

## Deployment Steps

### Option 1: Full Automated Deployment

```bash
# This handles everything: Fly app, volume, secrets, DNS, SSL, Supabase
./deploy.sh

# Skip specific steps if needed
./deploy.sh --skip-fly       # Skip Fly.io deployment
./deploy.sh --skip-dns       # Skip DNS configuration
./deploy.sh --skip-supabase  # Skip Supabase secrets
```

### Option 2: Manual Step-by-Step

#### 1. Install Fly CLI and Login

#### 1. Install Fly CLI and Login

```bash
# Install
brew install flyctl

# Login
fly auth login
```

#### 2. Create Fly App

```bash
cd infra/pds
fly apps create trainers-pds
```

#### 3. Create Persistent Volume

```bash
# Create a 10GB volume for SQLite + blobs
fly volumes create pds_data --size 10 --region sjc
```

#### 4. Set Secrets

```bash
# Generate a secure admin password
fly secrets set PDS_ADMIN_PASSWORD=$(openssl rand -hex 16)

# Generate JWT secret
fly secrets set PDS_JWT_SECRET=$(openssl rand -hex 32)

# Set PLC rotation key (generate once, never change!)
fly secrets set PDS_PLC_ROTATION_KEY_K256_PRIVATE_KEY_HEX=$(openssl rand -hex 32)

# Enable @username.trainers.gg handles (leading dot required)
fly secrets set "PDS_SERVICE_HANDLE_DOMAINS=.trainers.gg"
```

#### 5. Deploy

```bash
fly deploy
```

#### 6. Configure SSL

Fly.io handles SSL automatically. Verify with:

```bash
fly certs list
fly certs add trainers.gg
fly certs add "*.trainers.gg"
```

#### 7. Connect to Bluesky Relay

Your PDS needs to connect to the Bluesky relay (BGS) to federate:

```bash
# This happens automatically when PDS starts
# Verify connection in logs:
fly logs
```

## Creating User Accounts

### Via Script (Recommended for Testing)

```bash
# Set the admin password (saved to .admin-password by deploy.sh)
export PDS_ADMIN_PASSWORD=$(cat .admin-password)

# Create an account
./create-account.sh <username> <email> <password>

# Example
./create-account.sh testuser test@example.com SecurePass123
```

### Via Edge Function (Production)

The trainers.gg apps use the unified signup edge function:

1. User enters email, username, password in web/mobile app
2. Client calls `/functions/v1/signup` edge function
3. Edge function creates both Supabase Auth and PDS accounts
4. DID is stored in the users table

### Via Admin API (Manual)

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

### Via trainers.gg App

The web/mobile apps have an integrated signup flow that:

1. Collects user info (email, username, password)
2. Calls the `/functions/v1/signup` edge function
3. Edge function creates PDS account via admin API
4. Links DID to Supabase user record
5. Returns session tokens

## Files

| File                | Description                                         |
| ------------------- | --------------------------------------------------- |
| `fly.toml`          | Fly.io container configuration                      |
| `deploy.sh`         | Full deployment script (Fly + DNS + SSL + Supabase) |
| `create-account.sh` | Create user accounts on the PDS                     |
| `setup.sh`          | Initial setup script (creates app, volume, secrets) |
| `Makefile`          | Common operations (deploy, status, logs, health)    |
| `.admin-password`   | Saved admin password (gitignored)                   |
| `.gitignore`        | Ignores sensitive files                             |

## Environment Variables

| Variable                                    | Description                        | Required         |
| ------------------------------------------- | ---------------------------------- | ---------------- |
| `PDS_HOSTNAME`                              | `pds.trainers.gg`                  | Yes              |
| `PDS_DATA_DIRECTORY`                        | `/pds`                             | Yes              |
| `PDS_BLOBSTORE_S3_ENDPOINT`                 | Supabase S3 endpoint               | Yes (Production) |
| `PDS_BLOBSTORE_S3_BUCKET`                   | `pds-blobs`                        | Yes (Production) |
| `PDS_BLOBSTORE_S3_REGION`                   | `auto` or Supabase region          | Yes (Production) |
| `PDS_BLOBSTORE_S3_ACCESS_KEY_ID`            | Supabase S3 access key             | Yes (Production) |
| `PDS_BLOBSTORE_S3_SECRET_ACCESS_KEY`        | Supabase S3 secret key             | Yes (Production) |
| `PDS_BLOBSTORE_S3_FORCE_PATH_STYLE`         | `true` for S3-compatible services  | Yes (Production) |
| `PDS_DID_PLC_URL`                           | `https://plc.directory`            | Yes              |
| `PDS_BSKY_APP_VIEW_URL`                     | `https://api.bsky.app`             | Yes              |
| `PDS_BSKY_APP_VIEW_DID`                     | `did:web:api.bsky.app`             | Yes              |
| `PDS_REPORT_SERVICE_URL`                    | `https://mod.bsky.app`             | Yes              |
| `PDS_REPORT_SERVICE_DID`                    | `did:plc:ar7c4by46qjdydhdevvrndac` | Yes              |
| `PDS_CRAWLERS`                              | `https://bsky.network`             | Yes              |
| `PDS_JWT_SECRET`                            | (secret)                           | Yes              |
| `PDS_ADMIN_PASSWORD`                        | (secret)                           | Yes              |
| `PDS_PLC_ROTATION_KEY_K256_PRIVATE_KEY_HEX` | (secret)                           | Yes              |
| `PDS_SERVICE_HANDLE_DOMAINS`                | `.trainers.gg`                     | Yes              |

> **Note:** `PDS_SERVICE_HANDLE_DOMAINS` tells the PDS which domains are valid for user handles. Without it, the PDS only accepts handles under `*.pds.trainers.gg` (derived from `PDS_HOSTNAME`). Setting it to `.trainers.gg` (with leading dot) enables `@username.trainers.gg` handles.

---

## Blob Storage: Supabase Storage S3 API

**All environments** use **Supabase Storage** for PDS blob storage (images, videos). This provides:

- Scalable object storage (no volume size limits)
- Infrastructure consolidation (all in Supabase)
- Better cost economics at scale
- Automatic setup via `config.toml`

### Bucket Configuration (All Environments)

The `pds-blobs` bucket is defined in `packages/supabase/supabase/config.toml`:

```toml
[storage.buckets.pds-blobs]
public = false
file_size_limit = "50MiB"
allowed_mime_types = ["image/*", "video/*"]
```

**How it works**:

- **Local dev**: Bucket auto-created when running `pnpm db:start`
- **Preview branches**: Each preview branch gets isolated `pds-blobs` bucket
- **Production**: Bucket created automatically via GitHub Integration OR manually (see below)

### Setup for Each Environment

#### Local Development (One-time Manual Setup)

**Important:** The `config.toml` bucket definition is for documentation and configuration reference only. It does **not** auto-create buckets in local development.

**First-time setup** (only needed once):

1. Start Supabase:

   ```bash
   pnpm db:start
   ```

2. Create the bucket (choose one method):

   **Option A: Via Supabase Studio UI (Recommended)**
   - Open http://127.0.0.1:54323/project/default/storage/files
   - Click "New bucket"
   - Name: `pds-blobs`
   - Public: **OFF** (private bucket)
   - File size limit: `50 MB`
   - Allowed MIME types: `image/*, video/*`
   - Click "Create"

   **Option B: Via CLI**

   ```bash
   # Not yet supported in Supabase CLI v1.x
   # Use Studio UI instead
   ```

The bucket persists in Docker volumes, so you only need to create it once. After that, `pnpm db:start` will find the existing bucket automatically.

**Why doesn't config.toml auto-create buckets?**

According to [Supabase CLI PR #2460](https://github.com/supabase/cli/pull/2460), the `[storage.buckets.bucket-name]` syntax in config.toml is primarily for seeding existing buckets with files from a local directory (via `objects_path`), not for auto-creating them. Buckets must be created first, then config.toml settings are applied.

#### Preview Branches

**Enable GitHub Integration** in Supabase Dashboard:

1. Settings → Integrations → GitHub
2. Enable "Deploy to production" checkbox
3. Connect your repository

When you create a PR:

- Supabase automatically creates a preview branch
- Each preview branch has **isolated storage** (no data sharing)
- Preview branches are deleted when PR is closed

**Create the bucket in each preview branch:**

Each preview branch needs the `pds-blobs` bucket created manually (config.toml doesn't auto-create it):

1. Open the preview branch in Supabase Dashboard
2. Navigate to Storage → Files
3. Create bucket: `pds-blobs` (private, 50MB limit, `image/*, video/*` MIME types)

Or use the Supabase CLI:

```bash
# Link to preview branch first
supabase link --project-ref <preview-branch-ref>

# Create bucket (if CLI supports it)
supabase storage buckets create pds-blobs --public false
```

#### Production (Manual Setup Required)

**Create the bucket in production** (one-time):

1. **Via Supabase Dashboard:**
   - Open production project in Supabase Dashboard
   - Navigate to Storage → Files
   - Click "New bucket"
   - Name: `pds-blobs`
   - Public: **OFF** (private)
   - File size limit: `50 MB`
   - Allowed MIME types: `image/*, video/*`
   - Click "Create"

2. **Via Supabase CLI:**

   ```bash
   # Link to production project
   supabase link --project-ref <production-project-ref>

   # Create bucket
   supabase storage buckets create pds-blobs --public false
   ```

**Note:** Even with GitHub Integration enabled, buckets are not automatically created in production. You must create them manually once.

#### Generate S3 Credentials (Required for All)

Once the bucket exists (via any method above), generate S3 credentials:

1. Supabase Dashboard → Project Settings → Storage
2. Scroll to **S3 Connection** section
3. Click **Create access credentials**
4. Save the:
   - Access Key ID
   - Secret Access Key
   - S3 Endpoint URL (format: `https://<project-ref>.supabase.co/storage/v1/s3`)

#### Configure Fly.io Secrets

```bash
# Set S3 configuration
fly secrets set PDS_BLOBSTORE_S3_ENDPOINT="https://<project-ref>.supabase.co/storage/v1/s3" --app trainers-pds
fly secrets set PDS_BLOBSTORE_S3_BUCKET="pds-blobs" --app trainers-pds
fly secrets set PDS_BLOBSTORE_S3_REGION="auto" --app trainers-pds
fly secrets set PDS_BLOBSTORE_S3_ACCESS_KEY_ID="<access-key>" --app trainers-pds
fly secrets set PDS_BLOBSTORE_S3_SECRET_ACCESS_KEY="<secret-key>" --app trainers-pds
fly secrets set PDS_BLOBSTORE_S3_FORCE_PATH_STYLE="true" --app trainers-pds
```

#### 4. Deploy

```bash
fly deploy --app trainers-pds
```

The PDS will now store blobs in Supabase Storage instead of the local Fly volume.

### Local Development with S3 (Optional)

To test S3 locally, add these variables to `.pds-local.env`:

```bash
PDS_BLOBSTORE_S3_ENDPOINT=https://<project-ref>.supabase.co/storage/v1/s3
PDS_BLOBSTORE_S3_BUCKET=pds-blobs
PDS_BLOBSTORE_S3_REGION=auto
PDS_BLOBSTORE_S3_ACCESS_KEY_ID=<access-key>
PDS_BLOBSTORE_S3_SECRET_ACCESS_KEY=<secret-key>
PDS_BLOBSTORE_S3_FORCE_PATH_STYLE=true
# Comment out PDS_BLOBSTORE_DISK_LOCATION to use S3
```

**Note**: Local dev defaults to disk storage for simplicity. Most developers don't need S3 locally.

### Verify Blob Upload

After deploying:

1. Create a test account (see "Creating User Accounts" section)
2. Upload an image via Bluesky app or API
3. Check Supabase Dashboard → Storage → pds-blobs bucket
4. Verify the blob appears in the bucket

### Troubleshooting

**Blobs not uploading:**

- Check `fly logs` for S3 errors
- Verify S3 credentials are correct: `fly secrets list --app trainers-pds`
- Ensure bucket exists and is accessible
- Check bucket permissions in Supabase Dashboard

**Blobs not accessible via federation:**

- Verify bucket is set to Private (not Public)
- Check CORS settings in Supabase Storage
- Test blob URL directly: `https://<project-ref>.supabase.co/storage/v1/object/public/pds-blobs/<blob-path>`

---

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

### SQLite Database

The SQLite database is stored in `/pds` on the Fly volume. Back up regularly:

```bash
# Create snapshot
fly volumes snapshots create <volume-id>

# List snapshots
fly volumes snapshots list <volume-id>
```

**Note**: Volume snapshots will be billable starting January 2026 (Fly.io announcement).

### Blobs (Supabase Storage)

Blobs are stored in Supabase Storage, which provides:

- Automatic replication across multiple regions
- 11-nines durability (99.999999999%)
- Point-in-time recovery (Supabase features)

No manual blob backups needed - Supabase handles this.

## Cost Estimate

| Resource            | Size/Usage             | Monthly Cost              |
| ------------------- | ---------------------- | ------------------------- |
| Fly Machine         | shared-cpu-1x, 1GB RAM | ~$5                       |
| Fly Volume (SQLite) | 10GB SSD               | ~$1.50                    |
| Supabase Storage    | 10GB blobs             | ~$0.15 (Free tier: 100GB) |
| Storage Egress      | 50GB/month             | ~$1.25                    |
| **Total (Early)**   |                        | **~$8/month**             |

### Scaling Costs

| Scenario | Users  | Blobs | Storage Cost | Egress Cost | Total |
| -------- | ------ | ----- | ------------ | ----------- | ----- |
| Early    | 100    | 10GB  | Free         | ~$1.25      | ~$8   |
| Growth   | 1,000  | 100GB | Free         | ~$12.50     | ~$20  |
| Scale    | 10,000 | 500GB | ~$10         | ~$62.50     | ~$80  |

**Notes**:

- Supabase Storage: First 100GB free, then $0.025/GB/month
- Supabase Egress: $0.025/GB (federated network access)
- Fly Machine + Volume costs remain ~$6.50/month

Scale options:

- More RAM/CPU for more concurrent users
- Larger Fly volume if SQLite grows (unlikely - mostly metadata)
- No blob storage limits with Supabase S3

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

### "UnsupportedDomain" error when creating accounts

If `create-account.sh` fails with `"Not a supported handle domain"`, the `PDS_SERVICE_HANDLE_DOMAINS` secret is missing or incorrect:

```bash
# Set it to allow @username.trainers.gg handles
flyctl secrets set "PDS_SERVICE_HANDLE_DOMAINS=.trainers.gg" --app trainers-pds
```

The leading dot is required. Without this, the PDS only accepts handles under `*.pds.trainers.gg`.

## Resources

- [AT Protocol Docs](https://atproto.com/docs)
- [PDS GitHub](https://github.com/bluesky-social/pds)
- [Fly.io Docs](https://fly.io/docs)
- [Bluesky Community](https://github.com/bluesky-social/atproto/discussions)
