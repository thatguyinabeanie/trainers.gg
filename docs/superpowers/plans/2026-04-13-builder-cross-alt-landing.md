# Builder Cross-Alt Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/dashboard/teams` page showing all teams across all alts in a data table, and update the sidebar Builder link to use smart routing based on the current alt selection state.

**Architecture:** New Server Component page at `/dashboard/teams` fetches teams via a new cross-alt query, passes them to a client component with filter chips and a data table. The sidebar's Builder href changes based on whether a specific alt is selected or "All Alts" is active.

**Tech Stack:** Next.js 16 Server Component, TanStack Query v5, Supabase queries with `TypedClient`, existing `PageHeader`/`EmptyState`/`Badge` UI components.

---

### Task 1: Add `getTeamsForUser` Query

**Files:**
- Modify: `packages/supabase/src/queries/teams.ts`
- Modify: `packages/supabase/src/queries/index.ts`

- [ ] **Step 1: Add the `CrossAltTeamListItem` type and `getTeamsForUser` function**

In `packages/supabase/src/queries/teams.ts`, add after the `TeamListItem` type (after line 32):

```typescript
/** Team list item with the owning alt's username for cross-alt views. */
export type CrossAltTeamListItem = TeamListItem & {
  alt_username: string;
};
```

Then add after `getTeamsForAltByFormatFull` (at the end of the file):

```typescript
// =============================================================================
// Cross-Alt Team Queries
// =============================================================================

/**
 * Get all teams across all of a user's alts for the cross-alt landing page.
 * Joins through alts to get the owning alt's username for display.
 * Ordered by updated_at desc (most recently edited first).
 */
export async function getTeamsForUser(
  supabase: TypedClient,
  userId: string
): Promise<CrossAltTeamListItem[]> {
  const { data: teams, error } = await supabase
    .from("teams")
    .select(
      `
      id,
      name,
      format,
      is_public,
      updated_at,
      created_at,
      alt:alts!created_by(username),
      team_pokemon(
        id,
        team_position,
        pokemon:pokemon(id, species, is_shiny)
      )
    `
    )
    .eq("alts.user_id", userId)
    .order("updated_at", { ascending: false });

  if (error)
    throw new Error(`Failed to fetch teams for user: ${error.message}`);

  // Flatten the alt join into alt_username
  return (teams ?? []).map((t) => {
    const { alt, ...rest } = t;
    return {
      ...rest,
      alt_username: (alt as unknown as { username: string })?.username ?? "",
    };
  });
}
```

- [ ] **Step 2: Export from barrel file**

In `packages/supabase/src/queries/index.ts`, update the team builder exports block:

```typescript
// Team builder queries
export {
  getTeamsForAltList,
  getTeamsForAltFull,
  getTeamWithPokemon,
  getTeamsForAltByFormatFull,
  getTeamsForUser,
  type TeamListItem,
  type CrossAltTeamListItem,
  type TeamWithPokemon,
} from "./teams";
```

- [ ] **Step 3: Verify types compile**

Run: `pnpm typecheck --filter @trainers/supabase`
Expected: passes

- [ ] **Step 4: Commit**

```bash
git add packages/supabase/src/queries/teams.ts packages/supabase/src/queries/index.ts
git commit -m "feat: add getTeamsForUser cross-alt query"
```

---

### Task 2: Create Cross-Alt Teams Page

**Files:**
- Create: `apps/web/src/app/(dashboard)/dashboard/teams/page.tsx`
- Create: `apps/web/src/app/(dashboard)/dashboard/teams/loading.tsx`

- [ ] **Step 1: Create the loading skeleton**

Create `apps/web/src/app/(dashboard)/dashboard/teams/loading.tsx`:

