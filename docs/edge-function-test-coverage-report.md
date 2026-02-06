# Edge Function Test Coverage Report

**Generated:** 2026-02-05
**Status:** Phase 6 (TGG-229) - Edge Function API Layer NOT IMPLEMENTED

## Executive Summary

**Current State:**

- ✅ 2 shared utility modules have tests (100% coverage)
- ❌ 0 edge function endpoints have tests
- ❌ Edge Function API layer does not exist yet

**Required for Phase 6 Completion:**

- Create 5 new API edge functions (api-alts, api-tournaments, api-organizations, api-matches, api-notifications)
- Create shared API template infrastructure (\_shared/api-template.ts, \_shared/auth.ts, \_shared/types.ts)
- Achieve 80%+ test coverage on all new edge function code
- Add tests for api-template.ts and auth.ts utilities

## Test Coverage by Module

### 1. Shared Utilities

#### ✅ `_shared/cors.ts`

**Test File:** `_shared/__tests__/cors.test.ts`
**Coverage:** 100%
**Status:** Complete

**Tests:**

- ✅ Allows https://trainers.gg
- ✅ Allows https://www.trainers.gg
- ✅ Allows http://localhost:3000
- ✅ Allows http://127.0.0.1:3000
- ✅ Returns empty origin for disallowed origins
- ✅ Returns empty origin for requests without Origin header
- ✅ Includes expected CORS headers (methods, headers)
- ✅ Does not return wildcard origin

**Code Quality:** Excellent - Comprehensive coverage of all edge cases

---

#### ✅ `_shared/pds.ts`

**Test File:** `_shared/__tests__/pds.test.ts`
**Coverage:** 75% (network functions not tested, utility functions 100%)
**Status:** Acceptable for utilities

**Tests:**

- ✅ `generateSecurePassword()` - generates correct length
- ✅ `generateSecurePassword()` - defaults to 32 characters
- ✅ `generateSecurePassword()` - generates unique passwords
- ✅ `generateSecurePassword()` - uses valid charset
- ✅ `generateHandle()` - formats handle correctly
- ✅ `generateHandle()` - lowercases username
- ✅ `PDS_CONFIG` - exposes configuration constants

**Not Tested (by design):**

- Network functions (createPdsInviteCode, createPdsAccount, checkPdsHandleAvailable) - these require live PDS or extensive mocking
- Network functions should be integration tested, not unit tested

**Code Quality:** Good - Pure functions tested comprehensively

---

### 2. Auth Edge Functions

#### ❌ `signup/index.ts`

**Test File:** None
**Coverage:** 0%
**Status:** NOT TESTED

**Function:** Unified signup creating Supabase Auth + Bluesky PDS accounts

**Should Test:**

- Successful signup with valid input
- Email validation
- Username validation (format, uniqueness)
- Password strength validation (8+ chars, lowercase, uppercase, digit, symbol)
- Beta invite token validation (maintenance mode)
- Invite already used rejection
- Invite expired rejection
- Email mismatch with invite
- Username already taken
- Email already taken
- Bluesky handle already taken
- PDS account creation (happy path and failure path)
- CORS handling

**Priority:** Medium (used in production, but auth is critical path already manually tested)

---

#### ❌ `bluesky-auth/index.ts`

**Test File:** None
**Coverage:** 0%
**Status:** NOT TESTED

**Function:** Bridges AT Protocol OAuth sessions to Supabase sessions

**Should Test:**

- **Mode 1 (Sign in/Sign up):**
  - Missing DID or handle returns 400
  - Invalid DID verification returns 401
  - New user signup creates account with placeholder email
  - Existing user (by DID) signs in
  - Legacy user (by email) signs in and DID updated
  - Bluesky profile fetching (avatar, displayName)
  - Username sanitization from handle
  - Session token generation
- **Mode 2 (Link to existing account):**
  - Missing auth JWT returns 401
  - Invalid JWT returns 401
  - DID already linked to another user returns 409
  - Successful DID linking to authenticated user
- CORS handling
- Error handling for network failures

**Priority:** High (critical for mobile app authentication)

