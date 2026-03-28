# Mobile Parity Automation

Automatically detect when web app features are developed and guide the user through creating, updating, or linking mobile parity tickets in Linear.

## Problem

When features are built in `apps/web/`, the equivalent mobile work in `apps/mobile/` needs to be tracked in Linear. Without a prompt, this step is easy to forget. The automation should never silently create tickets — it should always converse with the user first and check for existing related work.

## Components

### 1. Skill: `mobile-parity`

**Location:** `.claude/skills/mobile-parity/SKILL.md`

A user-invocable skill (`/mobile-parity`) that analyzes web changes, searches Linear for matching or related tickets, and walks the user through the appropriate action.

#### Trigger Modes

The skill is invoked in three ways:

| Trigger | When | Behavior |
|---|---|---|
| Manual | User runs `/mobile-parity` | Full flow — analyze, search, converse, act |
| `finish-branch` | PR touches `apps/web/` | Full flow — runs as a step before push |
| Reminder | Commit or session start | Injects reminder text only — user invokes manually if desired |

#### Flow

1. **Analyze the web changes**
   - Run `git diff main --name-only -- apps/web/` to get changed files
   - Categorize changes by feature area (routes, components, actions, API routes)
   - Generate a plain-language summary of what was built or changed

2. **Search Linear (layered)**
   - **Layer 1 — Mobile App parity tickets:** Search issues in the `Mobile App` project using extracted keywords. Use the feature area mapping table (below) to identify likely matches among the known parity tickets (TGG-336 through TGG-352).
   - **Layer 2 — Broad search:** If Layer 1 finds nothing, search across all `trainers-gg` team issues by keyword.

3. **Present findings to user**
   - **Direct match found:** "This looks like it maps to TGG-XXX (*title*). Options: (a) Update it with details from this work, (b) Skip"
   - **Related tickets found:** "These tickets are related: TGG-XXX, TGG-YYY. Options: (a) Create new ticket and link to these, (b) Update one of these, (c) Skip"
   - **No match found:** "No existing mobile ticket found. Options: (a) Create a new ticket in Mobile App, (b) Skip — this doesn't need a mobile equivalent"

4. **Take action based on user's choice**
   - **Update:** Add details about the web implementation to the existing ticket's description (append, don't replace). Note what was built on web and what the mobile equivalent would need.
   - **Create:** New ticket in `Mobile App` project with appropriate milestone, label `type:feature`, priority `Medium`. Description includes: what was built on web, what the mobile equivalent needs, link to the web PR or branch.
   - **Link:** Create new ticket and add `relatedTo` relation to the related tickets.
   - **Skip:** Do nothing. No further prompts.

#### Feature Area Mapping

Reference table for Layer 1 search. Maps web file paths to likely mobile parity tickets. This is guidance for the search, not rigid logic.

| Web Path Pattern | Feature Area | Likely Mobile Tickets |
|---|---|---|
| `dashboard/` | Player Dashboard | TGG-336 |
| `dashboard/stats` | Player Stats | TGG-336 |
| `dashboard/alts` | Alts Management | TGG-340 |
| `dashboard/settings` | Settings | TGG-339 |
| `dashboard/notifications` | Notifications | TGG-341 |
| `dashboard/invitations` | Tournament Invitations | TGG-346 |
| `players/` | Player Directory | TGG-337 |
| `u/[handle]` | Player Profile | TGG-338 |
| `tournaments/` (browse) | Tournament Directory | TGG-342 |
| `tournaments/[slug]` (registration) | Registration Flow | TGG-343 |
| `tournaments/[slug]/r/` (match) | Match Interface | TGG-344 |
| `tournament/manage` (standings) | Bracket & Standings | TGG-345 |
| `communities/` | Community Directory | TGG-348 |
| `communities/create` | Community Creation | TGG-349 |
| `to-dashboard/` | TO Dashboard | TGG-351 |
| `to-dashboard/[slug]/staff` | Staff Management | TGG-352 |
| `components/match/` | Match Interface | TGG-344 |
| `components/tournament/` | Tournament Experience | TGG-342, TGG-345 |
| `components/players/` | Player Directory | TGG-337 |
| `components/notifications/` | Notifications | TGG-341 |
| `components/settings/` | Settings | TGG-339 |

