# Builder Cross-Alt Landing Page

## Problem

When a user is on the dashboard home viewing "All Alts" and clicks Builder in the sidebar, the app silently auto-selects the first alt and navigates to `/dashboard/alts/{firstAlt}/teams`. This feels jarring — the system made an unwanted decision. There needs to be something in the middle: a cross-alt teams view that matches the "All Alts" context.

## Solution

Add a new `/dashboard/teams` route — a flat data table showing ALL teams across all alts. The sidebar Builder link uses smart routing to decide where to go based on the current alt context.

## Smart Routing

The Builder sidebar link destination depends on the current alt selection state:

| State | Builder link goes to |
|-------|---------------------|
| 1 alt total (no choice needed) | `/dashboard/alts/{alt}/teams` |
| Specific alt selected | `/dashboard/alts/{selectedAlt}/teams` |
| "All Alts" selected | `/dashboard/teams` (new page) |

This means users with a single alt never see the cross-alt page — they go straight to their teams. Users who selected a specific alt stay in that context. Only the "All Alts" state triggers the landing page.

## Cross-Alt Teams Page (`/dashboard/teams`)

### Layout

Data table with columns:

| Column | Content |
|--------|---------|
| Team | 6 Pokemon sprite slots + team name |
| Alt | Owning alt username |
| Format | Format badge (Reg I, Reg H, etc.) |
| Updated | Relative time (2d ago, 1w ago) |
| Record | W/L record or "—" if no matches |

Default sort: last updated (most recent first).

### Filter Chips

Two groups of filter chips above the table, separated by a visual divider:

1. **Format filters**: All (default), Reg I, Reg H, etc. (from `getActiveFormats()`)
2. **Alt filters**: One chip per alt (from user's alts list)

Selecting a format chip filters to teams with that format. Selecting an alt chip filters to that alt's teams. Both can be active simultaneously (e.g., "Reg I" + "admin_trainer" = only admin_trainer's Reg I teams).

### Actions

- **"+ New Team" button**: Opens the new team dialog. Since the page is cross-alt, the dialog includes an alt selector (dropdown) in addition to the existing name + format fields. Defaults to the user's main alt.
- **"Import Paste" button**: Same as new team but pre-selects import mode.

### Row Click Behavior

Clicking a team row navigates directly to the team editor: `/dashboard/alts/{team.alt_username}/teams/{team.id}`. No intermediate step — the cross-alt table serves as the teams list.

### Empty State

When the user has no teams across any alt: empty state with "No teams yet" message and prominent "+ New Team" / "Import Paste" buttons.

## Data Fetching

New query: `getTeamsForUser(supabase, userId)` in `packages/supabase/src/queries/teams.ts`. Fetches all teams where `created_by` is any of the user's alts, joined with the alt username for display. Returns the same shape as `getTeamsForAltList` but with an additional `alt_username` field.

The page is a Server Component. Feature flag gating uses `hasTeamBuilderAccess(supabase, user.id)` (the new DB-based check).

## Sidebar Link Update

In `dashboard-sidebar.tsx`, update `builderHref` logic:

```
Before: currentAltUsername ? `/dashboard/alts/${currentAltUsername}/teams` : "/dashboard"
After:  currentAltUsername ? `/dashboard/alts/${currentAltUsername}/teams` : "/dashboard/teams"
```

When disabled (no feature flag access), the link stays as-is with the beta tooltip.

## What Changes

| File | Change |
|------|--------|
| `apps/web/src/app/(dashboard)/dashboard/teams/page.tsx` | **New** — cross-alt teams page |
| `apps/web/src/app/(dashboard)/dashboard/teams/loading.tsx` | **New** — skeleton loader |
| `packages/supabase/src/queries/teams.ts` | **Add** `getTeamsForUser()` query |
| `apps/web/src/components/dashboard/dashboard-sidebar.tsx` | **Update** Builder href fallback |
| `apps/web/src/components/team-builder/teams-table.tsx` | **New** — reusable data table component for team rows |

## What Stays the Same

- The existing alt-scoped teams page (`/dashboard/alts/[username]/teams`) is unchanged
- The team editor workspace is unchanged
- The new team dialog is reused (with an added alt selector for the cross-alt context)
- All existing team CRUD operations work the same

## Not In Scope

- Sorting by column click (can be added later via TanStack Table)
- Cross-alt team creation without the dialog (e.g., inline)
- Changing how the alt-scoped teams page works
