# Service Layer Architecture

## Overview

The service layer contains pure business logic that is shared between:

- **Server Actions** (web app forms, mutations)
- **API Routes** (mobile app, external clients)

## Pattern

```
┌─────────────────────────────────────────────────────────┐
│                   Web Client Component                   │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│               Server Action (use server)                 │
│  - Bot protection (rejectBots)                          │
│  - Cache invalidation (updateTag)                       │
│  - Error wrapping (ActionResult)                        │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                    Service Layer                         │
│  - Pure business logic                                   │
│  - Supabase queries/mutations                           │
│  - No framework dependencies                            │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
              Supabase Database
```

```
┌─────────────────────────────────────────────────────────┐
│                      Mobile App                          │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                  Next.js API Route                       │
│  - HTTP request handling                                │
│  - Input validation (Zod)                               │
│  - Response formatting (ActionResult)                   │
│  - Cache headers (Cache-Control)                        │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                    Service Layer                         │
│  (Same service functions as Server Actions)             │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
              Supabase Database
```

## Benefits

✅ **Zero Code Duplication**
Both Server Actions and API Routes call the same service functions.

✅ **Single Source of Truth**
Business logic lives in one place (service layer).

✅ **Easier Testing**
Test service functions independently without framework mocking.

✅ **Platform Independence**
Services have no Next.js dependencies (could be used in other frameworks).

✅ **Separation of Concerns**

- Services: Business logic
- Server Actions: Web-specific (bot protection, cache invalidation)
- API Routes: HTTP-specific (request/response handling)

## File Structure

```
apps/web/src/
  lib/services/
    tournaments.ts       # Tournament business logic
    matches.ts           # Match business logic
    alts.ts              # Alt management business logic
    organizations.ts     # Organization business logic
    notifications.ts     # Notification business logic
    README.md            # This file

  actions/
    tournaments.ts       # Server Actions (web) → calls services
    matches.ts
    alts.ts
    organizations.ts
    notifications.ts

  app/api/
    tournaments/
      route.ts           # API Routes (mobile) → calls services
      [id]/route.ts
      [id]/register/route.ts
    matches/[id]/route.ts
    alts/route.ts
    organizations/route.ts
    notifications/route.ts
```

## Example: Tournament Creation

### Service Function (Pure Business Logic)

```typescript
// apps/web/src/lib/services/tournaments.ts
export async function createTournamentService(data: CreateTournamentInput) {
  const supabase = await createClient();
  return await createTournament(supabase, data);
}
```

### Server Action (Web App)

```typescript
// apps/web/src/actions/tournaments.ts
"use server";

export async function createTournament(data: CreateTournamentInput) {
  try {
    await rejectBots(); // Bot protection
    const result = await createTournamentService(data); // Call service
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

### API Route (Mobile App)

```typescript
// apps/web/src/app/api/tournaments/route.ts
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const tournament = await createTournamentService(body); // Same service!
    return NextResponse.json({ success: true, data: tournament });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
```

## When to Use Services vs. Direct Calls

### Use Services ✅

- **Query/mutation logic** that might be reused
- **Complex business logic** (tournament pairings, standings)
- **Any operation the mobile app needs**

### Direct in Server Action ⚠️

- **Web-specific logic** (cache invalidation, bot protection)
- **One-off operations** not needed by mobile
- **Simple read queries** only used once

## Testing

Services are easy to test because they're pure functions:

```typescript
// apps/web/src/lib/services/__tests__/tournaments.test.ts
import { getTournamentByIdService } from "../tournaments";

describe("getTournamentByIdService", () => {
  it("should return tournament by ID", async () => {
    const tournament = await getTournamentByIdService(1);
    expect(tournament).toBeDefined();
    expect(tournament.id).toBe(1);
  });

  it("should throw error if tournament not found", async () => {
    await expect(getTournamentByIdService(999999)).rejects.toThrow(
      "Tournament not found"
    );
  });
});
```

## Migration Checklist

To refactor existing Server Actions to use services:

1. ✅ Create service function in `lib/services/[domain].ts`
2. ✅ Move business logic from Server Action to service
3. ✅ Update Server Action to call service
4. ✅ Keep bot protection, cache invalidation in Server Action
5. ✅ Create corresponding API Route if needed by mobile
6. ✅ Write tests for service function

## Next Steps

- [ ] Delete Edge Functions (no longer needed)
- [ ] Refactor remaining Server Actions to use services
- [ ] Create remaining API Routes for mobile app
- [ ] Write tests for service layer
- [ ] Update mobile app to call API Routes
