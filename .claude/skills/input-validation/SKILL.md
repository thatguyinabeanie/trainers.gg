---
name: input-validation
description: Use when creating Zod schemas, adding input validation, working with Server Action return types, or the validators package
---

# @trainers/validators

Zod schemas and inferred types for input validation across web, mobile, and edge functions. Pure TypeScript — no framework dependencies.

## Existing Schemas

Check `src/` first — it likely already has what you need. Key files: `auth.ts`, `user.ts`, `team.ts`, `tournament.ts`, `organization.ts`, `alt.ts`.

Each file exports a Zod schema + inferred TypeScript type.

## Adding a New Schema

1. Create `src/<domain>.ts` (e.g. `invitation.ts`)
2. Export schema with `camelCase` + `Schema` suffix: `createInvitationSchema`
3. Export inferred type: `type CreateInvitationInput = z.infer<typeof createInvitationSchema>`
4. Re-export from `src/index.ts`

## Action Result Type

```typescript
import type { ActionResult } from "@trainers/validators/action-result";
// { success: boolean, error?: string }
```

## Team Parsing

`team.ts` exports `parseShowdownText()` and `parsePokepaseUrl()` — integrate with `@trainers/pokemon` for full validation.

## Profanity Filter

`profanity.ts` — used in user and alt schemas.
- `containsProfanity(text)` — check for profane content
- `censorProfanity(text)` — replace with asterisks
- `CUSTOM_PATTERNS` — project-specific blocked terms beyond library defaults

## Finding Things

All schemas re-exported from `src/index.ts`. Named subpaths exist for some domains — see `package.json` exports field.

## Commands

```bash
pnpm --filter @trainers/validators test          # Run tests
pnpm --filter @trainers/validators test:watch    # Watch mode
pnpm --filter @trainers/validators typecheck     # Type checking
```

## Testing

- **Location**: `src/__tests__/`
- **Note**: `@pkmn/*` packages for team validation tests — may be slow on first run
