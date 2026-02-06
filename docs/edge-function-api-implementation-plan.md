# Edge Function API Implementation Plan (TGG-229 Phase 6)

## Status

**NOT IMPLEMENTED** - This document outlines what needs to be built for the Edge Function API layer required by the mobile app.

## Current State

### What Exists

**Edge Functions (Auth-related only)**

- `signup/` - Unified signup creating both Supabase Auth and Bluesky PDS accounts
- `bluesky-auth/` - Bridges AT Protocol OAuth sessions to Supabase sessions
- `provision-pds/` - PDS provisioning utilities
- `send-invite/` - Beta invite email sender

**Shared Utilities**

- `_shared/cors.ts` - CORS headers with origin validation
- `_shared/pds.ts` - PDS account creation, invite codes, handle generation

**Web Server Actions (Next.js only)**

- `apps/web/src/actions/alts.ts` - Alt CRUD operations
- `apps/web/src/actions/tournaments.ts` - Tournament management
- `apps/web/src/actions/organizations.ts` - Organization management
- `apps/web/src/actions/matches.ts` - Match result submission
- `apps/web/src/actions/notifications.ts` - Notification management
- `apps/web/src/actions/utils.ts` - Defines `ActionResult<T>` type

**Test Coverage**

- ✅ `_shared/__tests__/cors.test.ts` - CORS header validation
- ✅ `_shared/__tests__/pds.test.ts` - PDS utility functions
- ❌ No edge function endpoint tests exist

### What's Missing

**Edge Function API Endpoints** - None exist for mobile app consumption

## Architecture Requirements

### ActionResult Type Consistency

The `ActionResult<T>` type must be consistent across web Server Actions and mobile Edge Functions:

```typescript
// Current: apps/web/src/actions/utils.ts
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };
```

**Required:** Move this type to a shared location that both web and edge functions can import.

**Recommendation:** Create `packages/supabase/supabase/functions/_shared/types.ts`

### API Template Pattern

Create a reusable wrapper for edge function API endpoints that provides:

1. **CORS handling** - Preflight and origin validation
2. **Authentication** - JWT verification via Supabase Auth
3. **Input validation** - Zod schema parsing with consistent error messages
4. **Error handling** - Catch validation and runtime errors, return ActionResult
5. **Response formatting** - Consistent JSON responses with proper status codes

**Recommendation:** Create `packages/supabase/supabase/functions/_shared/api-template.ts`

```typescript
// Proposed structure (not implemented)
export interface ApiHandlerOptions<TInput, TOutput> {
  requireAuth?: boolean;
  schema?: z.ZodSchema<TInput>;
  handler: (input: TInput, context: ApiContext) => Promise<TOutput>;
}

export interface ApiContext {
  supabase: SupabaseClient;
  userId?: string;
  request: Request;
}

export function createApiHandler<TInput, TOutput>(
  options: ApiHandlerOptions<TInput, TOutput>
): (req: Request) => Promise<Response>;
```

## Required Edge Function API Endpoints

### 1. `api-tournaments/` - Tournament Operations

**Endpoints:**

- `POST /tournaments` - Create tournament (TO only)
- `PATCH /tournaments/:id` - Update tournament (TO only)
- `DELETE /tournaments/:id` - Delete tournament (TO only)
- `POST /tournaments/:id/register` - Register for tournament
- `POST /tournaments/:id/check-in` - Check in to tournament
- `POST /tournaments/:id/drop` - Drop from tournament
- `POST /tournaments/:id/start` - Start tournament (TO only)
- `POST /tournaments/:id/next-round` - Generate next round (TO only)
- `GET /tournaments/:id/standings` - Get current standings

**Data Sources:** Mirror `apps/web/src/actions/tournaments.ts` logic

### 2. `api-organizations/` - Organization Operations

**Endpoints:**

- `POST /organizations` - Create organization
- `PATCH /organizations/:id` - Update organization (staff only)
- `DELETE /organizations/:id` - Delete organization (owner only)
- `POST /organizations/:id/staff` - Add staff member (admin only)
- `DELETE /organizations/:id/staff/:userId` - Remove staff member (admin only)

