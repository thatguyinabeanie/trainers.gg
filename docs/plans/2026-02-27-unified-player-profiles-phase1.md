# Unified Player Profiles — Phase 1 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the player profile page with header, bio editing, and Overview tab (stats + recent tournaments) — replacing the current placeholder at `/players/[handle]`.

**Architecture:** Server Component page fetches cached public data (player profile + tournament history + stats). Client component handles Bluesky profile integration and tab switching. Follows the same pattern as `/organizations/[orgSlug]/page.tsx` — `unstable_cache` + `createStaticClient` for public data, `createClientReadOnly` for auth checks.

**Tech Stack:** Next.js 16 (App Router, RSC), Supabase (PostgreSQL), TanStack Query (client-side Bluesky), Base UI Tabs, Fishery factories for tests.

---

### Task 1: Add `getPlayerProfileByHandle` query

**Files:**
- Modify: `packages/supabase/src/queries/users.ts` (append new function)
- Test: `packages/supabase/src/queries/__tests__/users.test.ts` (create if not exists)

**Step 1: Write the failing test**

Create test file `packages/supabase/src/queries/__tests__/users.test.ts`:

```typescript
import { getPlayerProfileByHandle } from "../users";
import { createMockClient } from "@trainers/test-utils/mocks";
import type { TypedClient } from "../../client";

describe("getPlayerProfileByHandle", () => {
  it("returns alt with user data when username matches an alt", async () => {
    const mockAlt = {
      id: 1,
      user_id: "user-1",
      username: "ash_ketchum",
      bio: "Gotta catch em all",
      avatar_url: "https://play.pokemonshowdown.com/sprites/gen5/pikachu.png",
      tier: null,
      tier_expires_at: null,
      tier_started_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user: {
        id: "user-1",
        username: "ash_ketchum",
        country: "US",
        did: null,
        pds_handle: null,
      },
    };

    const mockClient = createMockClient();
    mockClient.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          maybeSingle: jest.fn().mockResolvedValue({
            data: mockAlt,
            error: null,
          }),
        }),
      }),
    });

    const result = await getPlayerProfileByHandle(
      mockClient as unknown as TypedClient,
      "ash_ketchum"
    );

    expect(result).toEqual(mockAlt);
  });

  it("returns null when no alt matches the username", async () => {
    const mockClient = createMockClient();
    mockClient.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          maybeSingle: jest.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      }),
    });

    const result = await getPlayerProfileByHandle(
      mockClient as unknown as TypedClient,
      "nonexistent"
    );

    expect(result).toBeNull();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @trainers/supabase test -- --testPathPattern="users.test" --no-coverage`
Expected: FAIL — `getPlayerProfileByHandle` is not exported from `../users`

**Step 3: Write minimal implementation**

Append to `packages/supabase/src/queries/users.ts`:

```typescript
/**
 * Get player profile by alt username for public profile pages.
 * Returns alt record with joined user data, or null if not found.
 */
export async function getPlayerProfileByHandle(
  supabase: TypedClient,
  handle: string
) {
  const { data, error } = await supabase
    .from("alts")
    .select(
      `
      *,
      user:users(id, username, country, did, pds_handle)
    `
    )
    .eq("username", handle)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}
```

Also add the export to `packages/supabase/src/queries/index.ts` if not already re-exporting from users.

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @trainers/supabase test -- --testPathPattern="users.test" --no-coverage`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/supabase/src/queries/users.ts packages/supabase/src/queries/__tests__/users.test.ts
git commit -m "feat: add getPlayerProfileByHandle query for public player profiles"
```

---

### Task 2: Add `getPlayerTournamentHistory` query (public version)

**Files:**
- Modify: `packages/supabase/src/queries/tournaments.ts` (append new function)
- Test: `packages/supabase/src/queries/__tests__/tournaments-player-history.test.ts` (create)

**Step 1: Write the failing test**

Create `packages/supabase/src/queries/__tests__/tournaments-player-history.test.ts`:

