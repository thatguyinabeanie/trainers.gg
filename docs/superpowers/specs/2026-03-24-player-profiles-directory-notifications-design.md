# Player Profiles, Player Directory & Notification Center

**Date:** 2026-03-24
**Status:** Draft
**Linear tickets:** TGG-116 (Player Stats), TGG-219 (Social Links), TGG-124 (Notification Preferences)

## Overview

Three independent features built in parallel via separate agents/worktrees:

1. **Player Profiles** — Complete the `/u/[handle]` profile page with 5 tabs and public alt visibility
2. **Player Directory** — Full discovery hub at `/players` with search, filters, leaderboards
3. **Notification Center** — Dedicated notification page + per-type preference toggles

**Architecture approach:** Independent features, no shared new code between them. The one dependency is that Player Profiles creates the `alts.is_public` migration, which Player Directory reads. All three features follow existing codebase patterns (Server Components, `unstable_cache`, TanStack Query, Supabase RLS).

---

## Feature 1: Player Profiles

### Route Migration

- **Delete** `apps/web/src/app/players/[handle]/` directory
- **Create** `apps/web/src/app/u/[handle]/page.tsx` — Server Component
- No redirects needed (pre-release, no existing links)
- Add `/u` to `PUBLIC_ROUTES` in `proxy-routes.ts`

### Database Changes

**Migration:** Add `is_public` column to `alts` table.

```sql
ALTER TABLE public.alts
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;
```

### Profile Header

- Avatar (from main alt `avatar_url` or sprite preference)
- Display name + `@handle` in muted text
- Country flag + bio
- Public alt chips: only alts where `is_public = true`, visible to all visitors
- "Edit Profile" button: shown only to profile owner, links to `/dashboard/settings/profile`
- Follow/follower counts: new count queries against existing `follows` table (`getFollowerCount`, `getFollowingCount`)

### Tabs

| Tab | Status | Data Source | Content |
|-----|--------|------------|---------|
| Overview | Implemented | `playerKeys.stats` + `playerKeys.tournaments` APIs | Stats cards (tournaments, win rate, best placement, main format) + recent 5 tournaments |
| Tournaments | New | New query: full tournament history | Filterable table — format, year, status. Shows placement, record, tournament name. Links to tournament page |
| Teams | New | `tournament_registrations` with team submission data | Public team sheets from tournaments. Parsed Pokemon display (sprites, moves, items, abilities) |
| Articles | Stub | None | "Coming Soon" placeholder |
| Achievements | Stub | None | "Coming Soon" placeholder |

### Query Changes

**`getPlayerProfileByHandle`** (packages/supabase/src/queries/users.ts):
- Include `is_public` in alt selection
- For non-owner viewers: filter alts to only those with `is_public = true`
- For profile owner: return all alts with their `is_public` status

**New query: `getPlayerTournamentHistoryFull`**:
- Full paginated tournament history with filters (format, year, status)
- Returns: tournament name, slug, date, format, placement, match record (W-L), status

**New query: `getPlayerPublicTeams`**:
- Team sheets from tournament registrations where the tournament is complete
- Returns: tournament name, team Pokemon data (parsed), date

### Navigation Changes

- Add "My Profile" link in topnav auth dropdown (between Dashboard and Organizations)
- Links to `/u/{username}` using current user's username
- All player links across the app (standings, pairings, registrations) point to `/u/[handle]`

### Alt Visibility

- Toggle in alt management UI (`/dashboard/alts`): each alt gets an `is_public` switch
- Server Action: `updateAltVisibility(altId, isPublic)` — validates alt belongs to current user
- Profile header shows public alt chips as small badges next to the main identity

### Caching

- `unstable_cache` with tag `player:{handle}` for profile data
- Invalidate on profile update, alt visibility change, tournament completion
- Tournament and teams tabs use client-side TanStack Query via API routes

### Testing

- Query tests: `getPlayerProfileByHandle` with `is_public` filtering
- Query tests: `getPlayerTournamentHistoryFull` with filters
- Component tests: profile header renders correct data, alt chips visibility
- Alt visibility toggle: Server Action validation

