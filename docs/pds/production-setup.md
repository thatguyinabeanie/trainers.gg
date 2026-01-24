# Bluesky PDS Production Setup

This document covers running the trainers.gg PDS (`pds.trainers.gg`) in a production-ready manner.

## Current Setup

| Component | Configuration                     |
| --------- | --------------------------------- |
| Hosting   | Fly.io (`trainers-pds` app)       |
| Region    | `ord` (Chicago)                   |
| Database  | SQLite on Fly volume              |
| Blobs     | Disk storage on Fly volume        |
| Backups   | Fly volume snapshots (5 retained) |

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Bluesky Network                                 │
│   bsky.social ◄──────► Relay (bsky.network) ◄──────► pds.trainers.gg       │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ▲
                                    │ Federation
                                    │
┌───────────────────────────────────┴─────────────────────────────────────────┐
│                           pds.trainers.gg (Fly.io)                          │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ Fly Volume (/pds)                                                      │ │
│  │  ├── account.sqlite      ← User accounts, sessions                     │ │
│  │  ├── sequencer.sqlite    ← Event sequencing                            │ │
│  │  ├── did_cache.sqlite    ← DID resolution cache                        │ │
│  │  ├── actors/             ← Per-user SQLite databases (repos)           │ │
│  │  └── blobs/              ← Images, media files                         │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Database

### SQLite Only (No Postgres Support)

The Bluesky PDS uses **SQLite exclusively**. Postgres is not supported.

| Database           | Location                | Purpose                |
| ------------------ | ----------------------- | ---------------------- |
| `account.sqlite`   | `/pds/account.sqlite`   | Account/user data      |
| `sequencer.sqlite` | `/pds/sequencer.sqlite` | Event sequencing       |
| `did_cache.sqlite` | `/pds/did_cache.sqlite` | DID resolution cache   |
| Actor stores       | `/pds/actors/*.sqlite`  | One SQLite DB per user |

This design is intentional - per-user database isolation enables future sharding.

### Environment Variables

```bash
PDS_DATA_DIRECTORY=/pds                    # Base directory for all data
PDS_ACTOR_STORE_CACHE_SIZE=100             # Number of actor DBs to cache in memory
```

---

## Blob Storage

### Option 1: Local Disk (Current)

```bash
PDS_BLOBSTORE_DISK_LOCATION=/pds/blobs
```

Simple but doesn't scale. All blobs stored on the Fly volume.

### Option 2: S3-Compatible Storage (Recommended)

For production, use external blob storage with CDN support.

#### Cloudflare R2

```bash
PDS_BLOBSTORE_S3_BUCKET=trainers-pds-blobs
PDS_BLOBSTORE_S3_REGION=auto
PDS_BLOBSTORE_S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
PDS_BLOBSTORE_S3_ACCESS_KEY_ID=<key>
PDS_BLOBSTORE_S3_SECRET_ACCESS_KEY=<secret>
PDS_BLOBSTORE_S3_FORCE_PATH_STYLE=true
```

#### AWS S3

```bash
PDS_BLOBSTORE_S3_BUCKET=trainers-pds-blobs
PDS_BLOBSTORE_S3_REGION=us-east-1
PDS_BLOBSTORE_S3_ENDPOINT=https://s3.amazonaws.com
PDS_BLOBSTORE_S3_ACCESS_KEY_ID=<key>
PDS_BLOBSTORE_S3_SECRET_ACCESS_KEY=<secret>
```

#### Google Cloud Storage

```bash
PDS_BLOBSTORE_S3_BUCKET=trainers-pds-blobs
PDS_BLOBSTORE_S3_REGION=us-central1
PDS_BLOBSTORE_S3_ENDPOINT=https://storage.googleapis.com
PDS_BLOBSTORE_S3_ACCESS_KEY_ID=<key>
PDS_BLOBSTORE_S3_SECRET_ACCESS_KEY=<secret>
```

**Important:** Remove `PDS_BLOBSTORE_DISK_LOCATION` when using S3. You cannot have both configured.

---

## Scaling

### Multi-Instance Support

The PDS supports running multiple instances with Redis for shared state:

```bash
PDS_REDIS_SCRATCH_ADDRESS=redis.example.com:6379
PDS_REDIS_SCRATCH_PASSWORD=<password>
PDS_RATE_LIMITS_ENABLED=true
```

Redis enables:

- Shared rate limiting state across instances
- Session management consistency

### Scaling Limitations

| Designed For       | Not Designed For       |
| ------------------ | ---------------------- |
| 1-20 users per PDS | Thousands of users     |
| Small communities  | Large public instances |

For larger deployments, Bluesky uses an "Entryway" pattern with distributed PDS backends.

---

## Backups

### Current: Fly Volume Snapshots

Fly automatically takes volume snapshots (5 retained). This provides basic disaster recovery.

### Recommended: Litestream