```typescript
import { getPlayerTournamentHistory } from "../tournaments";
import { createMockClient } from "@trainers/test-utils/mocks";
import type { TypedClient } from "../../client";

describe("getPlayerTournamentHistory", () => {
  it("returns empty array when no registrations exist for the alt", async () => {
    const mockClient = createMockClient();
    mockClient.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        in: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      }),
    });

    const result = await getPlayerTournamentHistory(
      mockClient as unknown as TypedClient,
      [1]
    );

    expect(result).toEqual([]);
  });

  it("returns formatted tournament history for completed tournaments", async () => {
    const mockRegistrations = [
      {
        id: 1,
        alt_id: 1,
        status: "checked_in",
        registered_at: "2026-01-15T00:00:00Z",
        team_id: 10,
        tournament: {
          id: 100,
          name: "VGC League #24",
          slug: "vgc-league-24",
          start_date: "2026-01-15",
          end_date: "2026-01-15",
          status: "completed",
          format: "vgc",
          player_count: 32,
          organization: {
            id: 1,
            name: "VGC League",
            slug: "vgc-league",
          },
        },
      },
    ];

    const mockStandings = [
      {
        tournament_id: 100,
        alt_id: 1,
        rank: 1,
        game_wins: 6,
        game_losses: 0,
      },
    ];

    const mockTeamPokemon = [
      { team_id: 10, team_position: 1, pokemon: { species: "Pelipper" } },
      { team_id: 10, team_position: 2, pokemon: { species: "Palafin" } },
    ];

    const mockClient = createMockClient();

    // First call: tournament_registrations
    let callCount = 0;
    mockClient.from.mockImplementation((table: string) => {
      if (table === "tournament_registrations") {
        return {
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: mockRegistrations,
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "tournament_standings") {
        return {
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({
                data: mockStandings,
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "team_pokemon") {
        return {
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: mockTeamPokemon,
                error: null,
              }),
            }),
          }),
        };
      }
      return { select: jest.fn().mockReturnThis() };
    });

    const result = await getPlayerTournamentHistory(
      mockClient as unknown as TypedClient,
      [1]
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      tournamentName: "VGC League #24",
      tournamentSlug: "vgc-league-24",
      placement: 1,
      wins: 6,
      losses: 0,
      teamPokemon: ["Pelipper", "Palafin"],
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @trainers/supabase test -- --testPathPattern="tournaments-player-history" --no-coverage`
Expected: FAIL — `getPlayerTournamentHistory` is not exported

**Step 3: Write minimal implementation**

Append to `packages/supabase/src/queries/tournaments.ts`:

```typescript
/**
 * Get tournament history for specific alt IDs (public, no auth required).
 * Adapted from getUserTournamentHistory for public profile pages.
 * Returns completed tournaments with placement, record, and team Pokemon.
 */
export async function getPlayerTournamentHistory(
  supabase: TypedClient,
  altIds: number[]
) {
  if (altIds.length === 0) return [];

  const { data: registrations, error } = await supabase
    .from("tournament_registrations")
    .select(
      `
      id,
      alt_id,
      status,
      registered_at,
      team_id,
      tournament:tournaments!tournament_registrations_tournament_id_fkey (
        id,
        name,
        slug,
        start_date,
        end_date,
        status,
        format,
        player_count,
        organization:organizations!tournaments_organization_id_fkey (
          id,
          name,
          slug
        )
      )
    `
    )
    .in("alt_id", altIds)
    .order("registered_at", { ascending: false });

  if (error) throw error;
  if (!registrations || registrations.length === 0) return [];

  // Filter to completed tournaments only
  const completedRegistrations = registrations.filter(
    (r) =>
      r.tournament &&
      typeof r.tournament === "object" &&
      "status" in r.tournament &&
      r.tournament.status === "completed"
  );

  if (completedRegistrations.length === 0) return [];

  // Get tournament IDs for standings lookup
  const completedTournamentIds = completedRegistrations
    .map((r) =>
      typeof r.tournament === "object" && r.tournament && "id" in r.tournament
        ? (r.tournament.id as number)
        : 0
    )
    .filter((id) => id > 0);

  // Fetch standings for placement/record
  const standingsMap = new Map<
    string,
    { rank: number; wins: number; losses: number }
  >();

  if (completedTournamentIds.length > 0) {
    const { data: standings } = await supabase
      .from("tournament_standings")
      .select("tournament_id, alt_id, rank, game_wins, game_losses")
      .in("tournament_id", completedTournamentIds)
      .in("alt_id", altIds);

    for (const standing of standings ?? []) {
      standingsMap.set(`${standing.tournament_id}_${standing.alt_id}`, {
        rank: standing.rank ?? 0,
        wins: standing.game_wins ?? 0,
        losses: standing.game_losses ?? 0,
      });
    }
  }

  // Fetch team Pokemon
  const teamIds = completedRegistrations
    .filter((r) => r.team_id)
    .map((r) => r.team_id as number);

  const teamPokemonMap = new Map<number, string[]>();

  if (teamIds.length > 0) {
    const { data: teamPokemon } = await supabase
      .from("team_pokemon")
      .select(
        `
        team_id,
        team_position,
        pokemon:pokemon!team_pokemon_pokemon_id_fkey(species)
      `
      )
      .in("team_id", teamIds)
      .order("team_position", { ascending: true });

    for (const tp of teamPokemon ?? []) {
      const existing = teamPokemonMap.get(tp.team_id) ?? [];
      const species =
        tp.pokemon && typeof tp.pokemon === "object" && "species" in tp.pokemon
          ? (tp.pokemon.species as string)
          : "";
      if (species) {
        existing.push(species);
      }
      teamPokemonMap.set(tp.team_id, existing);
    }
  }

  // Build result
  return completedRegistrations.map((r) => {
    const tournament =
      r.tournament && typeof r.tournament === "object" ? r.tournament : null;
    const org =
      tournament &&
      "organization" in tournament &&
      tournament.organization &&
      typeof tournament.organization === "object"
        ? tournament.organization
        : null;

    const standing = standingsMap.get(`${tournament?.id}_${r.alt_id}`);
    const teamPokemon = r.team_id
      ? (teamPokemonMap.get(r.team_id) ?? [])
      : [];

    return {
      id: r.id,
      tournamentId:
        tournament && "id" in tournament ? (tournament.id as number) : 0,
      tournamentName:
        tournament && "name" in tournament ? (tournament.name as string) : "",
      tournamentSlug:
        tournament && "slug" in tournament ? (tournament.slug as string) : "",
      organizationName: org && "name" in org ? (org.name as string) : "",
      organizationSlug: org && "slug" in org ? (org.slug as string) : "",
      startDate:
        tournament && "start_date" in tournament
          ? (tournament.start_date as string | null)
          : null,
      format:
        tournament && "format" in tournament
          ? (tournament.format as string | null)
          : null,
      playerCount:
        tournament && "player_count" in tournament
          ? (tournament.player_count as number | null)
          : null,
      placement: standing?.rank ?? null,
      wins: standing?.wins ?? 0,
      losses: standing?.losses ?? 0,
      teamPokemon,
    };
  });
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @trainers/supabase test -- --testPathPattern="tournaments-player-history" --no-coverage`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/supabase/src/queries/tournaments.ts packages/supabase/src/queries/__tests__/tournaments-player-history.test.ts
git commit -m "feat: add getPlayerTournamentHistory query for public player profiles"
```

---

### Task 3: Add `getPlayerLifetimeStats` query

**Files:**
- Modify: `packages/supabase/src/queries/tournaments.ts` (append new function)
- Test: `packages/supabase/src/queries/__tests__/tournaments-player-stats.test.ts` (create)

**Step 1: Write the failing test**

Create `packages/supabase/src/queries/__tests__/tournaments-player-stats.test.ts`:

```typescript
import { getPlayerLifetimeStats } from "../tournaments";
import { createMockClient } from "@trainers/test-utils/mocks";
import type { TypedClient } from "../../client";

