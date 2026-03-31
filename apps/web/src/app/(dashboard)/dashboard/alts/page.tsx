"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/page-header";
import { useAuth } from "@/components/auth/auth-provider";
import { useSupabaseQuery } from "@/lib/supabase";
import { getCurrentUserAlts } from "@trainers/supabase";
import type { TypedSupabaseClient } from "@trainers/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  Loader2,
  Pencil,
  Plus,
  Star,
  X,
  Users,
  Check,
  ChevronDown,
  ChevronRight,
  Hammer,
  ArrowUpRight,
  Copy,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { createAltAction, deleteAltAction } from "@/actions/alts";
import { updateAltVisibilityAction } from "@/actions/profile";
import { SpritePicker } from "@/components/profile/sprite-picker";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Alt = {
  id: number;
  username: string;
  avatar_url: string | null;
  is_public: boolean;
};

// Placeholder team type — future: fetch from DB
type Team = {
  id: number;
  name: string;
  species: string[];
  wins: number;
  losses: number;
  events: number;
  isArchived: boolean;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatWinRate(wins: number, losses: number): string {
  const total = wins + losses;
  if (total === 0) return "—";
  return `${((wins / total) * 100).toFixed(1)}%`;
}

function isHighWinRate(wins: number, losses: number): boolean {
  const total = wins + losses;
  if (total === 0) return false;
  return wins / total >= 0.55;
}

function spriteUrl(species: string): string {
  return `https://play.pokemonshowdown.com/sprites/gen5/${species.toLowerCase()}.png`;
}

// ---------------------------------------------------------------------------
// Aggregate stats — currently placeholders since stats aren't in the DB yet.
// Future: replace with real aggregated query.
// ---------------------------------------------------------------------------

function AggregateStatsRow({ alts }: { alts: Alt[] }) {
  const altCount = alts.length;

  return (
    <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
      <div className="bg-muted/50 rounded-lg p-3">
        <div className="text-muted-foreground mb-0.5 text-[10px] font-semibold tracking-widest uppercase">
          Record
        </div>
        <div className="font-mono text-lg font-bold">0-0</div>
        <div className="text-muted-foreground text-[10px]">across all alts</div>
      </div>
      <div className="bg-muted/50 rounded-lg p-3">
        <div className="text-muted-foreground mb-0.5 text-[10px] font-semibold tracking-widest uppercase">
          Win Rate
        </div>
        <div className="font-mono text-lg font-bold">—</div>
        <div className="text-muted-foreground text-[10px]">no games played</div>
      </div>
      <div className="bg-muted/50 rounded-lg p-3">
        <div className="text-muted-foreground mb-0.5 text-[10px] font-semibold tracking-widest uppercase">
          Peak Rating
        </div>
        <div className="font-mono text-lg font-bold">—</div>
        <div className="text-muted-foreground text-[10px]">
          {altCount} alt{altCount !== 1 ? "s" : ""}
        </div>
      </div>
      <div className="bg-muted/50 rounded-lg p-3">
        <div className="text-muted-foreground mb-0.5 text-[10px] font-semibold tracking-widest uppercase">
          Tournaments
        </div>
        <div className="font-mono text-lg font-bold">0</div>
        <div className="text-muted-foreground text-[10px]">0 active</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Public status dot
// ---------------------------------------------------------------------------

function PublicDot({ isPublic }: { isPublic: boolean }) {
  return (
    <span
      className={cn(
        "mx-auto block size-2 rounded-full",
        isPublic ? "bg-emerald-500" : "bg-neutral-300"
      )}
      title={isPublic ? "Public" : "Private"}
    />
  );
}

// ---------------------------------------------------------------------------
// Team action buttons
// ---------------------------------------------------------------------------

function TeamActions({
  team,
  altUsername,
}: {
  team: Team;
  altUsername: string;
}) {
  if (team.isArchived) {
    return (
      <Tooltip>
        <TooltipTrigger render={<span />}>
          <button
            className="bg-muted inline-flex size-6 cursor-pointer items-center justify-center rounded text-xs"
            aria-label="Restore team"
          >
            <RotateCcw className="text-muted-foreground size-3" />
          </button>
        </TooltipTrigger>
        <TooltipContent>Restore</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className="flex justify-end gap-1">
      {/* TODO: link to builder page when available */}
      <Tooltip>
        <TooltipTrigger render={<span />}>
          <Link
            href={`/dashboard/alts/${altUsername}`}
            className="bg-muted hover:bg-muted/80 inline-flex size-6 items-center justify-center rounded transition-colors"
            aria-label="Open in Builder"
          >
            <Hammer className="text-muted-foreground size-3" />
          </Link>
        </TooltipTrigger>
        <TooltipContent>Open in Builder</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger render={<span />}>
          <button
            className="bg-muted hover:bg-muted/80 inline-flex size-6 cursor-not-allowed items-center justify-center rounded transition-colors"
            aria-label="Share (coming soon)"
            disabled
          >
            <ArrowUpRight className="text-muted-foreground size-3" />
          </button>
        </TooltipTrigger>
        <TooltipContent>Share (coming soon)</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger render={<span />}>
          <button
            className="bg-muted hover:bg-muted/80 inline-flex size-6 cursor-not-allowed items-center justify-center rounded transition-colors"
            aria-label="Clone (coming soon)"
            disabled
          >
            <Copy className="text-muted-foreground size-3" />
          </button>
        </TooltipTrigger>
        <TooltipContent>Clone (coming soon)</TooltipContent>
      </Tooltip>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Teams sub-table
// ---------------------------------------------------------------------------

function TeamsSubTable({
  teams,
  altUsername,
  isMain,
  onDeleteAlt,
  isDeletePending,
}: {
  teams: Team[];
  altUsername: string;
  isMain: boolean;
  onDeleteAlt: () => void;
  isDeletePending: boolean;
}) {
  return (
    <div className="bg-background rounded-lg border">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b">
              <th className="text-muted-foreground px-3 py-1.5 text-left text-[10px] font-medium tracking-wider uppercase">
                Team
              </th>
              <th className="text-muted-foreground px-3 py-1.5 text-left text-[10px] font-medium tracking-wider uppercase">
                Pokemon
              </th>
              <th className="text-muted-foreground px-3 py-1.5 text-right text-[10px] font-medium tracking-wider uppercase">
                Record
              </th>
              <th className="text-muted-foreground px-3 py-1.5 text-right text-[10px] font-medium tracking-wider uppercase">
                Win %
              </th>
              <th className="text-muted-foreground px-3 py-1.5 text-right text-[10px] font-medium tracking-wider uppercase">
                Events
              </th>
              <th className="w-24 px-3 py-1.5" />
            </tr>
          </thead>
          <tbody>
            {teams.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="text-muted-foreground px-3 py-6 text-center text-xs"
                >
                  No teams yet
                </td>
              </tr>
            ) : (
              teams.map((team) => (
                <tr
                  key={team.id}
                  className={cn(
                    "hover:bg-muted/30 border-b transition-colors last:border-0",
                    team.isArchived && "opacity-40"
                  )}
                >
                  <td className="px-3 py-1.5 font-medium">
                    {team.name}
                    {team.isArchived && (
                      <span className="text-muted-foreground ml-1.5 font-normal">
                        (archived)
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-1">
                    <div className={cn("flex", team.isArchived && "grayscale")}>
                      {team.species.map((species, i) => (
                        <Image
                          key={i}
                          src={spriteUrl(species)}
                          alt={species}
                          width={28}
                          height={28}
                          className="object-contain"
                          style={{ imageRendering: "pixelated" }}
                          unoptimized
                        />
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono">
                    {team.wins}-{team.losses}
                  </td>
                  <td
                    className={cn(
                      "px-3 py-1.5 text-right font-mono",
                      !team.isArchived &&
                        isHighWinRate(team.wins, team.losses) &&
                        "font-medium text-teal-600 dark:text-teal-400"
                    )}
                  >
                    {formatWinRate(team.wins, team.losses)}
                  </td>
                  <td className="text-muted-foreground px-3 py-1.5 text-right font-mono">
                    {team.events}
                  </td>
                  <td className="px-3 py-1.5">
                    <TeamActions team={team} altUsername={altUsername} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t px-3 py-2">
        <div className="flex gap-1.5">
          <Button
            size="sm"
            className="h-7 text-xs"
            render={<Link href={`/dashboard/alts/${altUsername}`} />}
          >
            View as this alt
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            render={
              <Link href={`/dashboard/alts/${altUsername}/tournaments`} />
            }
          >
            View history
          </Button>
        </div>
        {/* TODO: Replace deleteAltAction with archiveAltAction — alts should be archived, not deleted */}
        {!isMain && (
          <button
            className="text-muted-foreground cursor-pointer text-xs hover:underline disabled:cursor-not-allowed disabled:opacity-50"
            onClick={onDeleteAlt}
            disabled={isDeletePending}
          >
            Archive alt
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Alt table row (collapsed + expanded)
// ---------------------------------------------------------------------------

function AltTableRow({
  alt,
  isMain,
  isExpanded,
  onToggle,
  onDelete,
  isDeletePending,
  onRefresh,
  refreshKey,
}: {
  alt: Alt;
  isMain: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  isDeletePending: boolean;
  onRefresh: () => void;
  refreshKey: number;
}) {
  const [, startVisibilityTransition] = useTransition();

  // Placeholder teams — future: fetch per-alt teams from DB
  const teams: Team[] = [];

  const wins = 0;
  const losses = 0;
  const rating = null;
  const events = 0;
  const teamCount = 0;

  const handleVisibilityChange = (checked: boolean) => {
    startVisibilityTransition(async () => {
      const result = await updateAltVisibilityAction(alt.id, checked);
      if (result.success) {
        onRefresh();
      } else {
        toast.error(result.error ?? "Failed to update visibility");
      }
    });
  };

  return (
    <>
      {/* Main row */}
      <tr
        onClick={onToggle}
        className={cn(
          "hover:bg-muted/50 cursor-pointer border-b transition-colors",
          isExpanded && "bg-muted/30",
          !isExpanded && "last:border-0"
        )}
      >
        {/* Handle */}
        <td className="w-[200px] px-3 py-2.5">
          <div className="flex items-center gap-2">
            {/* Avatar with sprite picker — stop propagation so row click doesn't fire */}
            <span onClick={(e) => e.stopPropagation()}>
              <Popover key={`${alt.id}-${refreshKey}`}>
                <PopoverTrigger
                  title="Change avatar"
                  className="group/avatar relative shrink-0 cursor-pointer"
                >
                  <div className="relative overflow-hidden rounded-full">
                    <Avatar className="ring-primary/10 size-7 ring-1">
                      {alt.avatar_url && (
                        <AvatarImage src={alt.avatar_url} alt={alt.username} />
                      )}
                      <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                        {alt.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover/avatar:bg-black/40">
                      <Pencil className="size-2.5 text-white opacity-0 drop-shadow-md transition-opacity group-hover/avatar:opacity-100" />
                    </div>
                  </div>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto p-2">
                  <SpritePicker
                    altId={alt.id}
                    currentAvatarUrl={alt.avatar_url}
                    onAvatarChange={onRefresh}
                  />
                </PopoverContent>
              </Popover>
            </span>
            <span className="flex min-w-0 items-center gap-1.5">
              <span
                className={cn(
                  "truncate text-[13px] font-semibold",
                  isExpanded && "font-bold"
                )}
              >
                {alt.username}
              </span>
              {isMain && (
                <Badge className="gap-0.5 border-amber-500/30 bg-amber-500/10 px-1.5 py-0 text-[10px] text-amber-600 dark:text-amber-400">
                  <Star className="size-2.5 fill-current" />
                  Main
                </Badge>
              )}
            </span>
          </div>
        </td>

        {/* Record */}
        <td className="px-3 py-2.5 text-right">
          <span
            className={cn(
              "font-mono text-xs",
              wins + losses === 0 && "text-muted-foreground",
              isExpanded && "font-semibold"
            )}
          >
            {wins}-{losses}
          </span>
        </td>

        {/* Win % */}
        <td className="px-3 py-2.5 text-right">
          <span
            className={cn(
              "font-mono text-xs",
              wins + losses === 0 && "text-muted-foreground",
              isExpanded && isHighWinRate(wins, losses)
                ? "font-semibold text-teal-600 dark:text-teal-400"
                : isExpanded
                  ? "font-semibold"
                  : ""
            )}
          >
            {formatWinRate(wins, losses)}
          </span>
        </td>

        {/* Rating */}
        <td className="px-3 py-2.5 text-right">
          <span
            className={cn(
              "font-mono text-xs",
              !rating && "text-muted-foreground",
              isExpanded && "font-semibold"
            )}
          >
            {rating ?? "—"}
          </span>
        </td>

        {/* Events */}
        <td className="px-3 py-2.5 text-right">
          <span
            className={cn(
              "font-mono text-xs",
              events === 0 && "text-muted-foreground"
            )}
          >
            {events}
          </span>
        </td>

        {/* Teams */}
        <td className="px-3 py-2.5 text-right">
          <span
            className={cn(
              "font-mono text-xs",
              teamCount === 0 && "text-muted-foreground"
            )}
          >
            {teamCount}
          </span>
        </td>

        {/* Public dot — stop propagation to allow toggling without expanding row */}
        <td
          className="px-3 py-2.5 text-center"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => handleVisibilityChange(!alt.is_public)}
            className="mx-auto block"
            title={
              alt.is_public
                ? "Public — click to make private"
                : "Private — click to make public"
            }
          >
            <PublicDot isPublic={alt.is_public} />
          </button>
        </td>

        {/* Chevron */}
        <td className="w-8 px-2 py-2.5 text-center">
          {isExpanded ? (
            <ChevronDown className="text-muted-foreground mx-auto size-3.5" />
          ) : (
            <ChevronRight className="text-muted-foreground mx-auto size-3.5" />
          )}
        </td>
      </tr>

      {/* Expanded panel */}
      {isExpanded && (
        <tr className="bg-muted/20 border-b last:border-0">
          <td colSpan={8} className="px-3 pt-1 pb-3">
            <TeamsSubTable
              teams={teams}
              altUsername={alt.username}
              isMain={isMain}
              onDeleteAlt={onDelete}
              isDeletePending={isDeletePending}
            />
          </td>
        </tr>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Create Alt inline form
// ---------------------------------------------------------------------------

function CreateAltForm({
  onCreated,
  onCancel,
}: {
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [username, setUsername] = useState("");

  const handleSubmit = () => {
    if (!username.trim()) {
      toast.error("Username is required");
      return;
    }

    startTransition(async () => {
      const result = await createAltAction({
        username: username.trim().toLowerCase(),
      });

      if (result.success) {
        toast.success("Alt created successfully!");
        onCreated();
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <Card className="border-primary/20">
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-primary/10 flex size-8 items-center justify-center rounded-lg">
              <Plus className="text-primary size-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Create New Alt</h3>
              <p className="text-muted-foreground text-xs">
                Add a new player identity
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="newAltUsername" className="text-sm font-medium">
            Username <span className="text-destructive">*</span>
          </Label>
          <Input
            id="newAltUsername"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="username"
            className="font-mono"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
              if (e.key === "Escape") onCancel();
            }}
            autoFocus
          />
          <p className="text-muted-foreground text-xs">
            Used for tournament registration
          </p>
        </div>

        <div className="mt-4 flex gap-2">
          <Button
            onClick={handleSubmit}
            disabled={isPending}
            size="sm"
            className="gap-1.5"
          >
            {isPending ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Check className="size-3.5" />
                Create Alt
              </>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function AltsPage() {
  const { user } = useAuth();
  const [isPending, startTransition] = useTransition();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [expandedAltId, setExpandedAltId] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const altsQueryFn = (client: TypedSupabaseClient) =>
    getCurrentUserAlts(client);
  const {
    data: alts,
    isLoading,
    refetch,
  } = useSupabaseQuery(altsQueryFn, ["alts", refreshKey]);

  const mainAltQueryFn = async (client: TypedSupabaseClient) => {
    if (!user) return null;
    const { data } = await client
      .from("users")
      .select("main_alt_id")
      .eq("id", user.id)
      .single();
    return data?.main_alt_id ?? null;
  };
  const { data: mainAltId } = useSupabaseQuery(mainAltQueryFn, [
    "mainAlt",
    user?.id,
    refreshKey,
  ]);

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1);
    refetch();
  };

  // TODO: Replace with archiveAltAction when archive system is built
  const handleDelete = (altId: number, altName: string) => {
    if (mainAltId === altId) {
      toast.error("Cannot archive your main alt.");
      return;
    }
    if (!confirm(`Archive alt "${altName}"? It can be restored later.`)) return;

    startTransition(async () => {
      const result = await deleteAltAction(altId);
      if (result.success) {
        toast.success("Alt archived");
        setExpandedAltId(null);
        handleRefresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleToggleExpand = (altId: number) => {
    setExpandedAltId((prev) => (prev === altId ? null : altId));
  };

  if (isLoading) {
    return (
      <>
        <PageHeader title="Alts" />
        <div className="flex min-h-[400px] items-center justify-center">
          <Loader2 className="text-muted-foreground size-8 animate-spin" />
        </div>
      </>
    );
  }

  const hasAlts = alts && alts.length > 0;

  return (
    <>
      <PageHeader title="Alts" />
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        {/* Page heading + action */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight">Alts</h1>
          <Button
            onClick={() => setShowCreateForm(true)}
            disabled={showCreateForm}
            size="sm"
            className="gap-1.5"
          >
            <Plus className="size-3.5" />
            New Alt
          </Button>
        </div>

        {/* Create form */}
        {showCreateForm && (
          <div className="animate-in slide-in-from-top-2 duration-200">
            <CreateAltForm
              onCreated={() => {
                setShowCreateForm(false);
                handleRefresh();
              }}
              onCancel={() => setShowCreateForm(false)}
            />
          </div>
        )}

        {/* Empty state */}
        {!hasAlts ? (
          <Card className="border-2 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="bg-primary/10 flex size-14 items-center justify-center rounded-full">
                <Users className="text-primary size-7" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">No alts yet</h3>
              <p className="text-muted-foreground mt-2 max-w-sm text-center text-sm">
                Create your first player identity to register for tournaments
                and track your competitive journey
              </p>
              <Button
                className="mt-6 gap-2"
                onClick={() => setShowCreateForm(true)}
              >
                <Plus className="size-4" />
                Create Your First Alt
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Aggregate stats */}
            <AggregateStatsRow alts={alts} />

            {/* Alts table */}
            <div className="overflow-hidden rounded-lg border">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/30 border-b">
                      <th className="text-muted-foreground h-9 w-[200px] px-3 text-left text-[10px] font-medium tracking-wider uppercase">
                        Handle
                      </th>
                      <th className="text-muted-foreground h-9 px-3 text-right text-[10px] font-medium tracking-wider uppercase">
                        Record
                      </th>
                      <th className="text-muted-foreground h-9 px-3 text-right text-[10px] font-medium tracking-wider uppercase">
                        Win %
                      </th>
                      <th className="text-muted-foreground h-9 px-3 text-right text-[10px] font-medium tracking-wider uppercase">
                        Rating
                      </th>
                      <th className="text-muted-foreground h-9 px-3 text-right text-[10px] font-medium tracking-wider uppercase">
                        Events
                      </th>
                      <th className="text-muted-foreground h-9 px-3 text-right text-[10px] font-medium tracking-wider uppercase">
                        Teams
                      </th>
                      <th className="text-muted-foreground h-9 px-3 text-center text-[10px] font-medium tracking-wider uppercase">
                        Public
                      </th>
                      <th className="h-9 w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {alts.map((alt) => (
                      <AltTableRow
                        key={alt.id}
                        alt={alt}
                        isMain={mainAltId === alt.id}
                        isExpanded={expandedAltId === alt.id}
                        onToggle={() => handleToggleExpand(alt.id)}
                        onDelete={() => handleDelete(alt.id, alt.username)}
                        isDeletePending={isPending}
                        onRefresh={handleRefresh}
                        refreshKey={refreshKey}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
