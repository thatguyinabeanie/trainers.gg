---
name: writing-tests
description: Use when writing tests, creating test data, mocking Supabase or AT Protocol, or configuring Jest
---

## Testing Philosophy

**Every feature, bug fix, or behavioral change must include tests.** CI enforces 60% patch coverage on new code.

**Test our logic, not the framework.** Don't test that React renders text, Array.filter works, or props pass through. Test decisions, conditional rendering based on domain rules, user interaction flows, and app-specific error handling.

**Use `it.each`** for multiple input/output pairs — parameterize instead of repeating `it()` blocks.

**Use Fishery factories** for all test data — never inline object literals for DB rows or domain types. If no factory exists, create one in `tooling/test-utils/src/factories/`.

**Prefer existing helpers over inline logic.** Check `@trainers/utils` and the package's own helpers before writing new code. Keep tests DRY and simple (KISS).

Pre-commit: Husky runs lint-staged (Prettier auto-fix). Fix errors, re-stage, retry — never skip hooks.

## Local Dev Test Accounts

Seed data in `packages/supabase/supabase/seeds/03_users.sql`. All accounts use the same password.

**Password**: `Password123!`

| Email                      | Username      | Role / Notes                     |
| -------------------------- | ------------- | -------------------------------- |
| `admin@trainers.local`     | admin_trainer | Site admin, VGC League org owner |
| `player@trainers.local`    | ash_ketchum   | Player, Pallet Town org owner    |
| `champion@trainers.local`  | cynthia       | Player                           |
| `gymleader@trainers.local` | brock         | Player                           |
| `elite@trainers.local`     | karen         | Player                           |
| `casual@trainers.local`    | red           | Player                           |
| `lance@trainers.local`     | lance         | Player                           |

Additional generated users follow the pattern `<username>@trainers.local` (see seed file for full list).

# @trainers/test-utils

Shared test utilities: Fishery factories, mock builders, and Jest configuration.

## Key Subpaths

- `@trainers/test-utils/factories` — Fishery factories for all DB rows and domain types
- `@trainers/test-utils/mocks` — mock builders (Supabase client, AT Protocol agents)
- `@trainers/test-utils/jest-config` — shared `createConfig()` for `jest.config.ts` (plain CJS — Jest loads this before ts-jest is active)

## Factories (Fishery)

```typescript
import { userFactory, altFactory, tournamentFactory } from "@trainers/test-utils/factories";

const user = userFactory.build({ username: "ash" });
const users = userFactory.buildList(5);
const alt = altFactory.build({ user_id: user.id });
```

### Available Factories

| Factory | Type |
| ------- | ---- |
| `userFactory` | `Tables<"users">` |
| `altFactory` | `Tables<"alts">` |
| `organizationFactory` | `Tables<"organizations">` |
| `tournamentFactory` | `Tables<"tournaments">` |
| `notificationFactory` | `Tables<"notifications">` |
| `tournamentMatchFactory` | `Tables<"tournament_matches">` |
| `matchGameFactory` | `Tables<"match_games">` |
| `playerRecordFactory` | `PlayerRecord` (tournament domain) |
| `bracketPlayerFactory` | `BracketPlayer` (tournament domain) |

### Adding a New Factory

1. Create `src/factories/<domain>.ts`
2. `Factory.define<YourType>(({ sequence }) => ({ ... }))`
3. Re-export from `src/factories/index.ts`

## Mock Builders

```typescript
import { createMockClient } from "@trainers/test-utils/mocks";
// All query builder methods pre-mocked with jest.fn().mockReturnThis()
// Terminal methods (single, maybeSingle) are plain jest.fn()

import {
  createMockAgent,        // social graph Agent (follow, block, mute)
  createMockFeedAgent,    // feed Agent (timeline, author feed, likes)
  createMockProfileView,  // basic profile
  createMockPost,         // feed post (FeedViewPost)
} from "@trainers/test-utils/mocks";
```

## Jest Config

```typescript
// jest.config.ts
import type { Config } from "jest";
import { createConfig } from "@trainers/test-utils/jest-config";

export default createConfig({ displayName: "my-package" }) satisfies Config;
```

## Commands

```bash
pnpm --filter @trainers/test-utils format        # Prettier auto-fix
pnpm --filter @trainers/test-utils format:check  # Check formatting
pnpm --filter @trainers/test-utils typecheck     # Type checking
```
