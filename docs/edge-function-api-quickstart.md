# Edge Function API Quick Start Guide

**For:** Engineers implementing TGG-229 Phase 6
**Goal:** Get from zero to first API endpoint with tests in one day

---

## 📋 Prerequisites

Before starting, ensure:

- ✅ Read [Edge Function API Implementation Plan](./edge-function-api-implementation-plan.md)
- ✅ Read [API Template Technical Spec](./edge-function-api-template-spec.md)
- ✅ Familiar with Supabase Edge Functions
- ✅ Familiar with Jest testing
- ✅ Local dev environment working (`pnpm dev`)

---

## 🚀 Step-by-Step Implementation

### Step 1: Create Shared Types (30 minutes)

**File:** `packages/supabase/supabase/functions/_shared/types.ts`

```typescript
import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

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

**Test:** No test file needed (type-only module).

---

### Step 2: Create Authentication Helpers (1 hour)

**File:** `packages/supabase/supabase/functions/_shared/auth.ts`

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
 */
export function createServiceRoleClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
```

**Test File:** `packages/supabase/supabase/functions/_shared/__tests__/auth.test.ts`

```typescript
// Mock Deno environment
const mockEnv = new Map<string, string>([
  ["SUPABASE_URL", "https://test.supabase.co"],
  ["SUPABASE_SERVICE_ROLE_KEY", "test-key"],
]);

(globalThis as Record<string, unknown>).Deno = {
  env: { get: (key: string) => mockEnv.get(key) ?? undefined },
};

const mockFetch = jest.fn();
global.fetch = mockFetch;

import { extractJwt, verifyAuth } from "../auth";
import { ApiErrorCode } from "../types";

describe("auth helpers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("extractJwt", () => {
    it("extracts token from Bearer header", () => {
      const req = new Request("https://test.com", {
        headers: { Authorization: "Bearer test-token-123" },
      });
      expect(extractJwt(req)).toBe("test-token-123");
    });

    it("returns null for missing header", () => {
      const req = new Request("https://test.com");
      expect(extractJwt(req)).toBeNull();
    });

    it("returns null for malformed header", () => {
      const req = new Request("https://test.com", {
        headers: { Authorization: "Invalid format" },
      });
      expect(extractJwt(req)).toBeNull();
    });
  });

  describe("verifyAuth", () => {
    it("throws for missing token", async () => {
      const req = new Request("https://test.com");
      await expect(verifyAuth(req)).rejects.toThrow(
        "Missing authentication token"
      );
    });

    it("throws for invalid token", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: { message: "Invalid token" } }),
      });

      const req = new Request("https://test.com", {
        headers: { Authorization: "Bearer invalid-token" },
      });

      await expect(verifyAuth(req)).rejects.toThrow(
        "Invalid or expired authentication token"
      );
    });

    it("returns userId for valid token", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: { id: "test-user-id" },
        }),
      });

      const req = new Request("https://test.com", {
        headers: { Authorization: "Bearer valid-token" },
      });

      const userId = await verifyAuth(req);
      expect(userId).toBe("test-user-id");
    });
  });
});
```

**Run tests:**

```bash
cd packages/supabase
pnpm jest supabase/functions/_shared/__tests__/auth.test.ts
```

---

### Step 3: Create API Template (2-3 hours)

**File:** `packages/supabase/supabase/functions/_shared/api-template.ts`

