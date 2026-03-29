---
paths:
  - "**/*.test.{ts,tsx}"
  - "**/*.spec.{ts,tsx}"
  - "**/__tests__/**/*"
  - "**/e2e/**/*"
---

# Testing Philosophy

**Every feature, bug fix, or behavioral change must include tests.** CI enforces 60% patch coverage on new code.

**Test our logic, not the framework.** Don't test that React renders text, Array.filter works, or props pass through. Test decisions, conditional rendering based on domain rules, user interaction flows, and app-specific error handling.

**Use `it.each`** for multiple input/output pairs — parameterize instead of repeating `it()` blocks.

**Use Fishery factories** for all test data — never inline object literals for DB rows or domain types. If no factory exists, create one in `tooling/test-utils/src/factories/`.

**Prefer existing helpers over inline logic.** Check `@trainers/utils` and the package's own helpers before writing new code. Keep tests DRY and simple (KISS).

Pre-commit: Husky runs lint-staged (Prettier auto-fix). Fix errors, re-stage, retry — never skip hooks.
