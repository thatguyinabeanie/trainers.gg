# Web App (`apps/web`)

Next.js 16 app with React 19.2, App Router, and Server Components.

## Key Paths

- `src/app/` — routes; route groups `(app)`, `(auth-pages)`, `(builder)`, `(dashboard)`, `(marketing)`
- `src/actions/` — Server Actions (alts, communities, matches, teams, tournaments, …)
- `src/components/` — feature components (`team-builder/`, `communities/`, `dashboard/`, `players/`, …)
- `src/components/ui/` — shadcn/ui + Base UI primitives
- `src/lib/` — server helpers, Supabase clients, cache tags, cache invalidation helpers
- `src/hooks/` — client-side React hooks
- `src/proxy.ts` — request interception (NOT `middleware.ts`)
- `e2e/` — Playwright end-to-end tests

## Notes

- Route interception uses `src/proxy.ts` — `middleware.ts` is NOT used
- Auto-loaded rules: `nextjs-conventions`, `react-patterns`, `mobile-responsiveness`
- On-demand catalogs (skills, invoke before creating new): `web-ui-catalog`, `web-hooks-and-helpers`

## Skills

- `building-web-app` — routes, Server Actions, data fetching, caching, TanStack Query
- `creating-components` — UI components, design tokens, design principles
- `querying-supabase` — Supabase client selection, query/mutation conventions
- `reviewing-caching` — `'use cache'` (Cache Components), TanStack Query, cache invalidation
- `tracking-analytics` — PostHog event constants
