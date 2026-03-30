# Dashboard Redesign v2 — Design Decisions

**Date:** 2026-03-30
**Status:** In progress — brainstorming

This document captures all design decisions made during the dashboard redesign brainstorming session. Updated as decisions are finalized.

---

## Sidebar Structure

### Navigation Items

```
[Alt Switcher]         ⇅     ← navigates between /dashboard/alts and /dashboard/alts/[username]
🏠  Home                     → /dashboard
👤  Alts                     → /dashboard/alts
📋  Inbox                    → /dashboard/inbox
💬  Messages                 → /dashboard/messages (future)
─── Communities ──── [+]
    [P] Pallet Town   🟢    → /dashboard/community/pallet-town
⚙  Settings                 → /dashboard/settings (pinned to bottom)
[avatar] user footer   ⋮    ← dropdown: Settings, Account, Sign out
```

### Key Decisions

- **No horizontal separator lines** — use spacing and group labels for visual separation (matches shadcn dashboard-01)
- **Settings pinned at bottom** — above user footer, below communities
- **History removed as top-level item** — lives under /dashboard/alts/history
- **Messages is a future sidebar item** — separate from Inbox
- **Notifications** — bell icon in the PageHeader bar (not a sidebar item, not a page). Dropdown/popover for quick view.
- **Sidebar collapses to icons** — `collapsible="icon"` with `variant="inset"`
- **Sidebar width** — `calc(var(--spacing) * 56)` (~224px)

### Alt Switcher

- Replaces the logo header in the sidebar
- Simple: avatar + name + subtitle ("Main alt" / "All alts") + chevron
- Dropdown shows: "All Alts" option, list of alts (name + Main badge only), "+ Create new alt", "⚙ Manage alts"
- **No stats in the switcher** — stats live on the pages
- Selecting an alt navigates to `/dashboard/alts/[username]`
- Selecting "All Alts" navigates to `/dashboard/alts`
- State derived from URL path, not client state

### NavUser Footer

- Round avatar (`rounded-full`)
- Username + role ("Player" / "Owner")
- 3-dot menu (`MoreVertical`) → dropdown with Settings, Account, Sign out
- Matches shadcn dashboard-01 NavUser pattern

### Notifications in Dashboard

- Bell icon in PageHeader bar (right side, next to page title)
- Badge count for unread notifications
- Click opens dropdown/popover with recent notifications
- "View all" link for full notification history
- Dashboard has no TopNav, so this is the only place notifications surface

---

## Route Structure

```
/dashboard                                → Home (always aggregate)
/dashboard/alts                           → All alts list (aggregate stats, expandable cards)
/dashboard/alts/history                   → Aggregate tournament history across all alts
/dashboard/alts/[username]                → Alt detail (stats, teams, management)
/dashboard/alts/[username]/history        → Tournament history for this alt
/dashboard/inbox                          → Actionable items + tournament activity feed
/dashboard/messages                       → Chat/DMs (future)
/dashboard/settings                       → Redirects to /dashboard/settings/profile
/dashboard/settings/profile               → Profile settings
/dashboard/settings/account               → Account settings
/dashboard/settings/display               → Display preferences
/dashboard/settings/notifications         → Notification preferences
/dashboard/community/request              → Request a Community form
/dashboard/community/[slug]               → Community overview
/dashboard/community/[slug]/tournaments   → Tournament list
/dashboard/community/[slug]/tournaments/create → Create tournament
/dashboard/community/[slug]/tournaments/[tournamentSlug]/manage → Manage tournament (3 tabs)
/dashboard/community/[slug]/tournaments/[tournamentSlug]/manage/settings → Tournament settings
/dashboard/community/[slug]/staff         → Staff management
/dashboard/community/[slug]/settings      → Community settings
```

### Key Routing Decisions

- **All path-based** — no query params or headers. Compatible with SSR, PPR, ISR, `generateStaticParams`.
- **"history" is a reserved username** — prevents route collision with `/dashboard/alts/history`
- **Parallel routes** — `/dashboard/alts/history` could use Next.js parallel routes to show history alongside alt content. Pattern to explore across the site.
- **Redirects in next.config.ts** — old paths (`/dashboard/overview`, `/dashboard/notifications`, `/to-dashboard/*`) redirect permanently.

---

## Page Designs

### Home (`/dashboard`)

- Always shows aggregate data (not filtered by alt)
- Stats cards: win rate, rating, tournaments, champion points
- Inbox preview (2-3 actionable items)
- Active tournaments
- What's Next section
- Clean heading: "Welcome back, [name]"

### Alts (`/dashboard/alts`)

**All Alts view (aggregate):**

- Aggregated stats at top (record, win rate, peak rating, tournament count)
- "+ New Alt" button
- Alt list as expandable rows
- Click alt row → expands inline to show:
  - Per-alt stats preview
  - Teams preview (first 2-3 teams with sprites)
  - "View as this alt" button → changes switcher + navigates to `/dashboard/alts/[username]`
  - "View history" link → `/dashboard/alts/[username]/history`
- Clicking does NOT auto-switch — just expands. Explicit "View as" button to switch.

**Single Alt view (`/dashboard/alts/[username]`):**

- Profile card: large avatar (click to change), name, badges (Main, Public/Private), visibility toggle
- Per-alt stats: record, win rate, rating (current + peak), champion points
- Teams section: list of teams owned by this alt
  - Each team: sprite row, name, version count, tournament usage, last played
  - Actions: Open in Builder (🔨), Share (↗), Archive (📦)
  - Archived teams at reduced opacity
  - Click team row → opens in Team Builder