**Data Sources:** Mirror `apps/web/src/actions/organizations.ts` logic

### 3. `api-alts/` - Alt Management

**Endpoints:**

- `GET /alts` - List user's alts
- `POST /alts` - Create alt
- `PATCH /alts/:id` - Update alt
- `DELETE /alts/:id` - Delete alt
- `POST /alts/:id/set-main` - Set as main alt

**Data Sources:** Mirror `apps/web/src/actions/alts.ts` logic

### 4. `api-matches/` - Match Result Submission

**Endpoints:**

- `POST /matches/:id/submit` - Submit match result
- `GET /matches/:id` - Get match details

**Data Sources:** Mirror `apps/web/src/actions/matches.ts` logic

### 5. `api-notifications/` - Notification Management

**Endpoints:**

- `GET /notifications` - List notifications (paginated)
- `POST /notifications/:id/read` - Mark as read
- `POST /notifications/read-all` - Mark all as read
- `DELETE /notifications/:id` - Delete notification

**Data Sources:** Mirror `apps/web/src/actions/notifications.ts` logic

## Implementation Strategy

### Phase 1: Shared Infrastructure

1. **Create `_shared/types.ts`**
   - Move `ActionResult<T>` from web actions
   - Add `ApiContext`, `ApiError` types
   - Export for use in web and edge functions

2. **Create `_shared/api-template.ts`**
   - Implement `createApiHandler` wrapper
   - CORS handling (reuse `cors.ts`)
   - Auth verification via Supabase service role client
   - Zod validation with error mapping
   - Try/catch with ActionResult response formatting

3. **Create `_shared/auth.ts`**
   - `verifyAuth(req)` - Extract and verify JWT
   - `createAuthenticatedClient(jwt)` - Create Supabase client with user context
   - `requireAuth(req)` - Throw if not authenticated

### Phase 2: Implement Edge Functions

**Priority Order:**

1. `api-alts/` - Simplest, good pattern template
2. `api-notifications/` - No complex business logic
3. `api-organizations/` - Moderate complexity
4. `api-matches/` - Moderate complexity
5. `api-tournaments/` - Most complex, many endpoints

**Each function should:**

- Import `createApiHandler` from `_shared/api-template.ts`
- Define Zod schemas for each endpoint's input
- Implement handlers that call existing `@trainers/supabase` mutations
- Return `ActionResult<T>` responses

### Phase 3: Test Coverage

**For each edge function:**

1. Create `__tests__/` directory in function folder
2. Test files: `<endpoint-name>.test.ts`

**Test Requirements:**

- ✅ Success responses with valid input and auth
- ✅ Error responses for invalid input (Zod validation failures)
- ✅ Error responses for missing authentication
- ✅ Error responses for unauthorized access (wrong user, wrong role)
- ✅ Proper HTTP status codes (200, 201, 400, 401, 403, 404, 500)
- ✅ ActionResult format consistency
- ✅ CORS headers on all responses
- ✅ OPTIONS preflight handling

**Test Pattern (following existing \_shared tests):**

```typescript
// Mock Deno environment
const mockEnv = new Map<string, string>([
  ["SUPABASE_URL", "https://test.supabase.co"],
  ["SUPABASE_SERVICE_ROLE_KEY", "test-key"],
]);

(globalThis as Record<string, unknown>).Deno = {
  env: {
    get: (key: string) => mockEnv.get(key) ?? undefined,
  },
};

// Mock fetch for Supabase API calls
global.fetch = jest.fn();

describe("api-alts endpoint", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /alts", () => {
    it("creates an alt with valid auth and input", async () => {
      // Test implementation
    });

    it("returns 401 for missing auth", async () => {
      // Test implementation
    });

    it("returns 400 for invalid input", async () => {
      // Test implementation
    });
  });
});
```

### Phase 4: Documentation

