# trainers.gg

[![License: PolyForm Noncommercial](https://img.shields.io/badge/License-PolyForm%20Noncommercial%201.0.0-blue.svg)](https://polyformproject.org/licenses/noncommercial/1.0.0)

All-in-one integrated platform for Pokemon fans. Current focus: competitive battling (VGC, Showdown, Pokemon Champions). Integrated with the **AT Protocol (Bluesky)** for decentralized social features.

## Tech Stack

| Layer                | Technology                          |
| -------------------- | ----------------------------------- |
| **Web**              | Next.js 16 (React 19.2, App Router) |
| **Mobile**           | Expo 55 (React Native 0.83)         |
| **Database**         | Supabase (PostgreSQL + RLS)         |
| **Auth**             | Supabase Auth + Bluesky PDS         |
| **Social**           | AT Protocol (Bluesky)               |
| **PDS Hosting**      | Fly.io (`pds.trainers.gg`)          |
| **Edge Functions**   | Supabase Edge Functions (Deno)      |
| **Styling (Web)**    | Tailwind CSS 4                      |
| **Styling (Mobile)** | Tamagui                             |
| **Theme**            | @trainers/theme (OKLCH, light/dark) |
| **Monorepo**         | pnpm + Turborepo                    |

## Monorepo Structure

```
apps/
  web/                 # Next.js 16 web app (@trainers/web)
  mobile/              # Expo 55 mobile app (@trainers/mobile)

packages/
  pokemon/             # Pokemon data, validation, parsing
  posthog/             # Shared PostHog event name constants
  tournaments/         # Tournament logic — pairings, standings, brackets
  utils/               # Shared utilities — formatting, countries, tiers
  supabase/            # Supabase client, queries, edge functions
  atproto/             # AT Protocol / Bluesky utilities
  theme/               # Shared OKLCH color tokens
  validators/          # Zod schemas + team parsing

infra/
  pds/                 # Bluesky PDS on Fly.io
  ngrok/               # Local dev tunnel for AT Protocol OAuth

tooling/               # Shared ESLint, Prettier, Tailwind, TypeScript, test-utils configs
```

## Getting Started

### Prerequisites

- [mise](https://mise.jdx.dev/) — manages Node.js, pnpm, ngrok, and other tool versions
- [Docker](https://www.docker.com/) — required for local Supabase

### Setup

```bash
git clone https://github.com/thatguyinabeanie/trainers.gg.git
cd trainers.gg
mise install          # installs Node 22, pnpm, ngrok, lefthook, etc.
pnpm dev              # starts everything (auto-configures local Supabase + ngrok tunnel)
```

`pnpm dev` handles local Supabase startup, env var configuration, and ngrok tunneling automatically. Set `SKIP_LOCAL_SUPABASE=1` to use remote Supabase instead.

## Commands

| Command                | Description                      |
| ---------------------- | -------------------------------- |
| `pnpm dev`             | Start all apps in development    |
| `pnpm dev:web`         | Start web app only               |
| `pnpm dev:mobile`      | Start mobile app only            |
| `pnpm dev:backend`     | Start Supabase backend only      |
| `pnpm dev:web+backend` | Start web + Supabase in parallel |
| `pnpm build`           | Build all packages               |
| `pnpm lint`            | Lint all packages                |
| `pnpm typecheck`       | TypeScript check all packages    |
| `pnpm test`            | Run all tests                    |
| `pnpm test:e2e`        | Run Playwright E2E tests         |
| `pnpm format`          | Format with Prettier             |
| `pnpm db:start`        | Start local Supabase             |
| `pnpm db:stop`         | Stop local Supabase              |
| `pnpm db:reset`        | Reset and re-seed local database |

## Test Users (Local Development)

After running `pnpm db:reset`, the following test users are available (password: `Password123!`):

| Email                      | Username      | Role                             |
| -------------------------- | ------------- | -------------------------------- |
| `admin@trainers.local`     | admin_trainer | Site admin, VGC League org owner |
| `player@trainers.local`    | ash_ketchum   | Player, Pallet Town org owner    |
| `champion@trainers.local`  | cynthia       | Player                           |
| `gymleader@trainers.local` | brock         | Player                           |
| `elite@trainers.local`     | karen         | Player                           |
| `casual@trainers.local`    | red           | Player                           |

## Architecture

### Authentication

- **Supabase Auth** handles authentication (sign-up, sign-in, OAuth)
- **Bluesky PDS** provides decentralized identity (`@username.trainers.gg`)
- **Row Level Security (RLS)** uses `auth.uid()` for access control
- **Edge function** orchestrates unified account creation

### Bluesky Integration

Every user gets a Bluesky identity (`@username.trainers.gg`) with a DID stored in the users table. Posts are visible on bsky.app and other AT Protocol apps.

## Deployment

- **Web**: Auto-deploys to Vercel on push to `main`
- **Database**: Migrations applied automatically via Supabase Git Integration
- **PDS**: Deployed to Fly.io — see [docs/setup/pds-deployment.md](./docs/setup/pds-deployment.md)

### Production Setup Guides

- [Supabase production configuration](./docs/setup/supabase-production.md) — dashboard settings, secrets, OAuth providers
- [Bluesky OAuth setup](./docs/setup/bluesky-oauth.md) — ngrok tunnel, keys, production config
- [PDS deployment](./docs/setup/pds-deployment.md) — Fly.io commands and account creation

## Contributing

See [CLAUDE.md](./CLAUDE.md) for code style guidelines and architecture decisions.

By submitting a pull request or otherwise contributing to this project, you agree to the [Contributor License Agreement](./CLA.md).

## License

This project is licensed under the [PolyForm Noncommercial License 1.0.0](./LICENSE.md). You are free to use, modify, and distribute this software for any **non-commercial** purpose. Commercial use requires a separate paid license.

For commercial licensing inquiries, contact the copyright holder.
