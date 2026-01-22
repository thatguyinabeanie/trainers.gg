# trainers.gg

A Pokemon community platform for competitive players, tournament organizers, and teams.

## Tech Stack

| Layer              | Technology                                |
| ------------------ | ----------------------------------------- |
| **Web**            | Next.js 16 (React 19, App Router)         |
| **Mobile**         | Expo 54 (React Native, React 19)          |
| **Database**       | Supabase (PostgreSQL)                     |
| **Auth**           | Clerk                                     |
| **Realtime**       | Supabase Realtime                         |
| **Edge Functions** | Supabase Edge Functions (Deno)            |
| **Styling**        | Tailwind CSS 4 (web), NativeWind (mobile) |
| **Monorepo**       | pnpm + Turborepo                          |

## Monorepo Structure

```
apps/
  web/                 # Next.js 16 web app (@trainers/web)
  mobile/              # Expo 54 mobile app (@trainers/mobile)

packages/
  supabase/            # Supabase client, queries, mutations, edge functions (@trainers/supabase)
  backend-convex/      # Convex backend (legacy/migration) (@trainers/backend)
  ui/                  # Shared UI components (@trainers/ui)
  theme/               # Shared theme tokens (@trainers/theme)
  validators/          # Zod schemas (@trainers/validators)

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

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
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

### Build

```bash
# Build all packages
pnpm build

# Build specific app
pnpm build:web
```

## Architecture

### Authentication Flow

```
User → Clerk (Auth) → JWT Token → Supabase (RLS)
                   ↓
            Clerk Webhook → Supabase Edge Function → users/profiles tables
```

- **Clerk** handles all authentication (sign-up, sign-in, OAuth, MFA)
- **Supabase** uses Clerk's JWT tokens for Row Level Security (RLS)
- **Webhooks** sync user data from Clerk to Supabase on user.created/updated/deleted

### Database

- **PostgreSQL** via Supabase with Row Level Security
- **Third-Party Auth** integration with Clerk (native JWT verification)
- **Edge Functions** for webhooks and server-side operations

### Key Tables

| Table                      | Description                                      |
| -------------------------- | ------------------------------------------------ |
| `users`                    | User accounts (synced from Clerk via webhook)    |
| `profiles`                 | Player profiles (username, display name, avatar) |
| `organizations`            | Tournament organizer accounts                    |
| `tournaments`              | Tournament events                                |
| `tournament_registrations` | Player registrations                             |

## Deployment

### Web (Vercel)

The web app auto-deploys to Vercel on push to `main`.

### Supabase

Database migrations are automatically applied via Supabase Git Integration on PR creation/merge.

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
