"use client";

import {
  Calendar,
  Plus,
  Swords,
  Trophy,
  UserCheck,
  Users,
  Zap,
} from "lucide-react";
import Link from "next/link";

import type {
  CommunityActivityItem,
  CommunityStats,
  TopPlayer,
} from "@trainers/supabase";
import { formatTimeAgo } from "@trainers/utils";

import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface OverviewClientProps {
  communitySlug: string;
  stats: CommunityStats;
  topPlayers: TopPlayer[];
  activity: CommunityActivityItem[];
  upcomingTournaments: Array<{
    id: number;
    name: string;
    slug: string;
    status: string | null;
    start_date: string | null;
    max_participants: number | null;
    registrationCount: number;
  }>;
}

// =============================================================================
// Helpers
// =============================================================================

function activityVerb(item: CommunityActivityItem): string {
  switch (item.type) {
    case "registration":
      return `registered for ${item.targetName}`;
    case "tournament_completed":
      return "was completed";
    case "staff_joined":
      return "joined staff";
    case "tournament_created":
      return "was created";
  }
}

function formatShortDate(dateStr: string | null): string {
  if (!dateStr) return "TBD";
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

// =============================================================================
// Sub-components
// =============================================================================

interface StatCardProps {
  label: string;
  value: number | string;
  subtitle: string;
  icon: React.ReactNode;
}

function StatCard({ label, value, subtitle, icon }: StatCardProps) {
  return (
    <div className="rounded-xl bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2">
        {icon}
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          {label}
        </p>
      </div>
      <p className="mt-2.5 text-2xl font-bold leading-none tabular-nums">
        {value}
      </p>
      <p className="text-muted-foreground mt-1.5 text-[11px]">{subtitle}</p>
    </div>
  );
}

// =============================================================================
// Main component
// =============================================================================

export function OverviewClient({
  communitySlug,
  stats,
  topPlayers,
  activity,
  upcomingTournaments,
}: OverviewClientProps) {
  const perEvent =
    stats.totalTournaments > 0
      ? Math.round(stats.totalEntries / stats.totalTournaments)
      : 0;

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 rounded-2xl bg-muted/30 p-3 lg:grid-cols-4">
        <StatCard
          label="Tournaments"
          value={stats.totalTournaments}
          icon={
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10">
              <Trophy className="size-3.5 text-primary" />
            </div>
          }
          subtitle={
            stats.totalTournaments === 0
              ? "Host your first tournament to start tracking"
              : `${stats.activeTournaments} active`
          }
        />
        <StatCard
          label="Unique Players"
          value={stats.uniquePlayers}
          icon={
            <div className="flex size-7 items-center justify-center rounded-lg bg-violet-500/10">
              <Users className="size-3.5 text-violet-600 dark:text-violet-400" />
            </div>
          }
          subtitle={
            stats.totalTournaments === 0
              ? "Host your first tournament to start tracking"
              : `of ${stats.totalEntries} total entries`
          }
        />
        <StatCard
          label="Total Entries"
          value={stats.totalEntries}
          icon={
            <div className="flex size-7 items-center justify-center rounded-lg bg-amber-500/10">
              <Swords className="size-3.5 text-amber-600 dark:text-amber-400" />
            </div>
          }
          subtitle={
            stats.totalTournaments === 0
              ? "Host your first tournament to start tracking"
              : `~${perEvent} per event`
          }
        />
        <StatCard
          label="Staff"
          value={stats.staffCount}
          icon={
            <div className="flex size-7 items-center justify-center rounded-lg bg-sky-500/10">
              <UserCheck className="size-3.5 text-sky-600 dark:text-sky-400" />
            </div>
          }
          subtitle={
            stats.totalTournaments === 0
              ? "Host your first tournament to start tracking"
              : `${stats.adminCount} admins, ${stats.judgeCount} judges`
          }
        />
      </div>

      {/* Upcoming Tournaments */}
      <DashboardCard>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="size-4 text-primary" />
            <p className="text-sm font-semibold">Upcoming Tournaments</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/dashboard/community/${communitySlug}/tournaments/create`}
              className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
            >
              <Plus className="h-3.5 w-3.5" />
              New
            </Link>
            <Link
              href={`/dashboard/community/${communitySlug}/tournaments`}
              className="text-primary text-xs font-medium"
            >
              View all →
            </Link>
          </div>
        </div>
        {upcomingTournaments.length === 0 ? (
          <div className="py-8 text-center">
            <Calendar className="text-muted-foreground/50 mx-auto mb-2 size-8" />
            <p className="text-muted-foreground text-sm">
              No upcoming tournaments
            </p>
            <p className="text-muted-foreground/70 mt-1 text-xs">
              Create one to get started
            </p>
          </div>
        ) : (
          <div className="flex gap-3">
            {upcomingTournaments.map((t) => (
              <Link
                key={t.id}
                href={`/dashboard/community/${communitySlug}/tournaments/${t.slug}/manage`}
                className="flex-1 rounded-xl bg-muted/50 p-3 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <p className="text-sm font-semibold">{t.name}</p>
                <p className="text-muted-foreground mt-1 text-xs">
                  {formatShortDate(t.start_date)} · {t.registrationCount}/
                  {t.max_participants ?? "∞"} registered
                </p>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-border">
                  <div
                    className="bg-primary h-full rounded-full"
                    style={{
                      width: `${t.max_participants ? Math.min((t.registrationCount / t.max_participants) * 100, 100) : 0}%`,
                    }}
                  />
                </div>
              </Link>
            ))}
          </div>
        )}
      </DashboardCard>

      {/* Activity Feed + Top Regulars */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Activity Feed */}
        <DashboardCard>
          <div className="mb-3 flex items-center gap-2">
            <Zap className="size-4 text-amber-500" />
            <p className="text-sm font-semibold">Recent Activity</p>
          </div>
          {activity.length === 0 ? (
            <div className="py-6 text-center">
              <Zap className="text-muted-foreground/50 mx-auto mb-2 size-8" />
              <p className="text-muted-foreground text-sm">No activity yet</p>
              <p className="text-muted-foreground/70 mt-1 text-xs">
                Things will show up here as your community grows
              </p>
            </div>
          ) : (
            activity.map((item, i) => (
              <div
                key={i}
                className={cn(
                  "py-2",
                  i < activity.length - 1 && "border-b border-border/50"
                )}
              >
                <p className="text-xs">
                  {item.actorName && (
                    <span className="font-medium">{item.actorName}</span>
                  )}
                  <span className="text-muted-foreground">
                    {item.actorName ? " " : ""}
                    {activityVerb(item)}
                  </span>
                </p>
                <p className="text-muted-foreground mt-0.5 text-[10px]">
                  {formatTimeAgo(item.timestamp)}
                </p>
              </div>
            ))
          )}
        </DashboardCard>

        {/* Top Regulars */}
        <DashboardCard>
          <div className="mb-3 flex items-center gap-2">
            <Trophy className="size-4 text-amber-500" />
            <p className="text-sm font-semibold">Top Regulars</p>
          </div>
          {topPlayers.length === 0 ? (
            <div className="py-6 text-center">
              <Trophy className="text-muted-foreground/50 mx-auto mb-2 size-8" />
              <p className="text-muted-foreground text-sm">No regulars yet</p>
              <p className="text-muted-foreground/70 mt-1 text-xs">
                Players will appear here after your first tournament
              </p>
            </div>
          ) : (
            topPlayers.map((player, i) => (
              <div
                key={player.userId}
                className="flex items-center gap-2.5 py-1.5"
              >
                <span className="text-muted-foreground w-4 text-[10px]">
                  {i + 1}.
                </span>
                <div
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full text-[9px] font-bold",
                    i === 0 && "bg-amber-400 text-amber-950",
                    i === 1 && "bg-zinc-300 text-zinc-700",
                    i === 2 && "bg-amber-700 text-white",
                    i > 2 && "bg-muted text-muted-foreground"
                  )}
                >
                  {player.username.charAt(0).toUpperCase()}
                </div>
                <span className="flex-1 text-xs font-medium">
                  {player.username}
                </span>
                <span className="text-muted-foreground text-xs">
                  {player.eventCount} events
                </span>
              </div>
            ))
          )}
        </DashboardCard>
      </div>
    </div>
  );
}
