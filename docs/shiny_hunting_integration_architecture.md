# Shiny Hunting Integration Architecture 🌟

**Project:** trainers.gg Shiny Dex + Mobile Companion  
**Date:** January 26, 2026  
**Status:** Planning Phase

---

## ⚠️ Prerequisites

Before implementing shiny hunting features, the social system needs a migration from `alt_id` to `user_id`.

> 📄 **See full migration plan:** [SOCIAL_MIGRATION_PLAN.md](./planning/SOCIAL_MIGRATION_PLAN.md)
>
> 📄 **See architecture guide:** [USER_VS_ALT_ARCHITECTURE.md](./architecture/USER_VS_ALT_ARCHITECTURE.md)

### Summary

| Table           | Current                               | Target                                  |
| --------------- | ------------------------------------- | --------------------------------------- |
| `posts`         | `alt_id`                              | `user_id`                               |
| `post_likes`    | `alt_id`                              | `user_id`                               |
| `follows`       | `follower_alt_id`, `following_alt_id` | `follower_user_id`, `following_user_id` |
| `organizations` | `owner_alt_id`                        | `owner_user_id`                         |

### Rationale

#### 🌐 Bluesky Federation (Critical Constraint)

trainers.gg uses the AT Protocol (Bluesky) for decentralized social features. Every user has:

- A DID (Decentralized Identifier): `did:plc:abc123...`
- A handle: `@username.trainers.gg`

**Why this matters for shiny dex:**

When a user shares a shiny catch, that post federates to the entire Bluesky network. Users on bsky.app, other PDS instances, and AT Protocol clients will see this content. These external systems have no concept of "alts" or tournament personas—they only know about the user's DID and handle.

If we used `alt_id` for shiny posts:

- ❌ The post would have no valid DID for federation
- ❌ External clients couldn't attribute content correctly
- ❌ The user's Bluesky identity would be disconnected from their content

By using `user_id`:

- ✅ Posts federate with proper DID attribution
- ✅ Content appears correctly on bsky.app and other clients
- ✅ User's handle (`@username.trainers.gg`) is consistent everywhere

#### 🎭 Tournament Anonymity Preservation

Using `alt_id` for social features would **break** tournament anonymity—the opposite of what alts are designed for:

- Posting patterns would link multiple alts to the same person
- Social graphs would reveal alt relationships
- Tournament opponents could track players across events

#### 🌟 Shiny Dex is a User-Level Feature

- One shiny collection per person (not per tournament identity)
- Displays on the user's social profile
- Collection persists regardless of tournament participation
- Users collect shinies as themselves, not as tournament personas

### Timeline

The social migration should be completed **before** starting shiny hunting implementation.

**Current Status:** Database is empty (no production data), so we can use a simplified drop-and-recreate approach.

**Estimated effort:** 2-3 elapsed days (streamlined migration)

---

## Overview 🎯

This document outlines how shiny hunting features will be integrated into trainers.gg as a **profile feature**, implemented in two phases:

1. **Phase 1: Shiny Dex Catalog** - Web-based collection management and social features
2. **Phase 2: Mobile Companion App** - Active hunting tool with 3DS integration

---

## Architecture Decision: User-Level Feature ✅

### Understanding trainers.gg Architecture

**Key Concepts:**

- **`users`** - Top-level account (the actual person, linked to auth.users)
- **`alts`** - Tournament-specific alternate identities for anonymity (NOT social profiles)
- **Social Profile** - The user's public-facing presence (like Twitter/Bluesky), displays user-level data
- **Shiny Dex** - User-level feature, NOT tied to tournament alts

### Why User-Level?

Shiny hunting is a **personal collection** tied to the user as a person:

- One shiny dex per user account (not per alt)
- Collection persists across tournament identities
- Social profile shows the user's actual accomplishments
- Alts are only for tournament anonymity, not social features
- Users collect shinies as themselves, not as tournament personas

### Integration Points

**Existing Tables We'll Use:**

- `users` - Each shiny dex belongs to a user account
- `posts` - Share shiny catches to social feed (as the user)
- `follows` - See catches from people you follow (user-to-user)
- `post_likes` - Like/comment on shiny catches

**New Tables We'll Add:**

- `shiny_catches` - Individual shiny Pokemon caught (FK: `user_id`)
- `shiny_hunts` - Active/completed hunt tracking (FK: `user_id`)
- `shiny_hunt_methods` - Reference data (Masuda, SR, etc.)
- `shiny_videos` - Video embeds and imports (optional table)

