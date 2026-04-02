---
name: reviewing-pr
description: Use when reviewing a PR or after creating a PR — orchestrates generic code quality review, project-specific checks, CI monitoring, and comment handling
---

# Reviewing PR

Orchestrator skill that runs a comprehensive PR review by dispatching domain-specific checks based on which files changed.

## Workflow

### Phase 1: Generic Code Quality

Invoke `/pr-review-toolkit:review-pr all parallel` for standard review agents (code, tests, errors, types, simplify).

### Phase 2: Project-Specific Checks

Based on changed files (`git diff main...HEAD --name-only`):

| Files Changed                                    | Skill to Invoke                          | Agent to Dispatch    |
| ------------------------------------------------ | ---------------------------------------- | -------------------- |
| `packages/supabase/supabase/migrations/`         | `reviewing-database`                     | `migration-reviewer` |
| `packages/supabase/src/queries/` or `mutations/` | `reviewing-database`                     | —                    |
| `apps/web/src/app/` (pages, Server Components)   | `reviewing-caching`                      | —                    |
| `apps/web/src/actions/`                          | `reviewing-caching` (cache invalidation) | —                    |
| Auth, RLS, or sensitive data changes             | —                                        | `security-reviewer`  |
| `apps/web/` (new user-facing features)           | `checking-mobile-parity`                 | —                    |

Dispatch independent checks in parallel where possible.

### Phase 3: CI + Feedback

After fixes are pushed, invoke `reviewing-pr-feedback` to monitor CI, fetch comments, address them with the user, and reply.

### Phase 4: Final Verification

- `pnpm typecheck` passes
- `pnpm test` passes
- `pnpm lint` passes
- All CI checks green
- All review comments addressed
