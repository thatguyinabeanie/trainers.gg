# trainers.gg

A Pokemon community platform for competitive players, tournament organizers, and teams. Integrated with the **AT Protocol (Bluesky)** for decentralized social features.

## Tech Stack

| Layer                 | Technology                          |
| --------------------- | ----------------------------------- |
| **Web**               | Next.js 16 (React 19, App Router)   |
| **Mobile**            | Expo 54 (React Native, React 19)    |
| **Database**          | Supabase (PostgreSQL)               |
| **Auth**              | Supabase Auth + Bluesky PDS         |
| **Social/Federation** | AT Protocol (Bluesky)               |
| **PDS Hosting**       | Fly.io (`pds.trainers.gg`)          |
| **DNS**               | Vercel DNS                          |
| **Realtime**          | Supabase Realtime                   |
| **Edge Functions**    | Supabase Edge Functions (Deno)      |
| **Styling (Web)**     | Tailwind CSS 4                      |
| **Styling (Mobile)**  | Tamagui                             |
| **Theme**             | @trainers/theme (OKLCH, light/dark) |
| **Monorepo**          | pnpm + Turborepo                    |

## Monorepo Structure

```
apps/
  web/                 # Next.js 16 web app (@trainers/web)
  mobile/              # Expo 54 mobile app (@trainers/mobile)

packages/
  supabase/            # Supabase client, queries, mutations, edge functions (@trainers/supabase)
  atproto/             # AT Protocol / Bluesky utilities (@trainers/atproto)
  ui/                  # Shared UI components (@trainers/ui)
  theme/               # Shared theme tokens (@trainers/theme)
  validators/          # Zod schemas + team parsing (@trainers/validators)

infra/
  pds/                 # Bluesky PDS deployment config (Fly.io)

tooling/
  eslint/              # Shared ESLint config (@trainers/eslint-config)
  prettier/            # Shared Prettier config (@trainers/prettier-config)
  tailwind/            # Shared Tailwind config (@trainers/tailwind-config)
  typescript/          # Shared TypeScript config (@trainers/typescript-config)
```

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker (for local Supabase development)
- [ngrok](https://ngrok.com/) (for Bluesky OAuth in local development) — see [Bluesky OAuth Setup](#bluesky-oauth-setup-local-development)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/trainers.gg.git
cd trainers.gg

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env.local
```

### Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Development

```bash
# Run all apps in parallel
pnpm dev

# Run specific apps
pnpm dev:web              # Web app only
pnpm dev:mobile           # Mobile app only
pnpm dev:backend          # Supabase backend only
pnpm dev:web+backend      # Web + Supabase in parallel

# Database management
pnpm db:start             # Start local Supabase (requires Docker)
pnpm db:stop              # Stop local Supabase
pnpm db:reset             # Reset and re-seed local database
```

### Bluesky OAuth Setup (Local Development)

AT Protocol OAuth requires HTTPS with a publicly accessible URL — `localhost` is not allowed. Local development uses **ngrok** to tunnel requests.

#### 1. Install ngrok (one-time)

```bash
# Install
brew install ngrok    # macOS
choco install ngrok   # Windows
snap install ngrok    # Linux

# Authenticate (get token from https://dashboard.ngrok.com/get-started/your-authtoken)
ngrok config add-authtoken <your-token>
```

#### 2. Automatic setup via `pnpm dev`

When you run `pnpm dev`, the setup script automatically:

1. Starts an ngrok tunnel to `localhost:3000`
2. Generates an ES256 private key (if not present)
3. Creates the JWKS file from the public key
4. Sets `NEXT_PUBLIC_SITE_URL` and `ATPROTO_PRIVATE_KEY` in `.env.local`

#### 3. Manual setup (if needed)

If automatic setup doesn't work, you can configure manually:

```bash
# Start ngrok
ngrok http 3000

# Add to .env.local
NEXT_PUBLIC_SITE_URL=https://<your-subdomain>.ngrok-free.app
ATPROTO_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

`NEXT_PUBLIC_SITE_URL` is used by OAuth callback routes, client metadata, and auth redirects to ensure URLs point to the public tunnel instead of `localhost`.

#### Production Setup (Vercel)

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

### Build

```bash
# Build all packages
pnpm build

# Build specific app
pnpm build:web
pnpm build:mobile
```

## Architecture

### Authentication Flow (Unified Supabase + Bluesky)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Signup Flow                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│  1. User enters email, username, password                                   │
│  2. Client calls /functions/v1/signup edge function                         │
│  3. Edge function creates Supabase Auth account                             │
│  4. Edge function creates PDS account (@username.trainers.gg)               │
│  5. Edge function stores DID in users table                                 │
│  6. User receives session for both systems                                  │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                           Identity Architecture                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  Supabase Auth ID  ←─────→  users.id  ←─────→  DID (AT Protocol)            │
│                                  │                                           │
│                                  ├── pds_handle: @username.trainers.gg      │
│                                  └── pds_status: pending | active | failed  │
└─────────────────────────────────────────────────────────────────────────────┘
```

- **Supabase Auth** handles authentication (sign-up, sign-in, OAuth)
- **Bluesky PDS** provides decentralized identity (`@username.trainers.gg`)
- **Row Level Security (RLS)** uses `auth.uid()` for access control
- **Edge function** orchestrates unified account creation

### Bluesky Integration

Every user gets a Bluesky identity:

| Feature        | Description                                          |
| -------------- | ---------------------------------------------------- |
| **Handle**     | `@username.trainers.gg`                              |
| **DID**        | Decentralized Identifier stored in users table       |
| **Federation** | Posts visible on bsky.app and other AT Protocol apps |
| **Login**      | Users can login to bsky.app with their handle        |

### Database

- **PostgreSQL** via Supabase with Row Level Security
- **Edge Functions** for webhooks and server-side operations

### Key Tables

| Table                      | Description                                 |
| -------------------------- | ------------------------------------------- |
| `users`                    | User accounts with DID and PDS handle       |
| `alts`                     | Alternate player identities for tournaments |
| `organizations`            | Tournament organizer accounts               |
| `tournaments`              | Tournament events                           |
| `tournament_registrations` | Player registrations (with team submission) |
| `posts`                    | Local activity feed (synced with PDS)       |
| `follows`                  | Follow relationships                        |
| `likes`                    | Post likes                                  |
| `roles`                    | Role definitions (site and org scoped)      |
| `user_roles`               | Site-scoped role assignments                |

## Test Users (Local Development)

After running `pnpm db:reset`, the following test users are available:

| Email                      | Password       | Username      | Site Admin |
| -------------------------- | -------------- | ------------- | ---------- |
| `admin@trainers.local`     | `Password123!` | admin_trainer | Yes        |
| `player@trainers.local`    | `Password123!` | ash_ketchum   | No         |
| `champion@trainers.local`  | `Password123!` | cynthia       | No         |
| `gymleader@trainers.local` | `Password123!` | brock         | No         |
| `elite@trainers.local`     | `Password123!` | karen         | No         |
| `casual@trainers.local`    | `Password123!` | red           | No         |

## Deployment

### Web (Vercel)

The web app auto-deploys to Vercel on push to `main`.

### Supabase

Database migrations are automatically applied via Supabase Git Integration on PR creation/merge.

#### Production Dashboard Setup

The local development environment is fully configured via `config.toml` and seed data, but several settings **must be manually configured** in the [Supabase Dashboard](https://supabase.com/dashboard) for production. Migrations handle schema, RLS policies, and function creation, but the items below are not covered by migrations.

##### 1. Custom Access Token Hook (required for admin access)

The `custom_access_token_hook` function injects `site_roles` into the JWT. The migration creates the function and grants permissions, but the hook itself must be **activated in the dashboard**.

1. Go to **Authentication > Hooks**
2. Enable the **Custom Access Token** hook
3. Select the `public.custom_access_token_hook` function

Without this, the JWT will never contain `site_roles`, and `/admin` routes will always show "forbidden" — even if `user_roles` are correctly assigned in the database. After enabling the hook, existing users must **sign out and sign back in** to get a new JWT with the updated claims.

##### 2. Edge Function Secrets

The `[edge_runtime.secrets]` in `config.toml` only apply to local Supabase. Production secrets must be set via **Dashboard > Edge Functions > Secrets** (or `supabase secrets set`):

| Secret               | Description                               | Example                       |
| -------------------- | ----------------------------------------- | ----------------------------- |
| `PDS_HOST`           | Production PDS URL                        | `https://pds.trainers.gg`     |
| `PDS_ADMIN_PASSWORD` | PDS admin password                        | *(from Fly.io secrets)*       |
| `PDS_HANDLE_DOMAIN`  | Domain for user handles                   | `trainers.gg`                 |
| `RESEND_API_KEY`     | Resend API key for transactional email    | `re_...`                      |

##### 3. OAuth Providers

Discord and GitHub are configured in `config.toml` for local dev only. In production, configure each provider in **Dashboard > Authentication > Providers**:

- **Discord**: Set production client ID, secret, and redirect URL
- **GitHub**: Set production client ID, secret, and redirect URL
- Add the production site URL and any preview deployment URLs to the **Redirect URLs** allowlist

##### 4. Storage Bucket: `pds-blobs`

The `pds-blobs` bucket is defined in `config.toml` for local dev but does not get created by migrations. Create it manually in **Dashboard > Storage**:

- **Name**: `pds-blobs`
- **Public**: No
- **File size limit**: 50 MiB
- **Allowed MIME types**: `image/*`, `video/*`

##### 5. Auth Settings

Verify these under **Dashboard > Authentication > URL Configuration**:

- **Site URL**: Set to the production URL (e.g., `https://trainers.gg`)
- **Redirect URLs**: Add production URLs and Vercel preview deployment patterns (e.g., `https://*.vercel.app/**`)

### Bluesky PDS (Fly.io)

The PDS is deployed to Fly.io and accessible at `https://pds.trainers.gg`.

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

See [infra/pds/README.md](./infra/pds/README.md) for full documentation.

## Commands

| Command                | Description                      |
| ---------------------- | -------------------------------- |
| `pnpm dev`             | Start all apps in development    |
| `pnpm dev:web`         | Start web app only               |
| `pnpm dev:mobile`      | Start mobile app only            |
| `pnpm dev:backend`     | Start Supabase backend only      |
| `pnpm dev:web+backend` | Start web + Supabase in parallel |
| `pnpm build`           | Build all packages               |
| `pnpm build:web`       | Build web app                    |
| `pnpm build:mobile`    | EAS build for mobile (iOS sim)   |
| `pnpm lint`            | Lint all packages                |
| `pnpm typecheck`       | TypeScript check all packages    |
| `pnpm format`          | Format with Prettier             |
| `pnpm clean`           | Remove build artifacts           |
| `pnpm db:start`        | Start local Supabase             |
| `pnpm db:stop`         | Stop local Supabase              |
| `pnpm db:reset`        | Reset and re-seed local database |
| `pnpm db:migrate`      | Push migrations to local DB      |

## Contributing

See [AGENTS.md](./AGENTS.md) for code style guidelines and architecture decisions.

## License

Private - All rights reserved.