---

## Phase 1: Shiny Dex Catalog (Foundation) 📚

**Goal:** Establish backend infrastructure and web UI for managing a shiny collection.

### Core Features

#### 1. Personal Shiny Dex

**What it is:**

- A catalog of all shinies caught by a user
- Each entry has stats, photos, videos, hunt method
- Public/private visibility controls
- Searchable and filterable
- Displays on user's social profile page

**User Stories:**

- "I want to catalog my 200+ shinies I've caught over the years"
- "I want to show off my shiny living dex on my profile"
- "I want to see what shinies my friends have caught"

#### 2. Manual Entry System

**What it is:**

- Web form to add existing shinies
- Fields: species, game, date, encounter count, method, notes
- Photo/video upload or embed links
- Bulk import from CSV (for power users)

**User Stories:**

- "I have 50 shinies documented in a spreadsheet, I want to import them"
- "I just caught a shiny, I want to add it to my collection"

#### 3. Social Integration

**What it is:**

- Share catches to the social feed (leverages existing `posts` table)
- Shiny catch posts have special formatting/metadata
- Profile page shows shiny dex summary

**User Stories:**

- "I just caught a shiny Rayquaza after 2000 resets, I want to share it!"
- "I want to see a feed of recent shiny catches from people I follow"

#### 4. Statistics & Analytics

**What it is:**

- Personal stats dashboard (total caught, fastest hunt, longest hunt)
- Leaderboards (most shinies, rare catches, etc.)
- Game-specific stats (BDSP vs ORAS vs SV)

**User Stories:**

- "I want to see my average encounters per shiny"
- "I want to compare my collection to the top collectors"

---

## Phase 1: Database Schema 🗄️

### New Tables

#### `shiny_catches`

Represents a single shiny Pokemon caught by a user.

```sql
CREATE TABLE "public"."shiny_catches" (
    "id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "user_id" uuid NOT NULL,

    -- Pokemon details
    "species" text NOT NULL,           -- "Rayquaza", "Charizard"
    "nickname" text,                   -- Optional nickname
    "game" text NOT NULL,              -- "BDSP", "ORAS", "Sword", "ScarletViolet"
    "is_shiny_locked" boolean DEFAULT false,  -- For impossible shinies

    -- Hunt details
    "hunt_method_id" bigint,           -- FK to shiny_hunt_methods
    "encounter_count" integer,         -- How many encounters before success
    "date_caught" date,                -- When it was caught
    "hunt_duration_hours" numeric(10,2),  -- Optional: total hunt time

    -- Media
    "photo_url" text,                  -- Screenshot of catch
    "video_url" text,                  -- YouTube/TikTok embed
    "video_platform" text,             -- "youtube", "tiktok", "twitch"

    -- Metadata
    "notes" text,                      -- User's story/notes
    "is_public" boolean DEFAULT true,  -- Visibility control
    "is_verified" boolean DEFAULT false,  -- For community verification

    -- Social
    "post_id" bigint,                  -- FK to posts (if shared)
    "views_count" integer DEFAULT 0,
    "likes_count" integer DEFAULT 0,   -- Denormalized from post_likes

    -- Timestamps
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now(),

    -- Foreign Keys
    CONSTRAINT "shiny_catches_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE,
    CONSTRAINT "shiny_catches_hunt_method_id_fkey"
        FOREIGN KEY ("hunt_method_id") REFERENCES "public"."shiny_hunt_methods"("id") ON DELETE SET NULL,
    CONSTRAINT "shiny_catches_post_id_fkey"
        FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE SET NULL
);

-- Indexes
CREATE INDEX "idx_shiny_catches_user" ON "public"."shiny_catches" ("user_id");
CREATE INDEX "idx_shiny_catches_species" ON "public"."shiny_catches" ("species");
CREATE INDEX "idx_shiny_catches_game" ON "public"."shiny_catches" ("game");
CREATE INDEX "idx_shiny_catches_date" ON "public"."shiny_catches" ("date_caught" DESC);
CREATE INDEX "idx_shiny_catches_public" ON "public"."shiny_catches" ("is_public") WHERE "is_public" = true;
```

#### `shiny_hunt_methods`

Reference table for hunt methods (static data).

