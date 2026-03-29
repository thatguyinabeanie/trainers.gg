---
name: using-utils
description: Use when displaying enum or DB values in UI, handling errors, checking permissions, or working with the utils package
---

# @trainers/utils

Shared utilities — formatting, countries, tiers, permissions, label mapping, error handling. Pure TypeScript — no framework dependencies.

## Key Modules

| Module | Purpose |
| ------ | ------- |
| `labels.ts` | `getLabel()` — convert snake_case enum values to human-readable strings |
| `error-handling.ts` | `getErrorMessage()` — extract message from Error, Supabase error, or unknown |
| `permissions.ts` | `PERMISSIONS` constants + `PermissionKey` type — security-critical |
| `tiers.ts` | User/org tier definitions, feature flags, pricing |
| `countries.ts` | ISO 3166-1 country codes and display names |
| `format.ts` | Date, number, and string formatters |
| `notifications.ts` | Notification type helpers |

## Critical Usage Rules

**`getLabel()`** is required whenever displaying enum/DB values in UI — never render raw snake_case values.

**`getErrorMessage(error, fallback, shouldSanitize?)`** handles all error types uniformly. Always use this instead of `error.message` directly.

**`escapeLike(str)`** — escape special characters for PostgREST `like` queries.

## Usage Examples

### getLabel()

```typescript
import { getLabel } from "@trainers/utils";

// Convert DB enum values to display strings
getLabel("checked_in");    // "Checked In"
getLabel("not_started");   // "Not Started"
getLabel("in_progress");   // "In Progress"

// Use in components:
<span>{getLabel(tournament.status)}</span>
```

### getErrorMessage()

```typescript
import { getErrorMessage } from "@trainers/utils";

// In Server Actions:
catch (e) {
  return { success: false, error: getErrorMessage(e, "Something went wrong") };
}

// Handles: Error objects, Supabase PostgrestError, strings, unknown
```

### Permissions

```typescript
import { PERMISSIONS, type PermissionKey } from "@trainers/utils";

// Check user permissions against org/tournament roles
// Read permissions.ts for the full permission matrix
```

### Formatting

```typescript
import { formatTimeAgo } from "@trainers/utils";

formatTimeAgo(new Date("2024-01-01")); // "3 months ago"
```

## Additional Exports

- `COUNTRIES` — ISO country codes and display names
- `PERMISSIONS` + `PermissionKey` — security-critical constants (read file directly for full list)
- `getUserTierFeatures()`, `getTournamentFeePercentage()`, `calculatePlatformFee()` — tier/pricing logic
- `formatTimeAgo()` — relative time formatting

## Commands

```bash
pnpm --filter @trainers/utils test          # Run tests
pnpm --filter @trainers/utils test:watch    # Watch mode
pnpm --filter @trainers/utils typecheck     # Type checking
```
