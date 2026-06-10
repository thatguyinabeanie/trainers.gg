# Edge Function — Code Reference

Full code for the required patterns and a complete template. The workflow and
rules live in the skill's `SKILL.md`; this file holds the verbose examples so
the skill body stays lean. Every edge function MUST follow these patterns.

## 1. CORS Handling

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

## 2. Authentication (when `auth` is `authenticated` or `admin`)

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

## 3. Admin Check (when `auth` is `admin`)

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

## 4. Response Format

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

## 5. Error Handling

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

## Full Template

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
