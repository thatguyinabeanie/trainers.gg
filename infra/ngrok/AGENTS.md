# infra/ngrok

Ngrok tunnel for local development. Tunnels port 3000 to a public HTTPS URL. Runs as a Turbo TUI panel via `pnpm dev`.

## Configuration

- Static domain configured via `NGROK_STATIC_DOMAIN` in `.env.ngrok` (copy from `.env.ngrok.example`)
- Ngrok auth token: sign up at ngrok.com, then `ngrok config add-authtoken <token>`
- The script auto-updates `NEXT_PUBLIC_SITE_URL` in root `.env.local` with the tunnel URL

## Usage

Starts automatically with `pnpm dev`. Can also run standalone:

```bash
./scripts/dev.sh   # Start ngrok tunnel
```

Used together with `infra/pds/local-dev.sh` to test PDS account creation and AT Protocol federation locally.
