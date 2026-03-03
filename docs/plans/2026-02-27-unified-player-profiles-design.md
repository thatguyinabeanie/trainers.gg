# Unified Player Profiles — Design Document

**Date**: 2026-02-27
**Status**: Approved
**Approach**: Social-First Profile (Approach A)

## Summary

Transform the placeholder player profile page (`/players/[handle]`) into a unified, social-media-style profile that merges competitive tournament data with Bluesky social content. Modeled after Twitter/Bluesky/Threads — a tabbed profile with a rich header, social-first Overview, and dedicated tabs for Posts, Tournaments, and Teams.

The existing `/profile/[handle]` Bluesky profile page will be merged into this unified profile.

## URL Structure

| URL | Tab | Notes |
|-----|-----|-------|
| `/players/[handle]` | Overview | Default landing tab — social-first highlight reel |
| `/players/[handle]/posts` | Posts | Bluesky feed (posts, replies, media) |
| `/players/[handle]/tournaments` | Tournaments | Full tournament history with filters |
| `/players/[handle]/teams` | Teams | Pinned teams + tournament teams |
| `/players/[handle]/likes` | Likes | Own profile only (Bluesky likes) |

- `[handle]` resolves via `users.username` first, then Bluesky handle fallback
- `/profile/[handle]` redirects to `/players/[handle]` for backwards compatibility

## Profile Header

Social-media-style header with:

```
┌─────────────────────────────────────────────────────┐
│             BANNER IMAGE (or gradient)              │
│                                                     │
│  ┌──────┐                                           │
│  │AVATAR│                          [Follow] [···]   │
│  └──────┘                                           │
│  Display Name              🇺🇸                      │
│  @handle                                            │
│                                                     │
│  Bio text goes here, supports multi-line...         │
│                                                     │
│  🔗 website.com  🦋 bsky  🐦 twitter  📺 youtube   │
│                                                     │
│  42 Followers  18 Following  12 Tournaments  67% WR │
│                                                     │
│  [Overview] [Posts] [Tournaments] [Teams] [Likes]   │
└─────────────────────────────────────────────────────┘
```

### Data Sources

| Field | Source | Notes |
|-------|--------|-------|
| Banner | Bluesky `ProfileView.banner` or custom | Gradient fallback if none set |
| Avatar | User's choice (`avatar_preference` setting) | Sprite (`alts.avatar_url`) OR Bluesky photo |
| Display name | `alts.display_name` or Bluesky `displayName` | Falls back to username |
| Handle | `@username` from `users.username` | Trainers.gg handle |
| Bio | `alts.bio` | Editable in settings |
| Country flag | `users.country` | Optional, from ISO code |
| Social links | `users.social_links` (new JSONB) | Predefined platforms + custom links |
| Followers/Following | Bluesky `ProfileView` counts | ATProto social graph |
| Tournament count | Aggregated from `tournament_registrations` | Completed tournaments |
| Win rate | Aggregated from `tournament_player_stats` | Overall match win percentage |

### Avatar Preference

Users choose which avatar displays as their primary profile image:
- **Sprite** — Pokemon/trainer sprite from `alts.avatar_url`
- **Bluesky** — Profile photo from Bluesky account

Setting stored in `users.avatar_preference` (enum: `sprite` | `bluesky`, default: `sprite`).

## Tab Designs

### Overview Tab (Default)

Social-first ordering — posts lead, competitive data enriches:

1. **Recent Posts** — 2-3 latest Bluesky posts (compact card view)
2. **Stats at a Glance** — 4 stat cards:
   - Tournament count
   - Overall win rate
   - Best placement
   - Most-played format
3. **Pinned Team** (if set) — Featured team with 6 Pokemon sprites, linked to full team view
4. **Recent Tournaments** — Last 3 completed tournaments with placement, record, date, format

### Posts Tab

Merged from existing `/profile/[handle]` implementation:
- Reuses existing `ProfileTabs` component (Posts, Replies, Media sub-tabs)
- Reuses `useAuthorFeed` hook with infinite scroll
- Content identical to current Bluesky profile page

### Tournaments Tab

Full tournament history:
- Paginated list of all tournament participations
- Filters: format, time period
- Sort: date (default), placement, record
- Each entry: tournament name, date, placement (e.g., "1st / 32"), record, win %, format, hosting org
- Click-through to tournament detail page
- Adapts existing `getUserTournamentHistory()` for public access by handle

