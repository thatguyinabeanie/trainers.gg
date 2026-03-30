# User Profile Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate the competitive player profile from `/players/[handle]` to `/u/[handle]`, expand it with tabbed content (Overview, Tournaments, Teams, Social, Achievements), add public alt chips to the header, and add a "My Profile" link to the topnav auth dropdown.

**Architecture:** The profile page is a Next.js Server Component that fetches data server-side via `getPlayerProfileByHandle` (cached with `unstable_cache`). Client-side tab content uses TanStack Query against existing `/api/players/stats` and `/api/players/tournaments` endpoints. A new `is_public` column on `alts` controls which alts appear as public chips in the header.

**Tech Stack:** Next.js 16 App Router, Supabase (PostgreSQL), TanStack Query v5, shadcn/ui tabs, `@trainers/supabase/queries`, Fishery factories (`@trainers/test-utils`), Jest + React Testing Library.

---

## Task 1: DB Migration — add `is_public` to `alts`

**Files:**

- Create: `packages/supabase/supabase/migrations/20260303000001_add_alt_is_public.sql`

**Step 1: Create the migration file**

```sql
-- Add is_public flag to alts for opt-in public visibility
-- Default false = private (privacy by default)
ALTER TABLE "public"."alts"
  ADD COLUMN IF NOT EXISTS "is_public" boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN "public"."alts"."is_public" IS
  'When true, this alt is visible on the user''s public profile page. Privacy by default.';
```

**Step 2: Apply migration locally**

```bash
pnpm db:reset
```

Expected: Supabase resets and replays all migrations. No errors.

**Step 3: Regenerate TypeScript types**

```bash
pnpm generate-types
```

Expected: `packages/supabase/src/types.ts` updated. The `alts` row type now includes `is_public: boolean`.

**Step 4: Commit**

```bash
git add packages/supabase/supabase/migrations/20260303000001_add_alt_is_public.sql
git add packages/supabase/src/types.ts
git commit -m "feat(db): add is_public to alts for public alt visibility"
```

---

## Task 2: Update `getPlayerProfileByHandle` to include `is_public`

**Files:**

- Modify: `packages/supabase/src/queries/users.ts` (lines 234–272)

**Step 1: Write the failing test**

File: `packages/supabase/src/__tests__/queries/users.test.ts`

Find the existing test file or create one. Add:

```typescript
import { getPlayerProfileByHandle } from "../queries/users";
import { createMockClient } from "@trainers/test-utils/mocks";

describe("getPlayerProfileByHandle", () => {
  it("includes is_public on each alt", async () => {
    const mockClient = createMockClient();
    // Simulate: users row found, alts row has is_public
    mockClient.from.mockImplementation((table: string) => {
      if (table === "users") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({
                  data: {
                    id: "user-1",
                    username: "ash",
                    country: "US",
                    did: null,
                    pds_handle: null,
                    main_alt_id: 1,
                    created_at: "2026-01-01T00:00:00Z",
                  },
                  error: null,
                }),
            }),
          }),
        };
      }
      if (table === "alts") {
        return {
          select: () => ({
            eq: () => ({
              order: () =>
                Promise.resolve({
                  data: [
                    {
                      id: 1,
                      username: "ash",
                      bio: null,
                      avatar_url: null,
                      tier: "free",
                      tier_expires_at: null,
                      is_public: true,
                    },
                  ],
                  error: null,
                }),
            }),
          }),
        };
      }
      return mockClient.from(table);
    });

    const result = await getPlayerProfileByHandle(mockClient as any, "ash");
    expect(result?.alts[0]).toHaveProperty("is_public");
  });
});
```

**Step 2: Run test to verify it fails**

```bash
pnpm --filter @trainers/supabase test -- --testPathPattern="users.test"
```

Expected: FAIL — `is_public` not in select query yet.

**Step 3: Update the alts select in `getPlayerProfileByHandle`**

In `packages/supabase/src/queries/users.ts`, find the alts select (line ~234):

```typescript
// BEFORE:
const { data: alts, error: altsError } = await supabase
  .from("alts")
  .select("id, username, bio, avatar_url, tier, tier_expires_at")
  .eq("user_id", userId)
  .order("id", { ascending: true });

// AFTER:
const { data: alts, error: altsError } = await supabase
  .from("alts")
  .select("id, username, bio, avatar_url, tier, tier_expires_at, is_public")
  .eq("user_id", userId)
  .order("id", { ascending: true });
```

