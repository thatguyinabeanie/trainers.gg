---
name: reviewing-pr-feedback
description: Use after pushing to a PR — fetches review comments, groups them, walks through each group with the user, fixes everything (no deferrals), commits, pushes, replies, resolves threads, requests re-review, and waits for completion
---

# Reviewing PR Feedback

Fetch review comments, group them, resolve every issue with the user, then close the loop. Nothing gets deferred — every comment is addressed in this session.

## The Loop

```
Fetch comments → Group by theme → Walk through groups with user →
Implement ALL fixes → Lint/typecheck/test → Commit + push →
Reply to every comment → Resolve every thread →
Request Copilot re-review → Wait for review → Loop if new comments
```

This loop repeats until a review cycle produces zero actionable comments.

## Phase 1: CI Check

```bash
gh pr checks <pr-number> --watch
```

Fix any failures locally before touching review comments:

- Lint: `pnpm lint`
- Types: `pnpm typecheck`
- Tests: `pnpm test`

Push fixes. CI re-runs automatically.

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

1. Implement all approved fixes
2. Use parallel subagents for independent fix groups when possible
3. Run verification:

```bash
pnpm lint && pnpm typecheck && pnpm test
```

4. Fix any test/type failures caused by the changes
5. Commit with a descriptive message referencing the review round
6. Push to the PR branch

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

## Phase 8: Wait for Review

Poll for the Copilot review to complete:

```bash
# Check every 60 seconds for up to 10 minutes
gh api repos/{owner}/{repo}/pulls/{pr}/reviews \
  | jq '[.[] | select(.user.login == "copilot-pull-request-reviewer[bot]")] | sort_by(.submitted_at) | last | {state: .state, submitted: .submitted_at}'
```

- If review state is `COMMENTED` or `APPROVED` — review is done
- If no new review appears after 10 minutes — timeout, notify the user
- If review has new comments — **loop back to Phase 2**

## Done When

All of these must be true simultaneously:

- [ ] All CI checks green
- [ ] Zero unreplied reviewer comments
- [ ] Zero unresolved review threads
- [ ] Latest Copilot review has no new actionable comments
- [ ] `pnpm lint && pnpm typecheck && pnpm test` all pass locally
