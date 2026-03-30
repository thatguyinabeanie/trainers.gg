# Sidebar Shell Polish

**Date:** 2026-03-30
**Status:** Approved

## Summary

Fix three visual issues with the dashboard sidebar to match shadcn dashboard-01 quality.

## Fix 1: Collapsed Alignment

Remove custom padding overrides on the logo `SidebarMenuButton`. Let the CVA `size="lg"` collapsed styles handle centering (`size-8! p-0!`). All icons should use the same 32x32 centered box in the collapsed rail.

**File:** `apps/web/src/components/dashboard/dashboard-sidebar.tsx`

- Remove `p-1.5 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center` from the logo `SidebarMenuButton` className
- The CVA's built-in `group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-0!` handles centering automatically
- Logo icon div should be `size-8` to fill the collapsed button exactly

## Fix 2: NavUser Footer

Match shadcn dashboard-01 NavUser pattern:

- Round avatar (`rounded-full` instead of `rounded-lg`)
- Show full username (no truncation — sidebar width accommodates it)
- Keep "Player" / "Owner" as role text (not email — this app doesn't show emails in sidebar)
- 3-dot menu (`MoreVertical`) opens dropdown with Settings, Account, Sign out

**File:** `apps/web/src/components/dashboard/dashboard-sidebar.tsx`

- Change avatar `className` from `rounded-lg` to `rounded-full`
- Ensure the `DropdownMenuTrigger` renders as `SidebarMenuButton size="lg"` (already done)

## Fix 3: Expanded Sidebar Structure

Already partially done (separators removed). Remaining:

- No additional separator lines (already removed)
- Group labels ("Communities") provide visual separation (already in place)
- Settings pinned at bottom with `mt-auto` (already in place)
- Clean user footer at very bottom (fix per #2)

## Additional fixes from todo list

### Tooltip positioning (#32)

The tooltip wrapper in `SidebarMenuButton` was modified to fix a render prop conflict. The fix may have broken tooltip positioning. Revert to simpler tooltip approach or verify the `TooltipTrigger` wrapper works correctly with collapsed state detection.

**File:** `apps/web/src/components/ui/sidebar.tsx`
