"use client";

import { useMemo } from "react";
import {
  Users,
  Building2,
  Trophy,
  Swords,
  UserCheck,
  Mail,
  MailCheck,
  MailX,
  Percent,
  BarChart3,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSupabaseQuery } from "@/lib/supabase";
import {
  getPlatformOverview,
  getUserGrowthStats,
  getActiveUserStats,
  getTournamentStats,
  getOrganizationStats,
  getInviteConversionStats,
} from "@trainers/supabase";
import type { UserGrowthEntry } from "@trainers/supabase";
import { StatCard } from "./stat-card";

// ── Label maps ───────────────────────────────────────────────────────

const TOURNAMENT_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  upcoming: "Upcoming",
  active: "Active",
  paused: "Paused",
  completed: "Completed",
  cancelled: "Cancelled",
};

const ORGANIZATION_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  active: "Active",
  rejected: "Rejected",
  suspended: "Suspended",
};

const ORGANIZATION_TIER_LABELS: Record<string, string> = {
  regular: "Regular",
  verified: "Verified",
  partner: "Partner",
};

// ── Helpers ──────────────────────────────────────────────────────────

/** Format a number with locale-aware thousands separators. */
function formatNumber(n: number): string {
  return n.toLocaleString();
}

/** Format a decimal ratio as a percentage string. */
function formatPercent(ratio: number): string {
  return `${(ratio * 100).toFixed(1)}%`;
}

