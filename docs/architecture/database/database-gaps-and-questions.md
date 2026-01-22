# [ARCHIVED] Database Gaps and Questions

> **⚠️ NOTE: This document is a historical artifact. Many of the questions raised here have been answered by the current implementation in Convex. This document is kept for reference and to provide context for future feature development.**

This document presents potential gaps and open questions in the current Battle Stadium database diagram.
Each section is a question about a possible area for improvement or additional modeling. Please review and answer in the space provided.

---

## 1️⃣ Tournament Structure & Rounds

> **Question:**
> Do you want to explicitly model tournament rounds, matches, and results (e.g., for pairing, tracking progress, and storing outcomes)?

**Your answer:**

- ✅ Yes.
- A tournament will have 1 or more phases.
- A phase is a part of a tournament, for example phase 1 could be swiss rounds. Then the next phase could be top cut.
  - A tournament could be swiss rounds only, or it could be a bracket style tournament from the start, no swiss, for example.
- Phase types could include but not limited to Swiss, bracket, double bracket (winners and loser), top cut, etc.
- A phase is made up of 1 or more rounds.
- A round is made up of 1 or more matches.
- A match is a set of games against 2 people.

**Implementation Note:** The current schema in `convex/schema.ts` includes tables for `tournaments`, `phases`, `rounds`, and `matches`, reflecting the structure described above.

---

## 2️⃣ Player/Team History

> **Question:**
> Is it important to track a PlayerProfile's or Team's history across tournaments for analytics, rankings, or player stats?

**Your answer:**

- ✅ Yes, it is.
- Please ask additional questions to fine tune.

### 🔍 Follow-up Questions

1. What specific stats or history do you want to track for PlayerProfiles? (e.g., wins, losses, top cut appearances, match-by-match results, opponent history, etc.)
   - _Your answer:_
2. Should team usage be tracked per tournament, per phase, or per match? (e.g., if a player changes teams between phases)
   - _Your answer:_
3. Do you want to track changes to a team over time (versioning/history of edits)?
   - _Your answer:_
4. Should we track opponent teams faced for each match for analytics?
   - _Your answer:_

**Implementation Note:** This is partially implemented. The schema tracks basic tournament participation, but detailed player and team analytics are future enhancements.

---

## 3️⃣ Invitations & Waitlists

> **Question:**
> Should the system support invitations, approvals, or waitlists for tournaments (e.g., for limited slots or approval-based entry)?

**Your answer:**

- ✅ Yes, it should.
- A tournament organizer should have full flexibility to run tournaments however they want:
  - Uncapped registration
  - Player cap
  - Player cap with waitlist
  - Invite only
  - Approval only

**Implementation Note:** The current implementation supports different tournament registration types. See the `tournaments` table in `convex/schema.ts`.

---

## 4️⃣ Notifications & Messaging

> **Question:**
> Do you want to model notifications or messaging (e.g., for pairings, results, announcements) as part of the data model?

**Your answer:**

- ✅ Yes, I do.
- Please ask additional questions to fine tune.

### 🔍 Follow-up Questions

1. What types of notifications do you want to support? (e.g., match pairings, results posted, tournament announcements, direct messages, registration status, etc.)
   - _Your answer:_
     match pairings, tournament announcements from tournament organizers, direct messages to players, etc...
2. Should notifications be in-app only, or also via email/push?
   - _Your answer:_
     all of them should be supported and the user should be able to customize their notification preferences.
3. Do you want to support threaded/group messaging (e.g., chat for a tournament or group), or just one-to-one messages?
   - _Your answer:_
     threads area nice to have but not for mvp.
4. Should users be able to customize notification preferences (opt-in/out of certain types)?
   - _Your answer:_
     yes but not for mvp.

**Implementation Note:** A basic notification system is not yet implemented. This is a future enhancement.

---

## 5️⃣ Organization Membership

> **Question:**
> Should there be a way to track which PlayerProfiles are members of which Organizations (outside of group/role assignment)?

**Your answer:**

- ✅ Yes, that would be amazing.
- Invite only.
- Clarification: players do not belong to an organization. They will simply register to play in an organization's tournament.
  - However, organizations will be able to individually ban players from playing in their tournament.
  - A ban on a PlayerProfile will also ban adjacent PlayerProfiles under the same account.
- Organizations can set requirements for membership (e.g., must have played in a tournament, must be approved by an admin).
- Support "Sign in with" workflows, such as Twitter or Discord. Organizations can require associated accounts and ban these accounts if needed.
- A member in this context would be an admin or a judge. Yes, they should be able to leave freely.

