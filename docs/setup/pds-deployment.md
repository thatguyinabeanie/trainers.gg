# Bluesky PDS Deployment (Fly.io)

The PDS is deployed to Fly.io and accessible at `https://pds.trainers.gg`.

## Commands

```bash
cd infra/pds

# Full deployment (Fly + DNS + SSL + Supabase secrets)
./deploy.sh

# Or use individual commands
make deploy       # Deploy to Fly.io
make status       # Check PDS status
make logs         # Stream logs
make health       # Check health endpoint

# Create a user account
./create-account.sh <username> <email> <password>
```

See [infra/pds/README.md](../../infra/pds/README.md) for full documentation.
