---
name: reviewing-pr-feedback
description: Use after pushing to a PR — waits for BOTH the Copilot review and all CI checks to finish, then fetches review comments + CI failures, groups them, walks through each group with the user, fixes everything (no deferrals), re-checks for new comments before pushing, commits, pushes, replies, resolves threads, requests re-review, and loops until comments are zero and CI is green
---

# Reviewing PR Feedback

Fetch review comments, group them, resolve every issue with the user, then close the loop. Nothing gets deferred — every comment is addressed in this session.

## The Loop

```
Wait for BOTH: Copilot review posted AND all CI checks terminal →
Fetch comments + CI failures → Group by theme → Walk through groups with user →
Implement ALL fixes (review comments AND CI failures) → Lint/typecheck/test →
Re-check for new comments → Commit + push →
Reply to every comment → Resolve every thread →
Request Copilot re-review → Wait for review + CI again → Loop if new comments or red CI
```

This loop repeats until a review cycle produces zero actionable comments **and** CI is green.

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

## Phase 2: Fetch Review Comments

```bash
# All code-level review comments
gh api repos/{owner}/{repo}/pulls/{pr}/comments --paginate \
  | jq '[.[] | {id, path, line: (.line // .original_line), author: .user.login, in_reply_to_id, body}]'

# Count unresolved threads
gh api graphql -f query='query {
  repository(owner: "{owner}", name: "{repo}") {
    pullRequest(number: {pr}) {
      reviewThreads(first: 100) {
        nodes { id isResolved comments(first: 1) {
          nodes { path line body author { login } }
        }}
      }
    }
  }
}'
```

Filter to **unreplied reviewer comments** — comments from Copilot, vercel[bot], or human reviewers that have no reply from the PR author.

### Stale Comment Detection

Review comments may reference code that has changed since the comment was posted (e.g., from a merge, rebase, or a fix in a later commit). Before grouping, **check each comment against the current code**:

1. Read the file at the path/line the comment references
2. If the code has already been changed to address the concern (or the flagged code no longer exists), mark the comment as **stale**
3. Stale comments should be replied to with "Already fixed in commit {sha}" or "Code no longer exists — resolved by subsequent changes" and resolved without presenting to the user

This prevents wasting the user's time on issues that were already addressed in prior review rounds or merges.

If there are zero unreplied comments and zero unresolved threads, skip to Phase 7.

## Phase 3: Group and Present

Group comments by **theme**, not by file. Multiple comments about the same underlying issue form one group.

**Example groupings:**

- 6 comments about using `team_pokemon.id` instead of `pokemon_id` → one group: "wrong ID for mutations"
- 3 comments about missing `DROP POLICY IF EXISTS` → one group: "migration idempotency"
- 1 standalone comment about a missing test → its own group

### Validity Assessment

For each comment/group, assess how valid the concern is before presenting:

| Validity            | Meaning                                                                             |
| ------------------- | ----------------------------------------------------------------------------------- |
| 🔴 **Critical**     | Real bug that will cause runtime failures, data corruption, or security issues      |
| 🟡 **Valid**        | Legitimate concern — code works but is fragile, misleading, or violates conventions |
| 🟢 **Minor**        | Style preference or theoretical concern unlikely to cause real issues               |
| ⚪ **Not an issue** | Reviewer misread the code or flagged something that's actually correct              |

### Presenting Groups

**Use the `AskUserQuestion` tool for every group.** Never present groups as plain text — always use the structured question UI so the user gets a clean interface to make decisions.

Format each group as an `AskUserQuestion` with:

- The **question** field contains the full context: emoji-organized summary, files affected, the concern explained in plain language, validity assessment, and recommended fix
- The **options** provide the decision choices

**Question body template:**

```
📋 Group N: {theme} ({count} comment(s))

📁 Files: `path/to/file.ts:42`, `path/to/other.ts:88`

🔍 Concern: {plain-language explanation}

{validity emoji} Validity: {Critical|Valid|Minor|Not an issue} — {why}

💡 Recommended fix: {specific, actionable description}
```