### 🔍 Follow-up Questions

1. Should membership be open (anyone can join), invite-only, or require approval?
   - _Your answer: Invite only._
     org membership is invite only
2. Should there be membership statuses (active, pending, banned, left, etc.)?
   - _Your answer: See above clarification._
     players do not belong to an organization. only admins and judges.
3. Should organizations be able to set requirements for membership (e.g., must have played in a tournament, must be approved by an admin)?
   - _Your answer: Yes. See above._
     no. invite only.
4. Should members be able to leave organizations on their own?
   - _Your answer: Yes, for admins/judges._

**Implementation Note:** The `organization_members` table in `convex/schema.ts` tracks which profiles are members of an organization. The invitation system is also implemented.

---

## 6️⃣ Custom Fields & Settings

> **Question:**
> Do tournaments, teams, or organizations need custom fields or settings (e.g., for different formats, rules, or branding)?

**Your answer:**

- ✅ Yes, that will be needed.
- Please ask additional questions to fine tune.

### 🔍 Follow-up Questions

1. Which entities need custom fields? (tournaments, teams, organizations, player profiles, etc.)
   - _Your answer:_
2. Should custom fields be admin-defined (per org/tournament), or user-defined (per user/team)?
   - _Your answer:_
3. What types of custom fields do you anticipate? (text, number, select, file upload, etc.)
   - _Your answer:_
4. Should custom fields be required or optional?
   - _Your answer:_
5. Should custom fields be visible to everyone, or have privacy settings?
   - _Your answer:_

**Implementation Note:** Custom fields are not yet implemented. This is a future enhancement.

---

## 7️⃣ Media Attachments

> **Question:**
> Should the system support file uploads or media attachments (e.g., decklists, screenshots, videos)?

**Your answer:**

- ✅ Yes.
- For decklists and team lists uploaded as text, we should store that raw without any processing, just in case.
- For screenshots and videos, maybe we can use something like UploadThing.

**Implementation Note:** File uploads are not yet implemented. This is a future enhancement.

---

## 8️⃣ Audit & Logging Granularity

> **Question:**
> Is the current AuditLog sufficient, or do you need more detailed tracking (e.g., per entity type, per action)?

**Your answer:**

- 🤔 That sounds like something I should do but I am unsure.
- Please ask additional questions to fine tune.

### 🔍 Follow-up Questions

1. What types of actions should be logged? (e.g., registration, match result entry, team upload, role changes, etc.)
   - _Your answer:_
2. Should logs include before/after values for changes (e.g., what a team looked like before and after an edit)?
   - _Your answer:_
3. Who should be able to view audit logs? (admins only, org owners, users themselves, etc.)
   - _Your answer:_
4. How long should audit logs be retained?
   - _Your answer:_

**Implementation Note:** A basic audit log is in place, but more granular logging is a future enhancement.

---

## 9️⃣ Custom Fields: Examples & Deep Dive

Below are some examples of custom fields for each major entity. Please review and answer the follow-up questions to clarify your needs.

### 📝 Examples of Custom Fields

- **Tournaments:** Region, Format, Entry Fee, Streaming Link, Registration Deadline, Custom Rules, Sponsor
- **Teams:** Team Nickname, Team Origin, Strategy Notes, Team Image
- **Organizations:** Discord Server Link, Twitter Handle, Organization Motto, Logo
- **Player Profiles:** Preferred Pronouns, Country, Favorite Pokémon, Twitch Channel, Bio, Profile Picture
- **Registration:** Decklist/Teamlist File, Special Requests, Referral Code

### 🔍 Follow-up Questions

1. For each entity (Tournament, Team, Organization, Player Profile, Registration), which custom fields do you consider essential vs. nice-to-have?
   - _Your answer:_
2. Should organizations be able to define their own custom fields for tournaments or registrations?
   - _Your answer:_
   - If so, how much flexibility should they have (field types, validation, etc.)?
   - _Your answer:_
3. Should users be able to define custom fields for their own profiles or teams, or should these be admin/organization-defined only?
   - _Your answer:_
4. Are there any custom field types you want to explicitly support or exclude (e.g., file uploads, URLs, select lists, etc.)?
   - _Your answer:_
5. Should custom fields be versioned or auditable (track changes over time)?
   - _Your answer:_
6. Should there be limits on the number or size of custom fields per entity?
   - _Your answer:_
7. Should custom fields have privacy settings (e.g., public, private, org-only)?
   - _Your answer:_

---

_Feel free to add more questions or notes as you review the data model!_
