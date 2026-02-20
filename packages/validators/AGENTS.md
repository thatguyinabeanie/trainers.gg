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

## Profanity Filter

`profanity.ts` — custom patterns for username/display name validation. Used in user and alt schemas.
