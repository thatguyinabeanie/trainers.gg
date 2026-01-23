---
title: Organization Roles & Permissions
description: Detailed documentation of roles and permissions system for organization management
category: organizations
type: roles
obsidian_compatible: true
---

# 🏷️ Roles & Permissions

> **Note:** This documentation is Obsidian-compatible. Use [[WikiLinks]] for navigation.

Roles are granular, assignable permissions that determine what a user can do within an organization. Each role can be assigned to one or more users in any group, allowing for fine-tuned delegation and access control.

> **Implementation Status:** Currently implemented roles are: `org_owner`, `org_admin`, `org_moderator`, `org_tournament_organizer`, and `org_judge`. Many roles listed below are planned for future implementation.

---

## 📋 List of Roles

### 👑 Owner

- Full access to all organization and tournament features
- Can assign/revoke any role, manage billing, branding, and org-wide settings

### 👑 Admin

- Vetted by the owner for elevated control
- Can create, edit, archive, and delete tournaments
- Can manage staff and assign roles (except Owner)
- Can view/export organization analytics
- Can manage organization settings (except billing/ownership)

### 🏆 Tournament Director

- Configure tournament settings (format, rules, schedule)
- Start, pause, end tournaments
- Seed, pair, and advance rounds
- Manage player registration and check-in
- Assign judges and staff to tournaments
- Communicate with all participants
- Archive or delete tournaments (if allowed by org policy)

### ⚖️ Head Judge

- Oversee all judges for a tournament
- Resolve disputes and appeals
- Assign/reassign judges to matches or groups
- Escalate issues to Tournament Director or Admin

### 🧑‍⚖️ Lead Judge / Group Lead

- Manage a group of judges (e.g., for a specific division)
- Assign matches to judges within their group
- Report to Head Judge

### 👨‍⚖️ Judge

- View assigned matches and report results
- Resolve in-game disputes for assigned matches
- Submit match notes or penalties
- Communicate with players in assigned matches

### 📝 Scorekeeper

- Enter and verify match results
- Update standings and pairings (if allowed)
- Generate and publish pairings for new rounds
- Export results and reports

### 🗂️ Registration Staff

- Approve or deny player registrations
- Manage waitlists and check-in
- Handle player drops and substitutions

### 🎥 Streamer / Media

- Access streaming overlays, match schedules, and featured matches
- Communicate with staff for scheduling interviews or coverage
- Upload or link media content

### ❌ Player Dropper

- Can drop any player from a tournament (e.g., for no-shows, rule violations, or at the player's request)
- This is a granular, assignable role and can be given to any trusted staff member as needed

### 🗃️ Deck/Teamlist Verifier

- Review, approve, or reject submitted decklists/teamsheets for legality and completeness

### 🚨 Penalty Manager

- Issue, review, and escalate penalties or infractions (warnings, game losses, disqualifications)

### 🏛️ Appeals Handler

- Review and resolve appeals from players regarding judge decisions or penalties

### 📢 Pairings Publisher

- Publish round pairings and standings to players

### 📣 Communications Manager

- Send announcements, emails, or notifications to all participants

### ✅ Check-in Manager

- Manage player check-in at the start of the event or each round
- Mark players as present/absent

### 👁️‍🗨️ Spectator Moderator

- Moderate chat, comments, or Q&A for spectators (if public-facing features exist)

### 🖼️ Media Uploader

- Upload photos, videos, or other media to the tournament page or stream overlays

### 🧐 Result Verifier

- Review and confirm match results before they are finalized

### 🗂️ Bracket Manager

- Manually adjust brackets, handle byes, or resolve bracket issues (e.g., for double elimination or custom formats)

### 💼 Sponsor Liaison

- Manage sponsor information, branding, and communications for the event

### 🏅 Prize Manager

- Manage prize distribution, eligibility, and tracking

---

## 🔗 Related Docs

- [[../USER_TYPES|👤 User Types (Player, Spectator)]]
- [[../ORGANIZATIONS|🏢 Organization System Overview]]
- [[../groups/ORG_GROUPS|👥 Groups & Templates]]
- [[../permissions/ORG_PERMISSIONS|🗂️ Permission Matrix & Advanced Topics]]
