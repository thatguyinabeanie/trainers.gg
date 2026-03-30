# Bluesky OAuth Setup

AT Protocol OAuth requires HTTPS with a publicly accessible URL — `localhost` is not allowed. Local development uses **ngrok** to tunnel requests.

## 1. Install ngrok (one-time)

```bash
# Install
brew install ngrok    # macOS
choco install ngrok   # Windows
snap install ngrok    # Linux

# Authenticate (get token from https://dashboard.ngrok.com/get-started/your-authtoken)
ngrok config add-authtoken <your-token>
```

## 2. Automatic setup via `pnpm dev`

When you run `pnpm dev`, the setup script automatically:

1. Starts an ngrok tunnel to `localhost:3000`
2. Generates an ES256 private key (if not present)
3. Creates the JWKS file from the public key
4. Sets `NEXT_PUBLIC_SITE_URL` and `ATPROTO_PRIVATE_KEY` in `.env.local`

## 3. Manual setup (if needed)

If automatic setup doesn't work, you can configure manually:

```bash
# Start ngrok
ngrok http 3000

# Add to .env.local
NEXT_PUBLIC_SITE_URL=https://<your-subdomain>.ngrok-free.app
ATPROTO_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

`NEXT_PUBLIC_SITE_URL` is used by OAuth callback routes, client metadata, and auth redirects to ensure URLs point to the public tunnel instead of `localhost`.

## Production Setup (Vercel)

**Generate a production private key:**

```bash
openssl ecparam -name prime256v1 -genkey -noout | openssl pkcs8 -topk8 -nocrypt
```

**Add to Vercel environment variables:**

1. Go to Vercel project settings > Environment Variables
2. Add `ATPROTO_PRIVATE_KEY` with the entire PEM output (including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`)
3. Escape newlines as `\n` (or use Vercel's multiline input)
4. JWKS is auto-generated during builds

**Important:** Never commit your private key or JWKS file to git!