describe("getPlayerLifetimeStats", () => {
  it("returns zero stats when no tournament data exists", async () => {
    const mockClient = createMockClient();
    mockClient.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        in: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }),
    });

    const result = await getPlayerLifetimeStats(
      mockClient as unknown as TypedClient,
      [1]
    );

    expect(result).toEqual({
      tournamentCount: 0,
      totalWins: 0,
      totalLosses: 0,
      winRate: 0,
      bestPlacement: null,
      formats: [],
    });
  });

  it("aggregates stats across multiple tournaments", async () => {
    const mockStats = [
      {
        tournament_id: 1,
        alt_id: 1,
        match_wins: 3,
        match_losses: 0,
        final_ranking: 1,
        tournament: { format: "vgc" },
      },
      {
        tournament_id: 2,
        alt_id: 1,
        match_wins: 4,
        match_losses: 2,
        final_ranking: 5,
        tournament: { format: "vgc" },
      },
      {
        tournament_id: 3,
        alt_id: 1,
        match_wins: 2,
        match_losses: 3,
        final_ranking: 12,
        tournament: { format: "ou" },
      },
    ];

    const mockClient = createMockClient();
    mockClient.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        in: jest.fn().mockResolvedValue({
          data: mockStats,
          error: null,
        }),
      }),
    });

    const result = await getPlayerLifetimeStats(
      mockClient as unknown as TypedClient,
      [1]
    );

    expect(result.tournamentCount).toBe(3);
    expect(result.totalWins).toBe(9);
    expect(result.totalLosses).toBe(5);
    expect(result.winRate).toBeCloseTo(64.3, 0);
    expect(result.bestPlacement).toBe(1);
    expect(result.formats).toContain("vgc");
    expect(result.formats).toContain("ou");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @trainers/supabase test -- --testPathPattern="tournaments-player-stats" --no-coverage`
Expected: FAIL — `getPlayerLifetimeStats` is not exported

**Step 3: Write minimal implementation**

Append to `packages/supabase/src/queries/tournaments.ts`:

```typescript
/**
 * Get lifetime aggregated stats for a player across all tournaments.
 * Returns tournament count, win/loss totals, win rate, best placement, and formats played.
 */
