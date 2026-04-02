"use client";

import { Plus } from "lucide-react";
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
      return "completed";
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
  extra?: React.ReactNode;
}

function StatCard({ label, value, subtitle, extra }: StatCardProps) {
  return (
    <div className="bg-card text-card-foreground rounded-lg p-3 shadow-sm">
      <p className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
        {label}
      </p>
      <div className="mt-1.5 flex items-end justify-between">
        <p className="text-xl font-bold">{value}</p>
        {extra ?? (
          <svg
            width="52"
            height="22"
            viewBox="0 0 52 22"
            className="text-primary opacity-60"
          >
            <polyline
              points="0,20 9,15 17,17 26,11 35,13 43,7 52,4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            />
          </svg>
        )}
      </div>
      <p className="mt-1 text-[10px] text-emerald-600">{subtitle}</p>
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

  const staffExtra = (
    <div className="flex">
      {stats.adminCount > 0 && (
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-500 text-[8px] font-semibold text-white">
          A
        </div>
      )}
      {stats.judgeCount > 0 && (
        <div className="-ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-sky-500 text-[8px] font-semibold text-white">
          J
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Create Tournament CTA */}
      <div className="flex justify-end">
        <Link
          href={`/dashboard/community/${communitySlug}/tournaments/create`}
          className={cn(buttonVariants({ size: "sm" }))}
        >
          <Plus className="mr-1 h-4 w-4" />
          Create Tournament
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Tournaments"
          value={stats.totalTournaments}
          subtitle={
            stats.totalTournaments === 0
              ? "Host your first tournament to start tracking"
              : `↑ ${stats.activeTournaments} active`
          }
        />
        <StatCard
          label="Unique Players"
          value={stats.uniquePlayers}
          subtitle={
            stats.totalTournaments === 0
              ? "Host your first tournament to start tracking"
              : `of ${stats.totalEntries} total entries`
          }
        />
        <StatCard
          label="Total Entries"
          value={stats.totalEntries}
          subtitle={
            stats.totalTournaments === 0
              ? "Host your first tournament to start tracking"
              : `~${perEvent} per event`
          }
        />
        <StatCard
          label="Staff"
          value={stats.staffCount}
          subtitle={
            stats.totalTournaments === 0
              ? "Host your first tournament to start tracking"
              : `${stats.adminCount} admins, ${stats.judgeCount} judges`
          }
          extra={staffExtra}
        />
      </div>

      {/* Upcoming Tournaments */}
      <DashboardCard>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold">📅 Upcoming Tournaments</p>
          <Link
            href={`/dashboard/community/${communitySlug}/tournaments`}
            className="text-primary text-xs font-medium"
          >
            View all →
          </Link>
        </div>
        {upcomingTournaments.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <p className="text-muted-foreground text-sm">
              No upcoming tournaments
            </p>
            <Link
              href={`/dashboard/community/${communitySlug}/tournaments/create`}
              className={cn(buttonVariants({ size: "sm" }))}
            >
              <Plus className="mr-1 h-4 w-4" />
              Create Tournament
            </Link>
          </div>
        ) : (
          <div className="flex gap-3">
            {upcomingTournaments.map((t) => (
              <div
                key={t.id}
                className="bg-muted border-primary flex-1 rounded-lg border-l-[3px] p-3"
              >
                <p className="text-sm font-semibold">{t.name}</p>
                <p className="text-muted-foreground mt-1 text-xs">
                  {formatShortDate(t.start_date)} · {t.registrationCount}/
                  {t.max_participants ?? "∞"} registered
                </p>
                <div className="bg-border mt-2 h-1 overflow-hidden rounded-full">
                  <div
                    className="bg-primary h-full rounded-full"
                    style={{
                      width: `${t.max_participants ? Math.min((t.registrationCount / t.max_participants) * 100, 100) : 0}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </DashboardCard>

      {/* Activity Feed + Top Regulars */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Activity Feed */}
        <DashboardCard>
          <p className="mb-3 text-sm font-semibold">⚡ Recent Activity</p>
          {activity.length === 0 ? (
            <p className="text-muted-foreground text-xs">
              No activity yet — things will show up here as your community grows
            </p>
          ) : (
            activity.map((item, i) => (
              <div
                key={i}
                className={cn(
                  "py-2",
                  i < activity.length - 1 && "border-border/50 border-b"
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
          <p className="mb-3 text-sm font-semibold">🏆 Top Regulars</p>
          {topPlayers.length === 0 ? (
            <p className="text-muted-foreground text-xs">
              Players will appear here after your first tournament
            </p>
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
                    "flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-bold",
                    i === 0 && "bg-amber-400",
                    i === 1 && "bg-zinc-300",
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
    </>
  );
}
