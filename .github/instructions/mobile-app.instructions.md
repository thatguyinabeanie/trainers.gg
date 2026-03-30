---
applyTo: "apps/mobile/**"
---

# Mobile App Instructions

## Framework

Expo 55 with React Native 0.83 and React 19.2.

## UI Framework

Tamagui (not Tailwind CSS). Theme tokens come from `@trainers/theme`. Use Tamagui's styling props and theme system, not StyleSheet or inline styles.

## Navigation

Expo Router with file-based routing. Route types are defined in `src/types/routes.d.ts`.

## State Management

TanStack Query v5 via the query factory pattern in `src/lib/api/query-factory.ts`.

- Use `createQuery<T>(queryKey, endpoint, options)` for GET requests
- Use `createMutation<T>(endpoint, options)` for mutations
- Query keys follow the factory pattern for consistent cache invalidation
- API calls go through `src/lib/api/client.ts` which communicates with Supabase edge functions

## Supabase Client

Use `createClient()` from `src/lib/supabase/client.ts`. Auth tokens are stored in Expo SecureStore, not AsyncStorage.

## React Compiler

React Compiler is enabled for the mobile app as well. Never use `useMemo`, `useCallback`, or `React.memo`.

## Shared Code

Import shared logic from workspace packages:

- `@trainers/validators` — Zod schemas and types
- `@trainers/utils` — formatting, countries, tiers
- `@trainers/tournaments` — tournament logic
- `@trainers/pokemon` — Pokemon data and validation
- `@trainers/theme` — OKLCH design tokens
- `@trainers/posthog` — event name constants

Do not duplicate shared package logic in app code.

## Dynamic Classes

Use `cn()` from `src/lib/utils/cn.ts` for conditional Tamagui class composition.