export async function getPlayerLifetimeStats(
  supabase: TypedClient,
  altIds: number[]
) {
  const emptyStats = {
    tournamentCount: 0,
    totalWins: 0,
    totalLosses: 0,
    winRate: 0,
    bestPlacement: null as number | null,
    formats: [] as string[],
  };

  if (altIds.length === 0) return emptyStats;

  const { data, error } = await supabase
    .from("tournament_player_stats")
    .select(
      `
      tournament_id,
      alt_id,
      match_wins,
      match_losses,
      final_ranking,
      tournament:tournaments!tournament_player_stats_tournament_id_fkey(format)
    `
    )
    .in("alt_id", altIds);

  if (error || !data || data.length === 0) return emptyStats;

  let totalWins = 0;
  let totalLosses = 0;
  let bestPlacement: number | null = null;
  const formatSet = new Set<string>();

  for (const stat of data) {
    totalWins += stat.match_wins ?? 0;
    totalLosses += stat.match_losses ?? 0;

    const ranking = stat.final_ranking;
    if (ranking != null && ranking > 0) {
      if (bestPlacement === null || ranking < bestPlacement) {
        bestPlacement = ranking;
      }
    }

    const format =
      stat.tournament &&
      typeof stat.tournament === "object" &&
      "format" in stat.tournament
        ? (stat.tournament.format as string | null)
        : null;
    if (format) formatSet.add(format);
  }

  const totalMatches = totalWins + totalLosses;
  const winRate = totalMatches > 0 ? (totalWins / totalMatches) * 100 : 0;

  return {
    tournamentCount: data.length,
    totalWins,
    totalLosses,
    winRate,
    bestPlacement,
    formats: Array.from(formatSet),
  };
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @trainers/supabase test -- --testPathPattern="tournaments-player-stats" --no-coverage`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/supabase/src/queries/tournaments.ts packages/supabase/src/queries/__tests__/tournaments-player-stats.test.ts
git commit -m "feat: add getPlayerLifetimeStats query for profile overview"
```

---

### Task 4: Add `player` cache tag

**Files:**
- Modify: `apps/web/src/lib/cache.ts`

**Step 1: Add the cache tag**

Add to `CacheTags` in `apps/web/src/lib/cache.ts`:

```typescript
/** Tag for a specific player profile */
player: (handle: string) => `player:${handle}`,
```

**Step 2: Verify typecheck passes**

Run: `pnpm --filter @trainers/web typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add apps/web/src/lib/cache.ts
git commit -m "feat: add player cache tag for profile page caching"
```

---

### Task 5: Build the player profile page (Server Component)

**Files:**
- Replace: `apps/web/src/app/players/[handle]/page.tsx`

**Step 1: Write the server page**

Replace `apps/web/src/app/players/[handle]/page.tsx` with:

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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { COUNTRIES } from "@trainers/utils";
import { PlayerProfileTabs } from "./player-profile-tabs";

// On-demand revalidation only (no time-based)
export const revalidate = false;

interface PlayerPageProps {
  params: Promise<{ handle: string }>;
}

/**
 * Cached player profile fetcher.
 * Uses handle-specific cache tag for granular invalidation.
 */
const getCachedPlayerProfile = (handle: string) =>
  unstable_cache(
    async () => {
      const supabase = createStaticClient();
      return getPlayerProfileByHandle(supabase, handle);
    },
    [`player-profile-${handle}`],
    { tags: [CacheTags.player(handle)] }
  )();

/**
 * Get current user ID (not cached — user-specific).
 */
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
}: PlayerPageProps): Promise<Metadata> {
  const { handle } = await params;
  const profile = await getCachedPlayerProfile(handle);

  if (!profile) {
    return { title: "Player Not Found | trainers.gg" };
  }

  return {
    title: `${profile.username} | trainers.gg`,
    description: profile.bio
      ? `${profile.username} — ${profile.bio}`
      : `View ${profile.username}'s profile on trainers.gg`,
  };
}

// ============================================================================
// Sub-Components
// ============================================================================

function Breadcrumb({ playerName }: { playerName: string }) {
  return (
    <div className="text-muted-foreground mb-4 flex items-center gap-2 text-sm">
      <Link href="/players" className="hover:underline">
        Players
      </Link>
      <span>/</span>
      <span className="text-foreground">{playerName}</span>
    </div>
  );
}

