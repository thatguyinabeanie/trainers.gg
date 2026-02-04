---
name: finish-branch
description: Run pre-PR checklist — typecheck, lint, review, then create a pull request
disable-model-invocation: true
---

# Finish Branch

Run the full pre-PR checklist for the current feature branch, then create a pull request.

## Prerequisites

- You must be on a feature branch (not `main`)
- All work should be committed (unstaged changes will be flagged)

## Steps

### 1. Verify branch state

```bash
# Confirm not on main
git branch --show-current

# Check for uncommitted changes
git status --short
```

- If on `main`, stop and ask the user to create a feature branch first.
- If there are uncommitted changes, ask if the user wants to commit them before continuing.

### 2. Run quality checks (in parallel)

Run all of these and collect results:

```bash
pnpm lint
pnpm typecheck
pnpm format:check
```

- If any check fails, report the failures clearly and ask if the user wants you to fix them.
- Fix issues if requested, commit the fixes, then re-run the failing checks.
- Do not proceed until all checks pass.

### 3. Review migrations (if any)

Check if this branch includes new migration files:

```bash
git diff main --name-only -- 'packages/supabase/supabase/migrations/'
```

- If new migrations exist, invoke the `migration-reviewer` agent on each new file.
- Report any issues found and ask if they should be addressed before the PR.

### 4. Security review

Check if this branch touches security-sensitive files:

```bash
git diff main --name-only -- \
  'apps/web/proxy.ts' \
  'packages/supabase/supabase/functions/' \
  '**/middleware.ts' \
  '**/auth/**' \
  '**/server-actions/**'
```

- If security-sensitive files were changed, invoke the `security-reviewer` agent.
- Report any findings and ask if they should be addressed.

### 5. Check edge functions (if any)

```bash
git diff main --name-only -- 'packages/supabase/supabase/functions/'
```

- If edge function files were changed, invoke the `edge-function-reviewer` agent.
- Report findings.

### 6. Push and create PR

After all checks pass:

1. Push the branch to remote:

```bash
git push -u origin $(git branch --show-current)
```

2. Generate PR title and body from the branch's commits:

```bash
git log main..HEAD --oneline
git diff main...HEAD --stat
```

3. Create the PR using `gh`:

```bash
gh pr create --title "<title>" --body "<body>"
```

- The PR body should follow this format:

```markdown
## Summary

<1-3 bullet points describing the changes>

## Checklist

- [x] Lint passes
- [x] Typecheck passes
- [x] Format check passes
- [x] Migration review (if applicable)
- [x] Security review (if applicable)
- [x] Edge function review (if applicable)

## Test plan

<How to verify the changes work>
```

4. Return the PR URL to the user.

## Error Handling

- If `gh` is not installed, provide the manual PR creation URL instead.
- If push fails (e.g., no upstream), set the upstream and retry.
- If any reviewer agent is not available, skip that review step and note it as unchecked in the PR body.
