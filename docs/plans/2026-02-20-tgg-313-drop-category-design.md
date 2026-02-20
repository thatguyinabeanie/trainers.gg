# TGG-313: Drop Category, Reason Persistence, and Audit Logging

## Context

The TO dashboard registration actions (Force Check-In, Remove Player, bulk variants) are functional but missing:

- Drop category selection (No-Show, Conduct, DQ, Other)
- Drop reason persistence in the database
- Audit log entries for drops and force check-ins
- "Send Message" placeholder still in the dropdown

## Design

### Database Changes

**New enum** `drop_category`:

```sql
CREATE TYPE public.drop_category AS ENUM (
  'no_show',
  'conduct',
  'disqualification',
  'other'
);
```

**New columns on `tournament_registrations`**:

| Column | Type | Notes |
| --- | --- | --- |
| `drop_category` | `drop_category` | Nullable. Only set when status = `dropped` |
| `drop_notes` | `text` | Nullable. Freetext reason. Required for conduct/dq/other, optional for no_show |
| `dropped_by` | `uuid REFERENCES auth.users(id)` | Nullable. The TO/admin who dropped the player (null for self-drop) |
| `dropped_at` | `timestamptz` | Nullable. When the drop happened |

**Audit trigger for `registration.dropped`**: When `tournament_registrations.status` changes to `dropped`, auto-insert into `audit_log` with metadata `{ category, notes, dropped_by, registration_id }`.

**Audit trigger for `registration.checked_in`**: When status changes to `checked_in`, auto-insert into `audit_log` with metadata `{ registration_id, force_check_in: true }` (distinguishes TO-initiated from player-initiated via `dropped_by` being set).

### UI Changes

**Drop Player Dialog** (replaces bare `confirm()`):

- Reusable dialog component for both single and bulk drops
- Radio group: No-Show, Conduct, Disqualification, Other
- Textarea for notes: optional for No-Show, required for the other three
- Destructive confirm button: "Drop Player" (single) / "Drop X Players" (bulk)
- Header shows player name (single) or count (bulk)

**Remove "Send Message"** menu item from the dropdown entirely.

**Registrations table**: Show drop category as a badge in the Status column when a player is dropped (e.g., "Dropped - No-Show").

### Server Action Changes

Update `removePlayerFromTournament` and `bulkRemovePlayers` to accept:

- `dropCategory: 'no_show' | 'conduct' | 'disqualification' | 'other'`
- `dropNotes?: string`

Pass through to the Supabase mutation. The audit trigger handles logging automatically.

`forceCheckInPlayer` and `bulkForceCheckIn` need no parameter changes — the audit trigger fires on status change.

### Decisions Made

- **Drop reason storage**: Columns on `tournament_registrations` (not separate table or audit-only)
- **Send Message**: Remove entirely (not "Coming Soon")
- **Notes requirement**: Optional for No-Show, required for Conduct/DQ/Other
- **Bulk drop UX**: Same dialog with shared category/reason for all selected players
