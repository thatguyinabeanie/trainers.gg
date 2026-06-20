---
name: reviewing-pr-feedback
description: Use after pushing to a PR — the orchestration loop: wait for BOTH the Copilot review and all CI checks to finish, enumerate every CI check, delegate comment handling to `responding-to-review-comments`, request re-review, and loop until comments are zero and CI is green.
---

# Reviewing PR Feedback

Orchestration loop for PR feedback rounds. Comment handling (fetch, group, two-reply protocol, resolve) is delegated to `responding-to-review-comments`; this skill owns the wait-for-CI, CI enumeration, re-review request, and loop logic.

## The Loop

```
Wait for BOTH: Copilot review posted AND all CI checks terminal →
Run responding-to-review-comments (fetch → group → Reply #1 → fix → Reply #2 → resolve) →
Request Copilot re-review → Wait for review + CI again → Loop if new comments or red CI
```

This loop repeats until a review cycle produces zero actionable comments **and** CI is green. (Reply #1 → fix → Reply #2 → resolve is the path for _fix_ comments; a _not-an-issue_ comment gets one explanatory reply then resolve — see `responding-to-review-comments`.)

## Phase 0: Wait for review AND CI to settle

**Before acting on a round, wait until BOTH are true: (a) a new Copilot review has been posted since the last push, AND (b) every CI check has reached a terminal state (pass or fail).** Acting on comments while CI is still running means you miss CI failures that need fixing in the same pass; acting before the review posts means you loop prematurely.

Poll for both in one background loop. Capture the last-seen Copilot review timestamp as the baseline (so you detect the _new_ review, not a stale one), and treat `pending` / `queued` / `in_progress` as not-yet-terminal:

```bash
BASELINE="<last copilot review submitted_at, or the time of your last push>"
review_done=""; ci_done=""
for i in $(seq 1 60); do
  if [[ -z "$review_done" ]]; then
    latest=$(gh api repos/{owner}/{repo}/pulls/{pr}/reviews --paginate \
      | jq -r '[.[] | select(.user.login == "copilot-pull-request-reviewer[bot]")] | sort_by(.submitted_at) | last | .submitted_at')
    [[ -n "$latest" && "$latest" > "$BASELINE" ]] && review_done="$latest"
  fi
  if [[ -z "$ci_done" ]]; then
    pend=$(gh pr checks {pr} 2>&1 | grep -cE "	pending	|	queued	|	in_progress	")
    [[ "$pend" -eq 0 ]] && ci_done="yes"
  fi
  [[ -n "$review_done" && -n "$ci_done" ]] && break
  sleep 40
done
```

Run this as a background command so the session isn't blocked. When it returns, you have the new review's comments AND the final CI status together — fix both in the same round. (`copilot-pull-request-reviewer[bot]` is the review author login; review _comments_ show as `Copilot` — match on either.)

## Phase 1: CI Check

Phase 0 already waited for CI to reach a terminal state — now enumerate the final result.

```bash
gh pr checks <pr-number>
```

**Enumerate every check by name with pass/fail — do not say "CI is running" or "CI looks good".** Report in a table so a missed failure (e.g., codecov patch coverage) cannot hide inside "running":

| Check           | Status       | Notes                     |
| --------------- | ------------ | ------------------------- |
| Lint            | PASS/FAIL/⏳ | —                         |
| Typecheck       | PASS/FAIL/⏳ | —                         |
| Unit tests      | PASS/FAIL/⏳ | X passed, Y failed        |
| E2E             | PASS/FAIL/⏳ | —                         |
| codecov/patch   | PASS/FAIL/⏳ | must enumerate explicitly |
| codecov/project | PASS/FAIL/⏳ | must enumerate explicitly |
| Vercel preview  | PASS/FAIL/⏳ | —                         |
| (any other)     | PASS/FAIL/⏳ | —                         |

If any check is FAIL, it is part of **this round's work** — fix it in the same pass as the review comments (don't push a comments-only fix and leave CI red). For a failing check, fetch the failing logs to find the real cause before guessing:

- Lint: `pnpm lint`
- Types: `pnpm typecheck`
- Tests: `pnpm test` — for a specific shard/file, `gh run view <run-id> --log-failed` (or `gh api repos/{owner}/{repo}/actions/jobs/<job-id>/logs`) to see the exact failing test, then reproduce locally with a scoped `jest <path>`
- Codecov failures: often fixed by adding tests for uncovered lines on the changed patch

Combine CI fixes and review-comment fixes into the round's commit(s). After pushing, **Phase 0 runs again** — re-enumerate CI and never assume a previous failure is fixed without confirming the status turned to PASS.

## Phase 2: Respond to comments

Run the `responding-to-review-comments` skill — it fetches comments, detects stale ones, groups by theme, walks through each with the user, posts Reply #1 (the decision), implements all fixes (review comments AND the CI failures from Phase 1, in the same round), posts Reply #2 (Fixed in \<sha\>), and resolves every thread. Fold any CI failures from Phase 1 into that same round.

## Phase 3: Request Re-Review

Request a new review from GitHub Copilot:

```bash
gh api repos/{owner}/{repo}/pulls/{pr}/requested_reviewers \
  -f "reviewers[]=copilot-pull-request-reviewer[bot]" \
  -X POST 2>&1 || true

# If the bot reviewer request fails, trigger via the reviews endpoint
gh api repos/{owner}/{repo}/pulls/{pr}/reviews \
  -f event="REQUEST_CHANGES" -X POST 2>&1 || true
```

If the PR has other configured reviewers (Vercel Agent, humans), note their status but don't block on them — only Copilot is waited on.

## Phase 4: Wait for Review AND CI

This is **Phase 0 again** for the next round — after requesting re-review, wait until BOTH a new Copilot review is posted AND CI re-runs to a terminal state (the push in Phase 2 re-triggers CI). Use the same combined background poll from Phase 0, with the baseline set to the previous Copilot review timestamp.

- New review state `COMMENTED` or `APPROVED` **and** CI terminal — round is ready to evaluate
- New review has actionable comments **or** CI is red — **loop back to Phase 1** (fix CI failures and comments together)
- New review has zero actionable comments **and** CI is green — **Done** (see below)
- No new review after the poll horizon — timeout, notify the user

Run the poll as a background command so the session isn't blocked while waiting.

## Done When

All of these must be true simultaneously:

- [ ] All CI checks green (every check enumerated by name, terminal, PASS)
- [ ] Zero unreplied reviewer comments
- [ ] Zero unresolved review threads
- [ ] Latest Copilot review (waited for in Phase 4) has no new actionable comments

CI green is the authoritative gate — running `pnpm lint && pnpm typecheck && pnpm test` locally is optional (per CLAUDE.md Push Policy), never a blocker.
