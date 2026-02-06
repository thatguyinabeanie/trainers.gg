# Edge Function API Template - Technical Specification

## Overview

This document specifies the design for a reusable API template pattern for Supabase Edge Functions, ensuring consistency with web Server Actions and providing proper error handling, authentication, and validation.

## Core Types

### ActionResult (Shared Type)

**Location:** `packages/supabase/supabase/functions/_shared/types.ts`

```typescript
/**
 * Consistent action result type for server actions and edge function APIs.
 * Used by both Next.js Server Actions and Supabase Edge Functions.
 */
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * API context provided to edge function handlers.
 */
export interface ApiContext {
  /** Supabase client (service role if no auth, user context if authenticated) */
  supabase: SupabaseClient;
  /** User ID from JWT (if authenticated) */
  userId?: string;
  /** Original request object */
  request: Request;
  /** Parsed request body */
  body?: unknown;
}

/**
 * Error codes for consistent error handling.
 */
export enum ApiErrorCode {
  MISSING_FIELDS = "MISSING_FIELDS",
  INVALID_INPUT = "INVALID_INPUT",
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  NOT_FOUND = "NOT_FOUND",
  CONFLICT = "CONFLICT",
  INTERNAL_ERROR = "INTERNAL_ERROR",
}

/**
 * Structured API error with code and message.
 */
export class ApiError extends Error {
  constructor(
    public code: ApiErrorCode,
    message: string,
    public status: number = 400
  ) {
    super(message);
    this.name = "ApiError";
  }
}
```

## API Template Implementation

### Location

`packages/supabase/supabase/functions/_shared/api-template.ts`

### Design Goals

1. **DRY Principle** - Extract common patterns (CORS, auth, validation, error handling)
2. **Type Safety** - Full TypeScript types with Zod validation
3. **Consistency** - Same ActionResult format as web Server Actions
4. **Testability** - Easy to mock and test individual handlers
5. **Performance** - Minimal overhead, reuse Supabase client instances

### Core Function Signature

````typescript
import { z } from "zod";
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { getCorsHeaders } from "./cors.ts";
import {
  type ActionResult,
  type ApiContext,
  ApiError,
  ApiErrorCode,
} from "./types.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

/**
 * Options for creating an API handler.
 */
export interface ApiHandlerOptions<TInput, TOutput> {
  /**
   * Require authentication? If true, handler will receive userId in context.
   * If false, handler receives service role client.
   */
  requireAuth?: boolean;

  /**
   * Zod schema for request body validation.
   * If omitted, no validation is performed (use for GET requests).
   */
  schema?: z.ZodSchema<TInput>;

  /**
   * Handler function that processes the request.
   * Receives validated input and context with Supabase client.
   * Should return data or throw ApiError for structured errors.
   */
  handler: (input: TInput, context: ApiContext) => Promise<TOutput>;
}

/**
 * Create a Deno.serve-compatible handler with built-in:
 * - CORS handling (preflight + response headers)
 * - Authentication (JWT verification if required)
 * - Input validation (Zod schema)
 * - Error handling (catch all, return ActionResult)
 * - Response formatting (JSON with proper status codes)
 *
 * @example
 * ```typescript
 * import { createApiHandler } from "../_shared/api-template.ts";
 * import { z } from "zod";
 *
 * const createAltSchema = z.object({
 *   username: z.string().min(3).max(20),
 *   displayName: z.string().min(1).max(64),
 * });
 *
 * export const handler = createApiHandler({
 *   requireAuth: true,
 *   schema: createAltSchema,
 *   handler: async (input, ctx) => {
 *     const alt = await createAlt(ctx.supabase, {
 *       username: input.username,
 *       displayName: input.displayName,
 *     });
 *     return { id: alt.id };
 *   },
 * });
 *
 * Deno.serve(handler);
 * ```
 */