**Step 4: Run test to verify it passes**

```bash
pnpm --filter @trainers/supabase test -- --testPathPattern="users.test"
```

Expected: PASS.

**Step 5: Commit**

```bash
git add packages/supabase/src/queries/users.ts
git add packages/supabase/src/__tests__/queries/users.test.ts
git commit -m "feat(supabase): include is_public in getPlayerProfileByHandle alts"
```

---

## Task 3: Create `/u/[handle]` page (migrate from `/players/[handle]`)

**Files:**

- Create: `apps/web/src/app/u/[handle]/page.tsx`

**Step 1: Create the directory**

```bash
mkdir -p apps/web/src/app/u/\[handle\]
```

**Step 2: Create the page component**

Copy `apps/web/src/app/players/[handle]/page.tsx` to `apps/web/src/app/u/[handle]/page.tsx`, then make these changes:

1. Remove the `Breadcrumb` component entirely (no `/players` directory any more)
2. Remove the `Breadcrumb` usage from `PlayerPage`
3. Add public alts chips to `PlayerHeader`
4. Update the import of `PlayerProfileTabs` to the new location

Full file content:

```typescript
import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  createStaticClient,
  createClientReadOnly,
} from "@/lib/supabase/server";
import { getPlayerProfileByHandle } from "@trainers/supabase/queries";
import { CacheTags } from "@/lib/cache";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings } from "lucide-react";
import { getCountryName } from "@trainers/utils";
import { PlayerProfileTabs } from "./player-profile-tabs";

export const revalidate = false;

interface UserPageProps {
  params: Promise<{ handle: string }>;
}

const getCachedPlayerProfile = (handle: string) =>
  unstable_cache(
    async () => {
      const supabase = createStaticClient();
      return getPlayerProfileByHandle(supabase, handle);
    },
    [`player-profile-${handle}`],
    { tags: [CacheTags.player(handle)] }
  )();

async function getCurrentUserId(): Promise<string | null> {
  try {
    const supabase = await createClientReadOnly();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: UserPageProps): Promise<Metadata> {
  const { handle } = await params;
  const profile = await getCachedPlayerProfile(handle);

  if (!profile) return { title: "Player Not Found" };

  const displayName = profile.mainAlt?.username ?? profile.username ?? handle;
  const bio = profile.mainAlt?.bio;
  const description = bio
    ? bio.slice(0, 160)
    : `${displayName}'s player profile on trainers.gg`;

  return {
    title: `${displayName} - Player Profile`,
    description,
    openGraph: {
      title: `${displayName} - Player Profile`,
      description,
      type: "profile",
      ...(profile.mainAlt?.avatar_url
        ? { images: [{ url: profile.mainAlt.avatar_url }] }
        : {}),
    },
  };
}

function countryCodeToFlag(code: string): string {
  const upper = code.toUpperCase();
  const offset = 0x1f1e6 - 65;
  return String.fromCodePoint(
    upper.charCodeAt(0) + offset,
    upper.charCodeAt(1) + offset
  );
}

type PlayerProfile = NonNullable<
  Awaited<ReturnType<typeof getPlayerProfileByHandle>>
>;

