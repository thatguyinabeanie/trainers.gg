---
name: validating-input
description: Use when creating Zod schemas, adding input validation, working with Server Action return types, profanity filtering, or the validators package
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

## Profanity Filter — Required for All Non-Staff User Input

**Every text field that accepts input from regular (non-staff, non-admin) users MUST include profanity validation.** The goal is preventing slurs, hate speech, and bigotry — not filtering mild profanity.

`profanity.ts` — uses the `obscenity` library with English dataset and leetspeak detection.

### Utilities

- `containsProfanity(text)` — returns `true` if slurs/hate speech detected
- `censorProfanity(text)` — replace with asterisks
- `PROFANITY_ERROR_MESSAGE` — standard error message (does not repeat the blocked word)
- `CUSTOM_PATTERNS` — project-specific blocked terms beyond library defaults

### How to Add Profanity Validation to a Zod Schema

**Always `.trim()` user text input before validation.** This prevents whitespace-only values from bypassing `.min()` checks and ensures profanity detection operates on cleaned content.

```typescript
import { containsProfanity, PROFANITY_ERROR_MESSAGE } from "./profanity";

// Required field — trim first, then validate:
z.string()
  .trim()
  .min(1)
  .max(200)
  .refine((val) => !containsProfanity(val), {
    message: PROFANITY_ERROR_MESSAGE,
  })

// Optional field — trim first:
z.string()
  .trim()
  .max(200)
  .refine((val) => !containsProfanity(val), {
    message: PROFANITY_ERROR_MESSAGE,
  })
  .optional()

// Optional field that could be empty string — trim first:
z.string()
  .trim()
  .max(200)
  .refine((val) => !val || !containsProfanity(val), {
    message: PROFANITY_ERROR_MESSAGE,
  })
  .optional()
```

### When to Add Profanity Validation

Add `.refine()` with `containsProfanity()` to any `z.string()` field where:
- A **non-staff, non-admin user** provides the text
- The text is **stored or displayed** to other users

This includes: usernames, display names, bios, locations, chat messages, team submissions, organization names/descriptions, tournament names/descriptions, Pokemon nicknames, alt names, social link labels.

### When NOT to Add Profanity Validation

Skip profanity validation for:
- **Admin/staff-only inputs**: announcements, moderation reasons, judge notes, tournament invitations, feature flag descriptions
- **Non-displayed inputs**: search queries, filter parameters, IDs, URLs, emails, passwords
- **External data**: OAuth profile data from third-party providers

### Fields Currently Protected

`auth.ts` (username), `user.ts` (displayName, bio, location), `alt.ts` (username, battleTag), `community.ts` (name, slug, description, social link labels), `organization-request.ts` (name, slug, description), `tournament.ts` (name, slug, description), `match.ts` (chat message content), `team.ts` (Pokemon nicknames via `validateTeamStructure()`, raw team text)

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
