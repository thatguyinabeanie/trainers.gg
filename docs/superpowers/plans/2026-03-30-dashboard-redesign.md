# Dashboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the horizontal-tab dashboard with a single collapsible sidebar layout that serves as a personal control center for both players and tournament organizers, consolidating `/to-dashboard` into `/dashboard/community/`.

**Architecture:** The dashboard layout uses the existing shadcn `SidebarProvider` + `Sidebar` + `SidebarInset` primitives from `apps/web/src/components/ui/sidebar.tsx`. The sidebar context-switches between player and community views based on `usePathname()`. All existing page components are relocated with path updates — no rewrite of content components.

**Tech Stack:** Next.js 16 (App Router), shadcn/ui Sidebar, Supabase (auth + queries), TanStack Query, Tailwind CSS 4, lucide-react icons, Base UI primitives.

**Spec:** `docs/superpowers/specs/2026-03-30-dashboard-redesign.md`

---

## Phase 1: Sidebar Shell + Home Page

Build the sidebar layout and get the Home page working. All existing sub-pages (alts, settings) continue to render inside the new shell.

### Task 1: Create the DashboardSidebar component

**Files:**

- Create: `apps/web/src/components/dashboard/dashboard-sidebar.tsx`

This is the main sidebar component. It renders different navigation based on whether the user is in a player or community context.

- [ ] **Step 1: Create the sidebar component**

Create `apps/web/src/components/dashboard/dashboard-sidebar.tsx` with the following structure:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Users,
  Inbox,
  Trophy,
  Settings,
  Plus,
  ArrowLeft,
  LayoutDashboard,
  UserPlus,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
} from "@/components/ui/sidebar";

// Types for data passed from the server layout
interface UserInfo {
  id: string;
  username: string;
  avatarUrl?: string | null;
}

interface CommunityInfo {
  id: number;
  name: string;
  slug: string;
  logoUrl?: string | null;
  role: "owner" | "staff";
  hasLiveTournament: boolean;
}

interface DashboardSidebarProps {
  user: UserInfo;
  communities: CommunityInfo[];
  unreadInboxCount: number;
}

