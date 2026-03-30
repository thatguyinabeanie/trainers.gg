# Dashboard Redesign — Sidebar Layout + Community Consolidation

**Date:** 2026-03-30
**Status:** Draft — awaiting review

## Summary

Redesign the player dashboard from horizontal tabs to a single left sidebar layout. Consolidate the community organizer dashboard (`/to-dashboard`) into `/dashboard/community/`. The sidebar context-switches between player and community views. The dashboard becomes a personal control center for both players and tournament organizers.

## Design Decisions

### Layout: Single Collapsible Sidebar

One sidebar (~240px expanded, icon-only when collapsed) that swaps its content based on context:

- **Player context** (default): Home, Alts & Teams, Inbox, History, Settings, community list
- **Community context** (when a community is clicked): Community header, Overview, Tournaments, Staff, Settings, Live Now section, recent tournaments

No double sidebar / icon rail. One sidebar, two states.

### Navigation: Back to Site

The sidebar header contains:

- **trainers.gg logo** — links to `/` (main site)
- **"← Back to site" text link** — explicit escape hatch next to the logo
- When in community context, the text link changes to **"← Dashboard"** to return to the player sidebar

### Sidebar: Player Context

Shown when user is at `/dashboard`, `/dashboard/alts`, `/dashboard/inbox`, `/dashboard/history`, or `/dashboard/settings/*`.

```
┌─────────────────────────┐
│ trainers.gg  ← Back to site │
├─────────────────────────┤
│ 🏠  Home                │
│ 👤  Alts & Teams        │
│ 📋  Inbox          [3]  │
│ 🏆  History             │
│ ⚙️  Settings            │
├─────────────────────────┤
│ COMMUNITIES          [+]│
│ [V] VGC Masters     🟢  │
│ [S] Showdown League     │
├─────────────────────────┤
│ [avatar] ash_ketchum    │
│          ⚙ Settings     │
└─────────────────────────┘
```

- Communities section only visible if user owns or is staff in any community
- Green dot on community = that community has a live tournament
- `+` button = Request a Community (currently at `/communities/create`, moved to `/dashboard/community/request`)
- User card at bottom with avatar, username, link to settings

### Sidebar: Community Context

Shown when user navigates to `/dashboard/community/[orgSlug]/*`.

```
┌─────────────────────────┐
│ trainers.gg  ← Dashboard│
├─────────────────────────┤
│ [V] VGC Masters        │
│     Owner               │
├─────────────────────────┤
│ 📊  Overview            │
│ 🏆  Tournaments         │
│ 👥  Staff               │
│ ⚙️  Settings            │
├─────────────────────────┤
│ 🟢 LIVE NOW             │
│ 🟢  Weekly #42     [2]  │
├─────────────────────────┤
│ RECENT                  │
│ ✓  Weekly #41           │
│ ✓  Monthly #6           │
├─────────────────────────┤
│ [avatar] ash_ketchum    │
│          Owner          │
└─────────────────────────┘
```

- "← Dashboard" returns to the player sidebar and navigates to `/dashboard`
- Community header shows icon, name, and user's role (Owner/Admin/Judge)
- "Live Now" section shows active tournaments with judge request badge count
- Recent tournaments section for quick access to recently completed tournaments
- Settings only visible to community owner
- User footer shows role instead of "⚙ Settings"

### Route Structure

```
/dashboard                              → Home (player overview)
/dashboard/alts                         → Alts & Teams management
/dashboard/inbox                        → Inbox (merges notifications + invitations)
/dashboard/history                      → Tournament history + achievements
/dashboard/settings                     → Redirects to /dashboard/settings/profile
/dashboard/settings/profile             → Profile settings
/dashboard/settings/account             → Account settings
/dashboard/settings/display             → Display preferences
/dashboard/settings/notifications       → Notification preferences
/dashboard/community/request            → Request a Community form
/dashboard/community/[orgSlug]          → Community overview
/dashboard/community/[orgSlug]/tournaments              → Tournament list
/dashboard/community/[orgSlug]/tournaments/create       → Create tournament
/dashboard/community/[orgSlug]/tournaments/[slug]/manage          → Manage tournament (3 tabs: Overview, Players, Live)
/dashboard/community/[orgSlug]/tournaments/[slug]/manage/settings → Tournament settings (route-based, not a tab)
/dashboard/community/[orgSlug]/staff                              → Staff management
/dashboard/community/[orgSlug]/settings                 → Community settings
```

