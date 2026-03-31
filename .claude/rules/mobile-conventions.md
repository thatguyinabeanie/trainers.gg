---
paths:
  - "apps/mobile/**/*"
---

# Mobile Conventions

Coding standards for the Expo 55 mobile application (`apps/mobile/`). React Native 0.83, Expo Router, Tamagui UI.

## React Compiler

React Compiler is active in the mobile app. Same rules as web — prefer letting the compiler handle memoization. See `code-style.md` for details.

## Expo Router

- **File-based routing** in the `app/` directory
- `_layout.tsx` for layout definitions (Root, Tabs, Stacks)
- Screen files export `default function ScreenName()` — function declarations, same as web
- Route groups via `(group-name)` folders: `(tabs)`, `(auth)`

```tsx
// app/(tabs)/explore.tsx
export default function ExploreScreen() {
  return (
    <YStack flex={1} padding="$4">
      ...
    </YStack>
  );
}
```

## Navigation

- `router.push()` / `router.replace()` from `expo-router` for programmatic navigation
- `<Link>` component for declarative navigation
- Use typed routes when available for compile-time safety

## Styling with Tamagui

- Use Tamagui layout primitives: `YStack`, `XStack`, `ScrollView`, `Text`, `Input`
- Prefer Tamagui components over raw React Native `View`/`Text` for consistency
- Use `$token` design tokens from `@trainers/theme`: `$primary`, `$card`, `$mutedForeground`, `$background`

```tsx
<YStack backgroundColor="$card" borderRadius="$4" padding="$4">
  <XStack alignItems="center" gap="$3">
    <Text fontSize="$5" fontWeight="600" color="$cardForeground">
      Tournament Name
    </Text>
  </XStack>
</YStack>
```

## Component Patterns

Same conventions as web (see `code-style.md`):

- `function` declarations for components
- `interface XxxProps` for prop types
- Named exports (not `export default` except for Expo Router screens)
- `"use client"` is not used in mobile — all components are client components by nature

## State Management

- `useState` / `useEffect` for local component state
- TanStack Query for server state — follow the query factory pattern in `src/lib/api/query-factory.ts`
- Custom hooks for Supabase data follow the `{ data, loading, error, refetch }` return pattern

```tsx
export function useTournament(slug: string | undefined) {
  const [tournament, setTournament] = useState<TournamentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  // ... fetch logic
  return { tournament, loading, error, refetch: fetchTournament };
}
```

## Auth

- `AuthProvider` + `useAuth()` hook from `src/lib/supabase/auth-provider`
- SecureStore for token persistence (never AsyncStorage for sensitive data)
- Same auth flow as web — Supabase Auth with email/password + OAuth

## Supabase Client

- Import from `src/lib/supabase/client.ts`
- Same dependency injection pattern as web — pass `supabase` as first param to shared package queries
- Share query logic with web via `@trainers/supabase` — never duplicate queries in the mobile app

## Barrel Exports

`src/lib/supabase/index.ts` re-exports all hooks, clients, and types with explicit named exports:

```ts
export { getSupabase, createClient, supabase } from "./client";
export { AuthProvider, useAuth, getUserDisplayName } from "./auth-provider";
export { useCommunities, type CommunityWithCounts } from "./use-communities";
```
