# @trainers/validators

Zod schemas and inferred types for input validation across web, mobile, and edge functions.
Pure TypeScript — no framework dependencies.

## Schemas

See `src/` for all schemas. Key files: `auth.ts`, `user.ts`, `team.ts`, `tournament.ts`, `organization.ts`, `alt.ts`.

Each schema file exports a Zod schema + inferred TypeScript type (e.g., `createTournamentSchema` + `CreateTournamentInput`).

## Team Parsing

`team.ts` exports `parseShowdownText()` and `parsePokepaseUrl()` — these integrate with `@trainers/pokemon` for full validation.

## Action Result Type

`actionResult` type used for Server Action return values: `{ success: boolean, error?: string }`. Import via `@trainers/validators/action-result`.

## Adding a New Schema

1. Create a file in `src/` named after the domain (e.g., `invitation.ts`)
2. Export a Zod schema using `camelCase` + `Schema` suffix (e.g., `createInvitationSchema`)
3. Export the inferred type alongside it (e.g., `type CreateInvitationInput = z.infer<typeof createInvitationSchema>`)
4. Re-export from `src/index.ts`

## Exports

| Import Path                 | Target         | Purpose                             |
| --------------------------- | -------------- | ----------------------------------- |
| `@trainers/validators`      | `src/index.ts` | All schemas and types               |
| `@trainers/validators/user` | `src/user.ts`  | Profile, settings, game preferences |
| `@trainers/validators/post` | `src/post.ts`  | Post creation, engagement           |
| `@trainers/validators/team` | `src/team.ts`  | Team parsing, submission            |

## Commands

```bash
pnpm --filter @trainers/validators test          # Run tests
pnpm --filter @trainers/validators test:watch    # Watch mode
pnpm --filter @trainers/validators typecheck     # Type checking
```

## Testing

- **Test location**: `src/__tests__/`
- **Dependencies**: `@pkmn/*` packages for team validation tests — may be slow on first run

## Profanity Filter

`profanity.ts` — custom patterns for username/display name validation. Used in user and alt schemas.

- `containsProfanity(text)` — check for profane content
- `censorProfanity(text)` — replace profane content with asterisks
- `CUSTOM_PATTERNS` — project-specific blocked terms (beyond the `obscenity` library defaults)
