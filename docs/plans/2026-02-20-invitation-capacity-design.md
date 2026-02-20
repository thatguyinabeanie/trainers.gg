# Invitation Capacity Enforcement & UI Wiring

**Date:** 2026-02-20
**Tickets:** TGG-316 (Fix registration race condition — remaining invitation path)
**Status:** Approved

---

## Problem

Two related gaps remain after the main TOCTOU fix:

1. **`respondToTournamentInvitation`** bypasses the `register_for_tournament_atomic` RPC and directly inserts into `tournament_registrations` with a hardcoded `status: "registered"`, ignoring capacity entirely.

2. **`sendTournamentInvitations`** does not check capacity at all. A TO can send more invitations than there are open spots, over-promising registration to more players than the tournament can hold.

3. **Neither the `InviteForm` nor `TournamentInvitationsView` components are wired into any page.** They exist but are unreachable.

---

## Core Invariant

```
registered_count + pending_non_expired_invitation_count ≤ max_participants
```

Key insight: **accepting an invitation does not change the total count** — it converts one `pending` invitation into one `registered` registration. Acceptance never needs a capacity check; it only needs to verify the invitation is still `pending` and not expired.

---

## Approach: Fully Atomic RPCs

All three paths (register, send invitations, accept invitation) use `SELECT ... FOR UPDATE` on the tournament row to eliminate all TOCTOU races.

---

## Database Changes (1 migration)

### 1. Modify `register_for_tournament_atomic`

Update the capacity check to include non-expired pending invitations:

```sql
-- Current check (only registered):
SELECT COUNT(*) INTO v_current_count
FROM tournament_registrations
WHERE tournament_id = p_tournament_id AND status = 'registered';

-- New check (registered + pending non-expired invitations):
SELECT
  (SELECT COUNT(*) FROM tournament_registrations
   WHERE tournament_id = p_tournament_id AND status = 'registered') +
  (SELECT COUNT(*) FROM tournament_invitations
   WHERE tournament_id = p_tournament_id
     AND status = 'pending'
     AND (expires_at IS NULL OR expires_at > now()))
INTO v_current_count;
```

Direct registrations are now blocked when pending invitations fill capacity.

### 2. New `send_tournament_invitations_atomic` RPC

Parameters: `p_tournament_id`, `p_invited_alt_ids bigint[]`, `p_invited_by_alt_id`, `p_message text DEFAULT NULL`

Logic:
1. Verify caller is authenticated and has org permission to manage the tournament
2. `SELECT ... FOR UPDATE` on tournament row
3. Count `registered + pending_non_expired` → `v_occupied`
4. Filter `p_invited_alt_ids` to exclude already-invited alts → `v_new_ids`
5. If `v_occupied + array_length(v_new_ids) > max_participants` → return error with available spot count
6. Insert invitation rows for `v_new_ids`
7. Return `{ success, invitationsSent, alreadyInvited, availableSpots }`

### 3. New `accept_tournament_invitation_atomic` RPC

Parameters: `p_invitation_id bigint`

Logic:
1. Verify caller is authenticated
2. Fetch invitation — verify `invited_alt_id` belongs to caller
3. If `status != 'pending'` → return error "Invitation already responded to"
4. If `expires_at IS NOT NULL AND expires_at < now()` → return error "Invitation has expired"
5. `SELECT ... FOR UPDATE` on tournament row (prevents concurrent duplicate accepts)
6. Update invitation: `status = 'accepted'`, `responded_at = now()`
7. Insert into `tournament_registrations` with `status = 'registered'`
8. Return `{ success, registrationId }`

No capacity check needed — the invariant is maintained because one `pending` is removed as one `registered` is added.

---

## TypeScript Mutations (2 changes)

### `sendTournamentInvitations`

Replace direct Supabase insert chain with call to `send_tournament_invitations_atomic` RPC. Surface the `availableSpots` field in the return value so the UI can display it.

### `respondToTournamentInvitation`

Replace direct `tournament_registrations` insert with call to `accept_tournament_invitation_atomic` RPC. Handle the new error cases (expired, already responded).

---

## TO Dashboard — Enhanced Registrations Tab

`TournamentRegistrations` component gains internal sub-tabs:

### Registered sub-tab (existing behavior, reorganized)
- Existing registrations table unchanged
- Existing bulk actions (force check-in, remove) unchanged
- Existing realtime subscription unchanged

### Invitations sub-tab (new)
- **Capacity bar** at top: `X of Y spots filled (Z pending invitations)`
- **`InviteForm`** with `maxInvitations={availableSpots}` — player selection capped; inline error shown before submit if too many selected
- **Sent invitations table** using `getTournamentInvitationsSent` (query already exists): columns Player, Invited By, Status, Expires, Invited At

`TournamentRegistrations` receives `maxParticipants?: number` from parent. Available spots:
```
availableSpots = maxParticipants - registeredCount - pendingNonExpiredCount
```

`tournament-manage-client.tsx` passes `maxParticipants` from tournament data (already loaded).

---

## Player Dashboard — New Invitations Page

- New page: `apps/web/src/app/dashboard/invitations/page.tsx`
- Uses existing `TournamentInvitationsView` component (already fully built)
- Add `{ href: "/dashboard/invitations", label: "Invitations" }` to `dashboard-nav.tsx`
- Show pending count badge on nav link (fetched server-side)

---

## Tests

| Test | File | What it covers |
|---|---|---|
| `sendTournamentInvitations` capacity overflow | `registration.test.ts` | Returns error when `registered + pending + new > max` |
| `sendTournamentInvitations` dedup | `registration.test.ts` | Already-invited alts excluded from count and insert |
| `sendTournamentInvitations` success | `registration.test.ts` | Happy path, returns correct counts |
| `respondToTournamentInvitation` expired | `registration.test.ts` | Returns error for expired invitation |
| `respondToTournamentInvitation` already responded | `registration.test.ts` | Returns error if status != pending |
| `respondToTournamentInvitation` success | `registration.test.ts` | Calls accept RPC, returns registration |
| `TournamentRegistrations` invitations sub-tab | `tournament-registrations.test.tsx` | Available spots count renders correctly |

---

## Files Touched

```
packages/supabase/supabase/migrations/YYYYMMDDHHMMSS_atomic_invitation_capacity.sql
packages/supabase/src/mutations/tournaments/registration.ts
packages/supabase/src/types.ts                          (regenerated)
apps/web/src/components/tournaments/manage/tournament-registrations.tsx
apps/web/src/components/tournaments/manage/tournament-manage-client.tsx  (pass maxParticipants)
apps/web/src/app/dashboard/invitations/page.tsx         (new)
apps/web/src/app/dashboard/dashboard-nav.tsx
packages/supabase/src/mutations/tournaments/__tests__/registration.test.ts
apps/web/src/components/tournaments/manage/__tests__/tournament-registrations.test.tsx
```