```tsx
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/dashboard/page-header";

export default function AllTeamsLoading() {
  return (
    <>
      <PageHeader title="Team Builder" />
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        {/* Filter chips skeleton */}
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-7 w-10 rounded-full" />
          <Skeleton className="h-7 w-20 rounded-full" />
          <Skeleton className="h-7 w-20 rounded-full" />
          <div className="border-border mx-1 h-5 border-l" />
          <Skeleton className="h-7 w-28 rounded-full" />
          <Skeleton className="h-7 w-28 rounded-full" />
        </div>

        {/* Table rows skeleton */}
        <div className="flex flex-col gap-0">
          {/* Header */}
          <div className="flex items-center gap-4 border-b px-3 py-2">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="ml-auto h-3 w-16" />
          </div>
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex items-center gap-4 border-b px-3 py-3">
              <div className="flex items-center gap-2">
                {Array.from({ length: 6 }, (_, j) => (
                  <Skeleton key={j} className="size-5 rounded" />
                ))}
                <Skeleton className="ml-2 h-4 w-32" />
              </div>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-14 rounded-full" />
              <Skeleton className="h-4 w-14" />
              <Skeleton className="ml-auto h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Create the server page**

Create `apps/web/src/app/(dashboard)/dashboard/teams/page.tsx`:

```tsx
import { notFound, redirect } from "next/navigation";

import { getActiveFormats } from "@trainers/pokemon";
import {
  getTeamsForUser,
  getCurrentUserAlts,
  hasTeamBuilderAccess,
} from "@trainers/supabase";

import { getUser, createClientReadOnly } from "@/lib/supabase/server";
import { PageHeader } from "@/components/dashboard/page-header";
import { AllTeamsClient } from "@/components/team-builder/all-teams-client";

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export const metadata = {
  title: "Team Builder — trainers.gg",
  description: "Manage your Pokemon teams across all alts",
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function AllTeamsPage() {
  const user = await getUser();
  if (!user) {
    redirect("/sign-in");
  }

  const supabase = await createClientReadOnly();

  // Gate on team builder feature flag
  const canAccess = await hasTeamBuilderAccess(supabase, user.id);
  if (!canAccess) {
    notFound();
  }

  const [teams, alts, activeFormats] = await Promise.all([
    getTeamsForUser(supabase, user.id),
    getCurrentUserAlts(supabase),
    Promise.resolve(getActiveFormats()),
  ]);

  return (
    <>
      <PageHeader title="Team Builder" />
      <AllTeamsClient
        initialTeams={teams}
        alts={alts}
        activeFormats={activeFormats}
        userId={user.id}
      />
    </>
  );
}
```

- [ ] **Step 3: Verify page compiles**

Run: `pnpm typecheck --filter @trainers/web`
Expected: may fail until AllTeamsClient exists (Task 3). That's fine — proceed to Task 3.

- [ ] **Step 4: Commit**

```bash
git add "apps/web/src/app/(dashboard)/dashboard/teams/"
git commit -m "feat: add cross-alt teams page route and loading skeleton"
```

---

### Task 3: Create AllTeamsClient Component

**Files:**
- Create: `apps/web/src/components/team-builder/all-teams-client.tsx`

This is the client component that renders the filter chips, data table, action buttons, and empty state. It reuses `SpriteSlot` from the existing `team-card.tsx` pattern.

- [ ] **Step 1: Create the client component**

Create `apps/web/src/components/team-builder/all-teams-client.tsx`:

```tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Plus, Upload } from "lucide-react";

