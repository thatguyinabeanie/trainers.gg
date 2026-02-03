---
name: add-ticket
description: Use when the user asks to create a Linear ticket, add an issue, file a bug, or request a feature
---

# Add Linear Ticket

Create a Linear issue with consistent formatting and project defaults.

## Arguments

- `description` (required): What the ticket is about — a bug, feature, improvement, etc.

## Defaults

| Field   | Value              |
| ------- | ------------------ |
| Team    | `Beanie-gg`        |
| Project | `Private Beta MVP` |

Override either by specifying in the description (e.g., "add to the Infrastructure project").

## Steps

1. **Check for duplicates** — use `mcp__plugin_linear_linear__list_issues` to search the team for existing issues with similar titles or descriptions. If a match exists, show it to the user and ask whether to proceed or update the existing one instead.

2. **Ask the user to confirm details** before creating — use `AskUserQuestion` to present:
   - **Project**: Default to `Private Beta MVP`, but offer the most relevant alternatives based on the ticket's subject (e.g., a replay-related ticket might suggest `Replay Analysis`). Show 2-3 project options.
   - **Priority**: Suggest a default based on the issue type (see table below), let the user override.
   - **Label/type**: Suggest the best-fit label, let the user override.

   Combine these into a single `AskUserQuestion` call with up to 3 questions. Skip questions where the user's description already made the choice explicit (e.g., "high priority bug" doesn't need priority or label confirmation).

3. **Determine the issue type** from the user's description (or confirmed answer):

   | Type          | Label              | Default Priority |
   | ------------- | ------------------ | ---------------- |
   | Bug fix       | `Bug`              | 2 (High)         |
   | New feature   | `type:feature`     | 3 (Medium)       |
   | Improvement   | `Improvement`      | 3 (Medium)       |
   | Enhancement   | `type:enhancement` | 3 (Medium)       |
   | Chore         | `type:chore`       | 4 (Low)          |
   | Documentation | `type:docs`        | 4 (Low)          |
   | Research      | `type:research`    | 3 (Medium)       |

4. **Write a concise title** — under 70 characters, imperative voice (e.g., "Add winner column to completed tournaments table").

5. **Write the description** in markdown:
   - Start with a `## Overview`, `## Bug`, or `## Feature` heading that summarizes the issue in 1-3 sentences
   - Add a `## Expected Behavior` or `## Details` section with specifics
   - Use bullet lists, tables, or code blocks where they help clarity
   - Keep it scannable — no walls of text

6. **Create the issue** using `mcp__plugin_linear_linear__create_issue` with:
   - `title`
   - `team`: `Beanie-gg`
   - `project`: the confirmed project from step 2
   - `description`: the markdown body
   - `labels`: array with the confirmed label
   - `priority`: the confirmed priority number

7. **Report back** with the issue identifier and a link.

## Available Labels

`Bug`, `Improvement`, `Feature`, `type:feature`, `type:enhancement`, `type:chore`, `type:docs`, `type:research`, `type:epic`, `mvp`, `phase:1-mvp`, `phase:2-growth`, `phase:3-future`

## Available Projects

`Private Beta MVP`, `Tournaments`, `Social & Feed`, `Infrastructure`, `Mobile App`, `Organizations`, `User Profiles`, `Team Builder`, `Draft League`, `Shiny Hunting`, `Analytics & Meta`, `AI/ML`, `Computer Vision`, `Replay Analysis`, `Reputation`, `Content & Streaming`, `Multi-Game`

## Priority Scale

| Value | Name   |
| ----- | ------ |
| 1     | Urgent |
| 2     | High   |
| 3     | Medium |
| 4     | Low    |
