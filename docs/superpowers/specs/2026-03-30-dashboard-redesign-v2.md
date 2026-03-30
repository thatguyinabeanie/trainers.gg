# Dashboard Redesign v2 — Design Decisions

**Date:** 2026-03-30
**Status:** In progress — brainstorming

This document captures all design decisions made during the dashboard redesign brainstorming session. Updated as decisions are finalized.

---

## Core Philosophy

The dashboard is the player's **personal control center** — a launchpad + identity hub + mission control combined. It does everything, but as summaries with links to deeper views. Fixed layout with context provided by the alt switcher.

**Not an esports site.** Clean, playful, community-driven. Data-rich where it matters, warm and friendly everywhere else. See `/product-vision` and `/competitive-landscape` skills for full context.

**Design reference:** shadcn dashboard-01 block. Match its spacing, typography, alignment, and overall feel. Always view https://ui.shadcn.com/blocks before starting design work.

---

## Sidebar Structure

### Navigation Items

```
[Alt Switcher]         ⇅     ← navigates between /dashboard/alts and /dashboard/alts/[username]
🏠  Home                     → /dashboard
👤  Alts                     → /dashboard/alts
🏆  Tournaments              → /dashboard/tournaments
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
- **Messages is a future sidebar item** — separate from Inbox (notifications ≠ messages)
- **Notifications** — bell icon in the PageHeader bar (right side). Dropdown/popover for quick view. "View all" links to /dashboard/inbox.
- **Sidebar collapses to icons** — `collapsible="icon"` with `variant="inset"`
- **Sidebar width** — `calc(var(--spacing) * 56)` (~224px)
- **No SidebarRail** — removed, resize cursor was misleading
- **trainers.gg logo** — the alt switcher replaces the logo in the sidebar header. Logo is just "t" in a teal rounded square.

### Alt Switcher (replaces logo header)

- Simple: avatar + name + subtitle ("Main alt" / "All alts") + chevron
- Dropdown shows: "All Alts" option, list of alts (name + Main badge only), "+ Create new alt", "⚙ Manage alts"
- **No stats in the switcher** — stats live on the pages. Keep it simple.
- Selecting an alt navigates to `/dashboard/alts/[username]`
- Selecting "All Alts" navigates to `/dashboard/alts`
- State derived from URL path, not client state
- Uses the shadcn Team Switcher pattern
- **Popover menu** (not inline dropdown) — floats over the sidebar at 260px width
- "Switch alt" label header at top of popover
- Sidebar dims behind the popover
- Inset separator lines between sections
- **Mockup:** `.superpowers/brainstorm/28734-1774902746/content/10-alt-switcher-v2.html`

### NavUser Footer

- Round avatar (`rounded-full`)
- Username + role ("Player" / "Owner")
- 3-dot menu (`MoreVertical`) → dropdown with user info header, Settings, Account, Sign out
- Matches shadcn dashboard-01 NavUser pattern

### Notifications Bell

- Bell icon in PageHeader bar (right side, next to page title) — Option A chosen
- Badge count for unread notifications
- Click opens dropdown/popover with recent notifications (last 4-5 items)
- "View all in Inbox →" link at bottom of dropdown
- Dashboard has no TopNav, so this is the only place notifications surface in the dashboard

### Community Sidebar Context

- Clicking a community swaps sidebar content to community nav
- "Back to Dashboard" link at top (with ArrowLeft icon)
- Community nav: Overview, Tournaments, Staff, Settings (owner only)
- Community header shows icon, name, role (Owner/Staff)
- Live dot on community icon in player sidebar shows active tournament

---

## Route Structure

```
/dashboard                                → Home (always aggregate)
/dashboard/alts                           → All alts list (aggregate stats, expandable cards)
/dashboard/tournaments                    → All tournaments (upcoming, live, completed)
/dashboard/alts/[username]                → Alt detail (stats, teams, management)
/dashboard/alts/[username]/tournaments    → Tournaments for this alt
/dashboard/messages                       → Chat/DMs (future, will become inbox when messaging ships)
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