---

## Feature 2: Player Directory

### Route

- **Replace** `apps/web/src/app/players/page.tsx` (currently "Coming Soon")
- Server Component with `unstable_cache` for initial page load
- Client-side search with debounced API calls

### Page Layout

**Main column** (left ~70%):
- Search bar: debounced text input, searches `users.username` + `alts.username`
- Filter row: Country dropdown, Format dropdown, Sort dropdown
- Player card grid: 2 columns, 24 per page, paginated
- Each card: avatar, username, country flag, tournament count, win rate → links to `/u/[handle]`

**Sidebar** (right ~30%):
- 🏆 **Leaderboard**: Top 5 by win rate (minimum 5 tournaments played)
- ⚡ **Recently Active**: Last 5 players with tournament activity
- 👋 **New Members**: 5 most recently created accounts

### New API Route

**`GET /api/players/search`**
- Query params: `q` (search), `country`, `format`, `sort`, `page`
- Returns: paginated player list with stats
- Public (no auth required)
- Rate limited via existing patterns

### New Queries (`packages/supabase/src/queries/players.ts`)

**`searchPlayers(query, filters, page)`**:
- `ILIKE` pattern search on `users.username` and `alts.username` (not full-text search — usernames are short strings)
- Join with tournament registration stats (count, wins, losses)
- Filter by country, format (via tournament format join)
- Sort options: most tournaments, highest win rate, newest, alphabetical
- Paginated: 24 per page, returns `{ players, totalCount, page }`

**`getLeaderboard(limit)`**:
- Top players by win rate
- Minimum 5 tournaments played (avoids 1-tournament-100%-win-rate outliers)
- Returns: username, avatar, win rate, top cut count

**`getRecentlyActivePlayers(limit)`**:
- Players with most recent tournament participation
- Based on `tournament_registrations.created_at` or tournament end date
- Returns: username, avatar, last active timestamp

**`getNewMembers(limit)`**:
- Most recently created user accounts
- Based on `users.created_at`
- Returns: username, avatar, join date

### Caching

- Server-side initial data: `unstable_cache` with tag `players_directory`
- Sidebar data: `unstable_cache` with tags `players_leaderboard`, `players_recent`, `players_new`
- Search results: client-side only (no server cache for search — too dynamic)
- Invalidate directory caches on: new user signup, tournament completion

### Testing

- Query tests: `searchPlayers` with various filter combinations
- Query tests: `getLeaderboard` minimum tournament threshold
- Query tests: `getRecentlyActivePlayers` ordering
- Component tests: search input debouncing, filter state management
- API route tests: query param validation, pagination

---

## Feature 3: Notification Center & Preferences

### Routes

- **Create** `apps/web/src/app/dashboard/notifications/page.tsx` — full notification center
- **Create** `apps/web/src/app/dashboard/settings/notifications/page.tsx` — preferences

### Database Changes

**Migration:** Create `notification_preferences` table.

```sql
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT notification_preferences_user_id_unique UNIQUE (user_id)
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Users can read their own preferences
CREATE POLICY "Users can read own preferences"
  ON public.notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own preferences
CREATE POLICY "Users can insert own preferences"
  ON public.notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own preferences
CREATE POLICY "Users can update own preferences"
  ON public.notification_preferences FOR UPDATE
  USING (auth.uid() = user_id);
```

**JSONB `preferences` column structure:**
```json
{
  "match_ready": true,
  "match_result": true,
  "match_disputed": true,
  "match_no_show": true,
  "judge_call": true,
  "judge_resolved": true,
  "tournament_start": true,
  "tournament_round": true,
  "tournament_complete": false,
  "org_request_approved": true,
  "org_request_rejected": true
}
```

When no row exists for a user, all notifications default to enabled (backwards compatible).

### Notification Center Page

**Header:** Title, unread count, "Mark all read" button

