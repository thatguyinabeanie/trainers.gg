# Edge Function API Testing Summary - TGG-229 Phase 6

**Date:** 2026-02-05
**Status:** ❌ NOT IMPLEMENTED
**Requested By:** User (TGG-229 Phase 6 requirement)

---

## 🎯 Objective

Create tests for Edge Function API endpoints required for the mobile app to consume backend services with the same ActionResult format as web Server Actions.

---

## 📊 Current State Analysis

### What Exists

#### ✅ Edge Function Shared Utilities (Tested)

**1. CORS Headers (`_shared/cors.ts`)**

- ✅ Test file: `_shared/__tests__/cors.test.ts`
- ✅ Coverage: 100%
- Tests 8 scenarios including allowlist validation, header inclusion

**2. PDS Utilities (`_shared/pds.ts`)**

- ✅ Test file: `_shared/__tests__/pds.test.ts`
- ✅ Coverage: ~75% (pure functions only, network functions skipped by design)
- Tests password generation, handle formatting, config exposure

#### ❌ Edge Functions (NOT Tested)

**Existing Auth Functions (No Tests):**

1. `signup/index.ts` - 435 lines, 0% coverage
2. `bluesky-auth/index.ts` - 508 lines, 0% coverage
3. `provision-pds/index.ts` - Not tested
4. `send-invite/index.ts` - Not tested

#### ❌ Edge Function API Layer (DOES NOT EXIST)

**Required for Mobile App:**

1. `api-alts/` - Alt management CRUD
2. `api-tournaments/` - Tournament operations (register, check-in, drop, start, rounds)
3. `api-organizations/` - Organization CRUD and staff management
4. `api-matches/` - Match result submission
5. `api-notifications/` - Notification management

**Required Infrastructure:**

1. `_shared/api-template.ts` - Reusable API handler wrapper
2. `_shared/auth.ts` - JWT verification and client creation
3. `_shared/types.ts` - Shared ActionResult type

---

## 📝 Key Findings

### 1. No API Template Exists

The project currently has NO reusable API template for edge functions. Each endpoint would need to manually implement:

- CORS handling
- JWT authentication
- Input validation with Zod
- Error handling
- ActionResult response formatting

**Impact:** High code duplication, inconsistent error handling, difficult to test

**Recommendation:** Implement `_shared/api-template.ts` as specified in the technical spec

### 2. ActionResult Type Not Shared

The `ActionResult<T>` type exists in `apps/web/src/actions/utils.ts` but is NOT shared with edge functions.

**Current:**

```typescript
// apps/web/src/actions/utils.ts
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };
```

**Issue:** Edge functions would need to duplicate this type, leading to potential inconsistencies.

**Recommendation:** Move to `packages/supabase/supabase/functions/_shared/types.ts` and import from both web and edge functions.

### 3. Web Server Actions Exist, But Not Edge Function Equivalents

The web app has comprehensive Server Actions:

- ✅ `apps/web/src/actions/alts.ts` - 149 lines
- ✅ `apps/web/src/actions/tournaments.ts` - Large file with many operations
- ✅ `apps/web/src/actions/organizations.ts` - Organization management
- ✅ `apps/web/src/actions/matches.ts` - Match operations
- ✅ `apps/web/src/actions/notifications.ts` - Notification operations

**Issue:** Mobile app cannot call Next.js Server Actions (they require Next.js request context).

**Recommendation:** Create edge function equivalents that mirror the logic but use standard HTTP requests.

### 4. Test Infrastructure Partially Ready

**Pros:**

- ✅ Jest configured for edge function tests
- ✅ Test pattern established (Deno environment mocking)
- ✅ Coverage collection configured
- ✅ CI pipeline exists

**Cons:**

