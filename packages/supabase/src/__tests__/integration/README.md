# Integration Tests

## Overview

Integration tests that run against a real local Supabase database to validate:

- Database behavior
- RLS (Row Level Security) policies
- Critical tournament flows
- Concurrent operations
- Organization permissions

## Requirements

### Local Supabase Running

These tests require a local Supabase instance. Start it with:

```bash
pnpm db:start
```

If Supabase is not running, tests will be automatically skipped with a warning message.

### Environment Variables

Tests will automatically use local Supabase credentials:

- `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`
- `SUPABASE_SERVICE_ROLE_KEY` (from `.env.local`)

## Running Tests

### Run all integration tests

```bash
pnpm test --filter=@trainers/supabase -- integration
```

### Run specific test file

```bash
pnpm test --filter=@trainers/supabase -- tournament-registration.integration
```

### Run with coverage

```bash
pnpm test:ci --filter=@trainers/supabase -- integration
```

## Test Files

### 1. tournament-registration.integration.test.ts

Tests the complete registration workflow:

- ✅ Player registration flow
- ✅ Team submission
- ✅ Check-in process
- ✅ Team locking on tournament start
- ✅ RLS policies for registrations
- ✅ Team visibility based on `open_team_sheets` flag
- ✅ Max capacity handling
- ✅ Notification queries with user isolation

**Key Scenarios:**

- Complete flow: register → submit team → check in → start tournament
- Team visibility: closed vs. open team sheets
- Registration capacity limits
- User-specific notification queries

### 2. multi-round-tournament.integration.test.ts

Tests multi-round tournament execution:

- ✅ Tournament start and round 1 creation
- ✅ Player stats initialization
- ✅ Match result submission
- ✅ Standings calculation
- ✅ Round 2 generation based on standings
- ✅ Player drop handling
- ✅ Bye assignment for odd player counts
- ✅ Tournament completion

**Key Scenarios:**

- Full tournament lifecycle with 8 players
- Match results updating standings correctly
- Swiss pairing logic
- Drop mechanics between rounds
- Final standings accuracy

### 3. concurrent-operations.integration.test.ts

Tests race conditions and concurrent operations:

- ✅ Simultaneous registrations at max capacity
- ✅ Concurrent match result submissions
- ✅ Concurrent team updates
- ✅ Team locking after tournament start
- ✅ Database transaction integrity
- ✅ Cascading delete behavior
- ✅ Optimistic locking scenarios

**Key Scenarios:**

- Multiple players racing to register in the last spot
- Both players in a match submitting results simultaneously
- Concurrent team modifications
- Foreign key constraint enforcement
- Data consistency under concurrent load

### 4. organization-permissions.integration.test.ts

Tests RLS policies and organization permissions:

- ✅ Organization owner permissions
- ✅ Tournament organizer (TO) permissions
- ✅ Staff member permissions
- ✅ Regular user permissions
- ✅ Cross-organization data isolation
- ✅ Permission escalation prevention
- ✅ `has_org_permission` RPC function validation

**Key Scenarios:**

- Owner can create tournaments and manage staff
- TO can start tournaments and view registrations
- Staff have read-only access
- Regular users cannot modify tournament data
- Users cannot access other organizations' data
- Users cannot grant themselves elevated permissions

## Test Helpers

### test-helpers.ts

Provides utilities for test setup:

**Functions:**

- `isSupabaseRunning()` - Check if local Supabase is available
- `createTestUser()` - Create authenticated test user
- `createTestAlt()` - Create player identity (alt)
- `createTestOrganization()` - Create test organization
- `createTestTournament()` - Create test tournament
- `registerPlayerForTournament()` - Register player for tournament
- `createTestTeam()` - Submit team for registration
- `cleanupTestData()` - Clean up test data after tests
- `createTournamentScenario()` - Create complete tournament with N players

**Types:**

- `TestUser` - User with auth client
- `TestAlt` - Player identity
- `TestTournament` - Tournament data

## Best Practices

### Test Isolation

Each test creates its own test data and cleans up after execution:

```typescript
afterEach(async () => {
  await cleanupTestData(adminClient, {
    tournamentIds: [tournament.id],
    organizationIds: [organizationId],
    userIds: [user.id],
  });
});
```

### Skipping Tests Gracefully

Tests automatically skip if Supabase is not running:

```typescript
beforeEach(async () => {
  if (!isSupabaseRunning()) {
    return;
  }
  // Test setup...
});

it("should test something", async () => {
  if (!isSupabaseRunning()) {
    return;
  }
  // Test code...
});
```

### Using Admin Client

Tests use the admin client (service role) to bypass RLS for setup/cleanup:

```typescript
const adminClient = createAdminSupabaseClient();
```

For RLS testing, create user-specific clients:

```typescript
const user = await createTestUser(adminClient, "test@example.com", "testuser");
// user.client is authenticated as this user
```

### Sample Data

Tests use realistic Pokemon teams from `SAMPLE_TEAM` constants. These are valid Showdown format team exports.

## CI Integration

Integration tests run in CI after unit tests:

1. **Setup:** CI starts local Supabase via Docker
2. **Migrate:** Apply all migrations
3. **Test:** Run integration tests
4. **Teardown:** Clean up database

Tests are included in coverage reports with the `supabase` flag in `codecov.yml`.

## Troubleshooting

### Tests are skipped

**Issue:** Tests show "Skipping integration tests" warning

**Solution:** Start local Supabase:

```bash
pnpm db:start
```

### Database connection errors

**Issue:** Tests fail with connection errors

**Solution:**

1. Check Supabase is running: `pnpm db:status`
2. Verify `.env.local` has correct credentials
3. Reset database: `pnpm db:reset`

### Tests leave behind data

**Issue:** Test data not cleaned up

**Solution:**

1. Check `afterEach` cleanup is running
2. Manually reset database: `pnpm db:reset`
3. Check for failed assertions that prevent cleanup

### RLS policy violations

**Issue:** Tests fail with RLS errors

**Solution:**

1. Tests should use admin client for setup/cleanup
2. Use user-specific clients only for testing RLS
3. Check migration files for correct RLS policies

## Writing New Integration Tests

### Template

```typescript
import { createAdminSupabaseClient } from "../../client";
import type { TypedClient } from "../../client";
import {
  isSupabaseRunning,
  createTournamentScenario,
  cleanupTestData,
} from "./test-helpers";

describe("My Integration Test", () => {
  let adminClient: TypedClient;
  let testData: {
    tournament: TestTournament;
    organizationId: number;
    owner: TestUser;
    players: Array<{ user: TestUser; alt: TestAlt; registrationId: number }>;
  };

  beforeAll(() => {
    if (!isSupabaseRunning()) {
      console.warn("Skipping integration tests: Supabase not running locally.");
    }
  });

  beforeEach(async () => {
    if (!isSupabaseRunning()) {
      return;
    }

    adminClient = createAdminSupabaseClient();
    testData = await createTournamentScenario(adminClient, 4);
  });

  afterEach(async () => {
    if (!isSupabaseRunning() || !testData) {
      return;
    }

    await cleanupTestData(adminClient, {
      tournamentIds: [testData.tournament.id],
      organizationIds: [testData.organizationId],
      userIds: [testData.owner.id, ...testData.players.map((p) => p.user.id)],
    });
  });

  it("should test something", async () => {
    if (!isSupabaseRunning()) {
      return;
    }

    // Your test code here
    expect(true).toBe(true);
  });
});
```

### Guidelines

1. **Always check `isSupabaseRunning()`** in `beforeAll`, `beforeEach`, and each test
2. **Always clean up** test data in `afterEach`
3. **Use descriptive test names** that explain what's being tested
4. **Test real behavior**, not implementation details
5. **Use realistic data** (e.g., valid Pokemon teams)
6. **Verify side effects** (e.g., standings updated after match)
7. **Test edge cases** (e.g., odd number of players, max capacity)

## Coverage

Integration tests contribute to overall coverage metrics:

- **Target:** 60% patch coverage on new code
- **Included in:** Codecov reports with `supabase` flag
- **Excluded:** Test files themselves, generated types, UI components

Run coverage report:

```bash
pnpm test:ci
```

View coverage:

```bash
open coverage/lcov-report/index.html
```

## Additional Resources

- [Supabase Testing Guide](https://supabase.com/docs/guides/testing)
- [Jest Testing Best Practices](https://jestjs.io/docs/api)
- [RLS Policy Testing](https://supabase.com/docs/guides/auth/row-level-security)