function PlayerHeader({
  profile,
  canEdit,
}: {
  profile: PlayerProfile;
  canEdit: boolean;
}) {
  const mainAlt = profile.mainAlt;
  const countryCode = profile.country;
  const countryName = countryCode ? getCountryName(countryCode) : null;
  // Only show alts the user has opted to make public, excluding the main alt
  const publicAlts = profile.alts.filter(
    (a) => a.is_public && a.id !== mainAlt?.id
  );

  return (
    <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
      <div className="flex items-start gap-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={mainAlt?.avatar_url ?? undefined} />
          <AvatarFallback className="text-xl">
            {(mainAlt?.username ?? profile.username ?? "?")
              .slice(0, 2)
              .toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div>
          <h1 className="text-3xl font-bold">
            {mainAlt?.username ?? profile.username}
          </h1>

          <p className="text-muted-foreground mt-0.5 text-sm">
            @{profile.username}
          </p>

          {countryCode && countryName && (
            <p className="text-muted-foreground mt-1 flex items-center gap-1.5 text-sm">
              <span>{countryCodeToFlag(countryCode)}</span>
              <span>{countryName}</span>
            </p>
          )}

          {mainAlt?.bio && (
            <p className="text-muted-foreground mt-2 max-w-xl whitespace-pre-wrap">
              {mainAlt.bio}
            </p>
          )}

          {publicAlts.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {publicAlts.map((alt) => (
                <Link key={alt.id} href={`/u/${alt.username}`}>
                  <Badge variant="secondary" className="text-xs">
                    @{alt.username}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        {canEdit && (
          <Link href="/dashboard/settings/profile">
            <Button variant="outline">
              <Settings className="mr-2 h-4 w-4" />
              Edit Profile
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}

export default async function UserProfilePage({ params }: UserPageProps) {
  const { handle } = await params;

  const [profile, currentUserId] = await Promise.all([
    getCachedPlayerProfile(handle),
    getCurrentUserId(),
  ]);

  if (!profile) notFound();

  const canEdit = currentUserId != null && profile.userId === currentUserId;

  return (
    <div className="container mx-auto px-4 py-8">
      <PlayerHeader profile={profile} canEdit={canEdit} />
      <PlayerProfileTabs altIds={profile.altIds} handle={handle} pdsHandle={profile.pdsHandle} />
    </div>
  );
}
```

**Step 3: Verify it compiles**

```bash
pnpm --filter @trainers/web typecheck
```

Expected: No errors (will fail until `PlayerProfileTabs` is created in next task).

---

## Task 4: Create `PlayerProfileTabs` with all five tabs

**Files:**

- Create: `apps/web/src/app/u/[handle]/player-profile-tabs.tsx`
- Create: `apps/web/src/app/u/[handle]/overview-tab.tsx` (copy from players/)
- Create: `apps/web/src/app/u/[handle]/tournaments-tab.tsx`
- Create: `apps/web/src/app/u/[handle]/teams-tab.tsx`
- Create: `apps/web/src/app/u/[handle]/social-tab.tsx`
- Create: `apps/web/src/app/u/[handle]/achievements-tab.tsx`

**Step 1: Copy the overview tab**

```bash
cp apps/web/src/app/players/\[handle\]/overview-tab.tsx \
   apps/web/src/app/u/\[handle\]/overview-tab.tsx
```

No changes needed — the component is self-contained.

**Step 2: Create `tournaments-tab.tsx`** (shows full history, not just last 5)

```typescript
"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Calendar } from "lucide-react";

interface TournamentEntry {
  id: number;
  tournamentId: number;
  tournamentName: string;
  tournamentSlug: string;
  organizationName: string;
  organizationSlug: string;
  startDate: string | null;
  format: string | null;
  playerCount: number | null;
  placement: number | null;
  wins: number;
  losses: number;
  teamPokemon: string[];
}

const playerKeys = {
  tournaments: (handle: string) => ["player", handle, "tournaments"] as const,
};

function formatPlacement(rank: number): string {
  const suffixes = ["th", "st", "nd", "rd"];
  const remainder = rank % 100;
  const suffix =
    suffixes[(remainder - 20) % 10] ?? suffixes[remainder] ?? suffixes[0];
  return `${rank}${suffix}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface TournamentsTabProps {
  altIds: number[];
  handle: string;
}

export function TournamentsTab({ altIds, handle }: TournamentsTabProps) {
  const { data: tournaments, isLoading } = useQuery<TournamentEntry[]>({
    queryKey: playerKeys.tournaments(handle),
    queryFn: async () => {
      const res = await fetch(
        `/api/players/tournaments?altIds=${altIds.join(",")}`
      );
      if (!res.ok) throw new Error("Failed to fetch tournament history");
      return res.json();
    },
    enabled: altIds.length > 0,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="flex items-center gap-4 pt-6">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-6 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!tournaments || tournaments.length === 0) {
    return (
      <div className="text-muted-foreground py-16 text-center text-sm">
        No completed tournaments yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tournaments.map((entry) => (
        <Card key={entry.id}>
          <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 mt-0.5 rounded-full p-2">
                <Trophy className="text-primary h-4 w-4" />
              </div>
              <div className="min-w-0">
                <Link
                  href={`/tournaments/${entry.tournamentSlug}`}
                  className="hover:text-primary font-medium transition-colors"
                >
                  {entry.tournamentName}
                </Link>
                <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
                  {entry.organizationName && (
                    <Link
                      href={`/organizations/${entry.organizationSlug}`}
                      className="hover:underline"
                    >
                      {entry.organizationName}
                    </Link>
                  )}
                  {entry.startDate && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(entry.startDate)}
                    </span>
                  )}
                  {entry.format && (
                    <span className="text-muted-foreground/70">
                      {entry.format}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 text-sm sm:text-right">
              <div>
                <span className="text-muted-foreground">Record: </span>
                <span className="font-medium">
                  {entry.wins}-{entry.losses}
                </span>
              </div>
              {entry.placement != null && (
                <div className="bg-muted rounded-md px-2.5 py-1 text-xs font-semibold">
                  {formatPlacement(entry.placement)}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

**Step 3: Create `teams-tab.tsx`** (stub — teams feature not yet built)

```typescript
"use client";

import { Users } from "lucide-react";

export function TeamsTab() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Users className="text-muted-foreground/40 mb-4 h-12 w-12" />
      <h3 className="text-foreground mb-1 font-semibold">No teams yet</h3>
      <p className="text-muted-foreground text-sm">
        Team sheets will appear here once submitted to tournaments.
      </p>
    </div>
  );
}
```

**Step 4: Create `social-tab.tsx`** (migrate Bluesky social content)

```typescript
"use client";

import { ProfileCard, ProfileTabs } from "@/components/bluesky/profile";
import { useProfile } from "@/hooks/bluesky";
import { useBlueskyUser } from "@/hooks/bluesky";
import { Skeleton } from "@/components/ui/skeleton";
import { AtSign } from "lucide-react";

interface SocialTabProps {
  /** The user's Bluesky PDS handle (e.g. "ash_ketchum.trainers.gg") */
  pdsHandle: string | null;
}

export function SocialTab({ pdsHandle }: SocialTabProps) {
  if (!pdsHandle) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <AtSign className="text-muted-foreground/40 mb-4 h-12 w-12" />
        <h3 className="text-foreground mb-1 font-semibold">No Bluesky account linked</h3>
        <p className="text-muted-foreground text-sm">
          This player hasn't connected a Bluesky account.
        </p>
      </div>
    );
  }

  return <SocialTabInner pdsHandle={pdsHandle} />;
}

function SocialTabInner({ pdsHandle }: { pdsHandle: string }) {
  const { blueskyDid } = useBlueskyUser();
  const { data: profile, isLoading } = useProfile(pdsHandle);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-muted-foreground py-16 text-center text-sm">
        Bluesky profile could not be loaded.
      </div>
    );
  }

  const isOwnProfile = blueskyDid === profile.did;

  return (
    <div className="space-y-6">
      <ProfileCard profile={profile} isOwnProfile={isOwnProfile} />
      <ProfileTabs actor={pdsHandle} isOwnProfile={isOwnProfile} />
    </div>
  );
}
```

**Step 5: Create `achievements-tab.tsx`** (stub)

```typescript
"use client";

import { Award } from "lucide-react";

export function AchievementsTab() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Award className="text-muted-foreground/40 mb-4 h-12 w-12" />
      <h3 className="text-foreground mb-1 font-semibold">No achievements yet</h3>
      <p className="text-muted-foreground text-sm">
        Badges and trophies will appear here as you compete.
      </p>
    </div>
  );
}
```

**Step 6: Create `player-profile-tabs.tsx`** with all five tabs

```typescript
"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OverviewTab } from "./overview-tab";
import { TournamentsTab } from "./tournaments-tab";
import { TeamsTab } from "./teams-tab";
import { SocialTab } from "./social-tab";
import { AchievementsTab } from "./achievements-tab";

type ProfileTab = "overview" | "tournaments" | "teams" | "social" | "achievements";

interface PlayerProfileTabsProps {
  altIds: number[];
  handle: string;
  pdsHandle: string | null;
}

const TAB_CLASS =
  "data-[state=active]:border-primary hover:bg-muted/50 flex-1 rounded-none border-b-2 border-transparent px-4 py-3 font-semibold transition-colors data-[state=active]:bg-transparent sm:flex-initial";

export function PlayerProfileTabs({
  altIds,
  handle,
  pdsHandle,
}: PlayerProfileTabsProps) {
  const [activeTab, setActiveTab] = useState<ProfileTab>("overview");

  return (
    <div className="space-y-4">
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as ProfileTab)}
      >
        <TabsList
          variant="line"
          className="h-auto w-full justify-start gap-0 rounded-none border-none bg-transparent p-0"
        >
          <TabsTrigger value="overview" className={TAB_CLASS}>
            Overview
          </TabsTrigger>
          <TabsTrigger value="tournaments" className={TAB_CLASS}>
            Tournaments
          </TabsTrigger>
          <TabsTrigger value="teams" className={TAB_CLASS}>
            Teams
          </TabsTrigger>
          <TabsTrigger value="social" className={TAB_CLASS}>
            Social
          </TabsTrigger>
          <TabsTrigger value="achievements" className={TAB_CLASS}>
            Achievements
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="border-border -mt-4 border-b" />

      {activeTab === "overview" && (
        <OverviewTab altIds={altIds} handle={handle} />
      )}
      {activeTab === "tournaments" && (
        <TournamentsTab altIds={altIds} handle={handle} />
      )}
      {activeTab === "teams" && <TeamsTab />}
      {activeTab === "social" && <SocialTab pdsHandle={pdsHandle} />}
      {activeTab === "achievements" && <AchievementsTab />}
    </div>
  );
}
```

**Step 7: Typecheck**

```bash
pnpm --filter @trainers/web typecheck
```

Expected: No errors.

**Step 8: Commit**

```bash
git add apps/web/src/app/u/
git commit -m "feat(web): add /u/[handle] user profile page with tabbed layout"
```

---

## Task 5: Add "My Profile" link to topnav auth dropdown

**Files:**

- Modify: `apps/web/src/components/topnav-auth-section.tsx`
- Modify: `apps/web/src/components/__tests__/topnav.test.tsx` (add auth-section tests)
- Create: `apps/web/src/components/__tests__/topnav-auth-section.test.tsx`

**Step 1: Write the failing test**

Create `apps/web/src/components/__tests__/topnav-auth-section.test.tsx`:

```typescript
import { render, screen } from "@testing-library/react";
import { TopNavAuthSection } from "../topnav-auth-section";