1. **API Reference** - Document each endpoint with:
   - HTTP method and path
   - Authentication requirements
   - Request body schema
   - Response format (ActionResult)
   - Error codes
   - Example requests/responses

2. **Mobile Integration Guide** - Document how to call from Expo app:
   - Base URL configuration
   - Auth header format
   - Error handling patterns
   - Retry strategies

## Testing Strategy

### Unit Tests (80%+ coverage goal)

**Scope:**

- `_shared/api-template.ts` - Generic wrapper logic
- `_shared/auth.ts` - JWT verification
- Each edge function handler - Business logic

**Tools:**

- Jest with Deno environment mocks
- Mock `fetch` for Supabase API calls
- Test helpers for creating Request objects

### Integration Tests (Future)

**Scope:**

- End-to-end edge function invocation
- Actual Supabase database queries (local dev)
- Test data seeding and cleanup

**Tools:**

- Supabase Test Helpers
- Local Supabase instance via Docker
- Playwright or Supertest for HTTP calls

## Success Criteria

- ✅ All 5 API edge function groups implemented
- ✅ `ActionResult<T>` type shared and consistent
- ✅ `createApiHandler` template reusable and tested
- ✅ 80%+ test coverage on edge function logic
- ✅ All tests passing in CI
- ✅ API documentation complete
- ✅ Mobile app can authenticate and call endpoints
- ✅ Error handling graceful with proper status codes

## File Structure (Proposed)

```
packages/supabase/supabase/functions/
├── _shared/
│   ├── __tests__/
│   │   ├── api-template.test.ts (NEW)
│   │   ├── auth.test.ts (NEW)
│   │   ├── cors.test.ts (EXISTS)
│   │   └── pds.test.ts (EXISTS)
│   ├── api-template.ts (NEW)
│   ├── auth.ts (NEW)
│   ├── cors.ts (EXISTS)
│   ├── pds.ts (EXISTS)
│   └── types.ts (NEW)
├── api-alts/
│   ├── __tests__/
│   │   └── index.test.ts (NEW)
│   └── index.ts (NEW)
├── api-organizations/
│   ├── __tests__/
│   │   └── index.test.ts (NEW)
│   └── index.ts (NEW)
├── api-matches/
│   ├── __tests__/
│   │   └── index.test.ts (NEW)
│   └── index.ts (NEW)
├── api-notifications/
│   ├── __tests__/
│   │   └── index.test.ts (NEW)
│   └── index.ts (NEW)
├── api-tournaments/
│   ├── __tests__/
│   │   └── index.test.ts (NEW)
│   └── index.ts (NEW)
├── bluesky-auth/ (EXISTS)
├── provision-pds/ (EXISTS)
├── send-invite/ (EXISTS)
└── signup/ (EXISTS)
```

## References

**Existing Code to Study:**

- `/Users/beanie/source/trainers.gg/apps/web/src/actions/utils.ts` - ActionResult type
- `/Users/beanie/source/trainers.gg/apps/web/src/actions/alts.ts` - Alt operations
- `/Users/beanie/source/trainers.gg/packages/supabase/supabase/functions/_shared/cors.ts` - CORS pattern
- `/Users/beanie/source/trainers.gg/packages/supabase/supabase/functions/signup/index.ts` - Full edge function example
- `/Users/beanie/source/trainers.gg/packages/supabase/supabase/functions/_shared/__tests__/cors.test.ts` - Test pattern

**Related Tickets:**

- TGG-229 - Backend Logic Architecture (Phase 6: Edge Function API Layer)

## Next Steps

1. Create Linear task for Phase 1 (Shared Infrastructure)
2. Create Linear task for Phase 2 (Implement api-alts as template)
3. Create Linear tasks for remaining API endpoints
4. Create Linear task for Phase 3 (Test Coverage)
5. Assign to engineer or AI agent for implementation

---

**Document Status:** Draft - Awaiting approval
**Created:** 2026-02-05
**Last Updated:** 2026-02-05
