# Mobile Parity Automation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automate detection of web app feature development and guide creation of mobile parity tickets in Linear.

**Architecture:** A Claude Code skill (`mobile-parity`) does the heavy lifting — analyzing git diffs, searching Linear, and conversing with the user. Two hooks (PostToolUse on Bash, SessionStart) provide passive reminders. The `finish-branch` skill gets a new step that invokes the skill at PR time.

**Tech Stack:** Claude Code skills (SKILL.md), Claude Code hooks (shell scripts), Linear MCP tools, git

---

## File Structure

| File                                                | Responsibility                                                 |
| --------------------------------------------------- | -------------------------------------------------------------- |
| `.claude/skills/mobile-parity/SKILL.md`             | Core skill — analyze web changes, search Linear, converse, act |
| `.claude/skills/mobile-parity/check-web-changes.sh` | Shared shell script — detect web changes on current branch     |
| `.claude/skills/finish-branch/SKILL.md`             | Modify — add mobile parity step                                |
| `.claude/settings.json`                             | Modify — add PostToolUse and SessionStart hooks                |

---

### Task 1: Create `check-web-changes.sh` helper script

**Files:**

- Create: `.claude/skills/mobile-parity/check-web-changes.sh`

- [ ] **Step 1: Create the shell script**

```bash
#!/usr/bin/env bash
# check-web-changes.sh
# Detects if the current branch has apps/web/ changes vs main.
# Outputs changed file paths (one per line) or nothing if no changes.
# Exit 0 always — callers check output emptiness.

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || exit 0
cd "$REPO_ROOT"

# Don't run on main
BRANCH="$(git branch --show-current 2>/dev/null)" || exit 0
if [ "$BRANCH" = "main" ] || [ "$BRANCH" = "master" ]; then
  exit 0
fi

# Get web-only changes vs main
git diff main --name-only -- apps/web/ 2>/dev/null || true
```

- [ ] **Step 2: Make it executable**

Run: `chmod +x .claude/skills/mobile-parity/check-web-changes.sh`

- [ ] **Step 3: Verify it works**

Run from a branch with web changes:

```bash
.claude/skills/mobile-parity/check-web-changes.sh
```

Expected: List of `apps/web/` file paths, or empty output if on main or no web changes.

- [ ] **Step 4: Commit**

```bash
git add .claude/skills/mobile-parity/check-web-changes.sh
git commit -m "feat: add web change detection script for mobile parity"
```

---

### Task 2: Create `mobile-parity` skill

**Files:**

- Create: `.claude/skills/mobile-parity/SKILL.md`

- [ ] **Step 1: Write the SKILL.md**

````markdown
---
name: mobile-parity
description: Use when developing web app features to check if equivalent mobile tickets exist in Linear. Analyzes apps/web/ changes, searches the Mobile App project for matching parity tickets, and guides creating, updating, or linking issues.
---

# Mobile Parity Check

Analyze web app changes and ensure equivalent mobile work is tracked in Linear.

## Arguments

- `summary` (optional): Plain-language description of what was built. If omitted, the skill analyzes the git diff.

## Flow

### 1. Detect web changes

Run the helper script to get changed files:

```bash
.claude/skills/mobile-parity/check-web-changes.sh
```
````

If no output, inform the user there are no `apps/web/` changes on this branch and stop.

### 2. Categorize changes

Group the changed files by feature area using this mapping:

| Path contains                                  | Feature Area           | Known Parity Tickets                   |
| ---------------------------------------------- | ---------------------- | -------------------------------------- |
| `admin/`                                       | Admin (web-only)       | **SKIP** — no mobile equivalent needed |
| `dashboard/overview` or `dashboard/stats`      | Player Dashboard       | TGG-336                                |
| `dashboard/alts`                               | Alts Management        | TGG-340                                |
| `dashboard/settings`                           | Settings               | TGG-339                                |
| `dashboard/notifications`                      | Notifications          | TGG-341                                |
| `dashboard/invitations`                        | Tournament Invitations | TGG-346                                |
| `players/` or `components/players/`            | Player Directory       | TGG-337                                |
| `u/[handle]` or `profile/`                     | Player Profile         | TGG-338                                |
| `tournaments/` (listing/browse)                | Tournament Directory   | TGG-342                                |
| `tournaments/[slug]` (registration)            | Registration Flow      | TGG-343                                |
| `tournaments/[slug]/r/` or `components/match/` | Match Interface        | TGG-344                                |
| `tournament/manage` (standings/bracket)        | Bracket & Standings    | TGG-345                                |
| `communities/` or `components/communities/`    | Community Directory    | TGG-348                                |
| `communities/create`                           | Community Creation     | TGG-349                                |
| `to-dashboard/`                                | TO Dashboard           | TGG-351                                |
| `to-dashboard/[slug]/staff`                    | Staff Management       | TGG-352                                |
| `components/tournament/`                       | Tournament Experience  | TGG-342, TGG-345                       |
| `components/notifications/`                    | Notifications          | TGG-341                                |
| `components/settings/`                         | Settings               | TGG-339                                |