- **All path-based** — no query params or headers. Compatible with SSR, PPR, ISR, `generateStaticParams`. Query params and headers interfere with Next.js 16 rendering optimizations.
- **"history" is a reserved username** — prevents route collision with `/dashboard/alts/history`. Add validation to alt creation.
- **Parallel routes** — `/dashboard/alts/history` could use Next.js parallel routes and slots to show history alongside alt content. This pattern should be explored across the site wherever two pieces of content need to coexist.
- **Redirects in next.config.ts** — old paths (`/dashboard/overview`, `/dashboard/notifications`, `/to-dashboard/*`) redirect permanently. No redirect page components.

---

## Page Designs

### Home (`/dashboard`) ✅ Approved

- Always shows aggregate data (not filtered by alt)
- **Compact layout, three sections:**
  1. **Live tournament card** (conditional) — single-line green accent bar with dot, tournament name, round, matchup info, "Go to match →" link. Only shows during active events.
  2. **Stats row** — 4 cards: Win Rate (+trend), Rating (+ peak), Record (across all alts), Tournaments (+ active count)
  3. **Recent results** — compact rows with tournament name (link), Pokemon sprites (18px), place/total, date. "View history →" link to tournaments page.
- **No "needs attention" section** — that lives in the bell popover, no duplication
- **No "What's Next" or CTA sections** — the sidebar handles navigation
- **Mockup:** `.superpowers/brainstorm/28734-1774902746/content/40-home-no-attention.html`

### Alts (`/dashboard/alts`) ✅ Approved

**All Alts view (aggregate) — table layout:**

- Aggregated stats row at top (record, win rate, peak rating, tournament count)
- "+ New Alt" button inline with heading
- **Alt table** with columns: Handle (200px), Record, Win %, Rating, Events, Teams, Public (dot), chevron
- Stats visible on every row without expanding — scannable across all alts
- Public column: green dot = public, gray dot = private
- Main badge (amber) on the main alt's handle
- Empty alts show dashes and muted text
- Click alt row → **expands inline** (does NOT auto-switch the alt switcher)
- Expanded row stats get bolded, win % highlighted in teal
- **Expanded view is a contained card** (white card with border inside tinted background):
  - **Teams sub-table** with columns: Team (name first), Pokemon (Gen 5 sprites from Showdown CDN, 28px, pixelated), Record, Win %, Events, Actions
  - Per-team record and win rate — see which teams perform best
  - Archived teams: reduced opacity + grayscale sprites, only ↩ Restore action
  - **Team actions** (icon buttons 24×24): 🔨 Open in Builder, ↗ Share (coming soon), ⊕ Clone (coming soon)
  - **Footer** with separator: "View as this alt" (primary) + "View history" (secondary) on left, "Delete alt" (red text) on right
- **Mockup:** `.superpowers/brainstorm/28734-1774902746/content/08-alts-table-v6.html`

**Single Alt view (`/dashboard/alts/[username]`):**

- Profile card: large avatar (click to change), name, badges (Main, Public/Private), visibility toggle
- Per-alt stats: record, win rate, rating (current + peak), champion points
- Teams section: list of teams owned by this alt
  - Each team: sprite row, name, version count, tournament usage, last played
  - Actions: Open in Builder (🔨), Share (↗), Archive (📦)
  - Archived teams at reduced opacity
  - Click team row → opens in Team Builder (future)
- "View history" link → `/dashboard/alts/[username]/history`
- Danger zone: delete alt (not for main alt)

**Teams are managed on the Alts page but edited in the Builder:**

- Alts page: archive, share, open in builder — management actions only
- Team Builder (future sidebar item): actual team editing (Pokemon, EVs, moves, items, abilities)
- The team builder will have analytics integrated (like pikalytics/labmaus) — it's a major feature, not just a form
- Team versioning and branching is a core differentiator — fork teams, track iterations, historical performance

### Tournaments (renamed from History) ✅ Approved

**Renamed:** "History" → "Tournaments" in sidebar, page title, and routes. Covers full tournament lifecycle: upcoming, live, late reg, completed.

**Routes:**

- **Aggregate:** `/dashboard/tournaments` — all alts (renamed from `/dashboard/alts/history`)
- **Per-alt:** `/dashboard/alts/[username]/tournaments` — pre-filtered, no Alt column

