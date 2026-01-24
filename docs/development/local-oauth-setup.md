# Local OAuth Development Setup

AT Protocol OAuth requires **public HTTPS URLs** for web applications. Localhost/loopback redirect URIs are explicitly forbidden by the spec for `application_type: "web"`.

This guide explains how to test Bluesky OAuth locally using a tunnel service.

---

## Why Tunnels Are Required

The AT Protocol OAuth specification states:

> "Loopback redirect URIs are only allowed for native apps"

Since trainers.gg uses `application_type: "web"`, we cannot use `http://localhost:3000` or `http://127.0.0.1:3000` as redirect URIs. The authorization server will reject these with an `invalid_request` error.

---

## Option 1: ngrok (Recommended)

### Installation

```bash
# macOS
brew install ngrok

# Or download from https://ngrok.com/download
```

### Setup

1. Create a free account at https://ngrok.com
2. Get your auth token from the dashboard
3. Configure ngrok:
   ```bash
   ngrok config add-authtoken YOUR_AUTH_TOKEN
   ```

### Usage

1. Start the Next.js dev server:

   ```bash
   pnpm dev:web
   ```

2. In another terminal, start ngrok:

   ```bash
   ngrok http 3000
   ```

3. Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

4. Set it in your environment:

   ```bash
   # In apps/web/.env.local
   NEXT_PUBLIC_SITE_URL=https://abc123.ngrok.io
   ```

5. Restart the dev server to pick up the new URL

6. Access your app via the ngrok URL, not localhost

---

## Option 2: Cloudflare Tunnel

### Installation

```bash
# macOS
brew install cloudflared

# Or download from https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/
```

### Usage (Quick Tunnel - No Account Required)

```bash
# Start the dev server
pnpm dev:web

# In another terminal
cloudflared tunnel --url http://localhost:3000
```

This creates a temporary public URL. Copy it and set `NEXT_PUBLIC_SITE_URL` as shown above.

---

## How It Works

When you set `NEXT_PUBLIC_SITE_URL`, the OAuth client uses this URL for:

1. **Client ID**: `https://your-tunnel.ngrok.io/api/oauth/client-metadata`
2. **Redirect URI**: `https://your-tunnel.ngrok.io/api/oauth/callback`
3. **JWKS URI**: `https://your-tunnel.ngrok.io/oauth/jwks.json`

The dynamic `/api/oauth/client-metadata` endpoint generates metadata based on the request host, so the authorization server sees consistent URLs.

---

## Environment Detection

The OAuth client automatically detects the environment:

| Environment       | Behavior                                  |
| ----------------- | ----------------------------------------- |
| Production        | Uses `https://trainers.gg`                |
| Vercel Preview    | OAuth disabled (returns 503 error)        |
| Local + Tunnel    | Uses `NEXT_PUBLIC_SITE_URL` env var       |
| Local (no tunnel) | Falls back to localhost (OAuth will fail) |

**Note:** Bluesky OAuth is intentionally disabled on Vercel preview deployments because Vercel's deployment protection blocks external access to OAuth metadata endpoints.

---

## Troubleshooting

### "invalid_request: Invalid redirect_uri"

- Make sure `NEXT_PUBLIC_SITE_URL` is set to your tunnel URL
- Restart the dev server after changing the env var
- Access the app via the tunnel URL, not localhost

### "Failed to fetch client metadata"

- Ensure the tunnel is running
- Check that the tunnel URL is accessible in your browser
- Verify `/api/oauth/client-metadata` returns valid JSON

### ngrok URL changed

Free ngrok accounts get a new URL each session. Update `NEXT_PUBLIC_SITE_URL` accordingly. Consider ngrok Pro for a stable subdomain.

---

## Production Note

In production (`https://trainers.gg`), no tunnel is needed. The system automatically uses the correct URLs.

**Vercel preview deployments do not support Bluesky OAuth** due to deployment protection. Test OAuth on production or use a local tunnel.
