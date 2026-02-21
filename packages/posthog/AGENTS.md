# @trainers/posthog

Shared PostHog event name constants for all surfaces: web (posthog-js), mobile (posthog-react-native), and edge functions (raw HTTP API).

Pure TypeScript — zero dependencies, no SDK imports.

## Structure

```
src/
  events.ts   # Event name constants (SCREAMING_SNAKE_CASE)
  index.ts    # Re-exports
```

## Usage

Import event names from `@trainers/posthog` in any surface:

```typescript
// Edge functions (Deno) — via import map in deno.json
import { TOURNAMENT_CREATED } from "@trainers/posthog";

// Web app (Next.js)
import { TOURNAMENT_CREATED } from "@trainers/posthog";

// Mobile app (Expo)
import { TOURNAMENT_CREATED } from "@trainers/posthog";
```

Edge functions resolve `@trainers/posthog` via the Deno import map in `packages/supabase/supabase/functions/deno.json`.

## Conventions

- **Past-tense event names**: `tournament_created`, not `create_tournament`
- **SCREAMING_SNAKE_CASE constants**: `TOURNAMENT_CREATED` in code, `"tournament_created"` as the value
- **Surface is distinguished by `$lib`**, not the event name — edge functions tag `$lib: "trainers-edge-functions"`, web and mobile use their respective SDK defaults

## Adding New Events

1. Add the constant to `src/events.ts`
2. Re-export from `src/index.ts`
3. Import at the call site (edge function, web, or mobile)

## Current Events

| Constant | Value | Surfaces |
|---|---|---|
| `USER_SIGNED_UP` | `user_signed_up` | Edge |
| `USER_SIGNED_UP_BLUESKY` | `user_signed_up_bluesky` | Edge |
| `BETA_INVITE_SENT` | `beta_invite_sent` | Edge |
| `TOURNAMENT_CREATED` | `tournament_created` | Edge |
| `TOURNAMENT_STARTED` | `tournament_started` | Edge |
| `TOURNAMENT_REGISTERED` | `tournament_registered` | Edge |
| `GAME_RESULT_SUBMITTED` | `game_result_submitted` | Edge |
