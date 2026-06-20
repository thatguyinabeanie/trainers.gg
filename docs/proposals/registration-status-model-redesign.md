# Proposal: Redesign tournament registration status as event/state tables

> **Status:** Captured (not scheduled). Future architecture project — its own spec → plan → implementation cycle.
> **Origin:** PR #361 review feedback (T6). Captured 2026-06-17.
> **Note:** Intended for a Linear ticket in team `trainers-gg`; the Linear MCP server was not connected when this was written, so it lives here until it can be mirrored to Linear.

## Context

While closing review feedback on PR #361 we tightened who can write to `tournament_registrations`: a `BEFORE UPDATE` trigger (`enforce_registration_write_rules`, migration `20260618000100`) now limits managers (non-owners) to `status` + `team_locked` and makes `alt_id`/`tournament_id` immutable. That trigger is the **minimal** fix. This document captures the larger redesign we discussed but deliberately deferred to keep PR #361 shippable.

## Idea

Model registration state through normalized event/state tables instead of a single overloaded `status` enum:

- **registered** = a row simply existing in `tournament_registrations` (drop the redundant `registered` status value).
- **checked_in** = a row in a new check-in table (FK → registration), which also captures who/when for free (audit). Both player self-check-in and manager check-in write there, governed by that table's own RLS — table-level ownership instead of column-level trigger logic.
- **dropped** = already separated (the `tournament_registration_staff` table + `drop_registrations` RPC); fold the leftover `status = 'dropped'` flag into this model.

## Why (benefits)

- Clean, table-level write ownership (no column-restricting trigger needed).
- Free audit trail for check-ins.
- Removes the manager/player tug-of-war over the shared `status` column.

## Cost / why deferred (the hard part — not the new table)

`status` is currently a single column read **everywhere**: standings, pairings, brackets, rosters, Supabase Realtime subscriptions, and `/api/v1` responses. Deriving status from "which rows exist" requires:

- a view or computed layer to present an effective status,
- touching every read site,
- backfilling existing data,
- rethinking realtime (`tournament_registrations` is a realtime-subscribed table),
- plus the leftover status values that don't map to "row exists": `waitlist` (capacity/system), `confirmed` (manager), `withdrawn` (player), `pending` — each needs a home.

## Also fold in when this is done (deferred from PR #361)

- Make `team_locked` truly **system-only** — flipped ONLY by the tournament-start flow (one-way; no un-start path exists today and we are not building one). Likely via a SECURITY DEFINER lock RPC + a transaction flag the trigger checks.
- **DB-level team freeze:** once `team_locked = true`, team fields (`team_id`, `team_name`, `team_submitted_at`) reject changes for everyone (today it's only a UI gate).
- **Player-side write tightening** — players currently have an unrestricted self-`UPDATE` with no `WITH CHECK`.
- **Funnel the inactivity-drop path** (`dropPlayerInactivity`) through the `drop_registrations` RPC so it writes staff metadata + derives the actor, instead of a direct status update.

## Scope note

This is a status-model refactor with broad read-path impact — treat as its own project (own spec → plan → implementation), not a quick fix. Suggested priority: Medium.
