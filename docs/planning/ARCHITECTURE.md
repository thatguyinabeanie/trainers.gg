# Architecture - trainers.gg

This document describes the monorepo structure and architecture for trainers.gg.

---

## Monorepo Structure

```
trainers.gg/
├── apps/
│   ├── web/                        # Next.js 16 app (React 19)
│   │   ├── src/
│   │   │   ├── app/                # App Router pages
│   │   │   ├── components/         # App-specific components
│   │   │   ├── hooks/              # React hooks
│   │   │   ├── lib/                # App-specific utilities
│   │   │   └── styles/             # Global styles
│   │   ├── public/                 # Static assets
│   │   ├── next.config.ts
│   │   ├── tailwind.config.ts
│   │   └── package.json
│   │
│   └── mobile/                     # Expo 54 app (React 19)
│       ├── src/
│       │   ├── app/                # Expo Router screens
│       │   ├── components/         # App-specific components
│       │   └── lib/                # App-specific utilities
│       ├── assets/                 # Images, fonts
│       ├── app.json
│       ├── tamagui.config.ts       # Tamagui theme config
│       └── package.json
│
├── packages/
│   ├── supabase/                   # Supabase backend
│   │   ├── src/
│   │   │   ├── client.ts           # Client creation functions
│   │   │   ├── types.ts            # Generated database types
│   │   │   ├── queries/            # Read-only query functions
│   │   │   └── mutations/          # Write operations
│   │   ├── supabase/
│   │   │   ├── functions/          # Edge functions (Deno)
│   │   │   │   ├── signup/         # Unified Supabase + PDS signup
│   │   │   │   └── _shared/        # Shared utilities (CORS, etc.)
│   │   │   └── migrations/         # SQL migration files
│   │   └── package.json
│   │
│   ├── atproto/                    # AT Protocol / Bluesky utilities
│   │   ├── src/
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── ui/                         # Shared web UI components
│   │   ├── src/
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── card.tsx
│   │   │   └── ... (shadcn components)
│   │   └── package.json
│   │
│   ├── theme/                      # Shared theme tokens
│   │   ├── src/
│   │   │   ├── primitives/         # OKLCH color definitions
│   │   │   ├── tokens/             # Semantic token mappings
│   │   │   └── generated/          # Generated CSS and mobile themes
│   │   └── package.json
│   │
│   └── validators/                 # Shared Zod schemas
│       ├── src/
│       │   ├── user.ts
│       │   ├── post.ts
│       │   └── index.ts
│       └── package.json
│
├── infra/
│   └── pds/                        # Bluesky PDS deployment (Fly.io)
│       ├── fly.toml
│       ├── deploy.sh
│       ├── create-account.sh
│       └── README.md
│
├── tooling/
│   ├── typescript/                 # Shared TypeScript configs
│   │   ├── base.json
│   │   ├── nextjs.json
│   │   ├── expo.json
│   │   └── package.json
│   │
│   ├── eslint/                     # Shared ESLint config
│   │   ├── base.js
│   │   ├── nextjs.js
│   │   └── package.json
│   │
│   ├── prettier/                   # Shared Prettier config
│   │   ├── index.mjs
│   │   └── package.json
│   │
│   └── tailwind/                   # Shared Tailwind config
│       ├── index.ts
│       └── package.json
│
├── turbo.json                      # Turborepo configuration
├── pnpm-workspace.yaml             # pnpm workspace config
├── package.json                    # Root package.json
├── AGENTS.md                       # Agent guidelines
└── README.md
```

---

## Package Dependencies

### Dependency Graph

```
                    ┌─────────────────┐
                    │    tooling/*    │
                    │ (configs only)  │
                    └────────┬────────┘
                             │ extends/uses
         ┌───────────────────┼───────────────────┐
         │                   │                   │
         ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌───────────────────┐
│  packages/ui    │ │packages/supabase│ │packages/validators│
│  (web only)     │ │   (backend)     │ │    (shared)       │
└────────┬────────┘ └────────┬────────┘ └────────┬──────────┘
         │                   │                   │
         │      ┌────────────┴────────────┐      │
         │      │                         │      │
         ▼      ▼                         ▼      ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│       apps/web          │     │      apps/mobile        │
│     (Next.js 16)        │     │       (Expo 54)         │
└─────────────────────────┘     └─────────────────────────┘
```

### Package Naming Convention

All internal packages use the `@trainers` namespace:

| Package               | Name                          | Description                          |
| --------------------- | ----------------------------- | ------------------------------------ |
| `packages/supabase`   | `@trainers/supabase`          | Supabase client, queries, edge funcs |
| `packages/atproto`    | `@trainers/atproto`           | AT Protocol / Bluesky utilities      |
| `packages/ui`         | `@trainers/ui`                | Web UI components (shadcn)           |
| `packages/theme`      | `@trainers/theme`             | Shared theme tokens (OKLCH colors)   |
| `packages/validators` | `@trainers/validators`        | Shared Zod validation schemas        |
| `tooling/typescript`  | `@trainers/typescript-config` | Shared TypeScript configs            |
| `tooling/eslint`      | `@trainers/eslint-config`     | Shared ESLint configs                |
| `tooling/prettier`    | `@trainers/prettier-config`   | Shared Prettier config               |
| `tooling/tailwind`    | `@trainers/tailwind-config`   | Shared Tailwind theme                |

