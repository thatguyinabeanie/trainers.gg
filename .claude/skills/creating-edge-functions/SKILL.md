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

Every edge function MUST follow these patterns:

#### 1. CORS Handling

Always use the shared CORS utility:

```typescript
import { getCorsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  // ... handler code
});
```

#### 2. Authentication (when `auth` is `authenticated` or `admin`)

```typescript
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Verify JWT via Supabase Auth
const authHeader = req.headers.get("Authorization");
if (!authHeader) {
  return new Response(
    JSON.stringify({
      success: false,
      error: "Authorization required",
      code: "UNAUTHORIZED",
    }),
    { status: 401, headers: { ...cors, "Content-Type": "application/json" } }
  );
}

const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  global: { headers: { Authorization: authHeader } },
});

const {
  data: { user },
  error: authError,
} = await supabaseAuth.auth.getUser();

if (authError || !user) {
  return new Response(
    JSON.stringify({
      success: false,
      error: "Invalid authorization token",
      code: "INVALID_TOKEN",
    }),
    { status: 401, headers: { ...cors, "Content-Type": "application/json" } }
  );
}
```

#### 3. Admin Check (when `auth` is `admin`)

```typescript
// Create service role client for DB operations
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Verify site_admin role via database query
const { data: adminRole } = await supabaseAdmin
  .from("user_roles")
  .select("role_id, roles!inner(name)")
  .eq("user_id", user.id)
  .eq("roles.name", "site_admin")
  .maybeSingle();

if (!adminRole) {
  return new Response(
    JSON.stringify({
      success: false,
      error: "Admin access required",
      code: "FORBIDDEN",
    }),
    { status: 403, headers: { ...cors, "Content-Type": "application/json" } }
  );
}
```

#### 4. Response Format

All responses MUST:

- Include CORS headers
- Include `Content-Type: application/json`
- Return a typed response object with `success` boolean
- Use error `code` strings (SCREAMING_SNAKE_CASE) for programmatic handling
- Never leak internal details in error messages

```typescript
interface FunctionNameResponse {
  success: boolean;
  error?: string;
  code?: string;
  // ... additional response fields
}

// Success
return new Response(
  JSON.stringify({ success: true } satisfies FunctionNameResponse),
  { status: 200, headers: { ...cors, "Content-Type": "application/json" } }
);

// Error
return new Response(
  JSON.stringify({
    success: false,
    error: "Human-readable error message",
    code: "ERROR_CODE",
  } satisfies FunctionNameResponse),
  { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
);
```

#### 5. Error Handling

Wrap the entire handler in try/catch:

```typescript
try {
  // ... handler logic
} catch (error) {
  console.error("Function name error:", error);
  return new Response(
    JSON.stringify({
      success: false,
      error: "An unexpected error occurred",
      code: "INTERNAL_ERROR",
    } satisfies FunctionNameResponse),
    {
      status: 500,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    }
  );
}
```

### Full Template

```typescript
// <Function description>
//
// Requires:
// - JWT auth (Bearer token)
// - <any env secrets>
//
// POST body: { <fields> }
// Returns: { success: boolean, error?: string, code?: string }

import { createClient } from "jsr:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface RequestBody {
  // Define request fields
}

interface FunctionNameResponse {
  success: boolean;
  error?: string;
  code?: string;
}

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    // 1. Authenticate
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Authorization required",
          code: "UNAUTHORIZED",
        } satisfies FunctionNameResponse),
        {
          status: 401,
          headers: { ...cors, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid authorization token",
          code: "INVALID_TOKEN",
        } satisfies FunctionNameResponse),
        {
          status: 401,
          headers: { ...cors, "Content-Type": "application/json" },
        }
      );
    }

    // 2. Parse and validate input
    const body: RequestBody = await req.json();
    // ... validate fields

    // 3. Business logic
    const supabaseAdmin = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: { autoRefreshToken: false, persistSession: false },
      }
    );

    // ... database operations

    // 4. Return success
    return new Response(
      JSON.stringify({ success: true } satisfies FunctionNameResponse),
      { status: 200, headers: { ...cors, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Function name error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "An unexpected error occurred",
        code: "INTERNAL_ERROR",
      } satisfies FunctionNameResponse),
      {
        status: 500,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      }
    );
  }
});
```

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