**Filter chips** — All (count), Live (count), Upcoming (count), Completed (count)

**Status badges** on each row:

- **Live** (green) — tournament in progress, shows current record, no place yet
- **Registered** (blue) — signed up, hasn't started, dashes for team/record/place
- **Late Reg** (amber) — tournament started, user can still join or hasn't checked in
- **Completed** (gray) — finished, full results

**Summary stats row** — played, win rate, best finish, avg place (respond to alt/format filters)

**Filters** — Alt dropdown ("All alts" default, clickable ✕ to clear), Format dropdown ("All formats" default)

**Table columns:** Tournament (name as link to `/tournaments/[slug]` · date inline), Alt (clickable → per-alt history), Format, Team (24px Gen 5 sprites), Record, Place (e.g., "3rd / 24" — placement out of total players)

- No vertical stacking in cells — everything single-line
- Tournament name is a teal link to the tournament page
- Alt names are clickable links to per-alt history
- 1st place highlighted teal + 🏆
- Per-alt view removes Alt column

**Expansion** — opponent schedule only (no duplicated team/detail info):

- Descending order (latest round at top, R1 at bottom)
- Sub-table with `table-layout: fixed` and `<col>` widths for proper proportioning
- Columns left to right: **RND** (36px) | **SCORE** (W 2-0, 60px) | **MATCHUP** (40%) | **OPP TEAM** (auto, sprites fill rest)
- **Seat order matters:** P1 shows "You vs opponent", P2 shows "opponent vs You" — reflects who had player 1 seat
- "You" is bolded, opponent name is a teal clickable link
- Opponent Pokemon sprites at 20px, reduced opacity (0.7)
- W in teal, L in red
- No "View tournament →" link — tournament name on the row is already a link
- Contained in a white card with border inside tinted background

**Empty state** — trophy icon + "No tournament history yet" + "Browse tournaments" CTA

**Implementation notes:**

- Team name in alts page expansion should be a link to builder page (leave code comment for future)
- Seat order (P1/P2) needs to be stored in match data — ensure the tournament system captures this

**Mockup:** `.superpowers/brainstorm/28734-1774902746/content/36-history-seat.html`

### Notifications (popover, no dedicated page) ✅ Approved

**No /dashboard/inbox page for now.** Notifications live entirely in a bell icon popover in the PageHeader. A full inbox page will be built when user-to-user messaging ships.

**Notification types by lifecycle:**

- **Persistent action** — stays until completed or irrelevant (e.g., "Submit team sheet", "Accept tournament invite", "Accept staff invite")
- **Persistent shortcut** — stays until no longer useful (e.g., "Round 3 started — go to your match" stays until match resolves)
- **Informational** — read and done (e.g., "Tournament completed — 5th place", "Community approved", "Added as Judge")

**Popover design (380px wide, max 520px tall, scrollable):**

- **Header:** "Notifications" title + "Mark all read" link
- **"Needs attention" section:** persistent items on subtle `bg-muted/50` cards with inline action buttons (Accept/Decline, Submit team, Go to match →). Includes: team sheet deadlines, tournament invites, staff invites, active match shortcuts.
- **"Recent" section:** informational feed below. Blue dot for unread, faded text + icon for read.
- Completed/dismissed persistent items archived (not visible, but retrievable if needed later)
- **No tabs** — just the two sections
- **Badge count on bell icon** — red circle, counts persistent + unread items
- **Type icons:** ⚔️ match, 🏆 tournament, 📋 submission, 📨 invite, ✅ approval, ⚖️ dispute, 👥 staff
- Includes staff invites (Accept/Decline) alongside tournament invites
- **Mockup:** `.superpowers/brainstorm/28734-1774902746/content/16-notifications-popover.html`

### Messages (`/dashboard/messages`) — FUTURE

- Separate sidebar item from Inbox
- DMs between players
- Community Leader → player communications
- Coach → student messaging (future coaching marketplace)
- Team share conversations
- Potentially AT Protocol native (Bluesky DMs via self-hosted PDS)
- Two-panel layout (conversation list + message thread)
- Linear ticket to be created

### Settings (`/dashboard/settings`)