[Litestream](https://litestream.io/) provides continuous SQLite replication to S3/R2.

#### Setup

1. Add environment variable:

   ```bash
   PDS_SQLITE_DISABLE_WAL_AUTO_CHECKPOINT=true
   ```

2. Run Litestream as a sidecar process that:
   - Monitors SQLite databases in `/pds/`
   - Continuously replicates to S3/R2
   - Handles WAL checkpointing

#### Data to Back Up

| Path                    | Contents          | Priority                  |
| ----------------------- | ----------------- | ------------------------- |
| `/pds/account.sqlite`   | Account data      | Critical                  |
| `/pds/sequencer.sqlite` | Event sequence    | Critical                  |
| `/pds/actors/`          | User repositories | Critical                  |
| `/pds/blobs/`           | Media files       | Important (if using disk) |

### Key Security

The PLC rotation key is critical and should be stored securely:

```bash
PDS_PLC_ROTATION_KEY_K256_PRIVATE_KEY_HEX  # Store in KMS/HSM, not env vars
```

---

## Environment Variables Reference

### Required

```bash
PDS_HOSTNAME=pds.trainers.gg
PDS_JWT_SECRET=<generated-secret>
PDS_ADMIN_PASSWORD=<admin-password>
PDS_PLC_ROTATION_KEY_K256_PRIVATE_KEY_HEX=<rotation-key>
```

### Database/Storage

```bash
PDS_DATA_DIRECTORY=/pds
PDS_BLOBSTORE_DISK_LOCATION=/pds/blobs        # OR use S3 vars
PDS_BLOBSTORE_S3_BUCKET=
PDS_BLOBSTORE_S3_REGION=
PDS_BLOBSTORE_S3_ENDPOINT=
PDS_BLOBSTORE_S3_ACCESS_KEY_ID=
PDS_BLOBSTORE_S3_SECRET_ACCESS_KEY=
PDS_BLOBSTORE_S3_FORCE_PATH_STYLE=true
PDS_SQLITE_DISABLE_WAL_AUTO_CHECKPOINT=true   # For Litestream
```

### Federation

```bash
PDS_DID_PLC_URL=https://plc.directory
PDS_BSKY_APP_VIEW_URL=https://api.bsky.app
PDS_BSKY_APP_VIEW_DID=did:web:api.bsky.app
PDS_REPORT_SERVICE_URL=https://mod.bsky.app
PDS_REPORT_SERVICE_DID=did:plc:ar7c4by46qjdydhdevvrndac
PDS_CRAWLERS=https://bsky.network
PDS_SERVICE_HANDLE_DOMAINS=.trainers.gg
```

### Scaling

```bash
PDS_REDIS_SCRATCH_ADDRESS=redis.example.com:6379
PDS_REDIS_SCRATCH_PASSWORD=<password>
PDS_RATE_LIMITS_ENABLED=true
```

### Email

```bash
PDS_EMAIL_SMTP_URL=smtps://username:password@smtp.example.com/
PDS_EMAIL_FROM_ADDRESS=admin@trainers.gg
```

---

## Production Checklist

| Task                     | Status  | Notes           |
| ------------------------ | ------- | --------------- |
| PDS running on Fly.io    | ✓       | Chicago region  |
| Custom domain configured | ✓       | pds.trainers.gg |
| TLS/HTTPS                | ✓       | Via Fly         |
| Health checks            | ✓       | `/xrpc/_health` |
| Volume snapshots         | ✓       | 5 retained      |
| Move blobs to R2         | Pending | Recommended     |
| Litestream backups       | Pending | Recommended     |
| Redis for scaling        | Pending | When needed     |

---

## Monitoring

### Health Check

```bash
curl https://pds.trainers.gg/xrpc/_health
```

### WebSocket Test

```bash
websocat wss://pds.trainers.gg/xrpc/com.atproto.sync.subscribeRepos?cursor=0
```

### Fly.io Dashboard

- Machines: https://fly.io/apps/trainers-pds/machines
- Metrics: https://fly.io/apps/trainers-pds/metrics
- Logs: https://fly.io/apps/trainers-pds/monitoring

---

## Migration Procedures

### Migrating Blobs to S3/R2

1. Create S3 bucket and get credentials
2. Copy existing blobs:
   ```bash
   fly ssh console -a trainers-pds
   # Use aws-cli or rclone to sync /pds/blobs to S3
   ```
3. Update Fly secrets:
   ```bash
   fly secrets set \
     PDS_BLOBSTORE_S3_BUCKET=trainers-pds-blobs \
     PDS_BLOBSTORE_S3_REGION=auto \
     PDS_BLOBSTORE_S3_ENDPOINT=https://<id>.r2.cloudflarestorage.com \
     PDS_BLOBSTORE_S3_ACCESS_KEY_ID=<key> \
     PDS_BLOBSTORE_S3_SECRET_ACCESS_KEY=<secret> \
     -a trainers-pds
   ```
4. Remove disk location:
   ```bash
   fly secrets unset PDS_BLOBSTORE_DISK_LOCATION -a trainers-pds
   ```
5. Deploy and verify

### Changing Regions

See the Fly CLI commands for volume forking and machine cloning:

```bash
# Fork volume to new region
fly volumes fork <vol_id> --region <new_region> -a trainers-pds

# Clone machine with new volume
fly machines clone <machine_id> --region <new_region> --attach-volume <new_vol_id>:/pds -a trainers-pds

# Destroy old machine and volume
fly machines destroy <old_machine_id> -a trainers-pds
fly volumes destroy <old_vol_id> -a trainers-pds
```

---

## Resources

- [Official PDS Repository](https://github.com/bluesky-social/pds)
- [AT Protocol Production Guide](https://atproto.com/guides/going-to-production)
- [Self-Hosting Guide](https://atproto.com/guides/self-hosting)
- [Litestream Documentation](https://litestream.io/)
- [Fly.io Volumes](https://fly.io/docs/reference/volumes/)