**Filter tabs:** All | Unread | Matches | Tournaments | Organizations
- "All" and "Unread" use existing `getNotifications(userId, { unreadOnly })` query
- Type tabs filter by notification type prefix — add optional `types` array filter param to `getNotifications` (e.g., Matches tab passes `["match_ready", "match_result", "match_disputed", "match_no_show"]`)

**Notification list:**
- Paginated: 20 per page
- Unread: teal left border, dot indicator, slightly highlighted background
- Read: dimmed opacity
- Click → navigate to `action_url`
- Icon mapping per type (reuse existing mapping from NotificationBell)

**Pagination:** Standard offset/limit pagination with page numbers

### Notification Preferences Page

**UI organized by category** (flat in DB):

| Category | Types | Shown To |
|----------|-------|----------|
| ⚔️ Match | match_ready, match_result, match_disputed, match_no_show | All users |
| 🏆 Tournament | tournament_start, tournament_round, tournament_complete | All users |
| 🔧 Staff | judge_call, judge_resolved | Users with staff roles only |
| 🏢 Organization | org_request_approved, org_request_rejected | All users |

Each type: label, description, toggle switch.

"Save Preferences" button at bottom — calls Server Action.

### How Preferences Are Applied

Modify existing notification trigger functions (`notify_judge_call`, `notify_round_start`, `notify_checkin_open`) to check `notification_preferences` before inserting:

```sql
-- In each trigger function, before INSERT INTO notifications:
-- Check if user has opted out of this notification type
IF EXISTS (
  SELECT 1 FROM notification_preferences
  WHERE user_id = target_user_id
  AND (preferences->>notification_type)::boolean = false
) THEN
  -- Skip this notification
  RETURN;
END IF;
```

This is backwards compatible: no preferences row = no opt-outs = all notifications sent.

### Bell Popover Changes

- Add "View all" link at bottom of popover → navigates to `/dashboard/notifications`
- No other changes to the existing NotificationBell component

### Settings Navigation

- Add "Notifications" item to dashboard settings sidebar (alongside Account, Profile, Display)

### New Queries/Mutations

**Queries** (`packages/supabase/src/queries/notification-preferences.ts`):
- `getNotificationPreferences(userId)` — returns preferences JSONB or null (null = all enabled)

**Mutations** (`packages/supabase/src/mutations/notification-preferences.ts`):
- `upsertNotificationPreferences(userId, preferences)` — insert or update preferences

**Server Actions** (`apps/web/src/actions/notification-preferences.ts`):
- `getNotificationPreferencesAction()` — for settings page load
- `updateNotificationPreferencesAction(preferences)` — save preferences with Zod validation

### Caching

- Preferences: no cache (always fresh, infrequently accessed)
- Notification center: server-side initial load, then TanStack Query for pagination/filtering
- Existing realtime subscription stays on the bell (not duplicated on the center page)

### Testing

- Query tests: `getNotificationPreferences` with/without existing row
- Mutation tests: `upsertNotificationPreferences` insert and update paths
- Migration tests: RLS policies (user can only access own preferences)
- Trigger modification tests: notification suppressed when preference is false
- Component tests: preference toggles save correctly, staff section visibility

---

## Parallel Execution Strategy

All three features are built simultaneously in separate git worktrees:

| Agent | Feature | Branch | Key Files |
|-------|---------|--------|-----------|
| Agent 1 | Player Profiles | `feat/player-profiles` | `apps/web/src/app/u/`, migration, queries |
| Agent 2 | Player Directory | `feat/player-directory` | `apps/web/src/app/players/`, new queries |
| Agent 3 | Notifications | `feat/notification-center` | `apps/web/src/app/dashboard/notifications/`, migration, triggers |

**Shared dependency:** Agent 1 creates the `alts.is_public` migration. Agent 2 reads `is_public` but doesn't need the migration to exist during development (can use `COALESCE(is_public, false)` defensively). Merge order: Agent 1 first, then Agent 2 and 3.

**No shared new components between features.** Any duplication (e.g., player card rendering) can be extracted after all three merge, per codebase guidelines ("extract after 2-3 repetitions").