```sql
CREATE TABLE "public"."shiny_hunt_methods" (
    "id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "name" text NOT NULL UNIQUE,           -- "Masuda Method", "Soft Reset"
    "description" text,                    -- How it works
    "base_odds" text,                      -- "1/4096", "1/512 with charm"
    "applicable_games" text[],             -- ["BDSP", "ORAS", "SV"]
    "created_at" timestamp with time zone DEFAULT now()
);

-- Seed data
INSERT INTO "public"."shiny_hunt_methods" ("name", "description", "base_odds", "applicable_games") VALUES
    ('Soft Reset', 'Reset the game before encountering a legendary/static Pokemon', '1/4096', ARRAY['BDSP', 'ORAS', 'XY', 'USUM', 'SM', 'SV']),
    ('Masuda Method', 'Breeding with Pokemon from different language games', '1/512 with Shiny Charm', ARRAY['All']),
    ('Poke Radar', 'Chain encounters using the Poke Radar', '1/99 at 40 chain', ARRAY['BDSP', 'XY']),
    ('SOS Chaining', 'Chain wild Pokemon calling for help', '1/315 at 31+ chain', ARRAY['USUM', 'SM']),
    ('Max Lair', 'Dynamax Adventures in Crown Tundra', '1/100 with charm', ARRAY['Sword', 'Shield']),
    ('Outbreak', 'Mass Outbreak hunting', '1/158 with charm', ARRAY['PLA', 'SV']),
    ('Random Encounter', 'Full odds random encounter', '1/4096', ARRAY['All']);
```

#### `shiny_hunts`

Tracks ongoing and completed hunts (Phase 2 focus, but create table now).

```sql
CREATE TABLE "public"."shiny_hunts" (
    "id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "user_id" uuid NOT NULL,

    -- Hunt target
    "target_species" text NOT NULL,
    "game" text NOT NULL,
    "hunt_method_id" bigint,

    -- Progress tracking
    "current_encounters" integer DEFAULT 0,
    "status" text DEFAULT 'active',    -- 'active', 'paused', 'success', 'abandoned'
    "started_at" timestamp with time zone DEFAULT now(),
    "completed_at" timestamp with time zone,

    -- Result (if successful)
    "shiny_catch_id" bigint,           -- FK to shiny_catches

    -- Metadata
    "notes" text,
    "is_public" boolean DEFAULT true,  -- Show in "Currently hunting" feed

    "updated_at" timestamp with time zone DEFAULT now(),

    CONSTRAINT "shiny_hunts_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE,
    CONSTRAINT "shiny_hunts_hunt_method_id_fkey"
        FOREIGN KEY ("hunt_method_id") REFERENCES "public"."shiny_hunt_methods"("id") ON DELETE SET NULL,
    CONSTRAINT "shiny_hunts_shiny_catch_id_fkey"
        FOREIGN KEY ("shiny_catch_id") REFERENCES "public"."shiny_catches"("id") ON DELETE SET NULL
);

CREATE INDEX "idx_shiny_hunts_user" ON "public"."shiny_hunts" ("user_id");
CREATE INDEX "idx_shiny_hunts_status" ON "public"."shiny_hunts" ("status");
CREATE INDEX "idx_shiny_hunts_active" ON "public"."shiny_hunts" ("user_id", "status") WHERE "status" = 'active';
```

---

## Phase 1: Web UI Features 🖥️

### Profile Page Integration

#### New Profile Tab: "Shiny Dex"

Located at `/:username/shinies` or as a tab on the profile page.

**Components:**

1. **Dex Grid View**
   - Grid of Pokemon sprites (shiny form)
   - Caught = full color, Not caught = silhouette
   - Click to see details modal
   - Filter by game, method, date range
   - Sort by: date caught, encounter count, species name

2. **Dex List View**
   - Table format with columns:
     - Pokemon | Game | Method | Encounters | Date | Actions
   - Inline editing for quick updates
   - Bulk actions (delete, change visibility)

3. **Stats Dashboard**
   - Total shinies caught
   - Average encounters per shiny
   - Fastest hunt (lowest encounter count)
   - Longest hunt (highest encounter count)
   - Game breakdown (pie chart)
   - Method breakdown (bar chart)

4. **Add Shiny Button**
   - Opens modal with form
   - Fields: species dropdown, game, method, encounters, date, photo/video
   - Optional: import from video URL (Phase 2 feature)

### Social Feed Integration

#### Shiny Catch Post Type

When a user shares a shiny catch, create a special post type:

**Post Schema Extension:**

```typescript
interface ShinyPost extends Post {
  content: string; // "Just caught shiny Rayquaza! 🌟"
  shiny_catch_id: bigint; // FK to shiny_catches
  // Rendered with special shiny catch card
}
```

**Rendering:**

- Post shows Pokemon sprite, game badge, encounter count
- Embedded video if available
- "View Full Dex" link to user's shiny collection

**Feed Queries:**

```sql
-- Feed of shiny catches from people I follow
-- NOTE: This assumes posts table uses user_id (not alt_id)
-- If posts table still has alt_id, it needs migration first
SELECT p.*, sc.*, u.username, u.image
FROM posts p
JOIN shiny_catches sc ON sc.post_id = p.id
JOIN users u ON u.id = p.user_id
JOIN follows f ON f.following_user_id = u.id
WHERE f.follower_user_id = :current_user_id
  AND p.is_deleted = false
ORDER BY p.created_at DESC;
```

**Important Note:**
The current `posts` table uses `alt_id` as FK, but for a user-level social system, it should use `user_id`. This will require a migration to update the posts table schema and all related tables (`follows`, `post_likes`) to use `user_id` instead of `alt_id`.

### Manual Entry Form

**Location:** `/:username/shinies/add`

**Form Fields:**

- **Required:**
  - Pokemon species (autocomplete dropdown with sprite preview)
  - Game (dropdown: BDSP, ORAS, SV, etc.)
- **Optional:**
  - Hunt method (dropdown from `shiny_hunt_methods`)
  - Encounter count (number input)
  - Date caught (date picker)
  - Nickname (text input)
  - Photo (file upload or URL)
  - Video (YouTube/TikTok URL embed)
  - Notes (textarea)
  - Visibility (public/private toggle)

- **Actions:**
  - Save (just add to dex)
  - Save & Share (add to dex + create post)
  - Save & Add Another (for bulk entry)

### Bulk Import Feature

**CSV Import:**

- Download template CSV with headers
- User fills in spreadsheet (Excel/Sheets)
- Upload CSV file
- Preview import (validation + corrections)
- Confirm import

**Example CSV:**

```csv
species,game,method,encounters,date_caught,notes
Rayquaza,ORAS,Soft Reset,2043,2024-12-15,"Finally got it!"
Mewtwo,BDSP,Soft Reset,892,2024-11-20,""
Charmander,SV,Masuda Method,234,2025-01-10,"Perfect IVs"
```

---

## Phase 1: API Endpoints 🔌

### Shiny Catches

**GET** `/api/users/:username/shiny-catches`

- Query params: `?game=BDSP&method=soft-reset&public=true`
- Returns: Array of shiny catches
- Auth: Public if `is_public=true`, owner only if private

**GET** `/api/users/:username/shiny-catches/:catchId`

- Returns: Single catch with full details
- Auth: Public if `is_public=true`, owner only if private

**POST** `/api/users/me/shiny-catches`

- Body: Catch details (species, game, method, etc.)
- Returns: Created catch
- Auth: Must be authenticated user

**PATCH** `/api/users/me/shiny-catches/:catchId`

- Body: Updated fields
- Returns: Updated catch
- Auth: Must be catch owner

**DELETE** `/api/users/me/shiny-catches/:catchId`

- Returns: Success
- Auth: Must be catch owner

**POST** `/api/users/me/shiny-catches/:catchId/share`

- Creates a post from the catch
- Returns: Post object
- Auth: Must be catch owner

### Shiny Stats

**GET** `/api/users/:username/shiny-stats`

- Returns: Aggregated stats
  ```json
  {
    "total_catches": 234,
    "average_encounters": 1842,
    "fastest_hunt": { "species": "Mewtwo", "encounters": 12 },
    "longest_hunt": { "species": "Rayquaza", "encounters": 8932 },
    "by_game": { "BDSP": 45, "ORAS": 89, "SV": 100 },
    "by_method": { "Soft Reset": 120, "Masuda": 80, "Radar": 34 }
  }
  ```

### Shiny Hunt Methods

**GET** `/api/shiny-hunt-methods`

- Returns: Array of all hunt methods (public reference data)

### Bulk Import

**POST** `/api/users/me/shiny-catches/import`

- Body: `{ csv: "base64 encoded CSV" }` or multipart file upload
- Returns: `{ imported: 45, errors: [] }`
- Auth: Must be authenticated user