---

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                      │
├────────────────────────────────┬─────────────────────────────────────────┤
│         Web (Next.js 16)       │           Mobile (Expo 54)              │
│         React 19               │           React 19                      │
│         Tailwind CSS 4         │           Tamagui                       │
│         shadcn/ui              │                                         │
└────────────────────────────────┴─────────────────────────────────────────┘
                    │                                    │
                    │ @supabase/ssr                      │ @supabase/supabase-js
                    ▼                                    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                            SUPABASE                                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │  PostgreSQL │  │   Auth      │  │  Edge Funcs │  │    Realtime     │  │
│  │  + RLS      │  │             │  │   (Deno)    │  │                 │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
                    │
                    │ Edge Functions call PDS API
                    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                         BLUESKY PDS (pds.trainers.gg)                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐  │
│  │  User Accounts  │  │  DID / Handles  │  │  Federation (Relay)    │  │
│  │  @user.trainers │  │  did:plc:...    │  │  → bsky.network        │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
                    │
                    │ Federates with
                    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                         BLUESKY NETWORK                                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐  │
│  │  bsky.social    │  │  Relay          │  │  AppView                │  │
│  │  (main PDS)     │  │  bsky.network   │  │  (aggregation)          │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Key Architecture Decisions

### 1. Supabase as Backend

Supabase handles:

- **Database**: PostgreSQL with Row Level Security (RLS)
- **Authentication**: Email/password, OAuth providers
- **Edge Functions**: Deno runtime for server-side logic
- **Realtime**: Live subscriptions for updates
- **Storage**: File storage for avatars, images (future)

### 2. Self-Hosted Bluesky PDS

We run our own PDS at `pds.trainers.gg` for:

- Custom handles: `@username.trainers.gg`
- Full control over user data
- Federation with the broader Bluesky network
- Users can login to bsky.app with their trainers.gg handle

### 3. Unified Authentication Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Signup Flow                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│  1. User enters email, username, password                                   │
│  2. Client calls /functions/v1/signup edge function                         │
│  3. Edge function creates Supabase Auth account                             │
│  4. Edge function generates PDS invite code                                 │
│  5. Edge function creates PDS account (@username.trainers.gg)               │
│  6. Edge function stores DID in users table                                 │
│  7. User receives session tokens for both systems                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4. Shared Code Strategy

| Code Type         | Shared Between Platforms? | Location                               |
| ----------------- | ------------------------- | -------------------------------------- |
| Database types    | Yes                       | `packages/supabase`                    |
| Queries/Mutations | Yes                       | `packages/supabase`                    |
| Validators        | Yes                       | `packages/validators`                  |
| UI Components     | No (different libs)       | `packages/ui` (web), Tamagui (mobile)  |
| Theme tokens      | Yes                       | `packages/theme`                       |
| Business logic    | Yes (in Edge Functions)   | `packages/supabase/supabase/functions` |

### 5. Theme System

Colors are defined in OKLCH color space for perceptual uniformity:

- **Web**: CSS variables generated from `@trainers/theme`
- **Mobile**: Hex colors generated for Tamagui themes
- **Light/Dark**: Both modes supported, respects system preference

---

## Environment Variables

### Supabase

| Variable                        | Description          | Used By    |
| ------------------------------- | -------------------- | ---------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase project URL | Web        |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key    | Web        |
| `SUPABASE_SERVICE_ROLE_KEY`     | Service role key     | Edge Funcs |
| `EXPO_PUBLIC_SUPABASE_URL`      | Supabase project URL | Mobile     |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key    | Mobile     |

### Bluesky PDS

| Variable             | Description                  | Used By    |
| -------------------- | ---------------------------- | ---------- |
| `PDS_HOSTNAME`       | PDS domain (pds.trainers.gg) | Edge Funcs |
| `PDS_ADMIN_PASSWORD` | PDS admin password           | Edge Funcs |
| `PDS_JWT_SECRET`     | JWT signing secret           | PDS        |
| `PDS_ADMIN_EMAIL`    | Admin email for PDS          | PDS        |

### Deployment

| Variable     | Description        | Used By |
| ------------ | ------------------ | ------- |
| `VERCEL_URL` | Auto-set by Vercel | Web     |

---

## Database Schema (Key Tables)

| Table                      | Description                                 |
| -------------------------- | ------------------------------------------- |
| `users`                    | User accounts with DID and PDS handle       |
| `alts`                     | Alternate player identities for tournaments |
| `organizations`            | Tournament organizer groups                 |
| `tournaments`              | Tournament events                           |
| `tournament_registrations` | Player registrations                        |
| `roles`                    | Role definitions (site and org scoped)      |
| `user_roles`               | Site-scoped role assignments                |
| `org_memberships`          | Organization membership and roles           |

See the database migrations in `packages/supabase/supabase/migrations/` for the complete schema.

---

## Deployment

| Component | Platform | URL                    |
| --------- | -------- | ---------------------- |
| Web       | Vercel   | trainers.gg            |
| Database  | Supabase | (managed)              |
| PDS       | Fly.io   | pds.trainers.gg        |
| Mobile    | EAS      | App Store / Play Store |
