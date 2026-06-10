# Supabase Package (`packages/supabase`)

Supabase client, queries, mutations, generated types, migrations, and edge functions.

## Key Paths

- `src/queries/` — read queries by domain (communities, tournaments, players, …)
- `src/mutations/` — write operations by domain
- `src/clients/` — client factory functions (server, client, mobile, static, service role)
- `src/types.ts` — auto-generated TypeScript types (`pnpm generate-types` to regenerate)
- `src/types-atproto.ts` — manually maintained AT Protocol session types
- `src/usage/` — team_slots / usage RPC helpers
- `supabase/migrations/` — SQL migration files (append-only)
- `supabase/functions/` — Deno edge functions (one directory per function)
- `supabase/functions/_shared/` — shared edge function utilities (cors, auth, …)
- `supabase/seeds/` — local dev seed data

## Notes

- Always check `src/queries/` and `src/mutations/` before writing new operations
- `src/types.ts` is auto-generated — do not hand-edit it
- Edge functions use Deno runtime — import from Deno URLs or relative paths

## Skills

- `querying-supabase` — client selection, query/mutation conventions, N+1 avoidance
- `create-migration` — adding new SQL migrations correctly (RLS, indexes, idempotency)
- `creating-edge-functions` — edge function template, CORS, auth, deployment rules
- `managing-edge-imports` — Deno import maps, `deno.json` management
- `reviewing-database` — RLS policies, indexes, query efficiency checklist
- `working-with-usage-data` — team_slots fact table, usage RPCs, per-source data