### Redirects (Permanent)

| Old Path                                            | New Path                                                   |
| --------------------------------------------------- | ---------------------------------------------------------- |
| `/dashboard/overview`                               | `/dashboard`                                               |
| `/dashboard/notifications`                          | `/dashboard/inbox`                                         |
| `/dashboard/invitations`                            | `/dashboard/inbox`                                         |
| `/to-dashboard`                                     | `/dashboard/community` (or first community if only one)    |
| `/to-dashboard/[orgSlug]`                           | `/dashboard/community/[orgSlug]`                           |
| `/to-dashboard/[orgSlug]/tournaments`               | `/dashboard/community/[orgSlug]/tournaments`               |
| `/to-dashboard/[orgSlug]/tournaments/create`        | `/dashboard/community/[orgSlug]/tournaments/create`        |
| `/to-dashboard/[orgSlug]/tournaments/[slug]/manage` | `/dashboard/community/[orgSlug]/tournaments/[slug]/manage` |
| `/to-dashboard/[orgSlug]/staff`                     | `/dashboard/community/[orgSlug]/staff`                     |
| `/to-dashboard/[orgSlug]/settings`                  | `/dashboard/community/[orgSlug]/settings`                  |

### Tab Mapping

| Current Tab   | New Location                                                                     |
| ------------- | -------------------------------------------------------------------------------- |
| Overview      | `/dashboard` (Home) — the root page                                              |
| Alts          | `/dashboard/alts` — Alts & Teams with richer analytics and team views            |
| Invitations   | Merged into `/dashboard/inbox`                                                   |
| Notifications | Merged into `/dashboard/inbox` — renamed to "Inbox"                              |
| Stats         | Merged into `/dashboard/history` — alongside tournament history and achievements |
| Settings      | `/dashboard/settings` — auto-redirects to `/dashboard/settings/profile`          |

### Home Page Content (`/dashboard`)

Fixed layout, glanceable summaries. Everything gets a spot, but as summaries with links to deeper views:

- **Aggregated stats** — win rate (across all alts), peak rating, champion points
- **Inbox preview** — 2-3 most recent/urgent items (team submissions, invitations, match results)
- **Active tournaments** — tournaments user is registered for, with status tags
- **Alt summary** — compact list of alts with quick stats (record, ELO)
- **Recent teams** — most recently used teams with sprite previews and tournament usage

### Alts & Teams Page (`/dashboard/alts`)

Each alt is a rich expandable card showing:

- Per-alt analytics (record, ELO, win rate, champion points)
- Teams owned by that alt (sprite previews, version count, tournament usage history)
- Team viewing is read-only here — editing navigates to the team builder
- Two paths to the same data: team → tournaments it was used in, OR tournament → team used
- Aggregated cross-alt stats at top of page
- Create new alt button prominently placed

### Inbox Page (`/dashboard/inbox`)

Replaces both Notifications and Invitations tabs:

- Filter tabs: All, Unread, Matches, Tournaments, Invitations, Organizations
- Urgent items (team submissions due, active match requests) surfaced at top with red indicators
- Tournament invitations inline with accept/decline actions
- Match results, round assignments, tournament updates
- Mark as read / mark all as read
- Badge count always visible in sidebar

### History Page (`/dashboard/history`)

Consolidates Stats tab + tournament history:

- Tournament history table (sortable, filterable by alt, format, date)
- Win rate trend chart
- Format performance breakdown
- Most used Pokemon
- Achievements / milestones section
- Alt selector to filter by specific alt or see aggregated

### Settings (`/dashboard/settings`)

Same 4 sub-pages, auto-redirects to profile (no dead end):

