---
name: responding-to-review-comments
description: Use when a PR has review comments to address — fetch, stale-detect, group by theme, walk through each with the user, then the two-reply protocol (Reply #1 the decision, Reply #2 the fix) and resolve every thread. No deferrals.
---

# Responding to Review Comments

Fetch review comments, group them by theme, walk through each with the user, post Reply #1 (the decision), implement all fixes, post Reply #2 (the done notice), and resolve every thread. Nothing is deferred.

## ⛔ Non-Negotiable: Reply Without Delay (Two-Reply Protocol)

**Replying to review comments is the single highest-priority action in this skill. It is never delayed, never batched for "later", and never substituted with a status report.** A _fix_ comment gets **two** replies then a resolve; a _not-an-issue_ comment gets **one** evidence-backed reply then a resolve (see the rules below):

| Step                    | When                                                                                                                              | Reply content                                                                  |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| **Reply #1 — Decision** | The moment the fix is decided (end of Group and Present, as soon as the user picks an approach — or immediately for not-an-issue) | What is going to be done: "Adopting X — <change>. Implementing in this round." |
| **Reply #2 — Done**     | Right after the fix is committed + pushed (Reply #2 — Done section)                                                               | "Fixed in `<sha>` — <one-line of what changed>."                               |
| **Resolve**             | Once Reply #2 is posted and the fix is verified                                                                                   | Resolve the thread.                                                            |

Rules that make this non-negotiable:

- **Reporting that comments exist is NOT replying.** "There are 6 unresolved comments" / "want me to reply?" / "I'll backfill later" are all failures. If a comment is undecided, decide it (Group and Present); if it's decided, post Reply #1 now.
- **Do not gate Reply #1 on the code landing.** You do not need a commit SHA to acknowledge the decision. Reply #1 goes out at decision time; Reply #2 carries the SHA after the push.
- **Not-an-issue comments still get a reply** (the evidence-backed explanation) and a resolve — they just skip the two-step and resolve right after the single explanatory reply.
- **A fresh review can land after any push.** New comments are not an edge case — the instant a new review posts, its comments jump to top priority: decide → Reply #1 → fix → Reply #2 → resolve.
- **End state is zero unreplied AND zero unresolved.** Both, every round.

If you catch yourself writing "want me to..." or "I can backfill..." about review comments — stop and post Reply #1.

## No Deferrals

Every comment is addressed in this session — no follow-up/deferred buckets unless the user explicitly says so. Matches the rule in `reviewing-pr-feedback`.

## Fetch Comments

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

If there are zero unreplied comments and zero unresolved threads, skip to Resolve Every Thread (end state already satisfied — no threads to resolve either).

## Group and Present

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

### Reply #1 — post the decision immediately

**As soon as a group's approach is decided, post Reply #1 to every comment in that group — before writing any code.** Do not wait for all groups, the fix, or a commit SHA. This is the first half of the two-reply protocol.

```bash
gh api repos/{owner}/{repo}/pulls/{pr}/comments \
  -f body="Adopting {approach} — {what will change}. Implementing in this round." \
  -F in_reply_to={comment_id}
```

For a group of duplicate comments, the first reply can carry the detail and the rest can say "Same change — see {first thread}." Not-an-issue comments instead get their single evidence-backed explanation here and are resolved right away (skip Reply #2).

## Implement Fixes

After all groups are reviewed with the user:

1. Implement all approved fixes — **review comments AND any CI failures the orchestrator (`reviewing-pr-feedback`) surfaced this round — see `diagnosing-ci` for diagnosing those.** Fix both in the same round.
2. Use parallel subagents for independent fix groups when possible
3. Verification is **optional locally — CI is authoritative** (per CLAUDE.md Push Policy). For fast iteration on a focused change you may run a scoped check, but never block the commit/push on it:

```bash
pnpm lint && pnpm typecheck && pnpm test   # optional — CI runs these regardless
```

4. Commit with a descriptive message referencing the review round
5. **Re-check for new comments before pushing.** Between when the round's comments were fetched and now, the reviewer (or a human) may have posted more. Re-run the Copilot-review check from the orchestrator's Phase 0; if a newer review exists, fetch and fold its comments into this round before pushing rather than pushing and looping again:

```bash
gh api repos/{owner}/{repo}/pulls/{pr}/reviews --paginate \
  | jq -r '[.[] | select(.user.login == "copilot-pull-request-reviewer[bot]")] | sort_by(.submitted_at) | last | .submitted_at'
```

6. Push to the PR branch.

## Reply #2 — Done (after push)

This is the second half of the two-reply protocol. After pushing, post Reply #2 to **every** comment you already acknowledged in Reply #1 (and any not-yet-replied comment). Lead each reply with a status label.

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
- **This is Reply #2** — every comment should already have a Reply #1 (the decision) from Group and Present; if any comment was missed there, post both now
- **Fixed replies include the commit SHA** — so the reviewer can verify
- **Group replies are fine** — if 6 comments are the same issue, the first reply can be detailed and the rest can say "Fixed in same commit ({sha})."
- **Never reply with just an explanation and no action** unless the code is genuinely already correct

## Resolve Every Thread

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

Invoked by `reviewing-pr-feedback` as its comment-handling step. If you arrived here directly, make sure CI failures are handled in the same round too.
