---
name: trainers-atproto
description: Use when integrating AT Protocol, Bluesky feeds, DID resolution, handles, or working with the atproto package
---

# @trainers/atproto

AT Protocol / Bluesky utilities. Platform-agnostic — no Next.js, Expo, or framework imports.

## Key Modules

| Module | Purpose |
| ------ | ------- |
| `agent.ts` | Error-wrapped AT Protocol Agent with typed error classes |
| `api/` | Feed, posts, interactions, social graph operations |
| `config.ts` | `PDS_URL`, `POKEMON_KEYWORDS`, shared constants |
| `handle-utils.ts` | Handle validation and formatting |

## Auth Is Platform-Handled

This package does not manage auth sessions — each platform handles it differently:
- **Web**: OAuth via `@atproto/oauth-client-node`
- **Mobile**: Session persistence in SecureStore

Pass an authenticated `Agent` instance into API functions — don't manage sessions here.

## Public Agent

`getPublicAgent()` — unauthenticated agent for reading public content (no session needed).

## Key Subpaths

- `@trainers/atproto/api` — feed, posts, interactions, social graph (not in main export)

## Error Handling

Custom typed error classes:
- `BlueskyAuthError` — authentication failures
- `BlueskyApiError` — API call failures
- `withErrorHandling(fn)` — wraps functions with typed error catching

## Commands

```bash
pnpm --filter @trainers/atproto test          # Run tests (--passWithNoTests)
pnpm --filter @trainers/atproto test:watch    # Watch mode
pnpm --filter @trainers/atproto typecheck     # Type checking
```

## Testing

- **Location**: `src/__tests__/`, `src/api/__tests__/`
- `--passWithNoTests` — some areas may lack coverage
