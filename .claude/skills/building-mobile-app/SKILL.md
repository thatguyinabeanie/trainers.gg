---
name: building-mobile-app
description: Use when building mobile screens, navigation, Tamagui UI, or any feature in apps/mobile
---

See `apps/mobile/CLAUDE.md` for directory structure, key files, and commands.

## Data Fetching

Use `createQuery` and `createMutation` from `src/lib/api/query-factory.ts` — do NOT write raw `useQuery` boilerplate. Each hook is a one-liner using the factory.

TanStack Query client configured in `src/lib/query-client.ts`.

## Supabase

Import from `@trainers/supabase/mobile`. Session stored in SecureStore (not localStorage).

## UI

Tamagui components — **not shadcn/ui** (web only). Use theme tokens from `@trainers/theme` for colors. No shared UI package between web and mobile.

## Navigation

Expo Router file-based routing. Route groups: `(tabs)` for main tab bar, `(auth)` for unauthenticated flows. See `src/app/_layout.tsx` for root layout and auth redirect logic.

## AT Protocol

Auth differs from web: mobile uses SecureStore for session persistence. Hooks in `src/lib/atproto/` wrap `@trainers/atproto`.

## After Building Features

After developing a web feature, check if a matching mobile ticket exists. See `checking-mobile-parity` skill.