**Options should always include:**

1. The recommended fix (labeled with "(Recommended)" if applicable)
2. An alternative approach if one exists
3. "Not an issue — explain why" (only when validity is ⚪)

Wait for the user's decision on each group before presenting the next.

**There is no "defer" option.** Every group must result in either a code fix or a reply explaining why the code is already correct (with evidence).

## Phase 4: Implement Fixes

After all groups are reviewed with the user:

1. Implement all approved fixes — **review comments AND any CI failures from Phase 1**, in the same round.
2. Use parallel subagents for independent fix groups when possible
3. Run verification:

```bash
pnpm lint && pnpm typecheck && pnpm test
```

4. Fix any test/type failures caused by the changes
5. Commit with a descriptive message referencing the review round
6. **Re-check for new comments before pushing.** Between when the round's comments were fetched and now, the reviewer (or a human) may have posted more. Re-run the Copilot-review check from Phase 0; if a newer review exists, fetch and fold its comments into this round before pushing rather than pushing and looping again:

```bash
gh api repos/{owner}/{repo}/pulls/{pr}/reviews --paginate \
  | jq -r '[.[] | select(.user.login == "copilot-pull-request-reviewer[bot]")] | sort_by(.submitted_at) | last | .submitted_at'
```

7. Push to the PR branch. (Phase 0's wait then runs again for the next round.)

## Phase 5: Reply to Every Comment

After pushing, reply to **every** unreplied reviewer comment. Lead each reply with a status label.

### Status Labels

| Label            | When to use                                          |
| ---------------- | ---------------------------------------------------- |
| **FIXED** (sha)  | Code was changed to address the comment              |
| **NOT AN ISSUE** | The concern is incorrect — explain why with evidence |

That's it. Two options. If it's a real concern, fix it. If it's not, explain why.

### Reply Format

```
Fixed in commit {sha} — {one-line description of what changed}.
```

```
Not an issue — {why the code is correct, with specific evidence}.
```

### Reply Commands

```bash
# Reply to a code-level comment
gh api repos/{owner}/{repo}/pulls/{pr}/comments \
  -f body="Fixed in commit {sha} — {description}." \
  -F in_reply_to={comment_id}

# Reply indicating not an issue
gh api repos/{owner}/{repo}/pulls/{pr}/comments \
  -f body="Not an issue — {explanation}." \
  -F in_reply_to={comment_id}
```

### Rules

- **Every reviewer comment gets a reply** — zero unreplied comments when done
- **Fixed replies include the commit SHA** — so the reviewer can verify
- **Group replies are fine** — if 6 comments are the same issue, the first reply can be detailed and the rest can say "Fixed in same commit ({sha})."
- **Never reply with just an explanation and no action** unless the code is genuinely already correct

## Phase 6: Resolve Every Thread

After replying, resolve all review threads:

```bash
# Get all unresolved thread IDs
gh api graphql -f query='query {
  repository(owner: "{owner}", name: "{repo}") {
    pullRequest(number: {pr}) {
      reviewThreads(first: 100) {
        nodes { id isResolved }
      }
    }
  }
}' | jq '[.data.repository.pullRequest.reviewThreads.nodes[] | select(.isResolved == false) | .id]'

# Resolve each thread
gh api graphql -f query='mutation {
  resolveReviewThread(input: {threadId: "{thread_id}"}) {
    thread { isResolved }
  }
}'
```

Verify: unresolved count should be **0**.

## Phase 7: Request Re-Review

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

## Phase 8: Wait for Review AND CI

This is **Phase 0 again** for the next round — after requesting re-review, wait until BOTH a new Copilot review is posted AND CI re-runs to a terminal state (the push in Phase 4 re-triggers CI). Use the same combined background poll from Phase 0, with the baseline set to the previous Copilot review timestamp.

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
- [ ] Latest Copilot review (waited for in Phase 8) has no new actionable comments
- [ ] `pnpm lint && pnpm typecheck && pnpm test` all pass locally
