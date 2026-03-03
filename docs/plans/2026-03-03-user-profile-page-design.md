# User Profile Page Design

**Date:** 2026-03-03
**Status:** Approved

## Summary

Migrate the existing competitive player profile from `/players/[handle]` to a new canonical route `/u/[handle]`, and significantly expand its content with tabs for tournaments, teams, Bluesky social data, and achievements. Add a "My Profile" link to the topnav auth dropdown.

---

## Routing & Migration

| Aspect | Decision |
|---|---|
| **New route** | `app/u/[handle]/page.tsx` → URL `/u/ash_ketchum` |
| **Display format** | Show `@ash_ketchum` visually throughout the app (in the header, links, etc.) |
| **Migration** | Move/rename `app/players/[handle]/` → `app/u/[handle]/` |
| **Old `/players` directory** | Delete entirely after migration (no redirects — pre-release, no existing links) |
| **Old `/players` index page** | Delete the "Coming Soon" placeholder |

No redirect from `/players/[handle]` to `/u/[handle]` is needed — the app is pre-release with no existing external links.

---

## Profile Header

```
┌─────────────────────────────────────────────────────────┐
│  [Avatar]  Display Name          [Edit Profile] (owner) │
│            @ash_ketchum                                  │
│            🇺🇸  •  Bio text here...                      │
│                                                          │
│  Public alts: [ alt1 chip ] [ alt2 chip ]               │
└─────────────────────────────────────────────────────────┘
```

- **Avatar**: Pokemon sprite from `alts.avatar_url`
- **Display name**: from `alts.display_name`
- **@handle**: `alts.username` displayed in muted text below display name
- **Country**: flag emoji inline with bio preview, sourced from `users.country`
- **Public alts chips**: small chips for each alt where `alts.is_public = true` (requires DB migration)
- **Edit button**: links to `/dashboard/settings/profile`, only rendered for the authenticated owner

---

## Tab Structure

| Tab | Content |
|---|---|
| **Overview** | Stats summary card (wins, losses, win rate, best placement, main format) + last 5 recent tournaments |
| **Tournaments** | Full tournament history, filterable by format/year |
| **Teams** | Public registered team sheets from tournaments (Pokemon sprites, sets) |
| **Social** | Bluesky posts + follower/following counts, sourced from AT Protocol (migrated from `/profile/[handle]`) |
| **Achievements** | Badges, trophies, milestones, seasonal rankings |

The tab structure reuses the existing `player-profile-tabs.tsx` pattern, migrated and extended.

---

## Privacy Model for Alts

Currently there is no visibility control on `alts`. A new migration is required:

```sql
ALTER TABLE alts ADD COLUMN is_public boolean NOT NULL DEFAULT false;
```

- Default `false` = private (users opt-in to showing alts on their public profile)
- The profile page shows alt chips **only** where `alts.is_public = true`
- The `/dashboard/alts` management page gets a per-alt public/private toggle

This is an explicit opt-in model — privacy by default.

---

## Topnav Change

In `apps/web/src/components/topnav-auth-section.tsx`, add a "My Profile" `DropdownMenuItem` as the first item after the header:

```
[Avatar] Display Name
─────────────────────
  My Profile         ← NEW → /u/[username]
  Dashboard
  [My Organizations] (if applicable)
  Settings
  Sign Out
```

The current user's `username` is available from the auth context (`getCurrentUser` / `useUser`).

---

## Files Affected

### New / Moved Files
- `app/u/[handle]/page.tsx` — server component (migrated from `app/players/[handle]/page.tsx`)
- `app/u/[handle]/overview-tab.tsx` — migrated
- `app/u/[handle]/player-profile-tabs.tsx` — migrated and extended with new tabs
- `app/u/[handle]/tournaments-tab.tsx` — new
- `app/u/[handle]/teams-tab.tsx` — new
- `app/u/[handle]/social-tab.tsx` — migrated from `app/profile/[handle]/profile-page-client.tsx`
- `app/u/[handle]/achievements-tab.tsx` — new

### Deleted Files
- `app/players/` — entire directory removed
- `app/profile/[handle]/` — social content merged into `/u/[handle]` social tab

### Modified Files
- `apps/web/src/components/topnav-auth-section.tsx` — add "My Profile" link
- `packages/supabase/supabase/migrations/YYYYMMDDHHMMSS_add_alt_is_public.sql` — add `is_public` column
- `packages/supabase/src/queries/users.ts` — update `getPlayerProfileByHandle` to filter private alts

---

## Out of Scope (Future)

- Public player directory at `/players` (currently "Coming Soon") — separate feature
- Alt-specific sub-profiles at `/@alt-handle` — future enhancement
- Follower/following on trainers.gg itself (not AT Protocol) — future social feature