/** Return a human-readable label for a raw key, falling back to title case. */
function humanLabel(key: string, labels: Record<string, string>): string {
  if (labels[key]) return labels[key];
  // Fallback: convert snake_case to Title Case
  return key
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// ── Sub-components ───────────────────────────────────────────────────

function UserGrowthChart({ data }: { data: UserGrowthEntry[] }) {
  const maxCount = useMemo(
    () => Math.max(...data.map((d) => d.count), 1),
    [data]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <BarChart3 className="size-5" />
          User Growth (Last 30 Days)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-muted-foreground py-4 text-center text-sm">
            No signup data available
          </p>
        ) : (
          <div className="space-y-1.5">
            {data.map((entry) => {
              // Width as a percentage of the max count
              const widthPercent =
                maxCount > 0 ? (entry.count / maxCount) * 100 : 0;

              return (
                <div key={entry.date} className="flex items-center gap-3">
                  {/* Date label */}
                  <span className="text-muted-foreground w-24 shrink-0 text-xs tabular-nums">
                    {new Date(entry.date + "T00:00:00").toLocaleDateString(
                      "en-US",
                      {
                        month: "short",
                        day: "numeric",
                      }
                    )}
                  </span>

                  {/* Visual bar */}
                  <div className="flex-1">
                    <div
                      className="bg-primary/80 h-5 min-w-[2px] rounded-sm transition-all"
                      style={{ width: `${widthPercent}%` }}
                    />
                  </div>

                  {/* Count label */}
                  <span className="text-muted-foreground w-8 shrink-0 text-right text-xs tabular-nums">
                    {entry.count}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RecordBreakdown({
  title,
  data,
  labels,
}: {
  title: string;
  data: Record<string, number>;
  labels: Record<string, string>;
}) {
  const entries = Object.entries(data);

  if (entries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">No data</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {entries.map(([key, count]) => (
        <StatCard
          key={key}
          title={humanLabel(key, labels)}
          value={formatNumber(count)}
          description={title}
        />
      ))}
    </>
  );
}

// ── Main page ────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  // Fetch all analytics data in parallel via separate hooks.
  // Each query is independent, so a failure in one does not block the others.
  const { data: overview, isLoading: overviewLoading } = useSupabaseQuery(
    (supabase) => getPlatformOverview(supabase),
    []
  );

  const { data: growth, isLoading: growthLoading } = useSupabaseQuery(
    (supabase) => getUserGrowthStats(supabase, 30),
    []
  );

  const { data: activeUsers, isLoading: activeLoading } = useSupabaseQuery(
    (supabase) => getActiveUserStats(supabase),
    []
  );

  const { data: tournamentStats, isLoading: tournamentLoading } =
    useSupabaseQuery((supabase) => getTournamentStats(supabase), []);

  const { data: orgStats, isLoading: orgLoading } = useSupabaseQuery(
    (supabase) => getOrganizationStats(supabase),
    []
  );

  const { data: inviteStats, isLoading: inviteLoading } = useSupabaseQuery(
    (supabase) => getInviteConversionStats(supabase),
    []
  );

  return (
    <div className="space-y-8">
      {/* ── Platform Overview ─────────────────────────────────────── */}
      <section>
        <h2 className="mb-4 text-lg font-semibold">Platform Overview</h2>
        {overviewLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-28 w-full" />
            ))}
          </div>
        ) : overview ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Users"
              value={formatNumber(overview.totalUsers)}
              icon={Users}
            />
            <StatCard
              title="Total Organizations"
              value={formatNumber(overview.totalOrganizations)}
              icon={Building2}
            />
            <StatCard
              title="Total Tournaments"
              value={formatNumber(overview.totalTournaments)}
              icon={Trophy}
            />
            <StatCard
              title="Total Matches"
              value={formatNumber(overview.totalMatches)}
              icon={Swords}
            />
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            Failed to load platform overview
          </p>
        )}
      </section>

      {/* ── User Growth ───────────────────────────────────────────── */}
      <section>
        {growthLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : growth ? (
          <UserGrowthChart data={growth} />
        ) : (
          <p className="text-muted-foreground text-sm">
            Failed to load user growth data
          </p>
        )}
      </section>

      {/* ── Active Users ──────────────────────────────────────────── */}
      <section>
        <h2 className="mb-4 text-lg font-semibold">Active Users</h2>
        {activeLoading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        ) : activeUsers ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard
              title="Active (7 Days)"
              value={formatNumber(activeUsers.active7d)}
              description="Users who signed in within the last 7 days"
              icon={UserCheck}
            />
            <StatCard
              title="Active (30 Days)"
              value={formatNumber(activeUsers.active30d)}
              description="Users who signed in within the last 30 days"
              icon={UserCheck}
            />
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            Failed to load active user data
          </p>
        )}
      </section>

      {/* ── Tournament Breakdown ──────────────────────────────────── */}
      <section>
        <h2 className="mb-4 text-lg font-semibold">Tournaments by Status</h2>
        {tournamentLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 w-full" />
            ))}
          </div>
        ) : tournamentStats ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <RecordBreakdown
              title="Tournament Status"
              data={tournamentStats}
              labels={TOURNAMENT_STATUS_LABELS}
            />
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            Failed to load tournament data
          </p>
        )}
      </section>

      {/* ── Organization Breakdown ────────────────────────────────── */}
      <section>
        <h2 className="mb-4 text-lg font-semibold">Organizations</h2>
        {orgLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 w-full" />
            ))}
          </div>
        ) : orgStats ? (
          <div className="space-y-6">
            {/* By Status */}
            <div>
              <h3 className="text-muted-foreground mb-3 text-sm font-medium">
                By Status
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <RecordBreakdown
                  title="Organization Status"
                  data={orgStats.byStatus}
                  labels={ORGANIZATION_STATUS_LABELS}
                />
              </div>
            </div>

            {/* By Tier */}
            <div>
              <h3 className="text-muted-foreground mb-3 text-sm font-medium">
                By Tier
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <RecordBreakdown
                  title="Organization Tier"
                  data={orgStats.byTier}
                  labels={ORGANIZATION_TIER_LABELS}
                />
              </div>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            Failed to load organization data
          </p>
        )}
      </section>

      {/* ── Invite Funnel ─────────────────────────────────────────── */}
      <section>
        <h2 className="mb-4 text-lg font-semibold">Invite Funnel</h2>
        {inviteLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-28 w-full" />
            ))}
          </div>
        ) : inviteStats ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Invites Sent"
              value={formatNumber(inviteStats.totalSent)}
              icon={Mail}
            />
            <StatCard
              title="Invites Used"
              value={formatNumber(inviteStats.totalUsed)}
              icon={MailCheck}
            />
            <StatCard
              title="Invites Expired"
              value={formatNumber(inviteStats.totalExpired)}
              icon={MailX}
            />
            <StatCard
              title="Conversion Rate"
              value={formatPercent(inviteStats.conversionRate)}
              description={`${formatNumber(inviteStats.totalUsed)} of ${formatNumber(inviteStats.totalSent)} invites redeemed`}
              icon={Percent}
            />
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            Failed to load invite data
          </p>
        )}
      </section>
    </div>
  );
}