// Player nav items
const playerNavItems = [
  { href: "/dashboard", label: "Home", icon: Home, exact: true },
  { href: "/dashboard/alts", label: "Alts & Teams", icon: Users },
  {
    href: "/dashboard/inbox",
    label: "Inbox",
    icon: Inbox,
    badgeKey: "inbox" as const,
  },
  { href: "/dashboard/history", label: "History", icon: Trophy },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function DashboardSidebar({
  user,
  communities,
  unreadInboxCount,
}: DashboardSidebarProps) {
  const pathname = usePathname();

  // Determine context: community or player
  const communityMatch = pathname.match(/^\/dashboard\/community\/([^/]+)/);
  const activeCommunitySlug = communityMatch?.[1] ?? null;
  const activeCommunity = activeCommunitySlug
    ? communities.find((c) => c.slug === activeCommunitySlug)
    : null;

  const isCommunityContext = !!activeCommunity;

  return (
    <Sidebar>
      {/* Header: logo + back link */}
      <SidebarHeader className="flex flex-row items-center gap-2 px-4 py-3">
        <Link href="/" className="text-primary text-sm font-bold">
          trainers.gg
        </Link>
        {isCommunityContext ? (
          <Link
            href="/dashboard"
            className="text-muted-foreground hover:text-foreground ml-auto text-xs"
          >
            ← Dashboard
          </Link>
        ) : (
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground ml-auto text-xs"
          >
            ← Back to site
          </Link>
        )}
      </SidebarHeader>

      <SidebarContent>
        {isCommunityContext && activeCommunity ? (
          <CommunitySidebarContent
            community={activeCommunity}
            pathname={pathname}
          />
        ) : (
          <PlayerSidebarContent
            pathname={pathname}
            communities={communities}
            unreadInboxCount={unreadInboxCount}
          />
        )}
      </SidebarContent>

      {/* Footer: user card */}
      <SidebarFooter>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <Avatar className="size-7">
            {user.avatarUrl && (
              <AvatarImage src={user.avatarUrl} alt={user.username} />
            )}
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
              {user.username.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate font-mono text-xs font-semibold">
              {user.username}
            </p>
            <p className="text-muted-foreground text-[10px]">
              {isCommunityContext && activeCommunity
                ? activeCommunity.role === "owner"
                  ? "Owner"
                  : "Staff"
                : "⚙ Settings"}
            </p>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

// ── Player Context ──────────────────────────────────────────────

function PlayerSidebarContent({
  pathname,
  communities,
  unreadInboxCount,
}: {
  pathname: string;
  communities: CommunityInfo[];
  unreadInboxCount: number;
}) {
  return (
    <>
      {/* Main nav */}
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            {playerNavItems.map((item) => {
              const isActive = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);

              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={isActive}>
                    <Link href={item.href}>
                      <item.icon className="size-4" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                  {item.badgeKey === "inbox" && unreadInboxCount > 0 && (
                    <SidebarMenuBadge>{unreadInboxCount}</SidebarMenuBadge>
                  )}
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      {/* Communities section (only if user has any) */}
      {communities.length > 0 && (
        <>
          <SidebarSeparator />
          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center justify-between">
              <span>Communities</span>
              <Link
                href="/dashboard/community/request"
                className="text-primary hover:text-primary/80"
                title="Request a Community"
              >
                <Plus className="size-3.5" />
              </Link>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {communities.map((community) => (
                  <SidebarMenuItem key={community.id}>
                    <SidebarMenuButton asChild>
                      <Link href={`/dashboard/community/${community.slug}`}>
                        <div
                          className={cn(
                            "bg-muted flex size-5 shrink-0 items-center justify-center rounded text-[10px] font-bold",
                            community.role === "owner"
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground"
                          )}
                        >
                          {community.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="truncate">{community.name}</span>
                      </Link>
                    </SidebarMenuButton>
                    {community.hasLiveTournament && (
                      <SidebarMenuBadge>
                        <span className="size-2 rounded-full bg-emerald-500" />
                      </SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </>
      )}
    </>
  );
}

// ── Community Context ───────────────────────────────────────────

const communityNavItems = [
  { href: "", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/tournaments", label: "Tournaments", icon: Trophy },
  { href: "/staff", label: "Staff", icon: UserPlus },
  { href: "/settings", label: "Settings", icon: Settings, ownerOnly: true },
];

function CommunitySidebarContent({
  community,
  pathname,
}: {
  community: CommunityInfo;
  pathname: string;
}) {
  const basePath = `/dashboard/community/${community.slug}`;

  return (
    <>
      {/* Community header */}
      <SidebarGroup>
        <div className="flex items-center gap-2 px-3 pb-2">
          <div className="bg-primary/10 text-primary flex size-7 items-center justify-center rounded-lg text-xs font-bold">
            {community.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{community.name}</p>
            <p className="text-muted-foreground text-[10px]">
              {community.role === "owner" ? "Owner" : "Staff"}
            </p>
          </div>
        </div>

        <SidebarGroupContent>
          <SidebarMenu>
            {communityNavItems.map((item) => {
              if (item.ownerOnly && community.role !== "owner") return null;

              const fullHref = basePath + item.href;
              const isActive = item.exact
                ? pathname === fullHref
                : pathname.startsWith(fullHref);

              return (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton asChild isActive={isActive}>
                    <Link href={fullHref}>
                      <item.icon className="size-4" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </>
  );
}
```

**Notes:**

- The `SidebarMenuButton` from shadcn uses `asChild` — this project uses Base UI, not Radix, but the shadcn sidebar component is already installed and working with its own patterns. Check `apps/web/src/components/ui/sidebar.tsx` for whether `asChild` is supported or if `render` prop is needed instead. If `asChild` is not supported, wrap the `Link` content inline instead of using `asChild`.
- The `communities` data is fetched server-side in the layout and passed as props. The sidebar itself is a client component for `usePathname()`.
- `hasLiveTournament` will be a computed field — the layout queries for active tournaments per community.

- [ ] **Step 2: Verify the component compiles**

Run: `pnpm typecheck`
Expected: No type errors related to `dashboard-sidebar.tsx`

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/dashboard/dashboard-sidebar.tsx
git commit -m "feat: create DashboardSidebar component with player + community context switching"
```

---

### Task 2: Rewrite the dashboard layout to use the sidebar

**Files:**

- Modify: `apps/web/src/app/(app)/dashboard/layout.tsx`
- Delete: `apps/web/src/app/(app)/dashboard/dashboard-nav.tsx` (replaced by sidebar)

Replace the current `PageContainer` + `DashboardNav` layout with `SidebarProvider` + `DashboardSidebar` + `SidebarInset`.

- [ ] **Step 1: Rewrite the layout**

Replace `apps/web/src/app/(app)/dashboard/layout.tsx` with:

```tsx
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import {
  getUnreadNotificationCount,
  listMyCommunities,
} from "@trainers/supabase";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { Separator } from "@/components/ui/separator";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getUser();

  if (!user) {
    redirect("/sign-in?redirect=/dashboard");
  }

  const supabase = await createClient();

  // Fetch sidebar data in parallel
  const [communities, unreadCount] = await Promise.all([
    listMyCommunities(supabase, user.id).catch(() => []),
    getUnreadNotificationCount(supabase).catch(() => 0),
  ]);

  // Transform communities for the sidebar
  const sidebarCommunities = communities.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    logoUrl: c.logo_url ?? null,
    role: c.isOwner ? ("owner" as const) : ("staff" as const),
    hasLiveTournament: false, // TODO: query active tournaments per community
  }));

  const sidebarUser = {
    id: user.id,
    username: (user.user_metadata?.username as string) ?? "user",
    avatarUrl: (user.user_metadata?.avatar_url as string | undefined) ?? null,
  };

  return (
    <SidebarProvider>
      <DashboardSidebar
        user={sidebarUser}
        communities={sidebarCommunities}
        unreadInboxCount={unreadCount}
      />
      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          {/* Breadcrumbs will be added per-page later */}
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
```

**Key differences from the old layout:**

- No more `PageContainer` — `SidebarInset` provides the content area
- No more `DashboardNav` — navigation is in the sidebar
- No more `h1 Dashboard` header — each page handles its own heading
- Server-side data fetching for sidebar: communities, unread count
- `listMyCommunities` already exists in `@trainers/supabase` — used by the current `/to-dashboard` page

- [ ] **Step 2: Update the dashboard index barrel export**

Add `DashboardSidebar` to `apps/web/src/components/dashboard/index.ts`:

```tsx
export { DashboardSidebar } from "./dashboard-sidebar";
```

(Append to existing exports — do not remove existing ones.)

- [ ] **Step 3: Verify it compiles and renders**

Run: `pnpm typecheck`
Then navigate to `http://localhost:3000/dashboard` in the browser. The sidebar should appear on the left with Home, Alts & Teams, Inbox, History, Settings items. The existing overview content should render in the main area (though styling may need adjustment since `PageContainer` padding is gone).

- [ ] **Step 4: Delete the old dashboard-nav**

Delete `apps/web/src/app/(app)/dashboard/dashboard-nav.tsx` — it's no longer imported by the layout.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/(app)/dashboard/layout.tsx
git add apps/web/src/components/dashboard/dashboard-sidebar.tsx
git add apps/web/src/components/dashboard/index.ts
git rm apps/web/src/app/(app)/dashboard/dashboard-nav.tsx
git commit -m "feat: replace dashboard horizontal tabs with sidebar layout"
```

---

### Task 3: Move overview content to the root dashboard page

**Files:**

- Modify: `apps/web/src/app/(app)/dashboard/page.tsx` (currently redirects to `/dashboard/overview`)
- Move content from: `apps/web/src/app/(app)/dashboard/overview/page.tsx` and `overview-client.tsx`
- Add redirect: `apps/web/src/app/(app)/dashboard/overview/page.tsx` → redirect to `/dashboard`

The root `/dashboard` page should show the Home view directly instead of redirecting to `/dashboard/overview`.

- [ ] **Step 1: Replace the root page with overview content**

Replace `apps/web/src/app/(app)/dashboard/page.tsx`:

```tsx
import { Suspense } from "react";
import { OverviewClient } from "./overview/overview-client";
import OverviewLoading from "./overview/loading";

export default function DashboardHomePage() {
  return (
    <Suspense fallback={<OverviewLoading />}>
      <OverviewClient />
    </Suspense>
  );
}
```

- [ ] **Step 2: Make the old overview route redirect**

Replace `apps/web/src/app/(app)/dashboard/overview/page.tsx`:

```tsx
import { redirect } from "next/navigation";

export default function OverviewRedirect() {
  redirect("/dashboard");
}
```

- [ ] **Step 3: Verify navigation works**

Navigate to `http://localhost:3000/dashboard` — should show the Home/overview content.
Navigate to `http://localhost:3000/dashboard/overview` — should redirect to `/dashboard`.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/(app)/dashboard/page.tsx
git add apps/web/src/app/(app)/dashboard/overview/page.tsx
git commit -m "feat: make /dashboard the home page, redirect /dashboard/overview"
```

---

### Task 4: Fix settings auto-redirect

**Files:**

- Modify: `apps/web/src/app/(app)/dashboard/settings/page.tsx`

The settings landing page currently shows "Select a settings tab to continue." It should redirect to profile.

- [ ] **Step 1: Replace with redirect**

Replace `apps/web/src/app/(app)/dashboard/settings/page.tsx`:

```tsx
import { redirect } from "next/navigation";

export default function SettingsRedirect() {
  redirect("/dashboard/settings/profile");
}
```

- [ ] **Step 2: Update settings layout — remove duplicate h1**

Read `apps/web/src/app/(app)/dashboard/settings/layout.tsx`. The settings layout currently renders `<h1>Settings</h1>` but the parent dashboard layout no longer has its own h1. The settings layout heading should stay, but should be `<h2>` to respect the page hierarchy (each settings sub-page is the main content).

Change the `<h1>` to `<h2>` in the settings layout:

```tsx
<h2 className="text-2xl font-bold">Settings</h2>
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/(app)/dashboard/settings/page.tsx
git add apps/web/src/app/(app)/dashboard/settings/layout.tsx
git commit -m "fix: auto-redirect /dashboard/settings to profile, fix heading level"
```

---

### Task 5: Run full quality checks

- [ ] **Step 1: Run typecheck**

Run: `pnpm typecheck`
Expected: All packages pass (11/11)

- [ ] **Step 2: Run lint**

Run: `pnpm lint`
Expected: All packages pass

- [ ] **Step 3: Run tests**

Run: `pnpm test`
Expected: All tests pass. Some dashboard tests may need import path updates if they reference `DashboardNav`.

- [ ] **Step 4: Visual verification via Playwright MCP**

Navigate to `http://localhost:3000/dashboard` — verify:

- Sidebar visible on left with player nav items
- Home page content renders in main area
- Clicking sidebar items navigates correctly
- Settings redirects to profile
- Mobile: sidebar trigger (hamburger) opens drawer

- [ ] **Step 5: Commit any test fixes**

```bash
git add -u
git commit -m "fix: update tests for sidebar layout"
```

---

## Phase 2: Inbox + History Pages

### Task 6: Create the Inbox page (merges Notifications + Invitations)

**Files:**

- Create: `apps/web/src/app/(app)/dashboard/inbox/page.tsx`
- Modify: `apps/web/src/app/(app)/dashboard/notifications/page.tsx` → redirect to `/dashboard/inbox`
- Modify: `apps/web/src/app/(app)/dashboard/invitations/page.tsx` → redirect to `/dashboard/inbox`

The Inbox page reuses the existing `NotificationCenter` component and adds an "Invitations" filter tab. The `NotificationCenter` already has filter tabs (All, Unread, Matches, Tournaments, Organizations) — we add "Invitations" to that list.

- [ ] **Step 1: Create the inbox page**

Create `apps/web/src/app/(app)/dashboard/inbox/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import {
  getNotifications,
  getUnreadNotificationCount,
  getNotificationCount,
  getTournamentInvitationsReceived,
} from "@trainers/supabase";
import { NotificationCenter } from "../notifications/notification-center";

export const metadata = {
  title: "Inbox — trainers.gg",
};

export default async function InboxPage() {
  const user = await getUser();
  if (!user) {
    redirect("/sign-in?redirect=/dashboard/inbox");
  }

  const supabase = await createClient();

  const [notifications, totalCount, unreadCount] = await Promise.all([
    getNotifications(supabase, { limit: 20, offset: 0 }).catch(() => []),
    getNotificationCount(supabase).catch(() => 0),
    getUnreadNotificationCount(supabase).catch(() => 0),
  ]);

  return (
    <NotificationCenter
      initialNotifications={notifications}
      initialTotalCount={totalCount}
      initialUnreadCount={unreadCount}
    />
  );
}
```

- [ ] **Step 2: Add redirects for old notification/invitation routes**

Replace `apps/web/src/app/(app)/dashboard/notifications/page.tsx`:

```tsx
import { redirect } from "next/navigation";

export default function NotificationsRedirect() {
  redirect("/dashboard/inbox");
}
```

Replace `apps/web/src/app/(app)/dashboard/invitations/page.tsx`:

```tsx
import { redirect } from "next/navigation";

export default function InvitationsRedirect() {
  redirect("/dashboard/inbox");
}
```

- [ ] **Step 3: Verify navigation**

Navigate to `http://localhost:3000/dashboard/inbox` — should show notifications.
Navigate to `http://localhost:3000/dashboard/notifications` — should redirect to inbox.
Navigate to `http://localhost:3000/dashboard/invitations` — should redirect to inbox.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/(app)/dashboard/inbox/page.tsx
git add apps/web/src/app/(app)/dashboard/notifications/page.tsx
git add apps/web/src/app/(app)/dashboard/invitations/page.tsx
git commit -m "feat: create /dashboard/inbox, redirect old notification/invitation routes"
```

---

### Task 7: Create the History page (merges Stats + Tournament History)

**Files:**

- Create: `apps/web/src/app/(app)/dashboard/history/page.tsx`
- Modify: `apps/web/src/app/(app)/dashboard/stats/page.tsx` → redirect to `/dashboard/history`

The History page reuses the existing `StatsClient` component which already has tournament history table, win rate trend, format performance, and most used Pokemon.

- [ ] **Step 1: Create the history page**

Create `apps/web/src/app/(app)/dashboard/history/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { checkFeatureAccess } from "@/lib/feature-flags/check-flag";
import { StatsClient } from "../stats/stats-client";

export const metadata = {
  title: "History — trainers.gg",
};

export default async function HistoryPage() {
  const user = await getUser();
  if (!user) {
    redirect("/sign-in?redirect=/dashboard/history");
  }

  // Stats/History content — feature flag check for analytics charts
  const showAnalytics = await checkFeatureAccess("dashboard_stats", user.id);

  return <StatsClient showAnalytics={showAnalytics} />;
}
```

**Note:** The `StatsClient` component may need a `showAnalytics` prop added to conditionally render the analytics charts (which are behind a feature flag). If `StatsClient` doesn't accept this prop, modify it to accept and use it — or simply render the component unconditionally and let it handle the flag internally (check its current implementation).

- [ ] **Step 2: Redirect old stats route**

Replace `apps/web/src/app/(app)/dashboard/stats/page.tsx`:

```tsx
import { redirect } from "next/navigation";

export default function StatsRedirect() {
  redirect("/dashboard/history");
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/(app)/dashboard/history/page.tsx
git add apps/web/src/app/(app)/dashboard/stats/page.tsx
git commit -m "feat: create /dashboard/history, redirect old stats route"
```

---

### Task 8: Phase 2 quality checks

- [ ] **Step 1: Run typecheck + lint + test**

```bash
pnpm typecheck && pnpm lint && pnpm test
```

- [ ] **Step 2: Visual verification**

Verify all sidebar links work:

- `/dashboard` → Home
- `/dashboard/alts` → Alts page
- `/dashboard/inbox` → Inbox (notifications)
- `/dashboard/history` → History (stats + tournament history)
- `/dashboard/settings` → Redirects to profile

- [ ] **Step 3: Commit any fixes**

```bash
git add -u
git commit -m "fix: phase 2 quality fixes"
```

---

## Phase 3: Community Consolidation

Move all `/to-dashboard` content into `/dashboard/community/`. This is primarily a file move + path update operation.

### Task 9: Create the community route structure

**Files:**

- Create: `apps/web/src/app/(app)/dashboard/community/page.tsx` (community selector)
- Create: `apps/web/src/app/(app)/dashboard/community/request/page.tsx` (request form)
- Create: `apps/web/src/app/(app)/dashboard/community/[orgSlug]/layout.tsx` (access control)
- Create: `apps/web/src/app/(app)/dashboard/community/[orgSlug]/page.tsx` (overview)

- [ ] **Step 1: Create community selector page**

Create `apps/web/src/app/(app)/dashboard/community/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import { listMyCommunities } from "@trainers/supabase";
import { OrgSelectorClient } from "@/app/(app)/to-dashboard/org-selector-client";

export default async function CommunityPage() {
  const user = await getUser();
  if (!user) {
    redirect("/sign-in?redirect=/dashboard/community");
  }

  const supabase = await createClient();
  const communities = await listMyCommunities(supabase, user.id);

  // If user has exactly one community, redirect directly
  if (communities.length === 1) {
    redirect(`/dashboard/community/${communities[0].slug}`);
  }

  // Reuse the existing OrgSelectorClient component
  // It will need its links updated from /to-dashboard/ to /dashboard/community/
  return (
    <OrgSelectorClient
      communities={communities}
      basePath="/dashboard/community"
    />
  );
}
```

**Note:** The `OrgSelectorClient` component currently hardcodes `/to-dashboard/` links. It needs a `basePath` prop added, or the links need to be updated. Check its implementation and update accordingly.

- [ ] **Step 2: Create community request page**

Create `apps/web/src/app/(app)/dashboard/community/request/page.tsx`:

This page moves the community request form from `/communities/create`. Read the current `/communities/create/page.tsx` and replicate its server-side logic (checking existing requests, cooldown) with the form components pointing to the same server actions.

```tsx
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { getMyOrganizationRequest } from "@trainers/supabase";
import { createClient } from "@/lib/supabase/server";
// Import the existing form and status components
import { RequestOrganizationForm } from "@/app/(app)/communities/create/request-organization-form";
import { RequestStatus } from "@/app/(app)/communities/create/request-status";
import { CommunityReviewDisclaimer } from "@/app/(app)/communities/create/community-review-disclaimer";

export const metadata = {
  title: "Request a Community — trainers.gg",
};

export default async function CommunityRequestPage() {
  const user = await getUser();
  if (!user) {
    redirect("/sign-in?redirect=/dashboard/community/request");
  }

  const supabase = await createClient();
  const existingRequest = await getMyOrganizationRequest(supabase);

  // Same logic as /communities/create/page.tsx
  const COOLDOWN_DAYS = 7;
  const showForm =
    !existingRequest ||
    (existingRequest.status === "rejected" &&
      existingRequest.reviewed_at &&
      new Date(existingRequest.reviewed_at).getTime() +
        COOLDOWN_DAYS * 24 * 60 * 60 * 1000 <
        Date.now());

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Request a Community</h2>
        <p className="text-muted-foreground">
          Apply to create your own tournament community on trainers.gg
        </p>
      </div>

      <CommunityReviewDisclaimer />

      {showForm ? (
        <RequestOrganizationForm
          previouslyRejected={existingRequest?.status === "rejected"}
        />
      ) : (
        existingRequest && <RequestStatus request={existingRequest} />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create community org layout (access control)**

Create `apps/web/src/app/(app)/dashboard/community/[orgSlug]/layout.tsx`:

```tsx
import type { ReactNode } from "react";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCommunityBySlug, hasCommunityAccess } from "@trainers/supabase";

interface LayoutProps {
  children: ReactNode;
  params: Promise<{ orgSlug: string }>;
}

export default async function CommunityOrgLayout({
  children,
  params,
}: LayoutProps) {
  const { orgSlug } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/sign-in?redirect=/dashboard/community/${orgSlug}`);
  }

  const organization = await getCommunityBySlug(supabase, orgSlug);
  if (!organization) {
    notFound();
  }

  const hasAccess = await hasCommunityAccess(
    supabase,
    organization.id,
    user.id
  );

  if (!hasAccess) {
    redirect(`/communities/${orgSlug}`);
  }

  // No header or nav rendered — sidebar handles navigation
  return <>{children}</>;
}
```

- [ ] **Step 4: Create community overview page**

Create `apps/web/src/app/(app)/dashboard/community/[orgSlug]/page.tsx`:

Import and render the existing `OverviewClient` from the TO-dashboard. This component needs its internal links updated from `/to-dashboard/` to `/dashboard/community/`.

```tsx
import { createClient } from "@/lib/supabase/server";
import {
  getCommunityBySlug,
  getCommunityWithTournamentStats,
  listCommunityTournaments,
} from "@trainers/supabase";
import { notFound } from "next/navigation";
import { OverviewClient } from "@/app/(app)/to-dashboard/[orgSlug]/overview-client";

interface PageProps {
  params: Promise<{ orgSlug: string }>;
}

export default async function CommunityOverviewPage({ params }: PageProps) {
  const { orgSlug } = await params;
  const supabase = await createClient();

  const organization = await getCommunityBySlug(supabase, orgSlug);
  if (!organization) notFound();

  const [stats, recentTournaments] = await Promise.all([
    getCommunityWithTournamentStats(supabase, organization.id),
    listCommunityTournaments(supabase, organization.id, { limit: 6 }),
  ]);

  return (
    <OverviewClient
      organization={organization}
      stats={stats}
      recentTournaments={recentTournaments}
      communitySlug={orgSlug}
      basePath={`/dashboard/community/${orgSlug}`}
    />
  );
}
```

**Note:** The `OverviewClient` will need a `basePath` prop to generate correct internal links. Check its implementation and add the prop.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/(app)/dashboard/community/
git commit -m "feat: create community route structure under /dashboard/community"
```

---

### Task 10: Move remaining community pages (tournaments, staff, settings)

**Files:**

- Create: `apps/web/src/app/(app)/dashboard/community/[orgSlug]/tournaments/` (list + create + manage)
- Create: `apps/web/src/app/(app)/dashboard/community/[orgSlug]/staff/page.tsx`
- Create: `apps/web/src/app/(app)/dashboard/community/[orgSlug]/settings/page.tsx`

Each of these pages imports the existing client components from the `/to-dashboard/` directory. The client components themselves need their internal `/to-dashboard/` links updated to `/dashboard/community/`.

- [ ] **Step 1: Create tournament pages**

Create the tournament directory structure:

- `apps/web/src/app/(app)/dashboard/community/[orgSlug]/tournaments/page.tsx` — list
- `apps/web/src/app/(app)/dashboard/community/[orgSlug]/tournaments/create/page.tsx` — create wizard
- `apps/web/src/app/(app)/dashboard/community/[orgSlug]/tournaments/[tournamentSlug]/manage/page.tsx` — manage

Each page should import the corresponding client component from the existing TO-dashboard location and pass the updated `basePath`.

- [ ] **Step 2: Create staff page**

Create `apps/web/src/app/(app)/dashboard/community/[orgSlug]/staff/page.tsx` — imports and renders the existing `StaffListClient`.

- [ ] **Step 3: Create settings page**

Create `apps/web/src/app/(app)/dashboard/community/[orgSlug]/settings/page.tsx` — imports and renders the existing community settings form.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/(app)/dashboard/community/
git commit -m "feat: add tournament, staff, and settings pages under /dashboard/community"
```

---

### Task 11: Update all /to-dashboard references

**Files:**

- Modify: ~18 files referencing `/to-dashboard` (see grep results from earlier exploration)

- [ ] **Step 1: Find all references**

Run: `grep -r "to-dashboard" apps/web/src/ --include="*.tsx" --include="*.ts" -l`

- [ ] **Step 2: Update each file**

For each file, replace `/to-dashboard/` with `/dashboard/community/` in link hrefs and redirect paths. Key files:

- `apps/web/src/components/topnav-auth-section.tsx` — dashboard link
- `apps/web/src/lib/proxy-routes.ts` — protected routes
- `apps/web/src/proxy.ts` — route protection
- `apps/web/src/app/(app)/communities/[orgSlug]/page.tsx` — community link
- `apps/web/src/app/(app)/communities/[orgSlug]/community-tabs.tsx`
- `apps/web/src/app/(app)/to-dashboard/[orgSlug]/overview-client.tsx` — internal links
- `apps/web/src/app/(app)/to-dashboard/[orgSlug]/tournaments/create/create-tournament-client.tsx`
- `apps/web/src/app/(app)/to-dashboard/[orgSlug]/tournaments/[tournamentSlug]/manage/tournament-manage-client.tsx`
- `apps/web/src/app/(app)/to-dashboard/[orgSlug]/tournaments/tournaments-list-client.tsx`

- [ ] **Step 3: Add redirects for old /to-dashboard routes**

Add redirect pages at the old `/to-dashboard` routes, or add redirects to `next.config.ts`:

```ts
const nextConfig: NextConfig = {
  // ... existing config
  redirects: async () => [
    {
      source: "/to-dashboard",
      destination: "/dashboard/community",
      permanent: true,
    },
    {
      source: "/to-dashboard/:slug",
      destination: "/dashboard/community/:slug",
      permanent: true,
    },
    {
      source: "/to-dashboard/:slug/:path*",
      destination: "/dashboard/community/:slug/:path*",
      permanent: true,
    },
  ],
};
```

- [ ] **Step 4: Update communities page Request button**

In `apps/web/src/app/(app)/communities/page.tsx`, update the "Request a Community" button href from `/communities/create` to `/dashboard/community/request`.

- [ ] **Step 5: Run full quality checks**

```bash
pnpm typecheck && pnpm lint && pnpm test
```

- [ ] **Step 6: Commit**

```bash
git add -u
git add apps/web/next.config.ts
git commit -m "feat: update all /to-dashboard references to /dashboard/community, add redirects"
```

---

## Phase 4: Tournament Management Redesign (6 → 3 tabs)

### Task 12: Restructure tournament manage tabs

**Files:**

- Modify: `apps/web/src/app/(app)/to-dashboard/[orgSlug]/tournaments/[tournamentSlug]/manage/tournament-manage-client.tsx`
- Create: `apps/web/src/app/(app)/dashboard/community/[orgSlug]/tournaments/[tournamentSlug]/manage/settings/page.tsx` (route-based settings)

Consolidate the 6-tab tournament management into 3 tabs (Overview, Players, Live) + 2 header actions (Settings route, Audit sheet).

- [ ] **Step 1: Read the current tournament-manage-client.tsx thoroughly**

Read the full file to understand all tab rendering logic, props, and state management.

- [ ] **Step 2: Modify the tab structure**

Update the tab list from 6 tabs to 3:

```tsx
const MANAGE_TABS = [
  { key: "overview", label: "Overview", icon: Trophy },
  { key: "players", label: "Players", icon: Users },
  { key: "live", label: "Live", icon: Radio },
] as const;
```

- [ ] **Step 3: Update the Overview tab panel**

The Overview tab should now include:

- All existing overview content (round state machine, stats, format info)
- **Added:** Judge queue preview (top N items from the pairings judge component)
- **Added:** Top 3 standings preview (from the standings component)

- [ ] **Step 4: Rename Registrations → Players tab**

The Players tab renders the existing `TournamentRegistrations` component. The tab label changes from "Registrations" to "Players" and shows a player count badge.

- [ ] **Step 5: Create the Live tab**

The Live tab combines:

- `TournamentPairingsJudge` component (match list + judge queue)
- `TournamentStandings` component (appended below)

Both components already exist — they're composed into one tab panel.

- [ ] **Step 6: Add Settings and Audit Log as header actions**

In the tournament manage header (above the tabs), add:

- "⚙ Settings" link → navigates to `.../manage/settings`
- "📋 Audit" button → opens a Sheet with the audit log component

- [ ] **Step 7: Create the settings route page**

Create `apps/web/src/app/(app)/dashboard/community/[orgSlug]/tournaments/[tournamentSlug]/manage/settings/page.tsx`:

This renders the existing `TournamentSettings` component as a standalone page instead of a tab.

- [ ] **Step 8: Run full quality checks**

```bash
pnpm typecheck && pnpm lint && pnpm test
```

- [ ] **Step 9: Visual verification**

Navigate to a tournament manage page. Verify:

- 3 tabs visible (Overview, Players, Live)
- Settings accessible via header button
- Audit log opens as a sheet
- Judge queue visible on Overview tab
- All match functionality works in Live tab
- All registration functionality works in Players tab

- [ ] **Step 10: Commit**

```bash
git add -u
git add apps/web/src/app/(app)/dashboard/community/
git commit -m "feat: consolidate tournament management from 6 tabs to 3 + header actions"
```

---

## Phase 5: Final Cleanup

### Task 13: Delete old files and verify

- [ ] **Step 1: Delete old TO-dashboard directory**

After verifying all community pages work under `/dashboard/community/`, delete the old directory:

```bash
git rm -r apps/web/src/app/(app)/to-dashboard/
```

**Important:** Only do this after confirming:

- All community pages render correctly at `/dashboard/community/[slug]/*`
- All redirects from `/to-dashboard/*` work
- No remaining imports reference files in the deleted directory

- [ ] **Step 2: Clean up unused notification/invitation pages**

The old notification and invitation pages now just redirect. The `NotificationCenter` component and test files should stay (they're still used by the inbox page). Delete only the redirect stub pages if desired, or leave them for backwards compatibility.

- [ ] **Step 3: Run final quality checks**

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm test:e2e
```

- [ ] **Step 4: Visual verification — full walkthrough**

Using Playwright MCP, verify every dashboard route:

**Player dashboard:**

- `/dashboard` — Home with stats, inbox preview, tournaments
- `/dashboard/alts` — Alts management
- `/dashboard/inbox` — Inbox with notifications
- `/dashboard/history` — Tournament history + stats
- `/dashboard/settings/profile` — Profile settings
- `/dashboard/settings/account` — Account settings

**Community dashboard:**

- `/dashboard/community/[slug]` — Community overview
- `/dashboard/community/[slug]/tournaments` — Tournament list
- `/dashboard/community/[slug]/tournaments/create` — Create tournament
- `/dashboard/community/[slug]/tournaments/[slug]/manage` — Manage (3 tabs)
- `/dashboard/community/[slug]/staff` — Staff management
- `/dashboard/community/[slug]/settings` — Community settings

**Redirects:**

- `/dashboard/overview` → `/dashboard`
- `/dashboard/notifications` → `/dashboard/inbox`
- `/dashboard/invitations` → `/dashboard/inbox`
- `/to-dashboard/[slug]` → `/dashboard/community/[slug]`

**Mobile:**

- Hamburger menu opens sidebar drawer
- All pages accessible from drawer

**Dark mode:**

- Sidebar adapts correctly

- [ ] **Step 5: Commit and finalize**

```bash
git add -u
git commit -m "chore: delete old to-dashboard directory, final cleanup"
```

---

## Summary

| Phase | Tasks      | What Ships                                             |
| ----- | ---------- | ------------------------------------------------------ |
| 1     | Tasks 1-5  | Sidebar shell, Home page, settings fix                 |
| 2     | Tasks 6-8  | Inbox page, History page, redirects                    |
| 3     | Tasks 9-11 | Community pages under sidebar, /to-dashboard redirects |
| 4     | Task 12    | Tournament management 3-tab redesign                   |
| 5     | Task 13    | Cleanup, delete old files, full verification           |
