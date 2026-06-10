---
name: creating-edge-functions
description: Create or update a Supabase edge function following trainers.gg conventions
disable-model-invocation: true
---

# Edge Function

Create or update a Supabase edge function following trainers.gg project conventions.

## Arguments

- `name` (required): Function name in kebab-case (e.g., `send-invite`, `verify-team`)
- `auth` (optional): Authentication requirement — `admin` (site_admin only), `authenticated` (any logged-in user), or `none` (public). Defaults to `authenticated`.

## Before Creating

1. **Check if it already exists**: Look in `packages/supabase/supabase/functions/` for a folder with this name
2. **If it exists**: Read the existing `index.ts` and modify it rather than replacing it

## Creating a New Edge Function

### File Location

- Function code: `packages/supabase/supabase/functions/<name>/index.ts`
- Shared utilities are in `packages/supabase/supabase/functions/_shared/`
- Deno config is at `packages/supabase/supabase/functions/deno.json`

### Required Patterns

Every edge function MUST follow these patterns. **Full code for each — plus a complete copy-paste template — is in [`references/patterns.md`](references/patterns.md).**

1. **CORS** — always `getCorsHeaders(req)` from `../_shared/cors.ts`; answer `OPTIONS` preflight with it. Never wildcard CORS.
2. **Authentication** (`auth: authenticated | admin`) — read the `Authorization` header, verify the JWT with an anon client's `auth.getUser()`; 401 `UNAUTHORIZED`/`INVALID_TOKEN` on failure.
3. **Admin check** (`auth: admin`) — with a service-role client, confirm a `site_admin` row in `user_roles`; 403 `FORBIDDEN` otherwise.
4. **Response format** — always JSON with CORS + `Content-Type`, a `success` boolean, SCREAMING_SNAKE_CASE error `code`s, and `satisfies <Response>`; never leak internals.
5. **Error handling** — wrap the whole handler in try/catch; on throw, `console.error` and return 500 `INTERNAL_ERROR`.

## Import Map (`deno.json`)

See the `managing-edge-imports` skill for full import map management, entry formats, and verification.

**Quick rule**: Every bare specifier import reachable from any edge function must be mapped in `packages/supabase/supabase/functions/deno.json`. Missing entries cause `failed to bundle function: exit status 1`.

## Deployment Pipeline

Edge functions are deployed automatically during the Vercel build (`run-migrations.mjs`) for both production and preview environments. Push to `main` to deploy to production; preview deploys happen automatically on PR branches.

**Do NOT declare edge functions in `config.toml`.** The Supabase GitHub integration's remote bundler cannot resolve monorepo imports (relative paths outside the `supabase/` directory). Declaring functions in `config.toml` causes `failed to bundle function: exit status 1` on every preview branch. Edge functions are deployed solely through the Vercel build pipeline via `vendor-packages.ts` + `supabase functions deploy --use-api`.

## Critical Rules

1. **Never deploy manually**: Edge functions deploy through the Vercel build pipeline. Never use `supabase functions deploy` directly.
2. **Never use wildcard CORS**: Always use the shared `getCorsHeaders()` from `_shared/cors.ts`.
3. **Never expose service role key**: The service role client is server-side only.
4. **Never trust client input**: Validate and sanitize all request body fields.
5. **Always use `satisfies`**: Type-check response objects with `satisfies FunctionNameResponse`.
6. **Import from JSR**: Use `jsr:@supabase/supabase-js@2` (not npm imports).
7. **Keep `deno.json` import map in sync**: Every bare specifier reachable from any edge function must be mapped. See the `managing-edge-imports` skill.

## After Creating

1. **Verify import map**: Run the `deno cache` verification script to confirm all functions bundle, and verify import map (see `managing-edge-imports` skill)
2. Test locally with `pnpm supabase functions serve <name>` (if local Supabase is running)
3. Invoke the `edge-function-reviewer` agent to validate the function
4. Commit to a feature branch — the function will deploy when merged to main
