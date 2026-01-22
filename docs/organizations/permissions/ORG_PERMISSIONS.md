---
title: Organization Permissions Matrix
description: Readable and accessible permission matrix for organization roles
category: organizations
type: permissions
obsidian_compatible: true
---

> **TL;DR:**  
> This document shows which roles can perform which actions in an organization.  
> ✅ = Allowed, ❌ = Not allowed, 🟡 = Allowed with conditions

---

## How to Use This Table

- **Find your role** in the left column.
- **Scan across** to see which actions you can perform.
- **See the glossary** below for action/role definitions.

---

## Tournament Management

| Role            | Create | Delete | Archive | Start/End | Seed/Pair | Assign Judges |
| --------------- | :----: | :----: | :-----: | :-------: | :-------: | :-----------: |
| Owner           |   ✅   |   ✅   |   ✅    |    ✅     |    ✅     |      ✅       |
| Admin           |   ✅   |   ✅   |   ✅    |    ✅     |    ✅     |      ✅       |
| Tournament Dir. |   ✅   |  ✅\*  |   ✅    |    ✅     |    ✅     |      ✅       |
| Head Judge      |        |        |         |           |           |      ✅       |
| Judge           |        |        |         |           |           |               |
| Scorekeeper     |        |        |         |           |    ✅     |               |

\* = If allowed by org policy

---

## Player Management

| Role            | Enter Results | Approve Reg. | Drop Player | Drop Self | Verify Team | Issue Penalty |
| --------------- | :-----------: | :----------: | :---------: | :-------: | :---------: | :-----------: |
| Owner           |      ✅       |      ✅      |     ✅      |           |             |               |
| Admin           |      ✅       |      ✅      |     ✅      |           |             |               |
| Tournament Dir. |      ✅       |      ✅      |     ✅      |           |             |               |
| Head Judge      |      ✅       |              |    ✅\*     |           |             |      ✅       |
| Judge           |      ✅       |              |             |           |             |      ✅       |
| Scorekeeper     |      ✅       |              |             |           |             |               |
| Registration    |               |      ✅      |             |           |             |               |
| Player Dropper  |               |              |     ✅      |           |             |               |
| Player          |               |              |             |    ✅     |             |               |

\* = If allowed by org policy

---

## Staff & Media

| Role             | Publish Pairings | Send Announce | Check-in | Moderate Spectators | Upload Media | Adjust Bracket |
| ---------------- | :--------------: | :-----------: | :------: | :-----------------: | :----------: | :------------: |
| Pairings Pub.    |        ✅        |               |          |                     |              |                |
| Comms Manager    |                  |      ✅       |          |                     |              |                |
| Check-in Manager |                  |               |    ✅    |                     |              |                |
| Spectator Mod    |                  |               |          |         ✅          |              |                |
| Media Uploader   |                  |               |          |                     |      ✅      |                |
| Bracket Manager  |                  |               |          |                     |              |       ✅       |

---

## Glossary

**Roles:**

- **Owner:** Full access, can assign/revoke any role.
- **Admin:** Elevated control, manage tournaments, staff, analytics.
- **Tournament Director:** Configure and run tournaments.
- **Head Judge:** Oversee judges, resolve disputes.
- **Judge:** Enter results, issue penalties.
- **Scorekeeper:** Enter/verify results.
- **Registration Staff:** Approve/deny registrations.
- **Player Dropper:** Can drop players from tournaments.
- **Player:** Register, drop self, view analytics.
- _(See docs/organizations/roles/ORG_ROLES.md for full list)_

**Actions:**

- **Create Tournament:** Start a new tournament.
- **Delete Tournament:** Remove a tournament (if allowed).
- **Archive Tournament:** Archive for record-keeping.
- **Seed/Pair Rounds:** Set up match pairings.
- **Assign Judges:** Assign staff to matches.
- **Enter Results:** Record match outcomes.
- **Approve Registration:** Accept players into tournaments.
- **Drop Player:** Remove a player from a tournament.
- **Verify Team:** Check legality of submitted teams.
- **Issue Penalty:** Penalize for rules infractions.
- **Publish Pairings:** Make pairings public.
- **Send Announcement:** Communicate with participants.
- **Check-in:** Mark players as present.
- **Moderate Spectators:** Manage chat/Q&A.
- **Upload Media:** Add photos/videos.
- **Adjust Bracket:** Manually change bracket structure.

---

## Advanced Topics

- **Custom Roles:** Orgs can define custom roles with granular permissions.
- **Role Hierarchies:** Some roles (e.g., Head Judge) may only exist within a specific tournament.
- **Audit Logs:** Track who performed sensitive actions.
- **Temporary Roles:** Allow for event-based permissions.
- **Notifications:** Role-based notifications for relevant actions.

---

## Related Docs

- [🏢 Organization System Overview](../ORGANIZATIONS)
- [👥 Groups & Templates](../groups/ORG_GROUPS)
- [🏷️ Roles & Permissions](../roles/ORG_ROLES)