- "View history" link → `/dashboard/alts/[username]/history`
- Danger zone: delete alt (not for main alt)

**Alt management happens at `/dashboard/alts`:**

- Create new alts
- Delete alts
- Change avatar/sprite
- Toggle public/private visibility
- Set main alt
- View and manage teams per alt

**Teams are managed on the Alts page but edited in the Builder:**

- Alts page: archive, share, open in builder
- Team Builder (future sidebar item): actual team editing (Pokemon, EVs, moves, items)

### History

- **Aggregate:** `/dashboard/alts/history` — tournament history across all alts
- **Per-alt:** `/dashboard/alts/[username]/history` — filtered to specific alt
- Could use Next.js parallel routes to show history alongside alt content
- Sortable table with alt column (aggregate), format filter, date range

### Inbox (`/dashboard/inbox`)

- **Notifications and actionable items only** — no messages
- Separate from the bell icon notifications (bell = quick alerts, inbox = full feed with actions)
- **Tabs:** All, Unread, Actions, Matches, Tournaments
- **Tournament notifications grouped** by tournament:
  - Group header: tournament name + update count
  - Latest notification always shown expanded
  - Older notifications collapsed into "N earlier" — click to reveal
- **Actionable items never grouped** — always standalone with inline buttons + "Action needed" badge
- **Actionable items float to top** regardless of timestamp
- **One-off notifications** — standalone items (org approved, judge resolved)
- **Unread indicators** — blue dot on left
- **Type-specific icons** — match (⚔), tournament (🏆), invite (📨), submission (📋), system (🔔)

### Messages (`/dashboard/messages`) — FUTURE

- Separate sidebar item from Inbox
- DMs between players
- TO → player communications
- Coach → student messaging
- Team share conversations
- Potentially AT Protocol native (Bluesky DMs)
- Two-panel layout (conversation list + message thread)
- Linear ticket to be created

### Settings (`/dashboard/settings`)

- Auto-redirects to `/dashboard/settings/profile`
- 4 sub-tabs: Profile, Account, Display, Notifications
- Same content as current, clean heading pattern

---

## Community Dashboard

### Sidebar Context Switching

- Clicking a community in the sidebar swaps sidebar content to community nav
- "Back to Dashboard" link at top of community sidebar
- Community nav: Overview, Tournaments, Staff, Settings (owner only)
- Community header shows icon, name, role (Owner/Staff)

### Community Overview (`/dashboard/community/[slug]`)

- Needs full redesign (currently moved from /to-dashboard as-is)
- Stats grid, tournament status breakdown, recent tournaments, quick actions
- TODO: Design in visual companion

### Community Staff (`/dashboard/community/[slug]/staff`)

- Needs ground-up redesign
- Drag-drop role assignment too large for sidebar layout
- TODO: Design in visual companion

### Community Settings (`/dashboard/community/[slug]/settings`)

- Needs redesign
- Form constrained to max-w-2xl
- TODO: Design in visual companion

### Community Request (`/dashboard/community/request`)

- Needs design work
- TODO: Design in visual companion

### Tournament Management

- 3 tabs: Overview, Players, Live
- Settings as route-based page (not a tab)
- Audit Log as slide-out Sheet
- All functionality preserved from 6-tab original

---

## Technical Decisions

- **Dashboard lives in `(dashboard)` route group** — no TopNav, no footer
- **Sidebar uses shadcn primitives** — `SidebarProvider`, `Sidebar`, `SidebarInset`, `SidebarMenuButton` with `render` prop (Base UI, not Radix)
- **`variant="inset"`** — rounded content area with shadow
- **`collapsible="icon"`** — collapses to icon rail
- **PageHeader component** — each page renders its own header (trigger + separator + title)
- **No `SidebarRail`** — removed, resize cursor was misleading
- **Mobile** — sidebar as Sheet (hamburger drawer)

### Implementation Notes (for future subagents)

- **Layouts matter** — pay special attention to how `layout.tsx` files are structured, especially with parallel routes and route groups. The alts section (`/dashboard/alts/`) may use parallel routes for history alongside alt content.
- **Parallel routes** — explore using Next.js parallel routes where content from different route segments needs to appear on the same page. Keep this pattern in mind across the site, not just for alts/history.
- **Route groups** — dashboard already uses `(dashboard)` route group. Consider whether community pages benefit from a nested route group for shared layout concerns.
- **Path-based everything** — no query params, no headers for state. All routing is path-based for SSR/PPR/ISR compatibility.
- **Reserved usernames** — "history" is reserved under `/dashboard/alts/`. Future reserved words may include "new", "create", "settings" if those become route segments.
- **Bell icon notifications** — the PageHeader component needs to accept a right-side slot/children for the bell icon. Each page renders PageHeader, and the bell should appear consistently.

---

## Outstanding Design Work

- [ ] Community overview full redesign
- [ ] Community staff ground-up redesign
- [ ] Community settings redesign
- [ ] Community request page design
- [ ] Notifications bell icon in PageHeader
- [ ] Tooltip positioning fix (collapsed sidebar)
- [ ] Collapsed sidebar icon alignment verification
- [ ] Messages page design (future — Linear ticket)
- [ ] Team Builder sidebar item (future)
