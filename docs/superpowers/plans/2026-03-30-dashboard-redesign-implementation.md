# Dashboard Redesign v2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement all approved dashboard page designs from the brainstorming phase.

**Architecture:** Each task rewrites or creates a dashboard page component to match the approved mockup. Pages follow the existing pattern: Server Component for auth/data, Client Component for interactivity. All designs are documented in `docs/superpowers/specs/2026-03-30-dashboard-redesign-v2.md` with mockup links.

**Tech Stack:** Next.js 16 (App Router), React 19, shadcn/ui + Base UI, TanStack Query, Supabase, `@pkmn/img` for Pokemon sprites, `@trainers/supabase` for queries.

**Design Spec:** `docs/superpowers/specs/2026-03-30-dashboard-redesign-v2.md`

---

## Phase 1: Sidebar Updates (foundation for everything else)

### Task 1: Update sidebar nav items

**Files:**

- Modify: `apps/web/src/components/dashboard/dashboard-sidebar.tsx`

**What to do:**

- [ ] Rename "Alts & Teams" to "Alts" (label and tooltip)
- [ ] Rename "History" to "Tournaments" and update href to `/dashboard/tournaments`
- [ ] Remove "Inbox" nav item entirely (notifications live in bell popover only)
- [ ] Update icon for Tournaments (use `Trophy` from lucide)
- [ ] Verify collapsed sidebar tooltips still work after changes
- [ ] Run `pnpm typecheck` and `pnpm lint`
- [ ] Commit: `refactor: update sidebar nav items — rename alts, history→tournaments, remove inbox`

### Task 2: Add alt switcher to sidebar header

**Files:**

- Modify: `apps/web/src/components/dashboard/dashboard-sidebar.tsx`
- Modify: `apps/web/src/app/(dashboard)/dashboard/layout.tsx` (pass alts data)
- Reference: `packages/supabase/src/queries/users.ts` (getCurrentUserAlts)

**What to do:**

- [ ] In layout.tsx, fetch user's alts via `getCurrentUserAlts()` and pass to sidebar
- [ ] Replace the logo/header section in dashboard-sidebar with an alt switcher component
- [ ] Build the alt switcher using shadcn DropdownMenu primitives:
  - Trigger: avatar + alt name + "Main alt" subtitle + ChevronsUpDown icon
  - Popover (260px): "Switch alt" header, "All Alts" option, alt list with Main badge + checkmark on current, separator, "+ Create new alt", "⚙ Manage alts"
  - State derived from URL path (parse `/dashboard/alts/[username]` from pathname)
  - Selecting an alt navigates to `/dashboard/alts/[username]`
  - "All Alts" navigates to `/dashboard/alts`
  - "Manage alts" navigates to `/dashboard/alts`
- [ ] Collapsed sidebar: show just the avatar circle with tooltip "Switch alt"
- [ ] Reference mockup: `.superpowers/brainstorm/28734-1774902746/content/10-alt-switcher-v2.html`
- [ ] Run `pnpm typecheck` and `pnpm lint`
- [ ] Commit: `feat: add alt switcher to sidebar header`

### Task 3: Add notifications bell to PageHeader

**Files:**

- Modify: `apps/web/src/components/dashboard/page-header.tsx`
- Create: `apps/web/src/components/dashboard/notifications-popover.tsx`
- Modify: `apps/web/src/app/(dashboard)/dashboard/layout.tsx` (pass notification data)

**What to do:**

- [ ] Add bell icon with badge count to the right side of PageHeader
- [ ] Build notifications popover component (380px wide, max 520px tall):
  - Header: "Notifications" + "Mark all read" link
  - "Needs attention" section: persistent items on subtle backgrounds with action buttons
  - "Recent" section: informational feed with blue dot for unread, faded for read
  - Type icons: ⚔️ match, 🏆 tournament, 📋 submission, 📨 invite, ✅ approval, ⚖️ dispute, 👥 staff