- **Profile** — username, bio, birth date, country, sprite picker
- **Account** — email, password, linked accounts (Bluesky, X, Discord, Twitch)
- **Display** — sprite style preference
- **Notifications** — notification preferences by type

### Community Pages (`/dashboard/community/[orgSlug]/*`)

Moved from `/to-dashboard/[orgSlug]/*` with minimal changes to page components:

- **Overview** — stats grid, tournament status breakdown, recent tournaments, quick actions
- **Tournaments** — list with status filtering, create tournament wizard, manage tournament
- **Staff** — drag-drop role assignment, invite, remove
- **Settings** — community name, description, logo, social links (owner only)
- Access control: owner + staff, same checks as current `hasCommunityAccess()`

### Tournament Management Page Redesign

The tournament management page (`/dashboard/community/[orgSlug]/tournaments/[slug]/manage`) is consolidated from 6 tabs to 3 tabs + 2 header actions. All existing functionality is preserved.

#### Tab Structure: 3 Tabs

**Tab 1: Overview** — The command center

- Round state machine (idle → generating → preview → starting → active → completing)
- Round control buttons (Start Round, Cancel, Confirm & Start, Complete Round)
- Preview table during pairing preview state
- Round progress bar with match completion stats
- Quick stats row (players, rounds completed, dropped, round progress %)
- Format info card (game, type, round time, top cut, schedule)
- Judge queue preview (top N requests with table/players/score — links to Live tab)
- Top 3 standings preview (links to Live tab for full standings)
- Real-time subscriptions: registrations, matches, rounds

**Tab 2: Players** (renamed from "Registrations")

- Stats bar (registered, checked in, not checked in, dropped)
- Filter chips: All, Checked In, Not Checked In, Dropped, Invitations
- Search input (filter by username)
- Player table with columns: #, Player (avatar + name), Team Name, Status, Registered, Actions
- Select all / individual checkboxes for bulk actions
- Bulk actions: "Force Check-in (N)", "Remove (N)"
- Per-row actions: Force Check-in, Drop Player (with category + notes dialog)
- Invitations view (when "Invitations" filter active): capacity bar, invite form, sent invitations table
- Real-time subscriptions: registrations, invitations
- Realtime status badge

**Tab 3: Live** — The live operations view

- Phase selector dropdown (for multi-phase tournaments)
- Round selector dropdown (switch between rounds, view historical)
- Real-time connection status badge (🟢 Live / 🟡 Reconnecting / 🔴 Error)
- "Needs Attention" section (red): matches with `staff_requested = true`, "Respond →" links
- "Active" section: ongoing matches with table numbers and scores
- "Completed" section: collapsed by default, expandable
- Match table columns: Table, Player 1, Player 2, Status (Ready/Score/Judge Call/Waiting), Actions
- Match status display with all states (BYE, completed, judge call, active, pending variants)
- Click row → navigate to match detail page
- Full standings table below matches (rank, player, record, match points, game win %, opp win %)
- Top 3 highlight cards (gold/silver/bronze styling)
- Dropped players section (at bottom, reduced opacity)
- Real-time subscriptions: rounds, matches (only on active round)

#### Header Actions (not tabs)

**⚙ Settings** — Opens as a route-based page at `.../manage/settings`

- Edit/Cancel/Save buttons
- Lock warnings for active tournaments
- Basic Information (name, description)
- Game Settings (game, regulation, platform, battle format)
- Schedule (start/end date pickers)
- Registration (type, player cap, check-in required, late registration + close-after-round)
- Tournament Structure (preset selector, phases editor with best-of/rounds/timer per phase)
- Danger Zone: Delete Tournament (draft only, with confirmation dialog)
- Permission rules: full edit for draft/upcoming, partial for active, none for completed

**📋 Audit Log** — Opens as a slide-out Sheet

- Category filter (All Events, Match, Judge, Tournament, Team, Registration)
- Refresh button
- Chronological event feed with category icons, action badges, metadata tags, timestamps
- Event categories: match events (Swords), disputes (ShieldAlert), judge actions (Gavel), tournament events (Trophy), team/registration (Lock/UserMinus)

