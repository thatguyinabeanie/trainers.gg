# infra/ngrok

Ngrok tunnel for local PDS development. Creates a public HTTPS URL pointing to the local PDS instance.

## Usage

```bash
./scripts/dev.sh   # Start ngrok tunnel
```

Used together with `infra/pds/local-dev.sh` to test PDS account creation and AT Protocol federation locally without deploying to Fly.io.
