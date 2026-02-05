---
name: ticket
description: Use when the user asks to create, update, edit, or modify a Linear ticket or epic, add an issue, file a bug, request a feature, create or manage an epic, or change an issue's status
---

# Linear Ticket

Create or update a Linear issue based on the user's request.

## Arguments

- `description` (required): What to create or update — can include a ticket number (e.g., "TGG-123"), keywords referencing an existing ticket, or a description of a new issue.

## Defaults

| Field   | Value              |
| ------- | ------------------ |
| Team    | `trainers-gg`      |
| Project | `Private Beta MVP` |

Override either by specifying in the description (e.g., "add to the Infrastructure project").

## Determine Action

1. **Existing ticket reference** → Update flow
   - Exact identifier like `TGG-123`
   - Phrases like "the coaching ticket", "update the analytics issue", "change TGG-50 priority"
2. **New issue** → Create flow
   - Describes a bug, feature, improvement, chore, or research task with no reference to an existing ticket
3. **Ambiguous** → Ask the user whether they want to create a new ticket or update an existing one

---

## Create Flow

1. **Check for duplicates** — use `mcp__plugin_linear_linear__list_issues` to search the team for existing issues with similar titles or descriptions. If a match exists, show it to the user and ask whether to proceed or update the existing one instead.

2. **Ask the user to confirm details** before creating — use `AskUserQuestion` to present:
   - **Project**: Default to `Private Beta MVP`, but offer the most relevant alternatives based on the ticket's subject (e.g., a replay-related ticket might suggest `Replay Analysis`). Show 2-3 project options.
   - **Priority**: Suggest a default based on the issue type (see table below), let the user override.
   - **Label/type**: Suggest the best-fit label, let the user override.

   Combine these into a single `AskUserQuestion` call with up to 3 questions. Skip questions where the user's description already made the choice explicit (e.g., "high priority bug" doesn't need priority or label confirmation).

3. **Determine the issue type** from the user's description (or confirmed answer) using the Issue Type Mapping table below.

4. **Write a concise title** — under 70 characters, imperative voice (e.g., "Add winner column to completed tournaments table").

5. **Write the description** in markdown:
   - Start with a `## Overview`, `## Bug`, or `## Feature` heading that summarizes the issue in 1-3 sentences
   - Add a `## Expected Behavior` or `## Details` section with specifics
   - Use bullet lists, tables, or code blocks where they help clarity
   - Keep it scannable — no walls of text

6. **Create the issue** using `mcp__plugin_linear_linear__create_issue` with:
   - `title`
   - `team`: `trainers-gg`
   - `project`: the confirmed project from step 2
   - `description`: the markdown body
   - `labels`: array with the confirmed label
   - `priority`: the confirmed priority number

7. **Report back** with the issue identifier and a link.

---

## Update Flow

1. **Find the ticket.**
   - If the user provided an exact identifier (e.g., `TGG-123`), use `mcp__plugin_linear_linear__get_issue` to fetch it directly.
   - If no identifier was provided, use `mcp__plugin_linear_linear__list_issues` to search the team by keyword. Filter by project, label, or recency if the user gave enough context. Present the top 1-3 matches and ask the user to confirm which ticket to update.

2. **Read the current ticket** using `mcp__plugin_linear_linear__get_issue` (if not already fetched). Understand the existing title, description, status, priority, labels, and project before making changes.

3. **Determine what to update** from the user's description. Possible changes:

   | Change      | Tool Parameter                     | Notes                                             |
   | ----------- | ---------------------------------- | ------------------------------------------------- |
   | Title       | `title`                            | Keep under 70 chars, imperative voice             |
   | Description | `description`                      | Merge with existing content, don't overwrite      |
   | Status      | `state`                            | Use Status Values table below                     |
   | Priority    | `priority`                         | Use Priority Scale table below                    |
   | Labels      | `labels`                           | Add to existing labels, don't remove unless asked |
   | Project     | `project`                          | Move between projects                             |
   | Assignee    | `assignee`                         | Assign or reassign                                |
   | Relations   | `relatedTo`, `blocks`, `blockedBy` | Link to other issues                              |

4. **Preserve existing content.** When updating the description:
   - Read the full current description first
   - Append new sections or edit specific sections — never replace the entire description unless the user explicitly asks
   - Maintain the existing markdown structure (headings, tables, lists)

5. **Confirm before making destructive changes.** Use `AskUserQuestion` if the user's request would:
   - Replace the entire description
   - Change the project
   - Change the status to Done or Cancelled
   - Remove labels

   Skip confirmation for additive changes (appending to description, adding labels, updating priority, adding relations).

6. **Apply the update** using `mcp__plugin_linear_linear__update_issue` with only the changed fields.

7. **Report back** with the issue identifier, a link, and a summary of what changed.

---

## Reference Tables

### Issue Type Mapping

| Type          | Label              | Default Priority |
| ------------- | ------------------ | ---------------- |
| Bug fix       | `Bug`              | 2 (High)         |
| New feature   | `type:feature`     | 3 (Medium)       |
| Improvement   | `Improvement`      | 3 (Medium)       |
| Enhancement   | `type:enhancement` | 3 (Medium)       |
| Chore         | `type:chore`       | 4 (Low)          |
| Documentation | `type:docs`        | 4 (Low)          |
| Research      | `type:research`    | 3 (Medium)       |
| Epic          | `type:epic`        | 3 (Medium)       |

### Available Labels

`Bug`, `Improvement`, `Feature`, `type:feature`, `type:enhancement`, `type:chore`, `type:docs`, `type:research`, `type:epic`, `mvp`, `phase:1-mvp`, `phase:2-growth`, `phase:3-future`

### Available Projects

`Private Beta MVP`, `Tournaments`, `Social & Feed`, `Infrastructure`, `Mobile App`, `Organizations`, `User Profiles`, `Team Builder`, `Draft League`, `Shiny Hunting`, `Analytics & Meta`, `AI/ML`, `Computer Vision`, `Replay Analysis`, `Reputation`, `Content & Streaming`, `Multi-Game`

### Priority Scale

| Value | Name   |
| ----- | ------ |
| 0     | None   |
| 1     | Urgent |
| 2     | High   |
| 3     | Medium |
| 4     | Low    |

### Status Values

`Backlog`, `Todo`, `In Progress`, `Done`, `Cancelled`
