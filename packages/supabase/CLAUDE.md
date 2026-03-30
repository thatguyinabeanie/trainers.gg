# @trainers/supabase

Supabase client, queries, mutations, edge functions, and migrations.

## Key Paths

| Path                           | Purpose                                            |
| ------------------------------ | -------------------------------------------------- |
| `src/`                         | TypeScript client code — queries, mutations, types |
| `supabase/migrations/`         | SQL migration files (timestamped, idempotent)      |
| `supabase/functions/`          | Deno edge functions                                |
| `supabase/functions/deno.json` | Import map — keep in sync                          |

## Skills

- `querying-supabase` — client selection, query conventions
- `create-migration` — migration creation workflow
- `creating-edge-functions` — edge function template and patterns
- `managing-edge-imports` — deno.json import map management
