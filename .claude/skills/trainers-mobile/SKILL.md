---
name: trainers-mobile
description: Use when building mobile screens, navigation, Tamagui UI, or any feature in apps/mobile
---

# @trainers/mobile

Expo 54 (React 19) React Native app. File-based routing via Expo Router.

## Structure

```
src/
  app/          # Expo Router screens (file-based routing)
  components/   # Tamagui UI components
  lib/
    api/        # query-factory.ts — TanStack Query factory for all hooks
    supabase/   # Mobile Supabase client (session in SecureStore)
    atproto/    # AT Protocol hooks
  hooks/        # useAuth, useColorScheme, etc.
```

## Data Fetching

Use `createQuery` and `createMutation` from `src/lib/api/query-factory.ts` — do NOT write raw `useQuery` boilerplate. Each hook is a one-liner using the factory.

TanStack Query client configured in `src/lib/query-client.ts`.

## Supabase

Import from `@trainers/supabase/mobile`. Session stored in SecureStore (not localStorage).

## UI

Tamagui components — **not shadcn/ui** (web only). Use theme tokens from `@trainers/theme` for colors. No shared UI package between web and mobile.

## Navigation

Expo Router file-based routing. Route groups: `(tabs)` for main tab bar, `(auth)` for unauthenticated flows. See `src/app/_layout.tsx` for root layout and auth redirect logic.

## Environment Variables

Mobile env vars must use `EXPO_PUBLIC_` prefix. All env vars live in root `.env.local`.

## AT Protocol

Auth differs from web: mobile uses SecureStore for session persistence. Hooks in `src/lib/atproto/` wrap `@trainers/atproto`.

## Commands

```bash
pnpm --filter @trainers/mobile dev            # Start Expo dev server
pnpm --filter @trainers/mobile test           # Run unit tests
pnpm --filter @trainers/mobile test:watch     # Watch mode
pnpm --filter @trainers/mobile lint           # ESLint
pnpm --filter @trainers/mobile typecheck      # TypeScript type checking
pnpm --filter @trainers/mobile prebuild       # Generate native projects
pnpm --filter @trainers/mobile prebuild:clean # Clean + regenerate native projects
```

## Testing

- **Environment**: `jest-expo` preset (React Native)
- **Location**: `src/**/__tests__/**/*.test.{ts,tsx}`
- **Setup**: `test-setup.ts`