- Auto-redirects to `/dashboard/settings/profile`
- 4 sub-tabs: Profile, Account, Display, Notifications
- Same content as current, clean heading pattern

---

## Community Dashboard

### Community Overview (`/dashboard/community/[slug]`) ✅ Approved

**Redesign:**

- Remove Quick Actions section — redundant with sidebar navigation
- Remove Tournament Status breakdown cards — redundant with tournaments page
- Stats row: Tournaments, Players, Staff, Founded
- "Live Now" highlight card (full width, green accent) when active tournament exists — tournament name, round progress, "Manage →" button
- **Two-column layout below stats:** tournaments table (left) + community activity feed (right)
- Tournaments as compact table rows (status badge + name + compact meta)
- "+ Create" button inline with tournaments section heading
- **Community activity feed** — community-scoped (not same as player inbox). Shows: player registrations (batched), round starts, staff joins, tournament completions. Batches similar events ("12 players registered" not 12 separate items).
- Bell icon in PageHeader

### Community Staff (`/dashboard/community/[slug]/staff`) ✅ Approved

**Redesign — Two-column drag-drop layout:**

- **Left column: Unassigned pool** — scrollable list of all unassigned staff with search bar. Source for drag-drop.
- **Right column: Role groups** — Owner (non-draggable, crown badge) + Admins + Head Judges + Judges as compact bordered cards with color dots.
- **Drag left → right** to assign a role. Drag between right groups to reassign. Drag right → left to unassign.
- **Empty role groups** show thin "Drop here" dashed zone (one line, not giant empty areas).
- **Staff rows are compact** — drag handle (⠿) + avatar + name + remove button (✕, appears on hover).
- **Search in unassigned** — useful when many unassigned staff.
- **Remove (✕)** removes from community entirely.
- **"+ Add Staff" button** in section heading.
- **Mobile** stacks vertically (unassigned on top, groups below).

### Community Settings (`/dashboard/community/[slug]/settings`)

**Redesign — rethought from purpose:**

- **Purpose:** Community leader managing their community's public identity
- **Audience:** Community leaders who rarely visit settings — it should be quick and clear
- Profile preview at top (logo + name + URL) — shows what the community looks like publicly
- Tabs: General (active), Permissions (future), Notifications (future) — sets up for growth
- Single column form, max-width 520px
- Fields: Community Name, Description (with character count), Social Links (fixed 100px prefix, + Add link)
- Save button right-aligned, no delete (admin-only action)
- Social link prefixes fixed width for input alignment
- **Mockup:** `.superpowers/brainstorm/39571-1774889724/content/21-settings-fixed.html`

### Community Request (`/dashboard/community/request`)

**Redesign — rethought from purpose:**

- **Purpose:** Player starting their own tournament community — should feel welcoming, not bureaucratic
- **Audience:** Existing TO who runs events elsewhere, wants to expand to trainers.gg
- Centered welcome section (icon + "Start your community" + subtitle) — warm tone
- Guidelines as ✓/✕ checklist, not dense paragraph — scannable
- Form sections: Your community (name + description), Discord (highlighted purple card, required), Other accounts (optional 2-column grid)
- Discord gets its own visual weight — purple accent card, most important field
- Friendlier labels ("What's your community about?" not "Description")
- Social grid: 4 platforms with fixed 84px prefix width for alignment
- Full-width submit + "We typically review within 48 hours" expectation
- Max-width 520px matching settings
- **Mockup:** `.superpowers/brainstorm/39571-1774889724/content/22-request-fixed.html`

### Tournament Management

- 3 tabs: Overview, Players, Live (consolidated from 6)
- Settings as route-based page at `.../manage/settings` (not a tab)
- Audit Log as slide-out Sheet (not a tab)
- All functionality preserved from 6-tab original
- Overview tab: round state machine + judge queue preview + top 3 standings preview
- Players tab: renamed from Registrations, filter chips instead of sub-tabs
- Live tab: combines Pairings + Judge Queue + Standings

---

## Technical Decisions

