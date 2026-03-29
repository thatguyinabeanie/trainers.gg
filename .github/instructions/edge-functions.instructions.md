---
applyTo: "**/supabase/functions/**,**/config.toml"
excludeAgent: "coding-agent"
---

# Code Review — Edge Functions

Edge functions are deployed automatically during the Vercel build via `run-migrations.mjs`. Never suggest manual `supabase functions deploy`.

Do NOT declare edge functions in `config.toml` — the Supabase GitHub integration's remote bundler cannot resolve monorepo imports (relative paths outside the `supabase/` directory), causing `failed to bundle function` errors on every preview branch.
