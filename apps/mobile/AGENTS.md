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

Use `createQuery` and `createMutation` from `src/lib/api/query-factory.ts` — do NOT repeat raw `useQuery` boilerplate. Each hook should be a one-liner using the factory.

TanStack Query client configured in `src/lib/query-client.ts`.

## Supabase

Import from `@trainers/supabase/mobile`. Session stored in SecureStore (not localStorage). Use `useSupabaseQuery` from `src/lib/supabase/` for simple queries.

## UI

Tamagui components — not shadcn/ui (web only). Use theme tokens from `@trainers/theme` for colors. Platform-specific components only — no shared UI package between web and mobile.

## Navigation

Expo Router with file-based routing. Route groups: `(tabs)` for the main tab bar, `(auth)` for unauthenticated flows. See `src/app/_layout.tsx` for the root layout and auth redirect logic.

## Environment Variables

Mobile env vars must use the `EXPO_PUBLIC_` prefix to be accessible in client code. All env vars still live in root `.env.local`.

## AT Protocol

Auth handled differently from web: mobile uses SecureStore for session persistence. Hooks in `src/lib/atproto/` wrap `@trainers/atproto` package.

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

- **Test environment**: `jest-expo` preset (React Native)
- **Test location**: `src/**/__tests__/**/*.test.{ts,tsx}`
- **Setup file**: `test-setup.ts`
- **Module alias**: Uses Expo's module resolution
