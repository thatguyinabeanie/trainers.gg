---
name: analytics
description: Use when adding PostHog analytics events, tracking user actions, or working with the posthog package
---

# @trainers/posthog

Shared PostHog event name constants for all surfaces: web, mobile, and edge functions. Pure TypeScript — zero dependencies, no SDK imports.

## Conventions

- **Past-tense event names**: `tournament_created`, not `create_tournament`
- **SCREAMING_SNAKE_CASE constants**: `TOURNAMENT_CREATED` in code, `"tournament_created"` as value
- **Surface distinguished by `$lib`**, not event name — edge functions tag `$lib: "trainers-edge-functions"`

## Adding New Events

1. Add constant to `src/events.ts`
2. Re-export from `src/index.ts`
3. Import at call site

## Current Events

| Constant | Value |
|---|---|
| `USER_SIGNED_UP` | `user_signed_up` |
| `USER_SIGNED_UP_BLUESKY` | `user_signed_up_bluesky` |
| `BETA_INVITE_SENT` | `beta_invite_sent` |
| `TOURNAMENT_CREATED` | `tournament_created` |
| `TOURNAMENT_STARTED` | `tournament_started` |
| `TOURNAMENT_REGISTERED` | `tournament_registered` |
| `GAME_RESULT_SUBMITTED` | `game_result_submitted` |

Edge functions resolve `@trainers/posthog` via the Deno import map in `packages/supabase/supabase/functions/deno.json`.

## Commands

```bash
pnpm --filter @trainers/posthog typecheck     # Type checking
```