### Teams Tab

Two sections:
1. **Pinned Teams** — User-curated featured teams (from settings)
2. **Tournament Teams** — Auto-populated from completed tournaments with open team sheets

Each team card shows:
- Team name (if set)
- 6 Pokemon sprites in a row
- Tournament context (where used, placement)
- Click to expand for full details (items, moves, EVs, etc.)

Respects `tournaments.open_team_sheets` visibility flag.

### Likes Tab

Own profile only (same as current Bluesky implementation):
- Reuses existing `useActorLikes` hook
- Infinite scroll pagination

## Database Changes

### Migration: New columns on `users`

```sql
-- Social links (same schema as organizations.social_links)
ALTER TABLE users ADD COLUMN social_links JSONB DEFAULT '[]'::jsonb;

-- Avatar display preference
CREATE TYPE avatar_preference AS ENUM ('sprite', 'bluesky');
ALTER TABLE users ADD COLUMN avatar_preference avatar_preference DEFAULT 'sprite';
```

### Migration: New `pinned_teams` table

```sql
CREATE TABLE pinned_teams (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id BIGINT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  position SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, team_id)
);

-- RLS: users can manage their own pins, anyone can read
ALTER TABLE pinned_teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view pinned teams"
  ON pinned_teams FOR SELECT USING (true);

CREATE POLICY "Users can manage own pinned teams"
  ON pinned_teams FOR ALL USING (auth.uid() = user_id);
```

### Social Links Schema

Reuses the same JSONB structure from `organizations.social_links`:

```typescript
type SocialLink = {
  platform: "twitter" | "discord" | "youtube" | "twitch" | "website" | "custom";
  url: string;
  label?: string; // Only for "custom" platform
};
```

Predefined platforms get their own icons. "Custom" links display with a generic link icon + optional label.

## Settings Enhancements

New fields in `/dashboard/settings/profile`:

| Field | Type | Notes |
|-------|------|-------|
| Bio | Textarea | Existing DB field, just needs UI |
| Social links | Dynamic list with platform picker + URL input | Add/remove, drag to reorder |
| Avatar preference | Toggle: Sprite vs Bluesky | Dropdown or radio buttons |
| Pinned teams | Multi-select from past tournament teams | Ordered list, max ~3-5 |

## New Queries Needed

| Query | Purpose | Location |
|-------|---------|----------|
| `getPlayerProfile(handle)` | Fetch user + alt + social links + Bluesky profile for public profile page | `packages/supabase/src/queries/users.ts` |
| `getPlayerLifetimeStats(altIds)` | Aggregate stats across all `tournament_player_stats` rows | `packages/supabase/src/queries/tournaments.ts` |
| `getPlayerTournamentHistory(altIds)` | Public version of `getUserTournamentHistory` (by alt IDs, not auth) | `packages/supabase/src/queries/tournaments.ts` |
| `getPinnedTeams(userId)` | Fetch user's pinned teams with Pokemon data | `packages/supabase/src/queries/users.ts` |

## Incremental Build Phases

| Phase | Scope | What Ships |
|-------|-------|-----------|
| **Phase 1** | Profile header + bio editing + Overview tab (stats + recent tournaments) | Functional profile page with identity + competitive stats |
| **Phase 2** | Social links (settings + display) + avatar preference toggle | Social identity layer |
| **Phase 3** | Tournaments tab (full history with filters) | Deep tournament history |
| **Phase 4** | Teams tab (tournament teams + pinned teams) | Team showcase |
| **Phase 5** | Posts tab (merge Bluesky feed) + Likes tab + redirect from `/profile/[handle]` | Full social integration, route unification |

Each phase is independently shippable. Phase 1 replaces the current placeholder page.

## Design Principles

- **Social-media-first layout** — familiar Twitter/Bluesky/Threads pattern
- **Progressive disclosure** — Overview shows highlights, tabs drill deeper
- **Data-driven, not empty** — gracefully handle users with no tournaments, no Bluesky, no teams
- **Respect visibility** — honor team sheet privacy, Bluesky blocks/mutes
- **Minimal flat design** — consistent with trainers.gg design language (no borders, teal primary, OKLCH tokens)
