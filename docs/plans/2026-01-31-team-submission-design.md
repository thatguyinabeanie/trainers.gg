# Team Submission & Format Validation Design

**Linear Issues:** BEA-147, BEA-150, BEA-149
**Date:** 2026-01-31
**Status:** Design

---

## Overview

Allow tournament-registered players to submit their Pokemon team, validate it against the tournament's format rules using `@pkmn/sim`, and gate match check-in on team submission. Teams are private — only the submitting player can see their own team, with controlled visibility for opponents during matches.

---

## Requirements Summary

| Requirement       | Detail                                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------ |
| Input methods     | Pokemon Showdown text paste, Pokepaste URL import                                          |
| Validation        | Full `@pkmn/sim` TeamValidator against tournament format                                   |
| Storage           | Parse into structured `pokemon`/`teams`/`team_pokemon` records                             |
| Privacy           | Only the player sees their team; staff see `has_team` boolean only                         |
| Open teamsheets   | Configurable per tournament; if enabled, all participant teams visible at tournament start |
| Closed teamsheets | Teams are never visible to other players — not even opponents in a match                   |
| Locking           | Teams lock when tournament status → `active`                                               |
| Check-in gate     | Cannot check in without a submitted team                                                   |
| Platforms         | Web (Next.js) and Mobile (Expo)                                                            |
| Entry points      | Tournament detail page, personal dashboard                                                 |

---

## Architecture

### Data Flow

```
User pastes text or Pokepaste URL
        ↓
  Client-side parsing (@pkmn/sets)
        ↓
  Client-side validation (@pkmn/sim TeamValidator)
        ↓
  Show validation results + team preview
        ↓
  On "Submit Team" → Server Action / API call
        ↓
  Server re-validates (can't trust client)
        ↓
  Insert pokemon records → Create team → Link team_pokemon
        ↓
  Update tournament_registrations.team_id + team_submitted_at
```

### Where Each Piece Lives

| Step             | Location                   | Why                                      |
| ---------------- | -------------------------- | ---------------------------------------- |
| Parse paste text | Client (web + mobile)      | Immediate feedback                       |
| Validate format  | Client + Server            | Client for UX, server for enforcement    |
| Store team       | Server (Supabase mutation) | Auth-gated writes                        |
| Check-in gate    | Supabase mutation          | `checkIn()` checks `team_id IS NOT NULL` |

### Package Location

Parsing and validation logic lives in a shared location accessible to both web and mobile:

- **Option A:** `packages/validators/` — add team parsing/validation exports alongside existing Zod schemas
- **Option B:** New `packages/pokemon/` package — dedicated Pokemon utilities

The `@pkmn/*` packages need to be added to whichever shared package is chosen, plus kept in `apps/web` and added to `apps/mobile` for client-side validation.

---

## Database Changes

### New column on `tournaments`

```sql
ALTER TABLE tournaments ADD COLUMN open_team_sheets boolean DEFAULT true;
```

### New columns on `tournament_registrations`

```sql
ALTER TABLE tournament_registrations
  ADD COLUMN team_submitted_at timestamptz,
  ADD COLUMN team_locked boolean DEFAULT false;
```

- `team_submitted_at` — timestamp of submission (null = not yet submitted)
- `team_locked` — set to `true` when tournament starts (prevents changes)
- `team_id` FK already exists

### RLS Policies

```sql
-- Players can view their own team's pokemon (tournament context)
CREATE POLICY "players_view_own_tournament_team"
ON team_pokemon FOR SELECT USING (
  team_id IN (
    SELECT team_id FROM tournament_registrations
    WHERE profile_id IN (
      SELECT id FROM alts WHERE user_id = auth.uid()
    )
    AND team_id IS NOT NULL
  )
);

-- Open teamsheets: PUBLICLY visible once tournament starts (no auth required)
CREATE POLICY "open_teamsheet_public_visibility"
ON team_pokemon FOR SELECT USING (
  team_id IN (
    SELECT tr.team_id
    FROM tournament_registrations tr
    JOIN tournaments t ON tr.tournament_id = t.id
    WHERE t.open_team_sheets = true
    AND t.status IN ('active', 'completed')
    AND tr.team_id IS NOT NULL
  )
);
```

**Staff visibility:** Staff queries for registration lists select `(team_id IS NOT NULL) AS has_team` — never join to team/pokemon data.

---

## Format Mapping

Map `tournaments.game_format` text values to `@pkmn/sim` format strings:

```typescript
export const FORMAT_MAP: Record<string, string> = {
  "reg-i": "gen9vgc2025regi",
  "reg-h": "gen9vgc2024regh",
  "reg-g": "gen9vgc2024regg",
  "reg-f": "gen9vgc2024regf",
  "reg-e": "gen9vgc2024rege",
  "reg-d": "gen9vgc2023regd",
  ou: "gen9ou",
  uu: "gen9uu",
  uber: "gen9ubers",
  lc: "gen9lc",
  // Extend as new formats release
};
```

If no mapping exists for a tournament's format, skip format-specific validation and only do structural checks (team size, no duplicate species/items).

---

## Team Privacy & Visibility Matrix

