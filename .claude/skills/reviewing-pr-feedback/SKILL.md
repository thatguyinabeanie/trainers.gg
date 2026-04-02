---
name: reviewing-pr-feedback
description: Use after pushing to a PR — monitors CI check results, fetches and addresses review comments (Copilot, Vercel Agent, human), fixes failures, and replies to all comments before declaring done
---

# Reviewing PR Feedback

Monitor CI, fetch review comments, address them with the user, fix approved items, and reply. This is the feedback loop after code is pushed to a PR.

## The Loop

```
PR pushed → Check CI → Fix failures → Fetch comments → Group + present →
User decides per group → Fix approved items → Reply to all → Re-check CI → Done
```

## Phase 1: CI Monitoring

```bash
gh pr checks <pr-number>
```

Re-run until no check shows `pending`. Fix any failures locally:

- Lint: `pnpm lint`
- Types: `pnpm typecheck`
- Tests: `pnpm test`
- E2E: `pnpm test:e2e`

Push fixes — CI re-runs automatically. Never force-push.

## Phase 2: Fetch Review Comments

```bash
# All review comments (code-level)
gh api /repos/{owner}/{repo}/pulls/{pr}/comments \
  --jq '.[] | {id, user: .user.login, path, line, body, in_reply_to_id}'

# PR-level comments
gh api /repos/{owner}/{repo}/issues/{pr}/comments \
  --jq '.[] | {id, user: .user.login, body}'
```

Filter to unreplied comments (no `in_reply_to_id` pointing to them).

## Phase 3: Review with User

**Group similar comments** — if 3 comments flag the same pattern, present once.

For each comment/group:

1. Show the file, line, and full comment text
2. Explain in plain language what the concern is
3. Give your assessment — valid concern, false positive, or style preference
4. Wait for user decision: fix, acknowledge, or dismiss
5. Record the decision

Do not touch code during this phase. One decision at a time.

## Phase 4: Implement Fixes

After all comments reviewed, ask: **"Ready to implement?"**

- Dispatch **parallel subagents** for independent fixes
- Single push to keep CI clean
- Run `pnpm typecheck && pnpm test` before pushing

## Phase 5: Reply to Comments

After pushing fixes:

```bash
# Fixed
gh api /repos/{owner}/{repo}/pulls/{pr}/comments/{id}/replies \
  -f body="Fixed in {sha} — {summary}"

# Acknowledged
gh api /repos/{owner}/{repo}/pulls/{pr}/comments/{id}/replies \
  -f body="Acknowledged — {reason}"

# Dismissed
gh api /repos/{owner}/{repo}/pulls/{pr}/comments/{id}/replies \
  -f body="Dismissed — {reason}"
```

## Phase 6: Final CI Check

Re-run `gh pr checks` after pushing fixes. Loop until green.

## Timing

| What                | Typical wait              |
| ------------------- | ------------------------- |
| CI checks start     | ~30s after push           |
| CI checks complete  | 2-10 min                  |
| Copilot review      | 2-5 min after PR creation |
| Vercel Agent review | 3-5 min                   |
| Copilot timeout     | 10 min                    |

## Done When

- All CI checks green
- All review comments addressed with replies
- No unreplied comments remaining
