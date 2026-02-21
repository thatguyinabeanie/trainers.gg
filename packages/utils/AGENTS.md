# @trainers/utils

Shared utilities — formatting, countries, tiers, permissions, label mapping, error handling.
Pure TypeScript — no framework dependencies.

## Key Modules

| Module              | Purpose                                                                                              |
| ------------------- | ---------------------------------------------------------------------------------------------------- |
| `labels.ts`         | `getLabel()` — convert snake_case enum values to human-readable strings                              |
| `error-handling.ts` | `getErrorMessage()` — extract message from Error, Supabase error, or unknown                         |
| `permissions.ts`    | `PERMISSIONS` constants and `PermissionKey` type — security-critical, see file directly for all keys |
| `tiers.ts`          | User/org tier definitions and feature flags                                                          |
| `countries.ts`      | Country codes and display names                                                                      |
| `format.ts`         | Date, number, and string formatters                                                                  |
| `notifications.ts`  | Notification type helpers                                                                            |

## Non-obvious Usage

**`getLabel()`** is required whenever displaying enum/DB values in UI — never render raw snake_case values. This is enforced by the UI guidelines in root `CLAUDE.md`.

**`getErrorMessage(error, fallback, shouldSanitize?)`** handles all error types uniformly. Always use this instead of `error.message` directly.

## Commands

```bash
pnpm --filter @trainers/utils test          # Run tests
pnpm --filter @trainers/utils test:watch    # Watch mode
pnpm --filter @trainers/utils typecheck     # Type checking
```

## Testing

- **Test location**: `src/__tests__/`
- **No external dependencies** — pure utility tests, fast execution

## Additional Exports

Beyond labels and error handling, this package also exports:

- `COUNTRIES` — ISO 3166-1 country codes and display names
- `PERMISSIONS` + `PermissionKey` — security-critical constants (read file directly for full list)
- `getUserTierFeatures()`, `getTournamentFeePercentage()`, `calculatePlatformFee()` — tier/pricing logic
- `escapeLike()` — escape special characters for PostgREST `like` queries
- `formatTimeAgo()` — relative time formatting