- **Dashboard lives in `(dashboard)` route group** — no TopNav, no footer, no announcement banner
- **Sidebar uses shadcn primitives** — `SidebarProvider`, `Sidebar`, `SidebarInset`, `SidebarMenuButton` with `render` prop (Base UI's `useRender`, NOT Radix `asChild`)
- **`variant="inset"`** — rounded content area with shadow
- **`collapsible="icon"`** — collapses to icon rail
- **PageHeader component** — each page renders its own header (trigger + separator + title + bell icon)
- **No `SidebarRail`** — removed, resize cursor was misleading
- **Mobile** — sidebar as Sheet (hamburger drawer), same navigation pattern
- **DropdownMenuTrigger** uses Base UI `render` prop, not Radix `asChild`
- **DropdownMenuLabel** requires `Menu.Group` context in Base UI — use plain `div` for user info header in dropdown
- **SidebarMenuButton tooltip** — modified to fix render prop + tooltip conflict. TooltipTrigger wraps as bare `<span>` (NOT `display: contents`, which breaks mouseenter/mouseleave events).

### Implementation Notes (for future subagents)

- **Layouts matter** — pay special attention to `layout.tsx` structure, especially with parallel routes and route groups. The alts section (`/dashboard/alts/`) should explore parallel routes for history alongside alt content.
- **Parallel routes** — Next.js parallel routes allow content from different route segments to appear on the same page. `/dashboard/alts/history` can be both a standalone route AND a parallel slot visible on `/dashboard/alts`. Explore this pattern across the site.
- **Route groups** — dashboard already uses `(dashboard)` route group. Consider nested route groups for community pages if they need shared layout concerns.
- **Path-based everything** — no query params, no headers for routing state. All path-based for SSR/PPR/ISR compatibility. Query params and headers force dynamic rendering in Next.js 16.
- **Reserved usernames** — "history" is reserved under `/dashboard/alts/`. Future reserved words may include "new", "create", "settings" if those become route segments. Add validation to alt creation.
- **Bell icon notifications** — PageHeader component needs a right-side slot/children for the bell icon. Each page renders PageHeader, bell should appear consistently.
- **Alt switcher state from URL** — the sidebar reads the current URL to determine which alt is selected. No client-side state management needed. When at `/dashboard/alts/ash_ketchum`, the switcher shows ash_ketchum. When at `/dashboard/alts`, it shows "All Alts".
- **Team builder** — future sidebar item. Will have analytics integrated (pikalytics/labmaus style). Teams belong to alts in the database. The team builder is a separate, complex feature — not part of the alts page.
- **Old /to-dashboard directory** — client components still live there. New community pages import from there. A future cleanup task should move components to a shared location. The old route pages are dead (next.config.ts redirects catch them).

---

## Process Notes

### Design Checklist (ask before every design)

1. **What is the purpose of this page?** — Why does it exist? What problem does it solve?
2. **Who is the audience?** — Who uses this and when? What are they trying to accomplish?
3. **Is the information salient?** — Is the most important content immediately visible and clear?
4. **Is it intuitive?** — Can someone understand what to do without instructions?
5. **How should information be presented?** — What format best serves the content (table, cards, form, feed)?
6. **How to organize elements on the screen?** — Layout, alignment, centering, hierarchy, grouping.

Never just copy existing UI and make it "cleaner." Always rethink from purpose.

### Design Decision Patterns (from this session)

1. Match shadcn dashboard-01 — clean, minimal, consistent spacing
2. No redundancy — if it's in the sidebar, don't repeat on the page
3. Compact over spacious — tight rows over large cards, two-column over single column
4. Cards for grouping — bordered cards to group related fields/content
5. Constrain form width — forms don't stretch full width
6. Action buttons inline with headings — not in separate sections
7. Type-specific icons — visual indicators for different content types
8. Subtle color dots over full backgrounds — role colors, status
9. "+ N more" truncation — don't show everything, let users expand
10. Two-column layouts — use horizontal space not just vertical
11. Collapsible/expandable patterns — show latest, hide older
12. No gradient backgrounds — flat, clean
13. Platform prefixes on form inputs — Discord, X, Bluesky icons with fixed widths for alignment
14. Warm, community-first, NOT esports — clean, playful
15. Path-based routing — no query params
16. Simple switchers — no stats in compact controls

### Workflow Rules

- **Always use visual companion** for design decisions — never describe designs in text only
- **Always use Playwright MCP** to view current pages before designing replacements
- **Always view shadcn blocks** (https://ui.shadcn.com/blocks) before starting design work
- **Don't ask the user design/layout questions** — ask about functionality, audience, behavior. Design decisions are delegated to the agent.
- **Use /brainstorming skill** for all creative work
- **Reference /product-vision and /competitive-landscape and /design-system skills** for context
- **Always update docs/** with every important decision
- **Link to .superpowers/ mockup files** instead of taking redundant screenshots
- **Use Playwright MCP** to view rendered pages as a supplement to reading code
- **At checkpoints, review docs/** to make sure everything is captured

---

## Outstanding Design Work

### Designs approved — ready to implement

- [x] Community settings — approved (General tab, 520px form, no delete) — **implemented**
- [x] Community request — approved (warm welcome, Discord highlight, 2-col socials) — **implemented**
- [x] Community overview — approved (activity feed, live now card, two-column)
- [x] Community staff — approved (two-column drag-drop)

### Designs still needed

- [x] Alt switcher — approved (popover menu, 260px, "Switch alt" header, no truncation)
- [x] Alts page — approved (table layout, expandable team sub-table with sprites + records)
- [x] Notifications popover — approved (no inbox page, bell popover with pinned + recent sections)
- [x] History page — approved (table with sprites, expandable opponent schedule, filters)
- [x] Home page — approved (live tournament card + stats + recent results, compact)
- [x] History → Tournaments rename — approved (full lifecycle with status badges + filter chips)
- [x] Notifications bell icon — approved (merged with inbox into popover design)

### Bugs (fixed)

- [x] Tooltip positioning on collapsed sidebar icons — fixed by removing `display: contents` from trigger wrapper
- [x] Build error: community request page import — resolved by page rewrite

### Sidebar changes (implement with designs)

- [ ] Rename "Alts & Teams" → "Alts" in sidebar
- [ ] Rename "History" → "Tournaments" in sidebar
- [ ] Remove "Inbox" from sidebar (notifications in bell popover only)
- [ ] Add alt switcher to sidebar header (replaces logo)

### Future (Linear tickets, not this branch)

- [ ] Messages page design (`/dashboard/messages`)
- [ ] Team Builder sidebar item

## Mockup Index

All mockups live in `.superpowers/brainstorm/` directories. The latest approved version for each design:

| Design                        | Mockup File                                                                      | Session   |
| ----------------------------- | -------------------------------------------------------------------------------- | --------- |
| Community settings            | `.superpowers/brainstorm/39571-1774889724/content/21-settings-fixed.html`        | Session 1 |
| Community request             | `.superpowers/brainstorm/39571-1774889724/content/22-request-fixed.html`         | Session 1 |
| Community overview            | `.superpowers/brainstorm/39571-1774889724/content/14-community-overview-v2.html` | Session 1 |
| Community staff               | `.superpowers/brainstorm/39571-1774889724/content/16-staff-two-column.html`      | Session 1 |
| Alts page (table + expansion) | `.superpowers/brainstorm/28734-1774902746/content/08-alts-table-v6.html`         | Session 2 |
| Alt switcher (popover)        | `.superpowers/brainstorm/28734-1774902746/content/10-alt-switcher-v2.html`       | Session 2 |
| Notifications popover         | `.superpowers/brainstorm/28734-1774902746/content/16-notifications-popover.html` | Session 2 |
| Tournaments (with seat order) | `.superpowers/brainstorm/28734-1774902746/content/41-tournaments-page.html`      | Session 2 |
| Home page (compact)           | `.superpowers/brainstorm/28734-1774902746/content/40-home-no-attention.html`     | Session 2 |

Earlier iterations are preserved in the same directories for reference.

## Linear Tickets to Create

- [ ] Messaging system (DMs, team shares, coach conversations) — `/dashboard/messages`
- [ ] Analytics-powered team builder — future sidebar item
- [ ] AT Protocol social integration for messages
- [ ] Data aggregation from external sources (RK9, Limitless)
- [ ] Team versioning and branching system
- [ ] Collaborative team building (websockets)
