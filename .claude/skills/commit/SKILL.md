---
name: commit
description: Stage and commit changes with a conventional commit message
disable-model-invocation: true
---

# Commit

Stage and commit current changes with a well-structured commit message following project conventions.

## Arguments

- `message` (optional): If provided, use this as the commit message instead of generating one.

## Steps

### 1. Assess the working tree

```bash
git status --short
git diff --stat
git diff --cached --stat
```

- If there are no changes (staged or unstaged), inform the user and stop.
- Show the user a summary of what will be committed.

### 2. Stage changes

- Stage specific files by name — avoid `git add -A` or `git add .` which can accidentally include sensitive files.
- Never stage `.env`, `.env.local`, credentials, or secrets files.
- If unsure which files to include, ask the user.

### 3. Run pre-commit checks

Before committing, verify the staged changes pass quality checks:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
```

- If any check fails, report the failure and offer to fix it.
- Fix issues if requested, re-stage, and re-run the failing check.
- Do not commit until all checks pass.

### 4. Write the commit message

If `message` was not provided, generate one following these rules:

**Format**: Conventional Commits

```
<type>: <short description>

<optional body — what and why, not how>
```

**Types**:

| Type       | When to use                                |
| ---------- | ------------------------------------------ |
| `feat`     | New feature or capability                  |
| `fix`      | Bug fix                                    |
| `refactor` | Code restructuring without behavior change |
| `style`    | Formatting, whitespace, missing semicolons |
| `docs`     | Documentation changes                      |
| `test`     | Adding or updating tests                   |
| `chore`    | Build, tooling, dependency updates         |
| `perf`     | Performance improvement                    |

**Rules**:

- Subject line: lowercase, imperative mood, under 72 characters
- No period at the end of the subject line
- Body: explain _why_ the change was made, not _what_ changed (the diff shows that)
- If the change relates to a Linear issue, include `Fixes BEA-xxx` or `Relates to BEA-xxx` in the body

### 5. Create the commit

```bash
git commit -m "<message>"
```

- Always use a HEREDOC for multi-line messages.
- Never use `--no-verify` unless the user explicitly asks.
- Never amend a previous commit unless the user explicitly asks.
- If the pre-commit hook (Husky) fails, fix the issue, re-stage, and create a NEW commit.

### 6. Confirm

Show the user the commit hash and summary:

```bash
git log -1 --oneline
```