export function createApiHandler<TInput, TOutput>(
  options: ApiHandlerOptions<TInput, TOutput>
): (req: Request) => Promise<Response> {
  const { requireAuth = true, schema, handler } = options;

  return async (req: Request): Promise<Response> => {
    const cors = getCorsHeaders(req);

    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: cors });
    }

    try {
      // Step 1: Parse request body (if schema provided)
      let input: TInput | undefined;
      let rawBody: unknown;

      if (schema) {
        try {
          rawBody = await req.json();
        } catch {
          throw new ApiError(
            ApiErrorCode.INVALID_INPUT,
            "Invalid JSON in request body",
            400
          );
        }

        // Validate with Zod
        const result = schema.safeParse(rawBody);
        if (!result.success) {
          // Format Zod errors as single message
          const message = result.error.errors
            .map((e) => `${e.path.join(".")}: ${e.message}`)
            .join("; ");
          throw new ApiError(ApiErrorCode.INVALID_INPUT, message, 400);
        }
        input = result.data;
      }

      // Step 2: Handle authentication
      let userId: string | undefined;
      let supabase: SupabaseClient;

      if (requireAuth) {
        const authHeader = req.headers.get("Authorization");
        const jwt = authHeader?.replace("Bearer ", "");

        if (!jwt) {
          throw new ApiError(
            ApiErrorCode.UNAUTHORIZED,
            "Missing authentication token",
            401
          );
        }

        // Create service role client to verify JWT
        const adminClient = createClient(
          SUPABASE_URL,
          SUPABASE_SERVICE_ROLE_KEY,
          {
            auth: { autoRefreshToken: false, persistSession: false },
          }
        );

        const {
          data: { user },
          error: authError,
        } = await adminClient.auth.getUser(jwt);

        if (authError || !user) {
          throw new ApiError(
            ApiErrorCode.UNAUTHORIZED,
            "Invalid or expired authentication token",
            401
          );
        }

        userId = user.id;

        // Create authenticated client for the user
        supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
          auth: { autoRefreshToken: false, persistSession: false },
          global: {
            headers: {
              Authorization: `Bearer ${jwt}`,
            },
          },
        });
      } else {
        // No auth required - use service role client
        supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
          auth: { autoRefreshToken: false, persistSession: false },
        });
      }

      // Step 3: Call handler
      const context: ApiContext = {
        supabase,
        userId,
        request: req,
        body: rawBody,
      };

      const data = await handler(input as TInput, context);

      // Step 4: Return success response
      const response: ActionResult<TOutput> = { success: true, data };
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    } catch (error) {
      // Handle known API errors
      if (error instanceof ApiError) {
        const response: ActionResult<never> = {
          success: false,
          error: error.message,
        };
        return new Response(JSON.stringify(response), {
          status: error.status,
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      // Handle Zod validation errors (shouldn't happen, but defensive)
      if (error instanceof z.ZodError) {
        const message = error.errors
          .map((e) => `${e.path.join(".")}: ${e.message}`)
          .join("; ");
        const response: ActionResult<never> = {
          success: false,
          error: message,
        };
        return new Response(JSON.stringify(response), {
          status: 400,
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      // Handle unexpected errors
      console.error("[api-handler] Unexpected error:", error);
      const response: ActionResult<never> = {
        success: false,
        error: "An unexpected error occurred",
      };
      return new Response(JSON.stringify(response), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
  };
}
````

## Authentication Helpers

### Location

`packages/supabase/supabase/functions/_shared/auth.ts`

```typescript
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { ApiError, ApiErrorCode } from "./types.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

/**
 * Extract JWT from Authorization header.
 * Returns null if header is missing or malformed.
 */
export function extractJwt(req: Request): string | null {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;

  const match = authHeader.match(/^Bearer (.+)$/);
  return match ? match[1] : null;
}

/**
 * Verify JWT and return user ID.
 * Throws ApiError if token is invalid or missing.
 */
export async function verifyAuth(req: Request): Promise<string> {
  const jwt = extractJwt(req);

  if (!jwt) {
    throw new ApiError(
      ApiErrorCode.UNAUTHORIZED,
      "Missing authentication token",
      401
    );
  }

  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const {
    data: { user },
    error,
  } = await adminClient.auth.getUser(jwt);

  if (error || !user) {
    throw new ApiError(
      ApiErrorCode.UNAUTHORIZED,
      "Invalid or expired authentication token",
      401
    );
  }

  return user.id;
}

/**
 * Create an authenticated Supabase client for a given JWT.
 * This client will have RLS policies applied for the authenticated user.
 */
export function createAuthenticatedClient(jwt: string): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
    },
  });
}

/**
 * Create a service role Supabase client (bypasses RLS).
 * Use with caution - only for admin operations.
 */
export function createServiceRoleClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
```

## Usage Examples

### Example 1: Simple CRUD (Alts)

```typescript
// packages/supabase/supabase/functions/api-alts/index.ts
import { createApiHandler } from "../_shared/api-template.ts";
import { ApiError, ApiErrorCode } from "../_shared/types.ts";
import { createAlt, updateAlt, deleteAlt } from "@trainers/supabase";
import { z } from "zod";

// Schema validation
const createAltSchema = z.object({
  username: z.string().min(3).max(20),
  displayName: z.string().min(1).max(64),
  inGameName: z.string().max(50).optional(),
});

const updateAltSchema = z.object({
  altId: z.number().int().positive(),
  displayName: z.string().min(1).max(64).optional(),
  bio: z.string().max(256).optional(),
  inGameName: z.string().max(50).nullable().optional(),
});

const deleteAltSchema = z.object({
  altId: z.number().int().positive(),
});

// Route handlers
export const handleCreateAlt = createApiHandler({
  requireAuth: true,
  schema: createAltSchema,
  handler: async (input, ctx) => {
    const alt = await createAlt(ctx.supabase, {
      username: input.username,
      displayName: input.displayName,
      inGameName: input.inGameName,
    });
    return { id: alt.id };
  },
});

export const handleUpdateAlt = createApiHandler({
  requireAuth: true,
  schema: updateAltSchema,
  handler: async (input, ctx) => {
    await updateAlt(ctx.supabase, input.altId, {
      displayName: input.displayName,
      bio: input.bio,
      inGameName: input.inGameName,
    });
    return { success: true };
  },
});

export const handleDeleteAlt = createApiHandler({
  requireAuth: true,
  schema: deleteAltSchema,
  handler: async (input, ctx) => {
    await deleteAlt(ctx.supabase, input.altId);
    return { success: true };
  },
});

// Main handler with routing
Deno.serve(async (req) => {
  const url = new URL(req.url);
  const method = req.method;

  if (method === "POST" && url.pathname === "/create") {
    return handleCreateAlt(req);
  }
  if (method === "PATCH" && url.pathname === "/update") {
    return handleUpdateAlt(req);
  }
  if (method === "DELETE" && url.pathname === "/delete") {
    return handleDeleteAlt(req);
  }

  return new Response("Not found", { status: 404 });
});
```

### Example 2: Complex Logic (Tournaments)

```typescript
// packages/supabase/supabase/functions/api-tournaments/index.ts
import {
  createApiHandler,
  ApiError,
  ApiErrorCode,
} from "../_shared/api-template.ts";
import {
  createTournament,
  registerForTournament,
  checkInToTournament,
} from "@trainers/supabase";
import { z } from "zod";

const registerSchema = z.object({
  tournamentId: z.number().int().positive(),
  altId: z.number().int().positive(),
  teamSheet: z.string().optional(),
});

export const handleRegister = createApiHandler({
  requireAuth: true,
  schema: registerSchema,
  handler: async (input, ctx) => {
    if (!ctx.userId) {
      throw new ApiError(
        ApiErrorCode.UNAUTHORIZED,
        "User ID not found in context",
        401
      );
    }

    // Verify alt belongs to user
    const { data: alt } = await ctx.supabase
      .from("alts")
      .select("id, user_id")
      .eq("id", input.altId)
      .single();

    if (!alt || alt.user_id !== ctx.userId) {
      throw new ApiError(
        ApiErrorCode.FORBIDDEN,
        "You do not own this alt",
        403
      );
    }

    // Register
    const registration = await registerForTournament(
      ctx.supabase,
      input.tournamentId,
      input.altId,
      input.teamSheet
    );

    return { registrationId: registration.id };
  },
});

// ... more handlers
```

## Testing Pattern

### Example Test File

```typescript
// packages/supabase/supabase/functions/api-alts/__tests__/index.test.ts

// Mock Deno environment
const mockEnv = new Map<string, string>([
  ["SUPABASE_URL", "https://test.supabase.co"],
  ["SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key"],
]);

(globalThis as Record<string, unknown>).Deno = {
  env: {
    get: (key: string) => mockEnv.get(key) ?? undefined,
  },
};

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

import { handleCreateAlt } from "../index";

describe("api-alts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /create", () => {
    it("creates an alt with valid auth and input", async () => {
      // Mock auth verification
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: { id: "test-user-id" },
        }),
      });

      // Mock createAlt mutation
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { id: 123 },
          error: null,
        }),
      });

      const req = new Request("https://test.com/create", {
        method: "POST",
        headers: {
          Authorization: "Bearer test-jwt",
          Origin: "https://trainers.gg",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: "ash_ketchum",
          displayName: "Ash Ketchum",
        }),
      });

      const response = await handleCreateAlt(req);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual({
        success: true,
        data: { id: 123 },
      });
    });

    it("returns 401 for missing auth", async () => {
      const req = new Request("https://test.com/create", {
        method: "POST",
        headers: {
          Origin: "https://trainers.gg",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: "ash_ketchum",
          displayName: "Ash Ketchum",
        }),
      });

      const response = await handleCreateAlt(req);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body).toEqual({
        success: false,
        error: "Missing authentication token",
      });
    });

    it("returns 400 for invalid input", async () => {
      // Mock auth verification
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: { id: "test-user-id" },
        }),
      });

      const req = new Request("https://test.com/create", {
        method: "POST",
        headers: {
          Authorization: "Bearer test-jwt",
          Origin: "https://trainers.gg",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: "a", // Too short
          displayName: "Ash",
        }),
      });

      const response = await handleCreateAlt(req);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error).toContain("username");
    });

    it("handles CORS preflight", async () => {
      const req = new Request("https://test.com/create", {
        method: "OPTIONS",
        headers: {
          Origin: "https://trainers.gg",
        },
      });

      const response = await handleCreateAlt(req);
      expect(response.status).toBe(200);
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
        "https://trainers.gg"
      );
    });
  });
});
```

## HTTP Status Code Guidelines

| Code | Usage                                                     |
| ---- | --------------------------------------------------------- |
| 200  | Success (GET, PATCH, DELETE with response data)           |
| 201  | Created (POST for resource creation)                      |
| 204  | No Content (DELETE with no response data)                 |
| 400  | Bad Request (invalid input, validation errors)            |
| 401  | Unauthorized (missing or invalid auth token)              |
| 403  | Forbidden (authenticated but not authorized for resource) |
| 404  | Not Found (resource doesn't exist)                        |
| 409  | Conflict (duplicate username, already registered, etc.)   |
| 500  | Internal Server Error (unexpected errors)                 |

## Error Message Guidelines

**DO:**

- ✅ "Username must be 3-20 characters"
- ✅ "You do not have permission to modify this tournament"
- ✅ "This alt is registered for an active tournament and cannot be deleted"

**DON'T:**

- ❌ "Invalid input" (too vague)
- ❌ Technical error messages exposing internals
- ❌ SQL errors or stack traces

## Implementation Checklist

### Phase 1: Infrastructure

- [ ] Create `_shared/types.ts` with ActionResult and ApiContext
- [ ] Create `_shared/api-template.ts` with createApiHandler
- [ ] Create `_shared/auth.ts` with authentication helpers
- [ ] Write tests for api-template and auth utilities
- [ ] Update web actions to import ActionResult from shared types

### Phase 2: First Endpoint (Template)

- [ ] Implement `api-alts/index.ts` using template
- [ ] Write comprehensive tests for api-alts
- [ ] Verify ActionResult format matches web actions
- [ ] Test CORS, auth, validation, error handling
- [ ] Document patterns learned

### Phase 3: Remaining Endpoints

- [ ] Implement api-notifications (simple, good second endpoint)
- [ ] Implement api-organizations (moderate complexity)
- [ ] Implement api-matches (moderate complexity)
- [ ] Implement api-tournaments (most complex)
- [ ] Write tests for each endpoint (80%+ coverage)

### Phase 4: Documentation

- [ ] API reference documentation (OpenAPI/Swagger style)
- [ ] Mobile integration guide
- [ ] Error handling guide
- [ ] Deployment guide

## References

- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [Zod Documentation](https://zod.dev/)
- [AT Protocol OAuth Spec](https://atproto.com/specs/oauth)
- Web Server Actions: `/Users/beanie/source/trainers.gg/apps/web/src/actions/`
- Existing Edge Functions: `/Users/beanie/source/trainers.gg/packages/supabase/supabase/functions/`

---

**Document Status:** Draft - Awaiting Implementation
**Created:** 2026-02-05
