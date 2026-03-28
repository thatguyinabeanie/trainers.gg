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

If no output, inform the user there are no `apps/web/` changes on this branch and stop.

### 2. Categorize changes

Group the changed files by feature area using this mapping:

| Path contains | Feature Area | Known Parity Tickets |
|---|---|---|
| `admin/` | Admin (web-only) | **SKIP** — no mobile equivalent needed |
| `dashboard/overview` or `dashboard/stats` | Player Dashboard | TGG-336 |
| `dashboard/alts` | Alts Management | TGG-340 |
| `dashboard/settings` | Settings | TGG-339 |
| `dashboard/notifications` | Notifications | TGG-341 |
| `dashboard/invitations` | Tournament Invitations | TGG-346 |
| `players/` or `components/players/` | Player Directory | TGG-337 |
| `u/[handle]` or `profile/` | Player Profile | TGG-338 |
| `tournaments/` (listing/browse) | Tournament Directory | TGG-342 |
| `tournaments/[tournamentSlug]` (registration) | Registration Flow | TGG-343 |
| `tournaments/[tournamentSlug]/r/` or `components/match/` | Match Interface | TGG-344 |
| both `tournaments/` and `/manage` (standings/bracket) | Bracket & Standings | TGG-345 |
| `communities/` or `components/communities/` | Community Directory | TGG-348 |
| `communities/create` | Community Creation | TGG-349 |
| `to-dashboard/` | TO Dashboard | TGG-351 |
| both `to-dashboard/` and `/staff` | Staff Management | TGG-352 |
| `components/tournament/` | Tournament Experience | TGG-342, TGG-345 |
| `components/notifications/` | Notifications | TGG-341 |
| `components/settings/` | Settings | TGG-339 |

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

- **Direct match:** "This maps to TGG-XXX (*title*). Options:"
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

| Field | Value |
|---|---|
| Team | `trainers-gg` |
| Project | `Mobile App` |
| Label | `type:feature` |
| Priority | 3 (Medium) |
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
