---
applyTo: "**"
excludeAgent: "coding-agent"
---

# Code Review Instructions

## Check All Commits Before Flagging Issues

This project uses stacked commits within PRs. Before flagging an issue, check whether a later commit in the same PR already addresses it. Review the full commit history, not just the diff against base.

## Auto-Generated Files

`packages/supabase/src/types.ts` is regenerated from the live database schema via `pnpm generate-types`. Changes in this file (including removed table types) reflect intentional schema changes in migration files — not accidental deletions. Do not flag added, removed, or modified types in this file.

## Migration Conventions

All migrations must be idempotent because Supabase preview branches replay every migration on a fresh database.

The standard pattern for constraints is:

```sql
DROP CONSTRAINT IF EXISTS ... ;
ADD CONSTRAINT ... ;
```

This is the project's idempotency pattern, not a redundant operation. Do not suggest removing the `DROP IF EXISTS`.

Migrations that add a `NOT NULL` column with `DEFAULT ''` followed by a `CHECK` constraint must account for backfilled empty strings. The pattern `CHECK (col = '' OR col ~ '^https?://')` is intentional.

Never suggest editing or renaming a committed migration file — timestamps are recorded in production history and renaming breaks preview branches.

## Regex Analysis

Before claiming a regex captures unintended characters, verify the character class. For example, `([a-zA-Z0-9-]+)` inherently stops at `?`, `#`, `/`, and any character not in the class. Do not flag it as capturing query parameters or fragments.

## React Compiler

React Compiler is enabled in this project. Do not suggest adding `useMemo`, `useCallback`, or `React.memo` — manual memoization conflicts with compiler optimizations.

## Zod Validation Patterns

This project uses Zod's `.transform().pipe()` pattern to trim input before validation:

```ts
z.string()
  .transform((val) => val.trim())
  .pipe(z.string().max(100));
```

This ensures trimming happens before length/format checks. Do not suggest `.preprocess()` as an alternative — the project has standardized on transform+pipe.

## JSONB Type Casting

Supabase JSONB columns use `as unknown as Json` for type casting (where `Json` is the Supabase-generated type). Do not suggest `Json[]` — the generated column type is `Json | null`, not `Json[]`.

## UI Components

- This project uses shadcn/ui v4 with **Base UI** primitives (not Radix). Do not suggest `asChild` — it does not exist in Base UI.
- Never suggest rendering raw enum or database values in UI. Values must be mapped through label constants (e.g., `SOCIAL_PLATFORM_LABELS`).
- Use `cn()` for dynamic Tailwind classes, never template literals.

## Edge Functions

Edge functions are deployed automatically during CI — never suggest manual `supabase functions deploy`. Every edge function must have a `[functions.<name>]` entry in `packages/supabase/supabase/config.toml`.

## Server Actions

Server Actions return `{ success: boolean; error?: string }`. Do not suggest throwing errors from Server Actions — errors are returned as values.

## Request Interception

Next.js 16 uses `proxy.ts` (at `src/proxy.ts`), not `middleware.ts`. Do not reference middleware patterns.
