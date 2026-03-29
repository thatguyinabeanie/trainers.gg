# @trainers/supabase

Supabase client, queries, mutations, edge functions, and migrations.

## Key Paths

| Path | Purpose |
|------|---------|
| `src/` | TypeScript client code — queries, mutations, types |
| `supabase/migrations/` | SQL migration files (timestamped, idempotent) |
| `supabase/functions/` | Deno edge functions |
| `supabase/functions/deno.json` | Import map — keep in sync |

## Skills

- `supabase-queries` — client selection, query conventions
- `create-migration` — migration creation workflow
- `edge-function` — edge function template and patterns
- `edge-function-imports` — deno.json import map management