See full implementation in [API Template Technical Spec](./edge-function-api-template-spec.md#api-template-implementation).

**Test File:** `packages/supabase/supabase/functions/_shared/__tests__/api-template.test.ts`

```typescript
// Mock Deno and fetch (same pattern as auth.test.ts)
const mockEnv = new Map<string, string>([
  ["SUPABASE_URL", "https://test.supabase.co"],
  ["SUPABASE_SERVICE_ROLE_KEY", "test-key"],
]);

(globalThis as Record<string, unknown>).Deno = {
  env: { get: (key: string) => mockEnv.get(key) ?? undefined },
};

const mockFetch = jest.fn();
global.fetch = mockFetch;

import { createApiHandler } from "../api-template";
import { z } from "zod";

describe("createApiHandler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("handles CORS preflight", async () => {
    const handler = createApiHandler({
      handler: async () => ({ success: true }),
    });

    const req = new Request("https://test.com", {
      method: "OPTIONS",
      headers: { Origin: "https://trainers.gg" },
    });

    const response = await handler(req);
    expect(response.status).toBe(200);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://trainers.gg"
    );
  });

  it("validates input with Zod schema", async () => {
    const schema = z.object({ name: z.string().min(3) });
    const handler = createApiHandler({
      schema,
      handler: async (input) => input,
    });

    const req = new Request("https://test.com", {
      method: "POST",
      headers: {
        Origin: "https://trainers.gg",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: "ab" }), // Too short
    });

    const response = await handler(req);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toContain("name");
  });

  it("requires authentication when specified", async () => {
    const handler = createApiHandler({
      requireAuth: true,
      handler: async () => ({ success: true }),
    });

    const req = new Request("https://test.com", {
      method: "POST",
      headers: { Origin: "https://trainers.gg" },
      body: "{}",
    });

    const response = await handler(req);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Missing authentication token");
  });

  it("calls handler with validated input and context", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: { id: "test-user-id" } }),
    });

    const schema = z.object({ name: z.string() });
    const mockHandler = jest.fn().mockResolvedValue({ id: 123 });

    const handler = createApiHandler({
      requireAuth: true,
      schema,
      handler: mockHandler,
    });

    const req = new Request("https://test.com", {
      method: "POST",
      headers: {
        Authorization: "Bearer test-jwt",
        Origin: "https://trainers.gg",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: "Test" }),
    });

    const response = await handler(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      success: true,
      data: { id: 123 },
    });

    expect(mockHandler).toHaveBeenCalledWith(
      { name: "Test" },
      expect.objectContaining({
        userId: "test-user-id",
        supabase: expect.any(Object),
      })
    );
  });
});
```

**Run tests:**

```bash
cd packages/supabase
pnpm jest supabase/functions/_shared/__tests__/api-template.test.ts
```

---

### Step 4: Implement First API Endpoint (api-alts) (3-4 hours)

**File:** `packages/supabase/supabase/functions/api-alts/index.ts`

```typescript
import { createApiHandler } from "../_shared/api-template.ts";
import { ApiError, ApiErrorCode } from "../_shared/types.ts";
import {
  createAlt,
  updateAlt,
  deleteAlt,
  setMainAlt,
} from "@trainers/supabase";
import { z } from "zod";

// Schemas
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

const setMainAltSchema = z.object({
  altId: z.number().int().positive(),
});

// Handlers
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

export const handleSetMainAlt = createApiHandler({
  requireAuth: true,
  schema: setMainAltSchema,
  handler: async (input, ctx) => {
    await setMainAlt(ctx.supabase, input.altId);
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
  if (method === "POST" && url.pathname === "/set-main") {
    return handleSetMainAlt(req);
  }

  return new Response("Not found", { status: 404 });
});
```

**Test File:** `packages/supabase/supabase/functions/api-alts/__tests__/index.test.ts`

```typescript
// Mock environment
const mockEnv = new Map<string, string>([
  ["SUPABASE_URL", "https://test.supabase.co"],
  ["SUPABASE_SERVICE_ROLE_KEY", "test-key"],
]);

(globalThis as Record<string, unknown>).Deno = {
  env: { get: (key: string) => mockEnv.get(key) ?? undefined },
};

const mockFetch = jest.fn();
global.fetch = mockFetch;

import { handleCreateAlt, handleUpdateAlt, handleDeleteAlt } from "../index";

describe("api-alts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /create", () => {
    it("creates an alt with valid auth and input", async () => {
      // Mock auth verification
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: { id: "test-user-id" } }),
      });

      // Mock createAlt mutation (assume it calls Supabase)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: 123 }, error: null }),
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
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: { id: "test-user-id" } }),
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
  });

  // Add tests for update, delete, set-main...
});
```

**Run tests:**

```bash
cd packages/supabase
pnpm jest supabase/functions/api-alts/__tests__/
```

---

### Step 5: Update Jest Config (5 minutes)

**File:** `packages/supabase/jest.config.ts`

```typescript
import type { Config } from "jest";
import { createConfig } from "@trainers/jest-config";

const config: Config = createConfig({
  displayName: "supabase",
  testMatch: [
    "<rootDir>/src/**/__tests__/**/*.test.ts",
    "<rootDir>/supabase/functions/_shared/__tests__/**/*.test.ts",
    "<rootDir>/supabase/functions/api-*/**/__tests__/**/*.test.ts", // NEW
  ],
  collectCoverageFrom: [
    "src/**/*.ts",
    "supabase/functions/_shared/**/*.ts",
    "supabase/functions/api-*/**/*.ts", // NEW
    "!src/**/__tests__/**",
    "!supabase/functions/_shared/__tests__/**",
    "!supabase/functions/api-*/**/__tests__/**", // NEW
    "!src/types.ts",
    "!src/index.ts",
  ],
});

export default config;
```

---

### Step 6: Update Web Actions (5 minutes)

**File:** `apps/web/src/actions/utils.ts`

Replace local ActionResult with import:

```typescript
"use server";

import { z } from "zod";
import { checkBotId } from "botid/server";
import { getErrorMessage } from "@/lib/utils";

// Import from shared location
export type { ActionResult } from "@trainers/supabase/functions/_shared/types";

// Rest of file unchanged...
```

**Note:** You'll need to ensure the types can be imported from the edge function directory. This might require:

1. Adding exports in `packages/supabase/src/index.ts`
2. Or using a build step to copy types to a shared location

---

## ✅ Verification Checklist

After completing steps 1-6:

- [ ] All shared utility tests pass

  ```bash
  pnpm jest supabase/functions/_shared/__tests__/
  ```

- [ ] api-alts tests pass

  ```bash
  pnpm jest supabase/functions/api-alts/__tests__/
  ```

- [ ] Coverage meets targets (90%+)

  ```bash
  pnpm test:ci --filter=@trainers/supabase
  ```

- [ ] Edge function can be deployed (dry run)

  ```bash
  cd packages/supabase
  supabase functions deploy api-alts --no-verify-jwt
  ```

- [ ] Manual test with curl
  ```bash
  curl -X POST https://your-project.supabase.co/functions/v1/api-alts/create \
    -H "Authorization: Bearer YOUR_JWT" \
    -H "Content-Type: application/json" \
    -d '{"username":"test","displayName":"Test User"}'
  ```

---

## 🎯 Next Day: Implement Remaining Endpoints

Once api-alts is working, use it as a template for:

1. **api-notifications** (simplest) - 1 day
2. **api-matches** (moderate) - 1 day
3. **api-organizations** (moderate) - 1-2 days
4. **api-tournaments** (complex) - 2-3 days

Each should follow the same pattern:

1. Define Zod schemas
2. Create handlers with `createApiHandler`
3. Add routing logic
4. Write comprehensive tests (80-90% coverage)

---

## 🐛 Common Issues

### Issue: Deno.env not found

**Solution:** Add mock at top of test file:

```typescript
(globalThis as Record<string, unknown>).Deno = {
  env: { get: (key: string) => mockEnv.get(key) ?? undefined },
};
```

### Issue: fetch is not defined

**Solution:** Mock global fetch:

```typescript
global.fetch = jest.fn();
```

### Issue: createClient fails

**Solution:** Mock the Supabase client calls:

```typescript
mockFetch.mockResolvedValueOnce({
  ok: true,
  json: async () => ({ user: { id: "test-user-id" } }),
});
```

### Issue: Tests timeout

**Solution:** Ensure all promises resolve in mocks. Check for missing `await`.

---

## 📚 Additional Resources

- [Edge Function API Implementation Plan](./edge-function-api-implementation-plan.md)
- [API Template Technical Spec](./edge-function-api-template-spec.md)
- [Test Coverage Report](./edge-function-test-coverage-report.md)
- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [Jest Documentation](https://jestjs.io/docs/getting-started)

---

## 🚀 Ready to Start?

1. Create a feature branch: `git checkout -b feat/edge-function-api-layer`
2. Follow steps 1-6 above
3. Commit as you go: `git commit -m "feat: implement api-template"`
4. Run tests: `pnpm test --filter=@trainers/supabase`
5. Open PR when tests pass

**Estimated Time:** 1 full day for infrastructure + first endpoint

**Questions?** Check the detailed specs or ask for clarification.

---

**Good luck! 🎉**