| Viewer             | Before tournament       | During (open sheets)             | During (closed sheets)  |
| ------------------ | ----------------------- | -------------------------------- | ----------------------- |
| Player (own team)  | ✅ Full view            | ✅ Full view                     | ✅ Full view            |
| Other participants | ❌ Hidden               | ✅ All participant teams visible | ❌ Hidden               |
| Staff/TO           | `has_team` boolean only | ✅ All teams visible (public)    | `has_team` boolean only |
| Public             | ❌ Hidden               | ✅ All teams visible (public)    | ❌ Hidden               |

**Closed teamsheets:** No player ever sees another player's team — not even when paired as opponents in a match. Teams remain fully private throughout the tournament.

---

## Component Design

### TeamSubmissionCard (Web + Mobile)

Three states:

**State 1 — No team submitted:**

- Message: "Submit a team before you can check in"
- Actions: "Paste Team" button, "Import Pokepaste" button

**State 2 — Editing/pasting:**

- Textarea for Pokemon Showdown format paste
- OR text input for Pokepaste URL
- Live validation errors displayed inline
- Actions: "Cancel", "Submit Team" (disabled until valid)

**State 3 — Team submitted:**

- Pokemon species names/sprites displayed (6 Pokemon grid)
- Submission timestamp
- Actions: "Replace Team" (disabled if locked)
- If locked: "Team locked — tournament has started"

### Placement

**Tournament detail page:** Between registration card and check-in card, visible only to registered players.

**Personal dashboard** (`/dashboard/overview`): In the "Upcoming Tournaments" section, show team submission status and action buttons per tournament.

**Match view (open teamsheet only):** When tournament has `open_team_sheets = true`, show opponent's team in the match view. For closed teamsheet tournaments, no team data is shown.

### Check-in Card Changes

- If no team submitted: check-in button disabled, warning message with link to team submission section
- If team submitted: existing check-in flow unchanged

---

## Mobile Implementation (Expo)

### Shared Logic

Parsing and validation logic is shared between web and mobile via a monorepo package. Both platforms use the same:

- `@pkmn/sets` parsing
- `@pkmn/sim` validation
- Format mapping
- Team data types

### Mobile Components

| Component            | Location                                 | Notes                         |
| -------------------- | ---------------------------------------- | ----------------------------- |
| `TeamSubmissionCard` | `apps/mobile/src/components/tournament/` | Tamagui-styled, same 3 states |
| `TeamPreview`        | `apps/mobile/src/components/tournament/` | 6-Pokemon grid with sprites   |
| `PasteInput`         | `apps/mobile/src/components/tournament/` | TextArea or URL input         |

### Mobile-Specific Considerations

- Use Tamagui components + `$theme` tokens (not Tailwind)
- Clipboard paste integration for mobile UX
- Consider camera/photo import for rental team codes (Phase 2)
- Team submission accessible from tournament detail screen and dashboard tab

---

## Pokepaste URL Handling

1. Detect if input matches `https://pokepast.es/[id]` pattern
2. Fetch raw text from `https://pokepast.es/[id]/raw`
3. Parse with `@pkmn/sets`
4. Same validation flow as text paste

Client-side fetch — Pokepaste's `/raw` endpoint is public with CORS headers.

---

## Check-in Gating (BEA-149)

### Server-side (mutation)

```typescript
// In checkIn() function:
const registration = await supabase
  .from("tournament_registrations")
  .select("team_id, team_submitted_at")
  .eq("id", registrationId)
  .single();

if (!registration.data?.team_id) {
  throw new Error("You must submit a team before checking in.");
}
```

### Client-side (check-in card)

```typescript
{!hasTeam ? (
  <Alert variant="warning">
    Submit a team before you can check in.
  </Alert>
) : (
  <Button onClick={handleCheckIn}>Check In</Button>
)}
```

---

## Team Locking

Teams lock when tournament status changes to `active`:

```sql
-- Trigger or application logic when tournament starts:
UPDATE tournament_registrations
SET team_locked = true
WHERE tournament_id = $1
AND team_id IS NOT NULL;
```

The `submitTeam` mutation checks `team_locked = false` before allowing updates.

---

## Implementation Order

### Phase 1: Core Parsing & Validation

1. Set up shared parsing/validation package with `@pkmn/sets` + `@pkmn/sim`
2. Format mapping (`game_format` → `@pkmn/sim` format string)
3. Parse Pokemon Showdown text → structured Pokemon data
4. Validate team against format rules
5. Pokepaste URL fetch + parse

### Phase 2: Database & Backend

6. Migration: `open_team_sheets`, `team_submitted_at`, `team_locked` columns
7. RLS policies for team privacy
8. `submitTeam` mutation (parse → validate → insert pokemon → create team → link)
9. `replaceTeam` mutation (delete old, insert new)
10. Update `checkIn` mutation with team gate
11. Team locking logic on tournament start

### Phase 3: Web UI

12. `TeamSubmissionCard` component (3 states)
13. `TeamPreview` component (6-Pokemon display)
14. Integrate into tournament detail page
15. Integrate into personal dashboard
16. Update `CheckInCard` with team gate UI
17. Match view: show opponent's team (open teamsheet tournaments only)

### Phase 4: Mobile UI

18. `TeamSubmissionCard` (Tamagui)
19. `TeamPreview` (Tamagui)
20. Integrate into mobile tournament detail screen
21. Integrate into mobile dashboard
22. Match view on mobile

---

## Out of Scope (Phase 2+)

- Visual team builder UI (drag-and-drop Pokemon selection)
- Import from rental codes
- Save teams to personal team library
- Team privacy settings (public/private/tournament-only)
- Camera import for rental team photos on mobile