function PlayerHeader({
  profile,
  canEdit,
}: {
  profile: NonNullable<Awaited<ReturnType<typeof getPlayerProfileByHandle>>>;
  canEdit: boolean;
}) {
  const user =
    profile.user && typeof profile.user === "object" ? profile.user : null;
  const countryCode =
    user && "country" in user ? (user.country as string | null) : null;
  const country = countryCode
    ? COUNTRIES.find((c) => c.code === countryCode)
    : null;

  return (
    <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
      <div className="flex items-start gap-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={profile.avatar_url ?? undefined} />
          <AvatarFallback className="text-xl">
            {profile.username.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold">{profile.username}</h1>
            {country && <span title={country.name}>{country.flag}</span>}
          </div>
          {profile.bio && (
            <p className="text-muted-foreground mt-2 max-w-xl whitespace-pre-wrap">
              {profile.bio}
            </p>
          )}
        </div>
      </div>

      {canEdit && (
        <Link href="/dashboard/settings/profile">
          <Button variant="outline">
            <Settings className="mr-2 h-4 w-4" />
            Edit Profile
          </Button>
        </Link>
      )}
    </div>
  );
}

// ============================================================================
// Main Page
// ============================================================================

export default async function PlayerPage({ params }: PlayerPageProps) {
  const { handle } = await params;

  const [profile, currentUserId] = await Promise.all([
    getCachedPlayerProfile(handle),
    getCurrentUserId(),
  ]);

  if (!profile) {
    notFound();
  }

  const canEdit = currentUserId === profile.user_id;

  return (
    <div className="container mx-auto px-4 py-8">
      <Breadcrumb playerName={profile.username} />
      <PlayerHeader profile={profile} canEdit={canEdit} />
      <PlayerProfileTabs altId={profile.id} handle={handle} />
    </div>
  );
}
```

**Step 2: Verify typecheck (will fail until tabs component exists)**

This depends on Task 6 (PlayerProfileTabs). Continue to next task.

---

### Task 6: Build the Overview tab and tab switcher

**Files:**
- Create: `apps/web/src/app/players/[handle]/player-profile-tabs.tsx`
- Create: `apps/web/src/app/players/[handle]/overview-tab.tsx`

**Step 1: Create the tab switcher**

Create `apps/web/src/app/players/[handle]/player-profile-tabs.tsx`:

```typescript
"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OverviewTab } from "./overview-tab";

type PlayerTab = "overview" | "tournaments";

interface PlayerProfileTabsProps {
  altId: number;
  handle: string;
}

export function PlayerProfileTabs({ altId, handle }: PlayerProfileTabsProps) {
  const [activeTab, setActiveTab] = useState<PlayerTab>("overview");

  return (
    <div className="space-y-4">
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as PlayerTab)}
      >
        <TabsList
          variant="line"
          className="h-auto w-full justify-start gap-0 rounded-none border-none bg-transparent p-0"
        >
          <TabsTrigger value="overview" className="flex-1 px-4 py-3">
            Overview
          </TabsTrigger>
          <TabsTrigger value="tournaments" className="flex-1 px-4 py-3">
            Tournaments
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="border-border -mt-4 border-b" />

      {activeTab === "overview" ? (
        <OverviewTab altId={altId} handle={handle} />
      ) : (
        <div className="text-muted-foreground py-12 text-center text-sm">
          Full tournament history coming soon.
        </div>
      )}
    </div>
  );
}
```

**Step 2: Create the Overview tab**

Create `apps/web/src/app/players/[handle]/overview-tab.tsx`:

```typescript
"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Target, Medal, Gamepad2 } from "lucide-react";
import Link from "next/link";
import { getLabel, tournamentStatusLabels } from "@trainers/utils";

interface OverviewTabProps {
  altId: number;
  handle: string;
}

// Types for the API responses
interface PlayerStats {
  tournamentCount: number;
  totalWins: number;
  totalLosses: number;
  winRate: number;
  bestPlacement: number | null;
  formats: string[];
}

interface TournamentHistoryEntry {
  id: number;
  tournamentName: string;
  tournamentSlug: string;
  organizationName: string;
  startDate: string | null;
  format: string | null;
  playerCount: number | null;
  placement: number | null;
  wins: number;
  losses: number;
  teamPokemon: string[];
}

async function fetchPlayerStats(altId: number): Promise<PlayerStats> {
  const res = await fetch(`/api/players/${altId}/stats`);
  if (!res.ok) throw new Error("Failed to fetch stats");
  return res.json();
}

async function fetchPlayerTournaments(
  altId: number
): Promise<TournamentHistoryEntry[]> {
  const res = await fetch(`/api/players/${altId}/tournaments`);
  if (!res.ok) throw new Error("Failed to fetch tournaments");
  return res.json();
}