// Mock dependencies
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
}));

jest.mock("@/components/auth/auth-provider", () => ({
  useAuth: jest.fn(),
  getUserDisplayName: jest.fn(() => "ash_ketchum"),
}));

jest.mock("@/lib/supabase", () => ({
  useSupabaseQuery: jest.fn(() => ({ data: [] })),
}));

jest.mock("@trainers/supabase", () => ({
  listMyOrganizations: jest.fn(),
}));

jest.mock("@/components/notification-bell", () => ({
  NotificationBell: () => null,
}));

jest.mock("@/components/theme-switcher", () => ({
  ThemeSwitcher: () => null,
}));

jest.mock("@/lib/sudo/actions", () => ({
  toggleSudoMode: jest.fn(),
  checkSudoStatus: jest.fn(() =>
    Promise.resolve({ isActive: false, isSiteAdmin: false })
  ),
}));

jest.mock("@/lib/maintenance", () => ({
  isMaintenanceModeEnabled: jest.fn(() => false),
}));

const { useAuth } = require("@/components/auth/auth-provider");

describe("TopNavAuthSection — My Profile link", () => {
  it("renders 'My Profile' link when user has a username", () => {
    useAuth.mockReturnValue({
      user: {
        id: "user-1",
        user_metadata: { username: "ash_ketchum" },
        profile: { username: "ash_ketchum" },
      },
      signOut: jest.fn(),
      loading: false,
    });

    render(<TopNavAuthSection />);

    const link = screen.getByRole("link", { name: /my profile/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/u/ash_ketchum");
  });

  it("does not render 'My Profile' link when user has no username", () => {
    useAuth.mockReturnValue({
      user: {
        id: "user-1",
        user_metadata: {},
        profile: null,
      },
      signOut: jest.fn(),
      loading: false,
    });

    render(<TopNavAuthSection />);

    expect(
      screen.queryByRole("link", { name: /my profile/i })
    ).not.toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
pnpm --filter @trainers/web test -- --testPathPattern="topnav-auth-section"
```

Expected: FAIL — "My Profile" link not found.

**Step 3: Update `topnav-auth-section.tsx`**

Add the `User` icon import and the "My Profile" item. Find these lines:

```typescript
import {
  LogOut,
  Settings,
  LayoutDashboard,
  Building2,
  ChevronRight,
  Shield,
  ShieldAlert,
} from "lucide-react";
```

Change to:

```typescript
import {
  LogOut,
  Settings,
  LayoutDashboard,
  Building2,
  ChevronRight,
  Shield,
  ShieldAlert,
  User,
} from "lucide-react";
```

Then add username resolution. After the `const hasOrganizations` line, add:

```typescript
const username =
  user.profile?.username ??
  (user.user_metadata?.username as string | undefined);
```

Then add the "My Profile" `DropdownMenuItem` as the first item after the separator following the header. Find:

```typescript
<DropdownMenuSeparator />
<DropdownMenuItem>
  <Link href="/dashboard" className="flex items-center gap-1.5">
    <LayoutDashboard className="mr-2 h-4 w-4" />
    <span>Dashboard</span>
  </Link>
</DropdownMenuItem>
```

Replace with:

```typescript
<DropdownMenuSeparator />
{username && (
  <DropdownMenuItem>
    <Link href={`/u/${username}`} className="flex items-center gap-1.5">
      <User className="mr-2 h-4 w-4" />
      <span>My Profile</span>
    </Link>
  </DropdownMenuItem>
)}
<DropdownMenuItem>
  <Link href="/dashboard" className="flex items-center gap-1.5">
    <LayoutDashboard className="mr-2 h-4 w-4" />
    <span>Dashboard</span>
  </Link>
</DropdownMenuItem>
```

**Step 4: Run tests to verify they pass**

```bash
pnpm --filter @trainers/web test -- --testPathPattern="topnav-auth-section"
```

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/web/src/components/topnav-auth-section.tsx
git add apps/web/src/components/__tests__/topnav-auth-section.test.tsx
git commit -m "feat(web): add My Profile link to topnav auth dropdown"
```

---

## Task 6: Write tests for the profile page tab structure

**Files:**

- Create: `apps/web/src/app/u/[handle]/__tests__/player-profile-tabs.test.tsx`

**Step 1: Write the tests**

```typescript
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PlayerProfileTabs } from "../player-profile-tabs";

// Mock all tab content components
jest.mock("../overview-tab", () => ({
  OverviewTab: () => <div data-testid="overview-tab">Overview Content</div>,
}));
jest.mock("../tournaments-tab", () => ({
  TournamentsTab: () => <div data-testid="tournaments-tab">Tournaments Content</div>,
}));
jest.mock("../teams-tab", () => ({
  TeamsTab: () => <div data-testid="teams-tab">Teams Content</div>,
}));
jest.mock("../social-tab", () => ({
  SocialTab: () => <div data-testid="social-tab">Social Content</div>,
}));
jest.mock("../achievements-tab", () => ({
  AchievementsTab: () => <div data-testid="achievements-tab">Achievements Content</div>,
}));

const defaultProps = {
  altIds: [1],
  handle: "ash_ketchum",
  pdsHandle: "ash_ketchum.trainers.gg",
};

describe("PlayerProfileTabs", () => {
  it("defaults to the Overview tab", () => {
    render(<PlayerProfileTabs {...defaultProps} />);
    expect(screen.getByTestId("overview-tab")).toBeInTheDocument();
    expect(screen.queryByTestId("tournaments-tab")).not.toBeInTheDocument();
  });

  it("switches to Tournaments tab when clicked", async () => {
    const user = userEvent.setup();
    render(<PlayerProfileTabs {...defaultProps} />);
    await user.click(screen.getByRole("tab", { name: "Tournaments" }));
    expect(screen.getByTestId("tournaments-tab")).toBeInTheDocument();
    expect(screen.queryByTestId("overview-tab")).not.toBeInTheDocument();
  });

  it("switches to Teams tab when clicked", async () => {
    const user = userEvent.setup();
    render(<PlayerProfileTabs {...defaultProps} />);
    await user.click(screen.getByRole("tab", { name: "Teams" }));
    expect(screen.getByTestId("teams-tab")).toBeInTheDocument();
  });

  it("switches to Social tab when clicked", async () => {
    const user = userEvent.setup();
    render(<PlayerProfileTabs {...defaultProps} />);
    await user.click(screen.getByRole("tab", { name: "Social" }));
    expect(screen.getByTestId("social-tab")).toBeInTheDocument();
  });

  it("switches to Achievements tab when clicked", async () => {
    const user = userEvent.setup();
    render(<PlayerProfileTabs {...defaultProps} />);
    await user.click(screen.getByRole("tab", { name: "Achievements" }));
    expect(screen.getByTestId("achievements-tab")).toBeInTheDocument();
  });

  it("renders all five tab triggers", () => {
    render(<PlayerProfileTabs {...defaultProps} />);
    expect(screen.getByRole("tab", { name: "Overview" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Tournaments" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Teams" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Social" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Achievements" })).toBeInTheDocument();
  });
});
```

**Step 2: Run tests**

```bash
pnpm --filter @trainers/web test -- --testPathPattern="player-profile-tabs"
```

Expected: PASS.

**Step 3: Commit**

```bash
git add apps/web/src/app/u/\[handle\]/__tests__/
git commit -m "test(web): add player profile tabs tests"
```

---

## Task 7: Delete old `/players/[handle]` and `/profile/[handle]` directories

**Files:**

- Delete: `apps/web/src/app/players/` (entire directory)
- Delete: `apps/web/src/app/profile/` (entire directory — social content merged into `/u/[handle]` social tab)

**Step 1: Confirm no other files reference `/players/[handle]`**

```bash
grep -r "href.*\"/players/" apps/web/src --include="*.tsx" --include="*.ts" -l
grep -r "href.*\"/profile/" apps/web/src --include="*.tsx" --include="*.ts" -l
```

Expected: No results (or only files in the directories being deleted). If other files reference these routes, update them first before deleting.

**Step 2: Delete the directories**

```bash
rm -rf apps/web/src/app/players
rm -rf apps/web/src/app/profile
```

**Step 3: Typecheck and test**

```bash
pnpm --filter @trainers/web typecheck
pnpm --filter @trainers/web test
```

Expected: No errors or failures.

**Step 4: Commit**

```bash
git add -A
git commit -m "feat(web): remove old /players and /profile routes (migrated to /u/[handle])"
```

---

## Task 8: Final verification

**Step 1: Run all tests**

```bash
pnpm test
```

Expected: All tests pass.

**Step 2: Typecheck all packages**

```bash
pnpm typecheck
```

Expected: No errors.

**Step 3: Smoke test in browser**

Start dev server:

```bash
pnpm dev:web+backend
```

Verify:

- Navigate to `/u/ash_ketchum` — profile page loads with header, tabs
- Click each tab — switches correctly
- Sign in as `player@trainers.local` (password: `Password123!`) — "My Profile" link appears in topnav dropdown, links to `/u/ash_ketchum`
- Navigate to `/players/ash_ketchum` — 404 (expected)

**Step 4: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "chore: final cleanup for user profile page migration"
```

---

## Summary of Changes

| File                                                                         | Action                                        |
| ---------------------------------------------------------------------------- | --------------------------------------------- |
| `packages/supabase/supabase/migrations/20260303000001_add_alt_is_public.sql` | Create                                        |
| `packages/supabase/src/types.ts`                                             | Regenerated                                   |
| `packages/supabase/src/queries/users.ts`                                     | Update alts select to include `is_public`     |
| `apps/web/src/app/u/[handle]/page.tsx`                                       | Create (migrated + enhanced from `/players/`) |
| `apps/web/src/app/u/[handle]/player-profile-tabs.tsx`                        | Create (5 tabs)                               |
| `apps/web/src/app/u/[handle]/overview-tab.tsx`                               | Create (copied from `/players/`)              |
| `apps/web/src/app/u/[handle]/tournaments-tab.tsx`                            | Create (full history)                         |
| `apps/web/src/app/u/[handle]/teams-tab.tsx`                                  | Create (stub)                                 |
| `apps/web/src/app/u/[handle]/social-tab.tsx`                                 | Create (migrated from `/profile/`)            |
| `apps/web/src/app/u/[handle]/achievements-tab.tsx`                           | Create (stub)                                 |
| `apps/web/src/app/u/[handle]/__tests__/player-profile-tabs.test.tsx`         | Create                                        |
| `apps/web/src/components/topnav-auth-section.tsx`                            | Add "My Profile" link                         |
| `apps/web/src/components/__tests__/topnav-auth-section.test.tsx`             | Create                                        |
| `apps/web/src/app/players/`                                                  | Delete entire directory                       |
| `apps/web/src/app/profile/`                                                  | Delete entire directory                       |
