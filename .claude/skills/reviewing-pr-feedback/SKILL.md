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

After pushing fixes, reply to EVERY comment with a **status label** so anyone scanning the PR can immediately see what happened. The label must be the first thing in the reply — bold, with emoji.

### Status Labels

| Label                 | When to use                                                              |
| --------------------- | ------------------------------------------------------------------------ |
| ✅ **FIXED** (sha)    | Code was changed to address the comment                                  |
| ❌ **FALSE POSITIVE** | The concern is incorrect (e.g., flagging a built-in function as missing) |
| 🚫 **WON'T DO**       | Valid concern but intentionally not addressing (explain why)             |
| 🔜 **DEFERRED**       | Valid concern, will address in a future PR (explain when/why)            |
| ℹ️ **ACKNOWLEDGED**   | Informational — no code change needed but noting for the record          |

### Format

```
✅ **FIXED** (abc1234) — Brief description of what changed.
```

Always include the commit SHA for FIXED items so the reviewer can verify. Keep the description to one line.

### Reply Commands

```bash
gh api /repos/{owner}/{repo}/pulls/{pr}/comments/{id}/replies \
  -f body="✅ **FIXED** ({sha}) — {what changed}"

gh api /repos/{owner}/{repo}/pulls/{pr}/comments/{id}/replies \
  -f body="❌ **FALSE POSITIVE** — {why it's incorrect}"

gh api /repos/{owner}/{repo}/pulls/{pr}/comments/{id}/replies \
  -f body="🔜 **DEFERRED** — {why and when}"

gh api /repos/{owner}/{repo}/pulls/{pr}/comments/{id}/replies \
  -f body="🚫 **WON'T DO** — {why}"

gh api /repos/{owner}/{repo}/pulls/{pr}/comments/{id}/replies \
  -f body="ℹ️ **ACKNOWLEDGED** — {context}"
```

### Rules

- **Every comment gets a labeled reply** — no comment left without a status
- **FIXED replies must include the commit SHA** — "Fixed" without a SHA is useless
- **DEFERRED must say when** — "later" is not a plan, "in a follow-up PR for X" is
- **Never reply with just an explanation** — always lead with the status label
- **If something was initially DEFERRED but later fixed in the same PR**, add a new reply updating the status to FIXED with the commit SHA

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