---

## Phase 1: Social Features 🌐

### Feed Integration

**Global Shiny Feed:**

- Route: `/shinies/feed`
- Shows all public shiny catches (recent first)
- Filter by game, species, method

**Following Feed:**

- Route: `/feed` (main feed with shiny posts mixed in)
- Shows shiny catches from people you follow
- Special rendering for shiny catch posts

**Profile Feed:**

- Route: `/:username/shinies`
- Shows only that user's shiny catches
- Owner can see private catches

### Leaderboards

**Route:** `/shinies/leaderboards`

**Leaderboard Types:**

- Most Shinies (total count)
- Fastest Shiny (lowest encounter count, min 3 shinies to qualify)
- Luckiest Hunter (lowest average encounters, min 10 shinies)
- Most Active (shinies caught in last 30 days)
- Game-specific (most BDSP shinies, most SV shinies, etc.)

**Database Query Example:**

```sql
-- Most Shinies Leaderboard
SELECT
    u.id,
    u.username,
    u.name,
    u.image,
    COUNT(sc.id) as total_shinies
FROM users u
JOIN shiny_catches sc ON sc.user_id = u.id
WHERE sc.is_public = true
GROUP BY u.id
ORDER BY total_shinies DESC
LIMIT 50;
```

---

## Phase 1: RLS Policies 🔒

```sql
-- Enable RLS
ALTER TABLE "public"."shiny_catches" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."shiny_hunts" ENABLE ROW LEVEL SECURITY;

-- Shiny catches: Public read for public catches, owner can manage
CREATE POLICY "Public shiny catches are viewable"
    ON "public"."shiny_catches" FOR SELECT
    USING ("is_public" = true);

CREATE POLICY "Users can view own private shiny catches"
    ON "public"."shiny_catches" FOR SELECT
    USING ("user_id" = auth.uid());

CREATE POLICY "Users can create own shiny catches"
    ON "public"."shiny_catches" FOR INSERT
    WITH CHECK ("user_id" = auth.uid());

CREATE POLICY "Users can update own shiny catches"
    ON "public"."shiny_catches" FOR UPDATE
    USING ("user_id" = auth.uid());

CREATE POLICY "Users can delete own shiny catches"
    ON "public"."shiny_catches" FOR DELETE
    USING ("user_id" = auth.uid());

-- Similar policies for shiny_hunts
CREATE POLICY "Public hunts are viewable"
    ON "public"."shiny_hunts" FOR SELECT
    USING ("is_public" = true);

CREATE POLICY "Users can view own hunts"
    ON "public"."shiny_hunts" FOR SELECT
    USING ("user_id" = auth.uid());

CREATE POLICY "Users can manage own hunts"
    ON "public"."shiny_hunts" FOR ALL
    USING ("user_id" = auth.uid());
```

---

## Phase 1: User Flows 🗺️

### Flow 1: Adding First Shiny

1. User navigates to their profile → "Shiny Dex" tab
2. Sees empty state: "Start your shiny collection!"
3. Clicks "Add Shiny" button
4. Modal opens with form
5. Selects species: "Rayquaza"
6. Selects game: "ORAS"
7. Selects method: "Soft Reset"
8. Enters encounters: "2043"
9. Enters date: "Dec 15, 2024"
10. Uploads screenshot
11. Adds note: "Finally got it after 3 weeks!"
12. Clicks "Save & Share"
13. Shiny added to dex + post created in feed
14. Redirected to profile with new shiny visible

### Flow 2: Viewing Someone's Collection

1. User sees shiny catch in feed from @AdrivenPlays
2. Clicks on username
3. Navigates to profile → "Shiny Dex" tab
4. Sees grid of 500+ shinies
5. Filters by game: "BDSP"
6. Sees 45 BDSP shinies
7. Clicks on shiny Dialga
8. Modal shows: photo, date, encounters (1204), notes, video embed
9. Clicks "Watch Video" → opens YouTube clip
10. Likes the catch via post
11. Follows @AdrivenPlays to see more catches

### Flow 3: Bulk Import (Power User)

1. User has spreadsheet with 200 shinies
2. Downloads CSV template from `/shinies/import`
3. Copies data into template (species, game, method, encounters, date)
4. Returns to trainers.gg and uploads CSV
5. Preview screen shows 200 rows:
   - ✅ 195 valid
   - ⚠️ 5 warnings (unknown game name, suggested: "ScarletViolet" → "SV")