If ALL changes fall under `admin/`, inform the user: "All changes are in admin routes (web-only). No mobile parity needed." and stop.

If changes are purely cosmetic (only CSS/Tailwind class changes, no logic), mention this and suggest skipping.

### 3. Summarize what was built

Generate a 1-2 sentence summary of the web feature. If the user provided a `summary` argument, use that instead.

### 4. Search Linear (layered)

**Layer 1 — Known parity tickets:**

If the mapping table identified specific ticket IDs, fetch them directly:

```
mcp__plugin_linear_linear__get_issue(query: "TGG-XXX")
```

Check if the ticket already covers this work or could be updated.

**Layer 2 — Keyword search in Mobile App project:**

```
mcp__plugin_linear_linear__list_issues(project: "Mobile App", query: "<feature keywords>")
```

**Layer 3 — Broad search (if Layer 1-2 found nothing):**

```
mcp__plugin_linear_linear__list_issues(team: "trainers-gg", query: "<feature keywords>")
```

### 5. Present findings and ask the user

Present what you found, grouped:

- **Direct match:** "This maps to TGG-XXX (_title_). Options:"
  - (a) Update it with details from this web work
  - (b) Skip — already covered
- **Related tickets:** "These tickets are related: TGG-XXX, TGG-YYY. Options:"
  - (a) Create new ticket and link to these
  - (b) Update one of these instead
  - (c) Skip
- **No match:** "No existing mobile ticket found. Options:"
  - (a) Create a new ticket in Mobile App
  - (b) Skip — this doesn't need a mobile equivalent

Always include the skip option. Never create a ticket without user confirmation.

### 6. Take action

**Update existing ticket:**

- Fetch current description with `mcp__plugin_linear_linear__get_issue`
- Append a new section (do NOT replace existing content):

```markdown
## Web Implementation (YYYY-MM-DD)

- **Branch:** <branch name>
- **Feature:** <summary>
- **Key files:** <list of changed web files>
- **Mobile notes:** <what the mobile equivalent would need>
```

**Create new ticket:**

| Field     | Value                                   |
| --------- | --------------------------------------- |
| Team      | `trainers-gg`                           |
| Project   | `Mobile App`                            |
| Label     | `type:feature`                          |
| Priority  | 3 (Medium)                              |
| Milestone | Inferred from feature area, or ask user |

Description:

```markdown
## Overview

Mobile equivalent of web feature: <summary>

## Web Implementation

- **Branch:** <branch name>
- **Files changed:** <key files>
- **Feature:** <plain language description>

## Mobile Scope

<What mobile implementation needs — Tamagui instead of shadcn, Expo Router instead of App Router, etc.>

## Dependencies

<Shared packages the web feature uses that mobile can leverage>
```

If linking to related tickets, use the `relatedTo` field.

**Skip:** Do nothing. Say "Skipped — no mobile parity ticket needed." and stop.

## Exclusions

These changes never need mobile parity tickets:

- `admin/` routes and components
- Changes only in `packages/` (shared packages are already cross-platform)
- Changes only in config files (next.config.ts, tailwind, etc.)
- Changes only in test files under `apps/web/`

````

- [ ] **Step 2: Commit**