- [ ] Use shadcn Popover component for the dropdown
- [ ] Wire up to existing notification queries from layout
- [ ] Reference mockup: `.superpowers/brainstorm/28734-1774902746/content/16-notifications-popover.html`
- [ ] Run `pnpm typecheck` and `pnpm lint`
- [ ] Commit: `feat: add notifications bell popover to PageHeader`

---

## Phase 2: Player Pages

### Task 4: Redesign home page

**Files:**

- Modify: `apps/web/src/app/(dashboard)/dashboard/page.tsx`
- Modify or replace: related client components in `apps/web/src/app/(dashboard)/dashboard/`

**What to do:**

- [ ] Redesign to match approved mockup: welcome heading, conditional live tournament card (green accent), 4 stat cards (win rate, rating, record, tournaments), recent results with Pokemon sprites
- [ ] Live tournament card: only shows when user has an active match, shows round + matchup + "Go to match →" link
- [ ] Recent results: compact rows with tournament name (link), 18px Gen 5 sprites from `@pkmn/img`, place/total, date
- [ ] "View history →" link goes to `/dashboard/tournaments`
- [ ] No "needs attention" section (lives in bell popover)
- [ ] No "What's Next" or CTA sections
- [ ] Reference mockup: `.superpowers/brainstorm/28734-1774902746/content/40-home-no-attention.html`
- [ ] Run `pnpm typecheck` and `pnpm lint`
- [ ] Commit: `feat: redesign dashboard home page`

### Task 5: Redesign alts page

**Files:**

- Modify: `apps/web/src/app/(dashboard)/dashboard/alts/page.tsx`

**What to do:**

- [ ] Replace current list/card view with table layout
- [ ] Aggregate stats row at top: record, win rate, peak rating, tournaments
- [ ] "+ New Alt" button inline with heading
- [ ] Table columns: Handle (avatar + name + Main badge), Record, Win %, Rating, Events, Teams, Public (dot), chevron
- [ ] Expandable rows: click to expand inline, contained white card inside tinted background
- [ ] Expanded view: teams sub-table with columns: Team (name, future builder link — leave comment), Pokemon (Gen 5 sprites 28px from `@pkmn/img`), Record, Win %, Events, Actions (🔨 Builder, ↗ Share, ⊕ Clone — builder works, share/clone show "coming soon" tooltip)
- [ ] Archived teams: reduced opacity + grayscale sprites, only ↩ Restore action
- [ ] Footer: "View as this alt" (primary) + "View history" buttons left, "Delete alt" (red text) right
- [ ] Reference mockup: `.superpowers/brainstorm/28734-1774902746/content/08-alts-table-v6.html`
- [ ] Run `pnpm typecheck` and `pnpm lint`
- [ ] Commit: `feat: redesign alts page with table layout and team sub-table`

### Task 6: Create tournaments page (renamed from history)

**Files:**

- Create: `apps/web/src/app/(dashboard)/dashboard/tournaments/page.tsx`
- Delete or redirect: `apps/web/src/app/(dashboard)/dashboard/history/page.tsx`
- Modify: `apps/web/next.config.ts` (add redirect from /dashboard/history → /dashboard/tournaments)

**What to do:**

- [ ] Create new tournaments page at `/dashboard/tournaments`
- [ ] Summary stats row: played, win rate, best finish, avg place
- [ ] Filter chips: All, Live, Upcoming, Completed (with counts)
- [ ] Filter dropdowns: Alt ("All alts"), Format ("All formats")
- [ ] Table columns: Status (badge), Tournament (name as link · date), Alt (clickable), Format, Team (24px sprites), Record, Place (e.g. "3rd / 24")
- [ ] Status badges: Live (green), Registered (blue), Late Reg (amber), Completed (gray)
- [ ] Upcoming/late reg rows show dashes for team/record/place
- [ ] Expandable rows for completed: opponent schedule sub-table
  - Columns: RND, SCORE (W/L + score), MATCHUP (seat order: "You vs opp" or "opp vs You"), OPP TEAM (20px sprites)
  - Descending order (latest round first)