6. User fixes warnings inline
7. Clicks "Import 200 Shinies"
8. Progress bar animates
9. Success message: "200 shinies added to your dex!"
10. Redirected to dex with full collection visible

---

## Phase 2: Mobile Companion App (Future) 📱

**Note:** Phase 2 will build on Phase 1's backend.

### Key Features (Phase 2 Only)

- Real-time hunt tracking with manual counter
- 3DS UDP input forwarding (soft reset on button press)
- Live hunt status ("Currently hunting shiny Rayquaza - 1204 encounters")
- Auto-create catch when hunt completes
- Bluetooth controller support
- "Hunt completed!" notification
- Direct post to social feed from app

### Phase 2 Prerequisites

Phase 1 must be complete first because:

- Mobile app writes to `shiny_hunts` and `shiny_catches` tables
- Mobile app creates posts via existing API
- Mobile app displays data from web dex

---

## Implementation Checklist ✅

### Phase 1: Backend (Week 1-2)

- [ ] Create migration for `shiny_catches` table
- [ ] Create migration for `shiny_hunt_methods` table (with seed data)
- [ ] Create migration for `shiny_hunts` table (structure only)
- [ ] Add RLS policies
- [ ] Create API endpoints (CRUD for catches, stats)
- [ ] Create helper functions (get_catch_stats, etc.)
- [ ] Write tests for API endpoints

### Phase 1: Web UI (Week 3-4)

- [ ] Create `/[username]/shinies` page (dex grid view)
- [ ] Create "Add Shiny" modal component
- [ ] Create shiny catch detail modal
- [ ] Create stats dashboard component
- [ ] Integrate shiny posts into social feed
- [ ] Create special post card for shiny catches
- [ ] Create leaderboards page
- [ ] Create CSV import UI

### Phase 1: Polish (Week 5)

- [ ] Add Pokemon sprite assets (shiny forms)
- [ ] Add game badge icons (BDSP, ORAS, SV logos)
- [ ] Add animations (sparkle effect on catch cards)
- [ ] Add empty states ("No shinies yet!")
- [ ] Add loading skeletons
- [ ] Mobile responsive design
- [ ] Accessibility audit
- [ ] Performance optimization (image lazy loading)

### Phase 1: Launch (Week 6)

- [ ] Beta testing with 10-20 shiny hunters
- [ ] Fix bugs from beta
- [ ] Write documentation (how to add shinies, import CSV)
- [ ] Create announcement post
- [ ] Launch to public
- [ ] Monitor usage and gather feedback

---

## Success Metrics (Phase 1) 📊

**Adoption:**

- 100+ users add at least 1 shiny in first month
- 10+ power users import 50+ shinies
- 20+ shiny catch posts per day in feed

**Engagement:**

- Average 5 shinies per active user
- 50+ views per public shiny catch
- 10+ likes per epic catch (rare species, low encounters)

**Social Growth:**

- 30+ new follows from shiny catch discovery
- 200+ total shiny catches cataloged in first month
- 5+ users on "Most Shinies" leaderboard with 20+ catches

---

## Open Questions ❓

1. **Pokemon Data Source:**
   - Where do we get Pokemon species data? (PokeAPI, static JSON, manual seed?)
   - Do we need abilities, forms, regional variants?

2. **Verification System:**
   - How do we prevent fake/impossible shinies? (e.g., shiny-locked legendaries)
   - Community reporting? Automated checks?

3. **Video Import (Phase 1 vs 2):**
   - Should Phase 1 include basic video URL parsing for metadata?
   - Or save all video import features for Phase 2?

4. **Privacy:**
   - Can users hide their entire dex but still share individual catches?
   - Should there be "friends-only" visibility?

5. **Monetization:**
   - Free tier: max 100 shinies?
   - Premium: unlimited shinies + advanced stats + no ads?
   - Or keep shiny dex fully free to grow the community?

---

## Next Steps 🚀

1. **Finalize Phase 1 scope** - Review with stakeholders
2. **Create database migration** - `shiny_catches` + `shiny_hunt_methods`
3. **Build API endpoints** - Start with CRUD operations
4. **Design UI mockups** - Dex grid, add modal, stats dashboard
5. **Implement web UI** - Iterate on feedback
6. **Beta launch** - Invite shiny hunting community

**After Phase 1 is stable:** Begin Phase 2 planning (mobile app).
