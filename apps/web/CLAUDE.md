# @trainers/web

Next.js 16 (React 19) web app. App Router, Server Components by default.

## Key Files

| File | Purpose |
|------|---------|
| `src/proxy.ts` | Request interception — auth, route protection, maintenance mode |
| `src/lib/supabase/server.ts` | Server-side Supabase client |
| `src/lib/supabase/client.ts` | Browser Supabase client |
| `src/components/ui/` | shadcn/ui + Base UI primitives — check here first |
| `src/actions/` | Server Actions — return `{ success, error }` |
| `src/components/providers.tsx` | TanStack Query client setup |

## Skills

- `building-web-app` — routes, Server Actions, data fetching patterns
- `creating-components` — component templates, design tokens
- `validating-input` — Zod schemas, profanity filter
