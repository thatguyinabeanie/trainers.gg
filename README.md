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
  validators/          # Zod schemas (@trainers/validators)

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
- ngrok (for Bluesky OAuth in local development)

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

# Run specific app
pnpm dev:web
pnpm dev:mobile

# Run Supabase locally (requires Docker)
cd packages/supabase && pnpm local:start
```

### Bluesky OAuth Setup

OAuth credentials are **automatically configured** when you run `pnpm dev`:

1. ES256 private key is generated
2. JWKS file is created from the public key
3. ngrok URL is set as the OAuth redirect URI

#### Requirements for Local Development

**Install and authenticate ngrok (one-time setup):**

```bash
# Install ngrok
brew install ngrok    # macOS
choco install ngrok   # Windows
snap install ngrok    # Linux

# Get free auth token from https://dashboard.ngrok.com/get-started/your-authtoken
ngrok config add-authtoken <your-token>
```

After setup, `pnpm dev` will automatically:

- Start ngrok tunnel
- Generate OAuth credentials
- Configure environment variables

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
| `tournament_registrations` | Player registrations                        |
| `posts`                    | Local activity feed (synced with PDS)       |
| `follows`                  | Follow relationships                        |
| `likes`                    | Post likes                                  |
| `roles`                    | Role definitions (site and org scoped)      |
| `user_roles`               | Site-scoped role assignments                |

## Test Users (Local Development)

After running `pnpm supabase db reset` in the supabase package, the following test users are available:

| Email                      | Password      | Username      | Site Admin |
| -------------------------- | ------------- | ------------- | ---------- |
| `admin@trainers.local`     | `password123` | admin_trainer | Yes        |
| `player@trainers.local`    | `password123` | ash_ketchum   | No         |
| `champion@trainers.local`  | `password123` | cynthia       | No         |
| `gymleader@trainers.local` | `password123` | brock         | No         |
| `elite@trainers.local`     | `password123` | karen         | No         |
| `casual@trainers.local`    | `password123` | red           | No         |

## Deployment

### Web (Vercel)

The web app auto-deploys to Vercel on push to `main`.

### Supabase

Database migrations are automatically applied via Supabase Git Integration on PR creation/merge.

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

| Command           | Description                   |
| ----------------- | ----------------------------- |
| `pnpm dev`        | Start all apps in development |
| `pnpm dev:web`    | Start web app only            |
| `pnpm dev:mobile` | Start mobile app only         |
| `pnpm build`      | Build all packages            |
| `pnpm build:web`  | Build web app                 |
| `pnpm lint`       | Lint all packages             |
| `pnpm typecheck`  | TypeScript check all packages |
| `pnpm format`     | Format with Prettier          |
| `pnpm clean`      | Remove build artifacts        |

## Contributing

See [AGENTS.md](./AGENTS.md) for code style guidelines and architecture decisions.

## License

Private - All rights reserved.