import {
  type GameFormat,
  getFormatLabel,
  getPokemonSprite,
} from "@trainers/pokemon";
import { type CrossAltTeamListItem } from "@trainers/supabase";
import { formatTimeAgo } from "@trainers/utils";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AllTeamsClientProps {
  initialTeams: CrossAltTeamListItem[];
  alts: Array<{ id: number; username: string }>;
  activeFormats: GameFormat[];
  userId: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Number of sprite slots to render per team row. */
const SPRITE_SLOTS = 6;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AllTeamsClient({
  initialTeams,
  alts,
  activeFormats,
}: AllTeamsClientProps) {
  // ---------- Local filter state ----------
  const [selectedFormat, setSelectedFormat] = useState<string | null>(null);
  const [selectedAlt, setSelectedAlt] = useState<string | null>(null);

  const filteredTeams = initialTeams.filter((team) => {
    if (selectedFormat && team.format !== selectedFormat) return false;
    if (selectedAlt && team.alt_username !== selectedAlt) return false;
    return true;
  });

  // Default new-team alt: selected alt filter, or first alt
  const defaultAltUsername = selectedAlt ?? alts[0]?.username ?? "";
  const newTeamUrl = `/dashboard/alts/${defaultAltUsername}/teams/new`;

  if (initialTeams.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8">
        <EmptyState
          title="No teams yet"
          description="Create your first team or import a Showdown paste."
          actions={
            <div className="flex gap-2">
              <Button
                variant="outline"
                render={<Link href={`${newTeamUrl}?mode=import`} />}
              >
                <Upload className="size-4" />
                Import Paste
              </Button>
              <Button render={<Link href={newTeamUrl} />}>
                <Plus className="size-4" />
                New Team
              </Button>
            </div>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      {/* Toolbar: filters + actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Format chips */}
          <button
            onClick={() => setSelectedFormat(null)}
            className={cn(
              "rounded-full border px-3 py-1 text-sm font-medium transition-colors",
              !selectedFormat
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-background hover:bg-accent border-transparent"
            )}
          >
            All
          </button>
          {activeFormats.map((fmt) => (
            <button
              key={fmt.id}
              onClick={() =>
                setSelectedFormat(selectedFormat === fmt.id ? null : fmt.id)
              }
              className={cn(
                "rounded-full border px-3 py-1 text-sm font-medium transition-colors",
                selectedFormat === fmt.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-background hover:bg-accent border-transparent"
              )}
            >
              {fmt.label}
            </button>
          ))}

          {/* Divider */}
          {alts.length > 1 && (
            <div className="border-border mx-1 h-5 border-l" />
          )}

          {/* Alt chips */}
          {alts.length > 1 &&
            alts.map((alt) => (
              <button
                key={alt.id}
                onClick={() =>
                  setSelectedAlt(
                    selectedAlt === alt.username ? null : alt.username
                  )
                }
                className={cn(
                  "rounded-full border px-3 py-1 text-sm font-medium transition-colors",
                  selectedAlt === alt.username
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-background hover:bg-accent border-transparent"
                )}
              >
                {alt.username}
              </button>
            ))}
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            render={<Link href={`${newTeamUrl}?mode=import`} />}
          >
            <Upload className="size-4" />
            Import Paste
          </Button>
          <Button size="sm" render={<Link href={newTeamUrl} />}>
            <Plus className="size-4" />
            New Team
          </Button>
        </div>
      </div>

      {/* Data table */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted-foreground border-b text-left text-xs uppercase tracking-wide">
              <th className="px-3 py-2 font-medium">Team</th>
              <th className="px-3 py-2 font-medium">Alt</th>
              <th className="px-3 py-2 font-medium">Format</th>
              <th className="px-3 py-2 font-medium">Updated</th>
              <th className="px-3 py-2 text-right font-medium">Record</th>
            </tr>
          </thead>
          <tbody>
            {filteredTeams.map((team) => (
              <TeamRow key={team.id} team={team} />
            ))}
            {filteredTeams.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="text-muted-foreground px-3 py-8 text-center"
                >
                  No teams match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TeamRow
// ---------------------------------------------------------------------------

function TeamRow({ team }: { team: CrossAltTeamListItem }) {
  // Sort pokemon by position to display sprites in team order
  const sortedPokemon = [...team.team_pokemon].sort(
    (a, b) => a.team_position - b.team_position
  );

  const href = `/dashboard/alts/${team.alt_username}/teams/${team.id}`;

  return (
    <tr className="hover:bg-muted/50 border-b transition-colors last:border-0">
      <td className="px-3 py-2.5">
        <Link href={href} className="flex items-center gap-2">
          <span className="flex gap-0.5">
            {Array.from({ length: SPRITE_SLOTS }, (_, i) => {
              const pokemon = sortedPokemon[i]?.pokemon;
              const species = pokemon?.species ?? null;
              const isShiny = pokemon?.is_shiny ?? false;

              if (!species) {
                return (
                  <span
                    key={i}
                    className="bg-muted inline-block size-5 rounded"
                  />
                );
              }

              const sprite = getPokemonSprite(species, { shiny: isShiny });
              return (
                <Image
                  key={i}
                  src={sprite.url}
                  alt={species}
                  width={20}
                  height={20}
                  className="size-5 rounded object-contain"
                  unoptimized
                />
              );
            })}
          </span>
          <span className="font-medium">{team.name}</span>
        </Link>
      </td>
      <td className="text-muted-foreground px-3 py-2.5">
        {team.alt_username}
      </td>
      <td className="px-3 py-2.5">
        {team.format && (
          <Badge variant="secondary" className="text-xs">
            {getFormatLabel(team.format)}
          </Badge>
        )}
      </td>
      <td className="text-muted-foreground px-3 py-2.5 text-xs">
        {team.updated_at ? formatTimeAgo(team.updated_at) : "—"}
      </td>
      <td className="text-muted-foreground px-3 py-2.5 text-right text-xs">
        —
      </td>
    </tr>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm typecheck --filter @trainers/web`
Expected: passes

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/team-builder/all-teams-client.tsx
git commit -m "feat: add AllTeamsClient component with filter chips and data table"
```

---

### Task 4: Update Sidebar Smart Routing

**Files:**
- Modify: `apps/web/src/components/dashboard/dashboard-sidebar.tsx`

- [ ] **Step 1: Update the builderHref logic**

In `dashboard-sidebar.tsx`, find the `builderHref` construction (around line 622) and update:

```typescript
// Before:
const builderHref = currentAltUsername
  ? `/dashboard/alts/${currentAltUsername}/teams`
  : "/dashboard";

// After:
const builderHref = currentAltUsername
  ? `/dashboard/alts/${currentAltUsername}/teams`
  : "/dashboard/teams";
```

- [ ] **Step 2: Update the Builder isActive check**

The current `isActive` check only matches alt-scoped team routes. Update it to also match `/dashboard/teams`:

```typescript
// Before:
isActive: pathname.includes("/alts/") && pathname.includes("/teams"),

// After:
isActive:
  pathname === "/dashboard/teams" ||
  (pathname.includes("/alts/") && pathname.includes("/teams")),
```

- [ ] **Step 3: Verify it compiles**

Run: `pnpm typecheck --filter @trainers/web`
Expected: passes

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/dashboard/dashboard-sidebar.tsx
git commit -m "feat: update Builder sidebar link with smart routing"
```

---

### Task 5: Verification

- [ ] **Step 1: Run all checks**

```bash
pnpm lint
pnpm typecheck
pnpm test
```

Expected: all pass.

- [ ] **Step 2: Manual browser verification**

Start `pnpm dev:web` and verify:

1. Sign in as `admin@trainers.local` / `Password123!`
2. On dashboard home with "All Alts" selected, click Builder → should go to `/dashboard/teams`
3. The page shows a data table of all teams across alts
4. Format filter chips work (click Reg I → only Reg I teams)
5. Alt filter chips work (click an alt → only that alt's teams)
6. Click a team row → goes to `/dashboard/alts/{alt}/teams/{id}` (the editor)
7. Switch to a specific alt in the sidebar → click Builder → goes to that alt's teams page
8. Switch back to "All Alts" → click Builder → goes to `/dashboard/teams`

- [ ] **Step 3: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: address verification issues"
```