function StatsCards({ stats }: { stats: PlayerStats }) {
  const mostPlayedFormat =
    stats.formats.length > 0 ? stats.formats[0] : null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardContent className="flex items-center gap-4 pt-6">
          <div className="bg-primary/10 rounded-full p-3">
            <Trophy className="text-primary h-6 w-6" />
          </div>
          <div>
            <p className="text-2xl font-bold">{stats.tournamentCount}</p>
            <p className="text-muted-foreground text-sm">Tournaments</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-center gap-4 pt-6">
          <div className="bg-primary/10 rounded-full p-3">
            <Target className="text-primary h-6 w-6" />
          </div>
          <div>
            <p className="text-2xl font-bold">
              {stats.winRate > 0 ? `${stats.winRate.toFixed(0)}%` : "—"}
            </p>
            <p className="text-muted-foreground text-sm">Win Rate</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-center gap-4 pt-6">
          <div className="bg-primary/10 rounded-full p-3">
            <Medal className="text-primary h-6 w-6" />
          </div>
          <div>
            <p className="text-2xl font-bold">
              {stats.bestPlacement != null ? `#${stats.bestPlacement}` : "—"}
            </p>
            <p className="text-muted-foreground text-sm">Best Placement</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-center gap-4 pt-6">
          <div className="bg-primary/10 rounded-full p-3">
            <Gamepad2 className="text-primary h-6 w-6" />
          </div>
          <div>
            <p className="text-2xl font-bold">
              {mostPlayedFormat?.toUpperCase() ?? "—"}
            </p>
            <p className="text-muted-foreground text-sm">Main Format</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function RecentTournaments({
  tournaments,
}: {
  tournaments: TournamentHistoryEntry[];
}) {
  if (tournaments.length === 0) {
    return (
      <div className="text-muted-foreground py-8 text-center text-sm">
        No tournament history yet.
      </div>
    );
  }

  // Show at most 5 recent tournaments
  const recent = tournaments.slice(0, 5);

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Recent Tournaments</h2>
      {recent.map((t) => (
        <Card key={t.id}>
          <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1">
              <Link
                href={`/tournaments/${t.tournamentSlug}`}
                className="font-semibold hover:underline"
              >
                {t.tournamentName}
              </Link>
              <p className="text-muted-foreground text-sm">
                {t.organizationName}
                {t.startDate &&
                  ` · ${new Date(t.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}
              </p>
            </div>
            <div className="flex items-center gap-6">
              {t.placement != null && (
                <div className="text-right">
                  <p className="font-semibold">
                    #{t.placement}
                    {t.playerCount != null && (
                      <span className="text-muted-foreground font-normal">
                        {" "}
                        / {t.playerCount}
                      </span>
                    )}
                  </p>
                  <p className="text-muted-foreground text-xs">Placement</p>
                </div>
              )}
              <div className="text-right">
                <p className="font-semibold">
                  {t.wins}–{t.losses}
                </p>
                <p className="text-muted-foreground text-xs">Record</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="flex items-center gap-4 pt-6">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-7 w-16" />
                <Skeleton className="h-4 w-20" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="space-y-3">
        <Skeleton className="h-6 w-40" />
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-12 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function OverviewTab({ altId, handle }: OverviewTabProps) {
  const {
    data: stats,
    isLoading: statsLoading,
  } = useQuery({
    queryKey: ["player", "stats", altId],
    queryFn: () => fetchPlayerStats(altId),
  });

  const {
    data: tournaments,
    isLoading: tournamentsLoading,
  } = useQuery({
    queryKey: ["player", "tournaments", altId],
    queryFn: () => fetchPlayerTournaments(altId),
  });

  if (statsLoading || tournamentsLoading) {
    return <OverviewSkeleton />;
  }

  return (
    <div className="space-y-6">
      {stats && <StatsCards stats={stats} />}
      {tournaments && <RecentTournaments tournaments={tournaments} />}
    </div>
  );
}
```

**Step 3: Verify typecheck**

Run: `pnpm --filter @trainers/web typecheck`
Expected: Should pass (or will identify import issues to fix)

**Step 4: Commit**

```bash
git add apps/web/src/app/players/[handle]/page.tsx apps/web/src/app/players/[handle]/player-profile-tabs.tsx apps/web/src/app/players/[handle]/overview-tab.tsx
git commit -m "feat: build player profile page with header and overview tab"
```

---

### Task 7: Create API routes for player stats and tournaments

**Files:**
- Create: `apps/web/src/app/api/players/[altId]/stats/route.ts`
- Create: `apps/web/src/app/api/players/[altId]/tournaments/route.ts`

**Step 1: Create the stats API route**

Create `apps/web/src/app/api/players/[altId]/stats/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { createStaticClient } from "@/lib/supabase/server";
import { getPlayerLifetimeStats } from "@trainers/supabase/queries";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ altId: string }> }
) {
  const { altId } = await params;
  const id = Number(altId);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid alt ID" }, { status: 400 });
  }

  const supabase = createStaticClient();
  const stats = await getPlayerLifetimeStats(supabase, [id]);

  return NextResponse.json(stats);
}
```

**Step 2: Create the tournaments API route**

Create `apps/web/src/app/api/players/[altId]/tournaments/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { createStaticClient } from "@/lib/supabase/server";
import { getPlayerTournamentHistory } from "@trainers/supabase/queries";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ altId: string }> }
) {
  const { altId } = await params;
  const id = Number(altId);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid alt ID" }, { status: 400 });
  }

  const supabase = createStaticClient();
  const tournaments = await getPlayerTournamentHistory(supabase, [id]);

  return NextResponse.json(tournaments);
}
```

**Step 3: Verify routes work**

Run: `pnpm --filter @trainers/web typecheck`
Expected: PASS

**Step 4: Commit**

```bash
git add apps/web/src/app/api/players/
git commit -m "feat: add API routes for player stats and tournament history"
```

---

### Task 8: Add bio field to profile settings page

**Files:**
- Modify: `apps/web/src/app/dashboard/settings/profile/page.tsx`
- Modify: `apps/web/src/actions/profile.ts` (update `getCurrentUserProfile` + `updateProfile`)

**Step 1: Update `getCurrentUserProfile` to return bio**

In `apps/web/src/actions/profile.ts`, find the `getCurrentUserProfile` function and ensure it returns the bio field from the alt. Check the existing code — if it already fetches the alt with `bio`, just ensure it's included in the return object.

Update to include `bio`:
```typescript
// In the return of getCurrentUserProfile, add:
bio: alt?.bio ?? null,
```

**Step 2: Update `updateProfile` action to accept bio**

In `apps/web/src/actions/profile.ts`, update the `updateProfile` function to accept and save a `bio` field:

```typescript
// Add bio to the updates type
const updates: {
  username?: string;
  birthDate?: string;
  country?: string;
  bio?: string;
} = {};

// Add bio handling in the function body
if (data.bio !== undefined) {
  // Update the alt's bio
  const { error: bioError } = await supabase
    .from("alts")
    .update({ bio: data.bio })
    .eq("id", mainAltId);

  if (bioError) throw bioError;
}
```

**Step 3: Add bio textarea to settings page**

In `apps/web/src/app/dashboard/settings/profile/page.tsx`, add state for bio and the textarea field:

Add state:
```typescript
const [bio, setBio] = useState("");
const [originalBio, setOriginalBio] = useState("");
```

Load bio in the `loadProfile` effect:
```typescript
setBio(profile.bio ?? "");
setOriginalBio(profile.bio ?? "");
```

Add change detection:
```typescript
const hasBioChanged = bio !== originalBio;
```

Update `hasAnyChange`:
```typescript
const hasAnyChange = hasUsernameChanged || hasBirthDateChanged || hasCountryChanged || hasBioChanged;
```

Add bio to save handler:
```typescript
if (hasBioChanged) {
  updates.bio = bio;
}
```

Update originals on success:
```typescript
setOriginalBio(bio);
```

Add textarea UI (place between username and birth date fields):
```html
<div className="space-y-2">
  <Label htmlFor="bio">Bio</Label>
  <textarea
    id="bio"
    value={bio}
    onChange={(e) => setBio(e.target.value)}
    placeholder="Tell us about yourself..."
    maxLength={160}
    rows={3}
    className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
  />
  <p className="text-muted-foreground text-xs">
    {bio.length}/160 characters
  </p>
</div>
```

**Step 4: Run tests**

Run: `pnpm --filter @trainers/web test -- --testPathPattern="profile" --no-coverage`
Expected: Existing tests should still pass. Add a test for bio update if tests exist for `updateProfile`.

**Step 5: Commit**

```bash
git add apps/web/src/actions/profile.ts apps/web/src/app/dashboard/settings/profile/page.tsx
git commit -m "feat: add bio editing to profile settings page"
```

---

### Task 9: Export new queries from package index

**Files:**
- Modify: `packages/supabase/src/queries/index.ts`

**Step 1: Verify exports**

Check that `getPlayerProfileByHandle`, `getPlayerTournamentHistory`, and `getPlayerLifetimeStats` are exported from `packages/supabase/src/queries/index.ts`. If not, add re-exports:

```typescript
export {
  getPlayerProfileByHandle,
  // ... existing user exports
} from "./users";

export {
  getPlayerTournamentHistory,
  getPlayerLifetimeStats,
  // ... existing tournament exports
} from "./tournaments";
```

**Step 2: Verify typecheck**

Run: `pnpm typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add packages/supabase/src/queries/index.ts
git commit -m "feat: export player profile queries from package index"
```

---

### Task 10: Check COUNTRIES has `flag` field, and verify end-to-end

**Files:**
- Check: `packages/utils/src/countries.ts` for flag emoji field

**Step 1: Verify COUNTRIES shape**

Check `packages/utils/src/countries.ts` to confirm each country entry has a `flag` property (emoji flag). If it doesn't exist, the header country display will need adjustment — use the country name instead.

**Step 2: Run full test suite**

Run: `pnpm test --no-coverage`
Expected: All tests pass

**Step 3: Run typecheck across monorepo**

Run: `pnpm typecheck`
Expected: PASS

**Step 4: Start dev server and manually verify**

Run: `pnpm dev:web+backend`

1. Navigate to `/players/ash_ketchum` (seed user) — verify profile renders with header
2. Navigate to `/players/nonexistent` — verify 404 page
3. Log in as `player@trainers.local` / `Password123!` and visit own profile — verify "Edit Profile" button appears
4. Go to `/dashboard/settings/profile` — verify bio field is present and saveable
5. Save a bio, then visit the profile page — verify bio displays

**Step 5: Final commit if any fixups needed**

```bash
git add -A
git commit -m "fix: address Phase 1 integration issues"
```

---

### Task 11: Write integration tests for the page

**Files:**
- Create: `apps/web/src/app/players/[handle]/__tests__/page.test.tsx`

**Step 1: Write tests for the page rendering**

```typescript
import { render, screen } from "@testing-library/react";
import { userFactory, altFactory } from "@trainers/test-utils/factories";

// Mock modules
jest.mock("@/lib/supabase/server", () => ({
  createStaticClient: jest.fn(),
  createClientReadOnly: jest.fn(),
}));

jest.mock("next/cache", () => ({
  unstable_cache: (_fn: Function) => _fn,
}));

jest.mock("next/navigation", () => ({
  notFound: jest.fn(),
}));

jest.mock("@trainers/supabase/queries", () => ({
  getPlayerProfileByHandle: jest.fn(),
}));

import { getPlayerProfileByHandle } from "@trainers/supabase/queries";
import { notFound } from "next/navigation";
import PlayerPage from "../page";

const mockGetPlayerProfileByHandle =
  getPlayerProfileByHandle as jest.MockedFunction<
    typeof getPlayerProfileByHandle
  >;

describe("PlayerPage", () => {
  const mockUser = userFactory.build({ country: "US" });
  const mockAlt = altFactory.build({
    user_id: mockUser.id,
    username: "ash_ketchum",
    bio: "Gotta catch em all",
    avatar_url:
      "https://play.pokemonshowdown.com/sprites/gen5/pikachu.png",
  });

  it("calls notFound when player does not exist", async () => {
    mockGetPlayerProfileByHandle.mockResolvedValue(null);

    await PlayerPage({ params: Promise.resolve({ handle: "nonexistent" }) });

    expect(notFound).toHaveBeenCalled();
  });

  it("renders player username in the header", async () => {
    mockGetPlayerProfileByHandle.mockResolvedValue({
      ...mockAlt,
      user: mockUser,
    });

    const page = await PlayerPage({
      params: Promise.resolve({ handle: "ash_ketchum" }),
    });
    render(page);

    expect(screen.getByText("ash_ketchum")).toBeInTheDocument();
  });

  it("renders bio when present", async () => {
    mockGetPlayerProfileByHandle.mockResolvedValue({
      ...mockAlt,
      user: mockUser,
    });

    const page = await PlayerPage({
      params: Promise.resolve({ handle: "ash_ketchum" }),
    });
    render(page);

    expect(screen.getByText("Gotta catch em all")).toBeInTheDocument();
  });
});
```

**Step 2: Run tests**

Run: `pnpm --filter @trainers/web test -- --testPathPattern="players" --no-coverage`
Expected: PASS

**Step 3: Commit**

```bash
git add apps/web/src/app/players/
git commit -m "test: add player profile page tests"
```

---

## Summary

Phase 1 delivers:
1. `getPlayerProfileByHandle` query — fetch alt + user by username
2. `getPlayerTournamentHistory` query — public tournament history for a player
3. `getPlayerLifetimeStats` query — aggregate win/loss/tournament stats
4. Player cache tag for granular invalidation
5. Full player profile page at `/players/[handle]` with:
   - Header (avatar, username, country flag, bio, edit button)
   - Tab switcher (Overview + Tournaments placeholder)
   - Overview tab with stats cards + recent tournaments
6. API routes for client-side data fetching
7. Bio editing in profile settings
8. Tests for queries and page rendering
