# Mobile App (`apps/mobile`)

Expo 55 (React Native 0.83) with Tamagui UI and Expo Router.

## Key Paths

- `src/app/` — Expo Router screens; groups `(auth)`, `(tabs)`, plus `organizations/`, `tournaments/`
- `src/components/` — feature components (`auth/`, `navigation/`, `tournament/`, `ui/`)
- `src/lib/` — Supabase mobile client, TanStack Query factories, SecureStore helpers
- `src/types/` — shared TypeScript types for the mobile app
- `src/tamagui.config.ts` — Tamagui theme/token config
- `assets/` — images, fonts, icons

## Notes

- Mobile hits Supabase directly — no Next.js API routes
- Query key factories: `src/lib/api/query-factory.ts` is the reference pattern
- Supabase client: `@trainers/supabase/mobile` (session stored in SecureStore)
- Styling: Tamagui tokens from `@trainers/theme` — no Tailwind

## Skills

- `building-mobile-app` — screens, Tamagui UI, Expo Router, SecureStore
- `querying-supabase` — Supabase client selection, query/mutation conventions
- `checking-mobile-parity` — verify feature parity with web after web changes
