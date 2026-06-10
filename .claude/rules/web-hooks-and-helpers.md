---
paths:
  - "apps/web/src/**/*.{ts,tsx}"
---

# Web Hooks & Helpers Catalog

Available hooks and utility functions. Check this list before writing new utilities — if something similar exists, use it. For full details, read the source file or invoke the `using-utils` skill.

## Hooks (`apps/web/src/hooks/`)

| Hook                     | Purpose                                                        |
| ------------------------ | -------------------------------------------------------------- |
| `useAuth()`              | Auth state, sign in/out, session                               |
| `useCurrentUser()`       | Logged-in user's profile data                                  |
| `usePermission(key)`     | Check single permission — returns `{ hasPermission, loading }` |
| `usePermissions(keys[])` | Check multiple permissions — returns permission map            |
| `useSiteAdmin()`         | Site roles and admin status from JWT                           |
| `useIsMobile()`          | Viewport < 768px detection                                     |
| `useIsClient()`          | SSR hydration guard                                            |
| `useSidebar()`           | Sidebar open/collapsed state (from SidebarProvider)            |

## Lib Helpers (`apps/web/src/lib/`)

| Helper                                                 | Import                     | Purpose                                                                         |
| ------------------------------------------------------ | -------------------------- | ------------------------------------------------------------------------------- |
| `cn()`                                                 | `@/lib/utils`              | Tailwind class merging (clsx + tailwind-merge)                                  |
| `CacheTags.*`                                          | `@/lib/cache`              | Static keys (`TOURNAMENTS_LIST`) and dynamic functions (`tournament(id)`)       |
| `invalidateCommunityPageCaches(slug?, id?)`            | `@/lib/cache-invalidation` | Bust `COMMUNITIES_LIST` + `community(slug/id)` — use in any community mutation  |
| `invalidateTournamentCaches(id)`                       | `@/lib/cache-invalidation` | Bust `tournament(id)` — for internal tournament changes (rounds, matches)       |
| `invalidateTournamentListCaches(id)`                   | `@/lib/cache-invalidation` | Bust `TOURNAMENTS_LIST` + `tournament(id)` — for registration count changes     |
| `invalidateTournamentAndCommunityCaches(supabase, id)` | `@/lib/cache-invalidation` | Bust list + tournament + community — use on status changes (async)              |
| `invalidatePlayerProfileCaches(username)`              | `@/lib/cache-invalidation` | Bust `player(username)` — for bio/country/avatar changes                        |
| `invalidatePlayerDirectoryCaches(username)`            | `@/lib/cache-invalidation` | Bust player + all directory/sidebar caches — on join or username change         |
| `invalidatePlayerRankingCaches()`                      | `@/lib/cache-invalidation` | Bust `PLAYERS_LEADERBOARD` + `PLAYERS_RECENT` — after tournament completion     |
| `invalidateTournamentWithTeamCaches(id)`               | `@/lib/cache-invalidation` | Bust `tournament(id)` + `tournamentTeams(id)` — after team submit/select        |
| `invalidateCommunityRequestCaches()`                   | `@/lib/cache-invalidation` | Bust `COMMUNITY_REQUESTS_LIST` — after request submit/review                    |
| `invalidateUsageStatsCaches(formats)`                  | `@/lib/cache-invalidation` | Bust `usage-stats` + `usage-stats:{format}` per format — Server Action surface  |
| `revalidateUsageStatsCaches(formats)`                  | `@/lib/cache-invalidation` | Bust usage stats via `revalidateTag(tag,'max')` — route handler/webhook surface |
| `invalidateAnnouncementCaches()`                       | `@/lib/cache-invalidation` | Bust `ANNOUNCEMENTS` — after announcement create/update/delete                  |
| `notificationIcons`                                    | `@/lib/notification-utils` | Notification type to lucide icon mapping                                        |
| `isSafeRelativeUrl()`                                  | `@/lib/notification-utils` | Validate relative URLs start with `/[^/\\]`                                     |
| `transformPhaseData()`                                 | `@/lib/tournament-utils`   | Supabase phase/round data to bracket visualization shape                        |

## @trainers/utils (import from `@trainers/utils`)

| Utility                              | Purpose                                                          |
| ------------------------------------ | ---------------------------------------------------------------- |
| `getLabel(value, map)`               | Enum to display label lookup                                     |
| `getErrorMessage(error, fallback)`   | Extract error message from Error, PostgrestError, or any shape   |
| `formatDate(str)`                    | Format as "Mar 1, 2026"                                          |
| `formatDateTime(str)`                | Format as "Mar 1, 2026, 3:45 PM"                                 |
| `formatTimeAgo(str)`                 | Format as "5m ago", "2h ago", "3d ago"                           |
| `getPlayerName(player, fallback?)`   | Resolve display name with username fallback                      |
| `PERMISSIONS`                        | Permission key constants (e.g., `PERMISSIONS.TOURNAMENT_MANAGE`) |
| `registrationStatusLabels`           | Registration status enum → display label map                     |
| `tournamentStatusLabels`             | Tournament status enum → display label map                       |
| `matchStatusLabels`                  | Match status enum → display label map                            |
| `roundStatusLabels`                  | Round status enum → display label map                            |
| `COUNTRIES` / `getCountryName(code)` | ISO 3166-1 country data                                          |
| `socialPlatformLabels`               | Social platform key → display name                               |
| `generateSlug(text)`                 | URL-friendly slug generation                                     |
| `escapeLike(input)`                  | Escape SQL LIKE special characters                               |
| `getUserTierFeatures(tier)`          | Feature flags by user tier                                       |
| `getCommunityFeatures(tier)`         | Feature availability by community subscription tier              |
| `calculatePlatformFee(fee, tier)`    | Platform fee calculation from entry fee + community tier         |

## Keeping This Catalog in Sync

When you **add, rename, or delete** a hook in `apps/web/src/hooks/` or a helper in `apps/web/src/lib/` or `@trainers/utils`, update this catalog so future agents see accurate information.
