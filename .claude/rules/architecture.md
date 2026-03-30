---
paths:
  - "packages/**/*"
---

# Architecture Principles

Guidelines for code organization, package boundaries, and reuse in the trainers.gg monorepo.

## Shared Packages vs App Code

**Shared package** (`packages/`): Zero framework imports — pure logic usable by web, mobile, and edge functions.

**App directory** (`apps/*/src/lib/`): Framework-specific adapters, React hooks, Next.js/Expo infrastructure.

### Decision Rule

If a module has zero framework imports and could be useful across apps, it belongs in a shared package.

| Has framework imports? | Used by multiple apps? | Where it belongs  |
| ---------------------- | ---------------------- | ----------------- |
| No                     | Yes                    | `packages/`       |
| No                     | No (but could be)      | `packages/`       |
| Yes                    | N/A                    | `apps/*/src/lib/` |

## Code Reuse

Extract abstractions after 2-3 repetitions. Always check existing patterns before creating new ones.

### Reference Implementations

- **TanStack Query factory**: `apps/mobile/src/lib/api/query-factory.ts`
- **Error extraction**: `packages/utils/src/error-handling.ts` — `getErrorMessage()`

### Extraction Checklist

1. Is this logic repeated 2-3 times already?
2. Does an existing utility in `@trainers/utils` or the relevant package already handle this?
3. Does the extracted code have zero framework imports? If yes, it belongs in `packages/`.
4. Will the extraction simplify tests?
