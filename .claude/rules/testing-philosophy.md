---
paths:
  - "**/*.test.{ts,tsx}"
  - "**/*.spec.{ts,tsx}"
  - "**/__tests__/**/*"
  - "**/e2e/**/*"
---

# Testing Philosophy

**Every feature, bug fix, or behavioral change must include tests.** CI enforces 60% patch coverage on new code.

## What to Test

**Test our logic, not the framework.** Don't test that React renders text, Array.filter works, or props pass through. Test decisions, conditional rendering based on domain rules, user interaction flows, and app-specific error handling.

Good test targets:

- Domain logic (tournament pairings, team validation, permission checks)
- Conditional rendering driven by business rules
- User interaction flows (form submit, click handlers, navigation)
- Error handling and edge cases
- Server Action return values

## Test Structure

**Use `it.each`** for multiple input/output pairs — parameterize instead of repeating `it()` blocks.

```ts
it.each([
  ["swiss", 8, 3],
  ["swiss", 16, 4],
  ["single_elimination", 8, 3],
])("calculates rounds for %s with %i players", (format, players, expected) => {
  expect(calculateRounds(format, players)).toBe(expected);
});
```

**Use `describe` blocks** to group related tests by behavior, not by method name.

## Test Data

**Use Fishery factories** for all test data — never inline object literals for DB rows or domain types. If no factory exists, create one in `tooling/test-utils/src/factories/`.

```ts
// Good
const tournament = tournamentFactory.build({ status: "active" });

// Avoid — brittle, hard to maintain
const tournament = { id: 1, name: "Test", status: "active", ... };
```

## File Location

- **Unit tests**: colocated — `foo.test.ts` next to `foo.ts`
- **E2E tests**: `apps/web/e2e/`
- **Test utilities/factories**: `tooling/test-utils/src/`

## Mocking Strategy

- Mock at the **query/mutation level**, not the HTTP level — use `@trainers/supabase` test helpers
- Prefer dependency injection over module mocking when possible (Supabase queries already accept `TypedClient`)
- Avoid snapshot testing — prefer explicit assertions on behavior and DOM structure

## Code Quality

**Prefer existing helpers over inline logic.** Check `@trainers/utils` and the package's own helpers before writing new code. Keep tests DRY and simple (KISS).

## Pre-commit Hooks

Lefthook runs ESLint `--fix`, Prettier auto-fix, and typecheck on affected packages. Fix errors, re-stage, retry — never skip hooks with `--no-verify`.
