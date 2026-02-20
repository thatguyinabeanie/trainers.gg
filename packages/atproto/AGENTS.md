# @trainers/atproto

AT Protocol / Bluesky utilities. Platform-agnostic — no Next.js, Expo, or framework imports.

## Key Modules

| Module            | Purpose                                                  |
| ----------------- | -------------------------------------------------------- |
| `agent.ts`        | Error-wrapped AT Protocol Agent with typed error classes |
| `api/`            | Feed, posts, interactions, social graph operations       |
| `config.ts`       | `PDS_URL`, `POKEMON_KEYWORDS`, shared constants          |
| `handle-utils.ts` | Handle validation and formatting                         |

## Auth Is Platform-Handled

This package does not manage auth sessions. Each platform handles it differently:

- **Web**: OAuth via `@atproto/oauth-client-node`
- **Mobile**: Session persistence in SecureStore

Pass an authenticated `Agent` instance into API functions — don't manage sessions here.

## Public Agent

`getPublicAgent()` — unauthenticated agent for reading public content (no session needed).