---

#### ❌ `provision-pds/index.ts`

**Test File:** None
**Coverage:** 0%
**Status:** NOT TESTED

**Function:** PDS provisioning utilities

**Priority:** Low (admin utility, rarely used)

---

#### ❌ `send-invite/index.ts`

**Test File:** None
**Coverage:** 0%
**Status:** NOT TESTED

**Function:** Beta invite email sender

**Priority:** Medium (used for beta invites, but simple logic)

---

### 3. API Edge Functions (PHASE 6 - NOT IMPLEMENTED)

#### ❌ `_shared/api-template.ts`

**Test File:** None (doesn't exist)
**Coverage:** 0%
**Status:** NOT IMPLEMENTED

**Should Test:**

- `createApiHandler` returns a function
- CORS preflight handling (OPTIONS request)
- Request body parsing (valid JSON)
- Request body parsing (invalid JSON returns 400)
- Zod schema validation (valid input passes)
- Zod schema validation (invalid input returns 400 with error message)
- Authentication required: missing token returns 401
- Authentication required: invalid token returns 401
- Authentication required: valid token extracts userId
- No authentication required: uses service role client
- Handler success returns ActionResult { success: true, data }
- Handler throws ApiError returns ActionResult { success: false, error } with correct status
- Handler throws unexpected error returns 500 with generic message
- Response includes CORS headers
- Response includes Content-Type: application/json

**Priority:** CRITICAL (foundation for all API endpoints)

---

#### ❌ `_shared/auth.ts`

**Test File:** None (doesn't exist)
**Coverage:** 0%
**Status:** NOT IMPLEMENTED

**Should Test:**

- `extractJwt()` - extracts token from "Bearer <token>"
- `extractJwt()` - returns null for missing header
- `extractJwt()` - returns null for malformed header
- `verifyAuth()` - throws ApiError for missing token
- `verifyAuth()` - throws ApiError for invalid token
- `verifyAuth()` - returns userId for valid token
- `createAuthenticatedClient()` - creates client with Authorization header
- `createServiceRoleClient()` - creates client without user context

**Priority:** CRITICAL (used by all authenticated endpoints)

---

#### ❌ `_shared/types.ts`

**Test File:** None (doesn't exist)
**Coverage:** N/A (type-only module)
**Status:** NOT IMPLEMENTED

**Notes:** Type definitions only, no runtime code to test. TypeScript compiler ensures correctness.

---

#### ❌ `api-alts/index.ts`

**Test File:** None (doesn't exist)
**Coverage:** 0%
**Status:** NOT IMPLEMENTED

**Endpoints to Test:**

- POST /create - Create alt
  - Success with valid auth and input
  - 401 for missing auth
  - 400 for invalid username (too short, too long, invalid chars)
  - 400 for invalid displayName (missing, too long)
  - 409 for duplicate username
- PATCH /update - Update alt
  - Success with valid auth and input
  - 401 for missing auth
  - 403 for updating alt not owned by user
  - 400 for invalid input
- DELETE /delete - Delete alt
  - Success with valid auth
  - 401 for missing auth
  - 403 for deleting alt not owned by user
  - 400 for deleting main alt
  - 400 for deleting alt in active tournament
- POST /set-main - Set main alt
  - Success with valid auth
  - 401 for missing auth
  - 403 for setting main alt not owned by user

**Priority:** HIGH (template for other API endpoints)

---

#### ❌ `api-tournaments/index.ts`

**Test File:** None (doesn't exist)
**Coverage:** 0%
**Status:** NOT IMPLEMENTED

**Endpoints to Test:**

- POST /create - Create tournament (TO only)
- PATCH /update - Update tournament (TO only)
- DELETE /delete - Delete tournament (TO only)
- POST /register - Register for tournament
- POST /check-in - Check in to tournament
- POST /drop - Drop from tournament
- POST /start - Start tournament (TO only)
- POST /next-round - Generate next round (TO only)
- GET /standings - Get current standings

**Priority:** HIGH (core feature for mobile app)

---

#### ❌ `api-organizations/index.ts`

**Test File:** None (doesn't exist)
**Coverage:** 0%
**Status:** NOT IMPLEMENTED

**Endpoints to Test:**

- POST /create - Create organization
- PATCH /update - Update organization (staff only)
- DELETE /delete - Delete organization (owner only)
- POST /staff/add - Add staff member (admin only)
- DELETE /staff/remove - Remove staff member (admin only)

**Priority:** MEDIUM (used but not as frequently as tournaments)

---

#### ❌ `api-matches/index.ts`

**Test File:** None (doesn't exist)
**Coverage:** 0%
**Status:** NOT IMPLEMENTED

**Endpoints to Test:**

- POST /submit - Submit match result
- GET /:id - Get match details

**Priority:** HIGH (real-time match reporting)

---

#### ❌ `api-notifications/index.ts`

**Test File:** None (doesn't exist)
**Coverage:** 0%
**Status:** NOT IMPLEMENTED

**Endpoints to Test:**

- GET / - List notifications (paginated)
- POST /:id/read - Mark as read
- POST /read-all - Mark all as read
- DELETE /:id - Delete notification

**Priority:** MEDIUM (nice-to-have for mobile)

---

## Test Infrastructure

### Current Setup

**Jest Configuration:** `packages/supabase/jest.config.ts`

```typescript
testMatch: [
  "<rootDir>/src/**/__tests__/**/*.test.ts",
  "<rootDir>/supabase/functions/_shared/__tests__/**/*.test.ts",
],
```

**Test Environment:**

- Jest with Node environment (not Deno, but close enough for utilities)
- Deno global mocked for environment variables
- fetch mocked for network calls

**Coverage Collection:**

```typescript
collectCoverageFrom: [
  "src/**/*.ts",
  "supabase/functions/_shared/**/*.ts",
  "!src/**/__tests__/**",
  "!supabase/functions/_shared/__tests__/**",
],
```

### Required Updates for Phase 6

**Jest Config Updates:**

```typescript
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
],
```

**CI/CD Updates:**

- Codecov flag: `supabase-edge-functions` (new)
- Coverage target: 80% patch coverage on new edge functions
- Test reports: JUnit XML for edge function tests

---

## Testing Patterns

### Mock Deno Environment

```typescript
const mockEnv = new Map<string, string>([
  ["SUPABASE_URL", "https://test.supabase.co"],
  ["SUPABASE_SERVICE_ROLE_KEY", "test-key"],
]);

(globalThis as Record<string, unknown>).Deno = {
  env: {
    get: (key: string) => mockEnv.get(key) ?? undefined,
  },
};
```

### Mock Fetch for Supabase API

```typescript
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock auth verification
mockFetch.mockResolvedValueOnce({
  ok: true,
  json: async () => ({
    user: { id: "test-user-id" },
  }),
});

// Mock database query
mockFetch.mockResolvedValueOnce({
  ok: true,
  json: async () => ({
    data: { id: 123 },
    error: null,
  }),
});
```

### Create Test Request

```typescript
const req = new Request("https://test.com/endpoint", {
  method: "POST",
  headers: {
    Authorization: "Bearer test-jwt",
    Origin: "https://trainers.gg",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ username: "test" }),
});
```

### Assert ActionResult Format

```typescript
const response = await handler(req);
const body = await response.json();

expect(response.status).toBe(200);
expect(body).toEqual({
  success: true,
  data: { id: 123 },
});
```

---

## Coverage Goals

### Overall Target: 80%+ patch coverage

**Priority Breakdown:**

| Module                   | Priority | Target Coverage | Rationale                 |
| ------------------------ | -------- | --------------- | ------------------------- |
| \_shared/api-template.ts | CRITICAL | 95%+            | Foundation for all APIs   |
| \_shared/auth.ts         | CRITICAL | 95%+            | Security-critical         |
| \_shared/cors.ts         | ✅ DONE  | 100%            | Already complete          |
| \_shared/pds.ts          | ✅ DONE  | 75%             | Utilities complete        |
| api-alts                 | HIGH     | 90%+            | Template for others       |
| api-tournaments          | HIGH     | 85%+            | Complex business logic    |
| api-matches              | HIGH     | 85%+            | Real-time critical        |
| api-organizations        | MEDIUM   | 80%+            | Standard CRUD             |
| api-notifications        | MEDIUM   | 80%+            | Standard CRUD             |
| signup                   | MEDIUM   | 70%+            | Auth flow tested manually |
| bluesky-auth             | HIGH     | 85%+            | Mobile auth critical      |

---

## Implementation Roadmap

### Phase 1: Infrastructure (Week 1)

1. Create `_shared/types.ts` with ActionResult
2. Create `_shared/api-template.ts` with createApiHandler
3. Create `_shared/auth.ts` with authentication helpers
4. Write tests for api-template.ts (95%+ coverage)
5. Write tests for auth.ts (95%+ coverage)
6. Update Jest config to include new test patterns

### Phase 2: Template Endpoint (Week 1)

1. Implement `api-alts/index.ts` using template
2. Write comprehensive tests (90%+ coverage)
3. Verify all test patterns work
4. Document lessons learned

### Phase 3: Remaining Endpoints (Week 2)

1. Implement api-notifications (simple, 80%+ coverage)
2. Implement api-matches (moderate, 85%+ coverage)
3. Implement api-organizations (moderate, 80%+ coverage)
4. Implement api-tournaments (complex, 85%+ coverage)
5. Write tests for each (meet coverage targets)

### Phase 4: Auth Functions (Week 2)

1. Write tests for signup/index.ts (70%+ coverage)
2. Write tests for bluesky-auth/index.ts (85%+ coverage)
3. Verify CI passes with new coverage targets

### Phase 5: Documentation (Week 2)

1. API reference documentation
2. Testing guide for future edge functions
3. Mobile integration guide

---

## Test Metrics

### Current State

- Total Edge Functions: 4 (signup, bluesky-auth, provision-pds, send-invite)
- Edge Functions with Tests: 0
- Shared Utilities: 2 (cors, pds)
- Shared Utilities with Tests: 2 (100%)
- Overall Edge Function Test Coverage: 0%
- Overall Shared Utility Test Coverage: ~90%

### Target State (After Phase 6)

- Total Edge Functions: 9 (4 existing + 5 new API endpoints)
- Edge Functions with Tests: 7 (5 new APIs + signup + bluesky-auth)
- Shared Utilities: 5 (cors, pds, types, api-template, auth)
- Shared Utilities with Tests: 5 (100%)
- Overall Edge Function Test Coverage: 80%+
- Overall Shared Utility Test Coverage: 95%+

---

## CI/CD Integration

### Current CI Pipeline

`.github/workflows/ci.yml` - Runs tests with coverage:

```bash
pnpm test:ci  # Runs all tests with coverage + JUnit XML
```

Coverage reported to Codecov with per-package flags:

- `web`
- `mobile`
- `validators`
- `supabase`
- `atproto`
- `pokemon`
- `tournaments`
- `utils`

### Required Updates

**Add edge function specific flag:**

```yaml
# codecov.yml
coverage:
  status:
    project:
      supabase-edge-functions:
        target: 80%
        threshold: 5%
        flags:
          - supabase-edge-functions
```

**Test command remains the same:**

```bash
pnpm test:ci  # Already includes supabase package
```

---

## Resources

**Documentation:**

- [Edge Function Implementation Plan](./edge-function-api-implementation-plan.md)
- [API Template Technical Spec](./edge-function-api-template-spec.md)

**Reference Code:**

- Web Server Actions: `/Users/beanie/source/trainers.gg/apps/web/src/actions/`
- Existing Edge Functions: `/Users/beanie/source/trainers.gg/packages/supabase/supabase/functions/`
- Existing Tests: `/Users/beanie/source/trainers.gg/packages/supabase/supabase/functions/_shared/__tests__/`

**Related Tickets:**

- TGG-229 - Backend Logic Architecture (Phase 6: Edge Function API Layer)

---

**Report Status:** Complete - Awaiting Implementation
**Last Updated:** 2026-02-05