#### New Ticket Defaults

| Field | Value |
|---|---|
| Team | `trainers-gg` |
| Project | `Mobile App` |
| Label | `type:feature` |
| Priority | 3 (Medium) |
| Milestone | Inferred from feature area mapping, or ask user |

#### Ticket Description Template

```markdown
## Overview

Mobile equivalent of web feature: <summary of what was built>

## Web Implementation

- **Branch/PR:** <branch name or PR link>
- **Files changed:** <key files in apps/web/>
- **Feature:** <plain language description>

## Mobile Scope

<What the mobile implementation would need — adapted from the web feature, considering Tamagui vs shadcn, Expo Router vs App Router, etc.>

## Dependencies

<Shared packages already used by web that mobile can leverage, hooks that already exist, etc.>
```

### 2. PostToolUse Hook (Commit Nudge)

**Location:** `.claude/settings.json` → `hooks.PostToolUse`

Matches `Bash` tool. When the command is a `git commit` and the committed files include paths under `apps/web/`:

- Injects reminder text: *"This commit touched `apps/web/`. If this is a new feature or significant change, consider running `/mobile-parity` to check for mobile parity tickets."*
- Non-blocking — just advisory text
- Does not trigger on commits that only touch shared packages, mobile, or config files

**Implementation:** Shell script that:
1. Parses `$CLAUDE_TOOL_INPUT` (JSON) to extract the `command` field
2. Checks if the command contains `git commit`
3. If so, runs `git diff HEAD~1 --name-only -- apps/web/` to check if web files were in the last commit
4. If web files found, outputs the reminder text to stdout
5. Otherwise exits silently (exit 0, no output)

### 3. `finish-branch` Integration

**Location:** `.claude/skills/finish-branch/SKILL.md`

Add a new step after Step 5 (edge function review) and before Step 6 (push and create PR):

> **Step 5.5: Mobile parity check**
>
> Check if the branch includes changes under `apps/web/`:
> ```bash
> git diff main --name-only -- apps/web/
> ```
> If web files were changed, invoke the `mobile-parity` skill. The skill will analyze changes, search Linear, and walk the user through creating, updating, or linking a mobile parity ticket. The user can skip if the changes don't warrant a mobile equivalent.

This step is non-blocking — the user can skip and proceed to PR creation.

### 4. SessionStart Hook (Forgotten Work Check)

**Location:** `.claude/settings.json` → `hooks.SessionStart`

On session start, checks if the current branch has `apps/web/` changes compared to `main`:

- Runs `git diff main --name-only -- apps/web/`
- If changes exist, injects: *"This branch has `apps/web/` changes. If you've added new features, run `/mobile-parity` to check for mobile parity tickets."*
- Only fires once per session (inherent to SessionStart)
- Silent if no web changes exist or if on `main`

**Implementation:** Shell script that:
1. Checks current branch is not `main`
2. Runs `git diff main --name-only -- apps/web/`
3. If output is non-empty, outputs the reminder text
4. Otherwise exits silently

## Files to Create/Modify

| File | Action |
|---|---|
| `.claude/skills/mobile-parity/SKILL.md` | Create — the skill |
| `.claude/skills/mobile-parity/check-web-changes.sh` | Create — shared script for detecting web changes |
| `.claude/skills/finish-branch/SKILL.md` | Modify — add Step 5.5 |
| `.claude/settings.json` | Modify — add PostToolUse and SessionStart hooks |

## Exclusions

- **Admin panel features** — admin is web-only, no mobile parity needed. The skill should recognize `admin/` paths and skip them.
- **Shared package changes** — changes to `packages/` don't need mobile parity tickets (the packages are already shared). Only `apps/web/` triggers the flow.
- **Styling/formatting only** — the skill should note when changes are purely cosmetic (CSS, tailwind classes) and suggest skipping.
