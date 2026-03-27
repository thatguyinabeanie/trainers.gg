---
applyTo: "packages/validators/**"
---

# Validators Package Instructions

## Purpose

`@trainers/validators` is the shared validation layer for all user input — forms, Server Actions, and edge functions. All validation schemas live here, not in app code.

## Schema Conventions

- One file per domain (e.g., `auth.ts`, `tournament.ts`, `match.ts`, `organization.ts`)
- Export both the Zod schema and the inferred type:
  ```ts
  export const createTournamentSchema = z.object({ ... });
  export type CreateTournamentInput = z.infer<typeof createTournamentSchema>;
  ```
- Naming: `camelCaseSchema` suffix (e.g., `reportMatchResultSchema`)
- Re-export from `src/index.ts`

## Transform+Pipe Pattern

Optional string fields use a standardized transform+pipe pattern:

```ts
// Trim before length check
const optionalHandle = z
  .string()
  .transform((val) => val.trim())
  .pipe(z.string().max(100))
  .or(z.literal(""))
  .optional()
  .transform((val) => val || undefined);

// Trim before URL validation
const optionalUrl = z
  .string()
  .transform((val) => val.trim())
  .pipe(z.string().url("Must be a valid URL"))
  .or(z.literal(""))
  .optional()
  .transform((val) => val || undefined);
```

Key principles:
- `.transform()` trims whitespace before `.pipe()` validates length/format
- Empty strings are transformed to `undefined` so downstream code only handles `string | undefined`
- Do not use `.preprocess()` — the project has standardized on transform+pipe

## Profanity Filter

User-facing string fields use `.refine()` with `containsProfanity()` from `./profanity`. Apply to name, description, slug, and label fields.

## Social Link Platforms

`SOCIAL_LINK_PLATFORMS` is a const array defining all known platforms. Use `z.enum(SOCIAL_LINK_PLATFORMS)` for platform validation. The `SocialLinkPlatform` type is derived from this array.

## Testing

Tests live in `src/__tests__/`. Cover:
- Valid input acceptance
- Required field rejection
- Constraint violations (max length, regex patterns)
- Transform behavior (trimming, empty-to-undefined conversion)