- [ ] Alt names clickable → per-alt view. Tournament names link to `/tournaments/[slug]`
- [ ] 1st place: teal + 🏆
- [ ] Add redirect in next.config.ts: `/dashboard/history` → `/dashboard/tournaments`
- [ ] Reference mockup: `.superpowers/brainstorm/28734-1774902746/content/41-tournaments-page.html`
- [ ] Run `pnpm typecheck` and `pnpm lint`
- [ ] Commit: `feat: create tournaments page (renamed from history) with full lifecycle`

---

## Phase 3: Community Pages

### Task 7: Redesign community overview

**Files:**

- Modify: `apps/web/src/app/(dashboard)/dashboard/community/[communitySlug]/page.tsx`
- Modify or replace: related client components

**What to do:**

- [ ] Remove Quick Actions section (redundant with sidebar)
- [ ] Remove Tournament Status breakdown cards (redundant with tournaments page)
- [ ] Stats row: Tournaments, Players, Staff, Founded
- [ ] "Live Now" highlight card (full width, green accent) when active tournament exists
- [ ] Two-column layout: tournaments table (left) + community activity feed (right)
- [ ] Tournaments as compact table rows (status badge + name + compact meta)
- [ ] "+ Create" button inline with tournaments heading
- [ ] Community activity feed: registrations (batched), round starts, staff joins, completions
- [ ] Reference mockup: `.superpowers/brainstorm/39571-1774889724/content/14-community-overview-v2.html`
- [ ] Run `pnpm typecheck` and `pnpm lint`
- [ ] Commit: `feat: redesign community overview with activity feed`

### Task 8: Redesign community staff

**Files:**

- Modify: `apps/web/src/app/(dashboard)/dashboard/community/[communitySlug]/staff/page.tsx`
- Modify or replace: related client components

**What to do:**

- [ ] Two-column drag-drop layout
- [ ] Left column: Unassigned pool with search bar, scrollable
- [ ] Right column: Role groups — Owner (non-draggable, crown badge), Admins, Head Judges, Judges
- [ ] Compact bordered cards with color dots per role
- [ ] Drag left→right to assign, between groups to reassign, right→left to unassign
- [ ] Empty role groups: thin "Drop here" dashed zone
- [ ] Staff rows: drag handle (⠿) + avatar + name + remove (✕, hover)
- [ ] Remove (✕) removes from community entirely
- [ ] "+ Add Staff" button in section heading
- [ ] Mobile: stacks vertically
- [ ] Reference mockup: `.superpowers/brainstorm/39571-1774889724/content/16-staff-two-column.html`
- [ ] Run `pnpm typecheck` and `pnpm lint`
- [ ] Commit: `feat: redesign community staff with two-column drag-drop`

---

## Phase 4: Cleanup

### Task 9: Remove dead routes and update redirects

**Files:**

- Modify: `apps/web/next.config.ts`
- Delete: `apps/web/src/app/(dashboard)/dashboard/inbox/` (if not already handled)
- Delete: `apps/web/src/app/(dashboard)/dashboard/history/` (after redirect added)

**What to do:**

- [ ] Ensure redirect from `/dashboard/history` → `/dashboard/tournaments` exists
- [ ] Ensure redirect from `/dashboard/inbox` → `/dashboard` exists
- [ ] Remove dead page files for inbox and history
- [ ] Run `pnpm build:web` to verify no broken imports
- [ ] Run full test suite: `pnpm test`
- [ ] Commit: `chore: remove dead inbox/history routes, add redirects`

### Task 10: Final verification

- [ ] Run `pnpm lint`
- [ ] Run `pnpm typecheck`
- [ ] Run `pnpm test`
- [ ] Run `pnpm build:web`
- [ ] Manually verify each page in the browser via Playwright MCP
- [ ] Commit any fixes
- [ ] Push