#### Feature Mapping (6 tabs → 3 tabs + header)

| Old Tab                  | New Location                                   | What Moved                                                                                     |
| ------------------------ | ---------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Overview                 | **Overview tab**                               | Round state machine, stats, format info, schedule. Added: judge queue preview, top 3 standings |
| Registrations            | **Players tab**                                | All registration functionality. Sub-tabs → filter chips. Renamed for clarity                   |
| Pairings (Admin + Judge) | **Live tab**                                   | Match lists, judge queue with Respond buttons, match status display. Judge queue at top        |
| Standings                | **Live tab** (bottom) + **Overview** (preview) | Full table in Live, top 3 preview on Overview                                                  |
| Audit Log                | **📋 header action** → Sheet                   | Same feed, in a slide-out sheet                                                                |
| Settings                 | **⚙ header action** → Route page               | Same form, at `.../manage/settings` instead of a tab                                           |

### Community Request (`/dashboard/community/request`)

Moved from `/communities/create`:

- Same form: name, description, Discord invite, social links
- Same validation and cooldown logic
- `/communities` page becomes purely a listing/discovery page (the "Request" button links to `/dashboard/community/request`)

### Mobile Strategy

The existing shadcn `Sidebar` component handles mobile via Sheet (slides in from left). `SidebarTrigger` in the content header acts as the hamburger menu. One navigation pattern across all screen sizes.

### Component Architecture

```
DashboardLayout (Server Component)
├── Fetches: user, communities, unread inbox count
└── SidebarProvider
    ├── DashboardSidebar (Client Component)
    │   ├── Header: logo + "← Back to site" / "← Dashboard"
    │   ├── Body: context-dependent nav items
    │   │   ├── Player context: Home, Alts, Inbox, History, Settings, Communities list
    │   │   └── Community context: Community header, Overview, Tournaments, Staff, Settings, Live Now, Recent
    │   └── Footer: user card
    └── SidebarInset
        ├── Thin header: SidebarTrigger + breadcrumbs
        └── {children}
```

The sidebar determines its context from `usePathname()`:

- Starts with `/dashboard/community/` → community context (extract orgSlug from path)
- Everything else → player context

### Files Affected

**New files:**

- `apps/web/src/components/dashboard/dashboard-sidebar.tsx` — the sidebar component
- `apps/web/src/app/dashboard/inbox/` — merged notifications + invitations page
- `apps/web/src/app/dashboard/history/` — merged stats + tournament history page
- `apps/web/src/app/dashboard/community/` — relocated TO-dashboard content
- `apps/web/src/app/dashboard/community/request/` — community request form (moved from `/communities/create`)

**Rewritten:**

- `apps/web/src/app/dashboard/layout.tsx` — sidebar shell replaces PageContainer + DashboardNav

**Deleted after migration:**

- `apps/web/src/app/dashboard/dashboard-nav.tsx` — replaced by sidebar
- `apps/web/src/app/dashboard/overview/` — content moves to `/dashboard/page.tsx`
- `apps/web/src/app/dashboard/notifications/` — merged into inbox
- `apps/web/src/app/dashboard/invitations/` — merged into inbox
- `apps/web/src/app/(app)/to-dashboard/` — entire directory after consolidation

**Modified:**

- `apps/web/next.config.ts` — redirect rules
- `apps/web/src/lib/proxy-routes.ts` — update protected routes
- `apps/web/src/components/topnav-auth-section.tsx` — update dashboard link
- ~18 files referencing `/to-dashboard` — path updates
- `apps/web/src/app/(app)/communities/page.tsx` — "Request" button links to `/dashboard/community/request`

### What This Spec Does Not Cover

- Detailed visual design of individual page content (stats cards, inbox items, etc.) — this spec covers the sidebar shell and route structure
- Team builder integration — teams are view-only in the dashboard, editing is deferred to when the team builder is built
- Analytics charts and data — the existing mock data components (win-rate-trend, format-performance, most-used-pokemon) carry over as-is
- Mobile-specific community management UX — the Sheet drawer pattern works, but may need refinement later