```bash
git add .claude/skills/mobile-parity/SKILL.md
git commit -m "feat: add mobile-parity skill for Linear ticket automation"
````

---

### Task 3: Add PostToolUse hook for commit nudge

**Files:**

- Modify: `.claude/settings.json`

- [ ] **Step 1: Read current settings.json**

Read `.claude/settings.json` to get the current hook configuration.

- [ ] **Step 2: Add a new PostToolUse entry matching Bash**

Add to the `hooks.PostToolUse` array (after the existing Edit|Write entry):

```json
{
  "matcher": "Bash",
  "hooks": [
    {
      "type": "command",
      "command": "TOOL_INPUT=$(cat); CMD=$(echo \"$TOOL_INPUT\" | grep -o '\"command\":\"[^\"]*\"' | head -1 | sed 's/\"command\":\"//;s/\"$//'); case \"$CMD\" in *'git commit'*) WEB_CHANGES=$(git diff HEAD~1 --name-only -- apps/web/ 2>/dev/null); if [ -n \"$WEB_CHANGES\" ]; then echo 'This commit touched apps/web/. If this is a new feature or significant change, consider running /mobile-parity to check for mobile parity tickets.'; fi;; esac; exit 0"
    }
  ]
}
```

- [ ] **Step 3: Verify settings.json is valid JSON**

Run: `cat .claude/settings.json | python3 -m json.tool > /dev/null`
Expected: No output (valid JSON).

- [ ] **Step 4: Commit**

```bash
git add .claude/settings.json
git commit -m "feat: add PostToolUse hook for mobile parity commit nudge"
```

---

### Task 4: Add SessionStart hook for branch check

**Files:**

- Modify: `.claude/settings.json`

- [ ] **Step 1: Read current settings.json**

Read `.claude/settings.json` to get the current hook configuration.

- [ ] **Step 2: Add a SessionStart hook entry**

Add a new `SessionStart` key to the `hooks` object:

```json
"SessionStart": [
  {
    "matcher": "",
    "hooks": [
      {
        "type": "command",
        "command": "BRANCH=$(git branch --show-current 2>/dev/null); if [ \"$BRANCH\" != 'main' ] && [ \"$BRANCH\" != 'master' ] && [ -n \"$BRANCH\" ]; then WEB_CHANGES=$(git diff main --name-only -- apps/web/ 2>/dev/null); if [ -n \"$WEB_CHANGES\" ]; then echo 'This branch has apps/web/ changes. If you have added new features, run /mobile-parity to check for mobile parity tickets.'; fi; fi; exit 0"
      }
    ]
  }
]
```

Note: This will coexist with any existing SessionStart hooks from plugins (Vercel plugin has its own). The `matcher` is empty string which matches all session events.

- [ ] **Step 3: Verify settings.json is valid JSON**

Run: `cat .claude/settings.json | python3 -m json.tool > /dev/null`
Expected: No output (valid JSON).

- [ ] **Step 4: Commit**

```bash
git add .claude/settings.json
git commit -m "feat: add SessionStart hook for mobile parity branch reminder"
```

---

### Task 5: Integrate into `finish-branch` skill

**Files:**

- Modify: `.claude/skills/finish-branch/SKILL.md`

- [ ] **Step 1: Read the current finish-branch skill**

Read `.claude/skills/finish-branch/SKILL.md`.

- [ ] **Step 2: Add Step 5.5 between edge function review (Step 5) and push/PR (Step 6)**

Insert after the "### 5. Check edge functions" section and before "### 6. Push and create PR":

````markdown
### 5.5. Mobile parity check

Check if the branch includes changes under `apps/web/`:

```bash
git diff main --name-only -- apps/web/
```
````

- If web files were changed, invoke the `mobile-parity` skill to analyze changes and check for mobile parity tickets in Linear.
- The skill will present findings and ask whether to create, update, or skip — it never acts without confirmation.
- The user can skip to proceed directly to PR creation.
- If no web files were changed, skip this step silently.

````

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/finish-branch/SKILL.md
git commit -m "feat: add mobile parity check to finish-branch workflow"
````

---

### Task 6: Update CLAUDE.md skill table

**Files:**

- Modify: `CLAUDE.md`

- [ ] **Step 1: Read the workspace skills table in CLAUDE.md**

Find the `## Workspace Skills` table.

- [ ] **Step 2: Add mobile-parity to the table**

Add a new row:

```markdown
| `mobile-parity` | After developing web features, check for mobile parity tickets |
```

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add mobile-parity skill to workspace skills table"
```