- ❌ No tests for main edge functions (signup, bluesky-auth)
- ❌ No API endpoint tests (because API endpoints don't exist)
- ❌ 25 failing tests in supabase package (unrelated to edge functions, in src/ directory)

---

## 📋 Implementation Plan

### Phase 1: Shared Infrastructure (Priority: CRITICAL)

**Deliverables:**

1. `_shared/types.ts` - ActionResult, ApiContext, ApiError types
2. `_shared/api-template.ts` - createApiHandler wrapper
3. `_shared/auth.ts` - Authentication helpers
4. Tests for api-template.ts (95%+ coverage)
5. Tests for auth.ts (95%+ coverage)

**Estimated Effort:** 2-3 days

**Tests Required:**

- API template handles CORS preflight
- API template validates Zod schemas
- API template enforces authentication
- API template formats errors correctly
- API template returns ActionResult consistently
- Auth helpers extract and verify JWTs
- Auth helpers create authenticated clients

### Phase 2: First API Endpoint (api-alts) (Priority: HIGH)

**Deliverables:**

1. `api-alts/index.ts` - Alt CRUD operations
2. `api-alts/__tests__/index.test.ts` - Comprehensive tests (90%+ coverage)

**Estimated Effort:** 2-3 days

**Tests Required:**

- POST /create - Success, auth failure, validation failure, duplicate username
- PATCH /update - Success, auth failure, forbidden (wrong user), validation failure
- DELETE /delete - Success, auth failure, forbidden, cannot delete main alt, cannot delete alt in tournament
- POST /set-main - Success, auth failure, forbidden

**Why api-alts first?**

- Simplest API (straightforward CRUD)
- Good template for other endpoints
- Already has web Server Action to mirror
- High priority for mobile app

### Phase 3: Remaining API Endpoints (Priority: HIGH)

**Deliverables:**

1. `api-notifications/index.ts` + tests (80%+ coverage)
2. `api-matches/index.ts` + tests (85%+ coverage)
3. `api-organizations/index.ts` + tests (80%+ coverage)
4. `api-tournaments/index.ts` + tests (85%+ coverage)

**Estimated Effort:** 1 week

**Priority Order:**

1. api-notifications (simple CRUD)
2. api-matches (moderate complexity)
3. api-organizations (moderate complexity, permissions)
4. api-tournaments (most complex, many endpoints)

### Phase 4: Backfill Auth Function Tests (Priority: MEDIUM)

**Deliverables:**

1. `signup/__tests__/index.test.ts` (70%+ coverage)
2. `bluesky-auth/__tests__/index.test.ts` (85%+ coverage)

**Estimated Effort:** 2-3 days

**Why lower priority?**

- Already in production and working
- Manually tested during auth flow
- Not blocking mobile app development
- Good to have, but not critical path

---

## 🧪 Testing Strategy

### Test Categories

**1. Unit Tests (Primary Focus)**

- Mock Deno environment
- Mock fetch for Supabase calls
- Test individual handler functions
- Validate input/output contracts

**2. Integration Tests (Future)**

- Real Supabase instance (local Docker)
- End-to-end edge function invocation
- Database state verification

### Coverage Targets

| Module                   | Target | Rationale                       |
| ------------------------ | ------ | ------------------------------- |
| \_shared/api-template.ts | 95%+   | Foundation, must be bulletproof |
| \_shared/auth.ts         | 95%+   | Security-critical               |
| api-alts                 | 90%+   | Template for others             |
| api-tournaments          | 85%+   | Complex logic                   |
| api-matches              | 85%+   | Real-time critical              |
| api-organizations        | 80%+   | Standard CRUD                   |
| api-notifications        | 80%+   | Standard CRUD                   |
| signup                   | 70%+   | Already working, manual testing |
| bluesky-auth             | 85%+   | Mobile auth critical            |

### Test Patterns

**Mock Deno Environment:**

```typescript
const mockEnv = new Map<string, string>([
  ["SUPABASE_URL", "https://test.supabase.co"],
  ["SUPABASE_SERVICE_ROLE_KEY", "test-key"],
]);

(globalThis as Record<string, unknown>).Deno = {
  env: { get: (key: string) => mockEnv.get(key) ?? undefined },
};
```

**Mock Supabase Fetch:**

```typescript
global.fetch = jest
  .fn()
  .mockResolvedValueOnce({
    // Auth verification
    ok: true,
    json: async () => ({ user: { id: "test-user-id" } }),
  })
  .mockResolvedValueOnce({
    // Database query
    ok: true,
    json: async () => ({ data: { id: 123 }, error: null }),
  });
```

**Test Request Creation:**

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

**Assert ActionResult:**

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

## 📚 Documentation Created

As part of this investigation, I created three comprehensive documents:

### 1. Edge Function API Implementation Plan

**File:** `/Users/beanie/source/trainers.gg/docs/edge-function-api-implementation-plan.md`

**Contents:**

- Current state analysis
- Architecture requirements
- Required API endpoints (5 groups)
- Implementation strategy (4 phases)
- File structure proposal
- Success criteria
- Next steps

### 2. API Template Technical Specification

**File:** `/Users/beanie/source/trainers.gg/docs/edge-function-api-template-spec.md`

**Contents:**

- Core type definitions (ActionResult, ApiContext, ApiError)
- API template implementation (createApiHandler function)
- Authentication helpers (verifyAuth, extractJwt, createAuthenticatedClient)
- Usage examples (api-alts, api-tournaments)
- Testing patterns
- HTTP status code guidelines
- Error message guidelines
- Implementation checklist

### 3. Test Coverage Report

**File:** `/Users/beanie/source/trainers.gg/docs/edge-function-test-coverage-report.md`

**Contents:**

- Test coverage by module (current state)
- Required tests for each endpoint
- Test infrastructure requirements
- Testing patterns and examples
- Coverage goals and metrics
- CI/CD integration updates
- Implementation roadmap

---

## 🚦 Status by Component

| Component                | Status             | Tests       | Coverage | Priority    |
| ------------------------ | ------------------ | ----------- | -------- | ----------- |
| \_shared/cors.ts         | ✅ Implemented     | ✅ Complete | 100%     | ✅ Done     |
| \_shared/pds.ts          | ✅ Implemented     | ✅ Complete | 75%      | ✅ Done     |
| \_shared/types.ts        | ❌ Not implemented | ❌ N/A      | 0%       | 🔴 Critical |
| \_shared/api-template.ts | ❌ Not implemented | ❌ Missing  | 0%       | 🔴 Critical |
| \_shared/auth.ts         | ❌ Not implemented | ❌ Missing  | 0%       | 🔴 Critical |
| api-alts/                | ❌ Not implemented | ❌ Missing  | 0%       | 🔴 High     |
| api-tournaments/         | ❌ Not implemented | ❌ Missing  | 0%       | 🔴 High     |
| api-organizations/       | ❌ Not implemented | ❌ Missing  | 0%       | 🟡 Medium   |
| api-matches/             | ❌ Not implemented | ❌ Missing  | 0%       | 🔴 High     |
| api-notifications/       | ❌ Not implemented | ❌ Missing  | 0%       | 🟡 Medium   |
| signup/index.ts          | ✅ Implemented     | ❌ Missing  | 0%       | 🟡 Medium   |
| bluesky-auth/index.ts    | ✅ Implemented     | ❌ Missing  | 0%       | 🔴 High     |

---

## 🎬 Next Steps

### Immediate Actions (This Week)

1. **Create Linear Tasks**
   - [ ] TGG-XXX: Implement \_shared/api-template.ts and auth.ts
   - [ ] TGG-XXX: Implement api-alts with comprehensive tests
   - [ ] TGG-XXX: Implement remaining API endpoints
   - [ ] TGG-XXX: Backfill tests for signup and bluesky-auth

2. **Technical Decisions**
   - [ ] Review and approve API template design
   - [ ] Review and approve ActionResult type location
   - [ ] Review and approve test coverage targets

3. **Dependencies**
   - [ ] Fix 25 failing tests in supabase package (unrelated to edge functions)
   - [ ] Ensure Codecov integration ready for edge function coverage

### Phase 1 (Week 1): Infrastructure

**Day 1-2:**

- Implement `_shared/types.ts`
- Implement `_shared/auth.ts`
- Write tests for auth.ts (95%+ coverage)

**Day 3-5:**

- Implement `_shared/api-template.ts`
- Write comprehensive tests (95%+ coverage)
- Verify test patterns work

### Phase 2 (Week 1): First Endpoint

**Day 6-7:**

- Implement `api-alts/index.ts`
- Write comprehensive tests (90%+ coverage)
- Document lessons learned

### Phase 3 (Week 2): Remaining Endpoints

**Day 8-12:**

- Implement api-notifications (2 days)
- Implement api-matches (2 days)
- Implement api-organizations (2 days)
- Implement api-tournaments (3 days)
- All with 80-85%+ coverage

### Phase 4 (Week 2-3): Backfill & Polish

**Day 13-15:**

- Write tests for signup/index.ts (70%+)
- Write tests for bluesky-auth/index.ts (85%+)
- Fix any failing tests
- Update documentation
- Verify CI passes

---

## 📊 Success Metrics

**Goal: 80%+ coverage on all new edge function code**

**Measurement:**

- Codecov reports per-package coverage with `supabase-edge-functions` flag
- CI blocks PRs with patch coverage below 60%
- All tests pass before merge

**Definition of Done:**

- ✅ All 5 API endpoint groups implemented
- ✅ All endpoints have comprehensive tests (80-95% coverage)
- ✅ API template and auth utilities have 95%+ coverage
- ✅ ActionResult type is shared and consistent
- ✅ CI passes with no test failures
- ✅ Mobile app can authenticate and call endpoints
- ✅ Documentation complete (API reference, testing guide)

---

## 🔗 Related Resources

**Documentation:**

- [Edge Function API Implementation Plan](./edge-function-api-implementation-plan.md) (NEW)
- [API Template Technical Spec](./edge-function-api-template-spec.md) (NEW)
- [Test Coverage Report](./edge-function-test-coverage-report.md) (NEW)
- [CLAUDE.md Project Guidelines](../CLAUDE.md)

**Reference Code:**

- Web Server Actions: `/Users/beanie/source/trainers.gg/apps/web/src/actions/`
- Existing Edge Functions: `/Users/beanie/source/trainers.gg/packages/supabase/supabase/functions/`
- Existing Tests: `/Users/beanie/source/trainers.gg/packages/supabase/supabase/functions/_shared/__tests__/`

**Related Tickets:**

- TGG-229 - Backend Logic Architecture (Phase 6: Edge Function API Layer)

---

## ✅ Conclusion

**The Edge Function API layer (TGG-229 Phase 6) has not been implemented yet.**

This investigation revealed:

1. ✅ Test infrastructure is ready (Jest, coverage, CI)
2. ✅ Shared utility tests exist and pass (cors.ts, pds.ts)
3. ❌ No API template or authentication helpers exist
4. ❌ No API endpoints exist for mobile app
5. ❌ Existing auth edge functions have no tests

**Recommendation: Proceed with Phase 1 (Shared Infrastructure) immediately.**

The API template is the foundation for all endpoints. Once built and tested, the remaining endpoints can be implemented rapidly using the template pattern.

**Estimated Timeline:**

- Phase 1 (Infrastructure): 2-3 days
- Phase 2 (First Endpoint): 2-3 days
- Phase 3 (Remaining Endpoints): 1 week
- Phase 4 (Backfill Tests): 2-3 days
- **Total: 2-3 weeks for complete implementation**

**Blocking Issues:**

- None - Ready to start implementation

**Required Approvals:**

- [ ] API template design (technical spec provided)
- [ ] Test coverage targets (80-95% specified)
- [ ] Implementation timeline (2-3 weeks estimated)

---

**Report Status:** Complete - Ready for Implementation
**Author:** Claude (AI Agent)
**Date:** 2026-02-05
