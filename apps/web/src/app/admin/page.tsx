"use client";

import { useCallback, useMemo } from "react";
import { Label, Pie, PieChart } from "recharts";
import {
  Users,
  Activity,
  Building2,
  Trophy,
  Swords,
  UserCheck,
  Mail,
  BarChart3,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useSupabaseQuery } from "@/lib/supabase";
import {
  getPlatformOverview,
  getActiveUserStats,
  getAuditLogStats,
  getAuditLog,
  getOrganizationStats,
  getTournamentStats,
  getInviteConversionStats,
} from "@trainers/supabase";
import type { TypedSupabaseClient, Database } from "@trainers/supabase";
import {
  AuditActionBadge,
  getActionPrefix,
} from "./activity/audit-action-badge";
import { ActivityTab } from "./activity-tab";

type AuditAction = Database["public"]["Enums"]["audit_action"];

// ── Label maps ──────────────────────────────────────────────────────

const TOURNAMENT_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  upcoming: "Upcoming",
  active: "Active",
  paused: "Paused",
  completed: "Completed",
  cancelled: "Cancelled",
};

const ORG_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  active: "Active",
  rejected: "Rejected",
  suspended: "Suspended",
};

const ORG_TIER_LABELS: Record<string, string> = {
  regular: "Regular",
  verified: "Verified",
  partner: "Partner",
};

// ── Chart color map (hex values for recharts fills) ─────────────────

const CHART_COLORS: Record<string, string> = {
  active: "oklch(0.765 0.177 163.22)",
  upcoming: "oklch(0.623 0.214 259.53)",
  draft: "oklch(0.705 0.015 286.07)",
  paused: "oklch(0.769 0.188 70.08)",
  completed: "oklch(0.705 0.015 286.07)",
  cancelled: "oklch(0.637 0.237 25.33)",
  pending: "oklch(0.769 0.188 70.08)",
  rejected: "oklch(0.637 0.237 25.33)",
  suspended: "oklch(0.637 0.237 25.33)",
  regular: "oklch(0.705 0.015 286.07)",
  verified: "oklch(0.623 0.214 259.53)",
  partner: "oklch(0.765 0.177 163.22)",
};

// ── Helpers ─────────────────────────────────────────────────────────

function formatNumber(n: number): string {
  return n.toLocaleString();
}

function relativeTime(isoString: string): string {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;

  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays}d ago`;
}

function humanLabel(key: string, labels: Record<string, string>): string {
  return (
    labels[key] ??
    key
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ")
  );
}

// ── Metric Card ─────────────────────────────────────────────────────

interface MetricTheme {
  iconBg: string;
  iconColor: string;
  border: string;
}

const metricThemes = {
  teal: {
    iconBg: "bg-teal-500/10 dark:bg-teal-500/15",
    iconColor: "text-teal-600 dark:text-teal-400",
    border: "border-l-teal-500",
  },
  blue: {
    iconBg: "bg-blue-500/10 dark:bg-blue-500/15",
    iconColor: "text-blue-600 dark:text-blue-400",
    border: "border-l-blue-500",
  },
  amber: {
    iconBg: "bg-amber-500/10 dark:bg-amber-500/15",
    iconColor: "text-amber-600 dark:text-amber-400",
    border: "border-l-amber-500",
  },
  emerald: {
    iconBg: "bg-emerald-500/10 dark:bg-emerald-500/15",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    border: "border-l-emerald-500",
  },
  purple: {
    iconBg: "bg-purple-500/10 dark:bg-purple-500/15",
    iconColor: "text-purple-600 dark:text-purple-400",
    border: "border-l-purple-500",
  },
} satisfies Record<string, MetricTheme>;

function MetricCard({
  title,
  value,
  icon: Icon,
  subtitle,
  isLoading,
  theme,
}: {
  title: string;
  value: number | undefined;
  icon: LucideIcon;
  subtitle?: string;
  isLoading: boolean;
  theme: MetricTheme;
}) {
  return (
    <Card className={cn("border-l-[3px]", theme.border)}>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              {title}
            </p>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <p className="text-3xl font-semibold tracking-tight tabular-nums">
                {formatNumber(value ?? 0)}
              </p>
            )}
            {subtitle && (
              <p className="text-muted-foreground text-xs">{subtitle}</p>
            )}
          </div>
          <div className={cn("rounded-lg p-2.5", theme.iconBg)}>
            <Icon className={cn("size-5", theme.iconColor)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Donut Breakdown Chart ───────────────────────────────────────────

function DonutBreakdownCard({
  title,
  data,
  labels,
  isLoading,
}: {
  title: string;
  data: Record<string, number> | undefined;
  labels: Record<string, string>;
  isLoading: boolean;
}) {
  // Build recharts data + chart config from the Record
  const { chartData, chartConfig, total } = useMemo(() => {
    const entries = data ? Object.entries(data) : [];
    const t = entries.reduce((sum, [, v]) => sum + v, 0);

    const cd = entries.map(([key, value]) => ({
      name: key,
      value,
      fill: CHART_COLORS[key] ?? "oklch(0.705 0.015 286.07)",
    }));

    const cc: ChartConfig = {};
    for (const [key] of entries) {
      cc[key] = {
        label: humanLabel(key, labels),
        color: CHART_COLORS[key] ?? "oklch(0.705 0.015 286.07)",
      };
    }

    return { chartData: cd, chartConfig: cc, total: t };
  }, [data, labels]);

  return (
    <Card>
      <CardHeader className="pb-0">
        <CardTitle className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <Skeleton className="size-[120px] rounded-full" />
            <div className="flex gap-4">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ) : chartData.length > 0 ? (
          <div className="flex flex-col items-center">
            {/* Donut chart */}
            <ChartContainer
              config={chartConfig}
              className="aspect-square h-[140px]"
            >
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      hideLabel
                      formatter={(value, name) => (
                        <div className="flex items-center gap-2">
                          <div
                            className="size-2.5 shrink-0 rounded-[2px]"
                            style={{
                              backgroundColor:
                                CHART_COLORS[name as string] ??
                                "oklch(0.705 0.015 286.07)",
                            }}
                          />
                          <span className="text-muted-foreground">
                            {humanLabel(name as string, labels)}
                          </span>
                          <span className="font-mono font-medium tabular-nums">
                            {(value as number).toLocaleString()}
                          </span>
                        </div>
                      )}
                    />
                  }
                />
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={40}
                  outerRadius={60}
                  strokeWidth={2}
                  stroke="var(--color-card)"
                >
                  <Label
                    content={({ viewBox }) => {
                      if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                        return (
                          <text
                            x={viewBox.cx}
                            y={viewBox.cy}
                            textAnchor="middle"
                            dominantBaseline="middle"
                          >
                            <tspan
                              x={viewBox.cx}
                              y={viewBox.cy}
                              className="fill-foreground text-2xl font-semibold"
                            >
                              {total.toLocaleString()}
                            </tspan>
                          </text>
                        );
                      }
                    }}
                  />
                </Pie>
              </PieChart>
            </ChartContainer>

            {/* Legend */}
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5">
              {chartData.map((item) => (
                <div key={item.name} className="flex items-center gap-1.5">
                  <div
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: item.fill }}
                  />
                  <span className="text-muted-foreground text-xs">
                    {humanLabel(item.name, labels)}
                  </span>
                  <span className="text-xs font-medium tabular-nums">
                    {item.value.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground py-8 text-center text-sm">
            No data
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ── Recent Activity Feed ────────────────────────────────────────────

interface RecentEntry {
  id: number;
  action: AuditAction;
  created_at: string;
  actor_user_id: string | null;
  actor_user: { username: string; image: string | null } | null;
}

function RecentActivityFeed({
  entries,
  isLoading,
}: {
  entries: RecentEntry[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="space-y-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-2 py-2.5">
            <Skeleton className="size-7 shrink-0 rounded-full" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-3.5 w-24" />
            </div>
            <Skeleton className="h-5 w-20" />
          </div>
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Activity className="text-muted-foreground mb-3 size-8 opacity-30" />
        <p className="text-muted-foreground text-sm">No recent activity</p>
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {entries.map((entry) => {
        const prefix = getActionPrefix(entry.action);
        const colors: Record<string, string> = {
          match: "bg-blue-500",
          judge: "bg-purple-500",
          tournament: "bg-emerald-500",
          admin: "bg-red-500",
          team: "bg-amber-500",
          registration: "bg-teal-500",
        };
        const avatarBg: Record<string, string> = {
          match: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
          judge: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
          tournament:
            "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
          admin: "bg-red-500/10 text-red-600 dark:text-red-400",
          team: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
          registration: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
        };
        const dotColor = colors[prefix] ?? "bg-muted-foreground";

        return (
          <div
            key={entry.id}
            className="hover:bg-muted/50 flex items-center gap-3 rounded-lg px-2 py-2 transition-colors"
          >
            <div
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                avatarBg[prefix] ?? "bg-muted text-muted-foreground"
              )}
            >
              {(entry.actor_user?.username ?? "S").charAt(0).toUpperCase()}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-medium">
                  {entry.actor_user?.username ?? "System"}
                </span>
                <div
                  className={cn("size-1.5 shrink-0 rounded-full", dotColor)}
                />
                <span className="text-muted-foreground shrink-0 text-xs">
                  {relativeTime(entry.created_at)}
                </span>
              </div>
            </div>

            <AuditActionBadge
              action={entry.action}
              className="shrink-0 text-xs"
            />
          </div>
        );
      })}
    </div>
  );
}

// ── Invite Funnel ───────────────────────────────────────────────────

function InviteFunnelCard({
  inviteStats,
  isLoading,
}: {
  inviteStats:
    | { totalSent: number; totalUsed: number; conversionRate: number }
    | undefined;
  isLoading: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Invite Funnel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <>
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-3 w-full rounded-full" />
          </>
        ) : inviteStats ? (
          <>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1.5 text-sm">
                <Mail className="size-3.5" /> Sent
              </span>
              <span className="text-sm font-medium tabular-nums">
                {formatNumber(inviteStats.totalSent)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1.5 text-sm">
                <Swords className="size-3.5" /> Used
              </span>
              <span className="text-sm font-medium tabular-nums">
                {formatNumber(inviteStats.totalUsed)}
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-xs">
                  Conversion
                </span>
                <Badge variant="default" className="tabular-nums">
                  {(inviteStats.conversionRate * 100).toFixed(1)}%
                </Badge>
              </div>
              <div className="bg-muted h-2 overflow-hidden rounded-full">
                <div
                  className="bg-primary h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(inviteStats.conversionRate * 100, 100)}%`,
                  }}
                />
              </div>
            </div>
          </>
        ) : (
          <p className="text-muted-foreground py-2 text-center text-sm">
            No data
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ── Dashboard Content ───────────────────────────────────────────────

function DashboardContent() {
  const { data: overview, isLoading: overviewLoading } = useSupabaseQuery(
    (s) => getPlatformOverview(s),
    []
  );

  const { data: activeUsers, isLoading: activeLoading } = useSupabaseQuery(
    (s) => getActiveUserStats(s),
    []
  );

  const { data: auditStats, isLoading: auditStatsLoading } = useSupabaseQuery(
    (s) => getAuditLogStats(s),
    []
  );

  const recentQueryFn = useCallback(
    (s: TypedSupabaseClient) => getAuditLog(s, { limit: 10, offset: 0 }),
    []
  );
  const { data: recentLog, isLoading: recentLoading } = useSupabaseQuery(
    recentQueryFn,
    []
  );

  const { data: orgStats, isLoading: orgLoading } = useSupabaseQuery(
    (s) => getOrganizationStats(s),
    []
  );

  const { data: tournamentStats, isLoading: tournamentLoading } =
    useSupabaseQuery((s) => getTournamentStats(s), []);

  const { data: inviteStats, isLoading: inviteLoading } = useSupabaseQuery(
    (s) => getInviteConversionStats(s),
    []
  );

  const recentEntries = (recentLog?.data ?? []) as RecentEntry[];
  const pendingOrgs = orgStats?.byStatus?.pending ?? 0;

  return (
    <div className="space-y-8">
      {/* ── Pending Org Alert ──────────────────────────────────── */}
      {!orgLoading && pendingOrgs > 0 && (
        <Link href="/admin/organizations">
          <Card className="group border-amber-500/30 bg-amber-500/5 transition-colors hover:border-amber-500/50">
            <CardContent className="flex items-center gap-4 pt-5">
              <div className="rounded-lg bg-amber-500/10 p-2.5">
                <Building2 className="size-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">
                  {pendingOrgs} organization
                  {pendingOrgs !== 1 ? "s" : ""} pending approval
                </p>
                <p className="text-muted-foreground text-xs">
                  Review and approve or reject
                </p>
              </div>
              <ArrowRight className="text-muted-foreground size-4 transition-transform group-hover:translate-x-0.5" />
            </CardContent>
          </Card>
        </Link>
      )}

      {/* ── Key Metrics ───────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard
          title="Total Users"
          value={overview?.totalUsers}
          icon={Users}
          isLoading={overviewLoading}
          theme={metricThemes.teal}
        />
        <MetricCard
          title="Active (7d)"
          value={activeUsers?.active7d}
          icon={UserCheck}
          subtitle={
            overview && activeUsers
              ? `${((activeUsers.active7d / Math.max(overview.totalUsers, 1)) * 100).toFixed(0)}% of total`
              : undefined
          }
          isLoading={activeLoading}
          theme={metricThemes.blue}
        />
        <MetricCard
          title="Organizations"
          value={overview?.totalOrganizations}
          icon={Building2}
          isLoading={overviewLoading}
          theme={metricThemes.amber}
        />
        <MetricCard
          title="Tournaments"
          value={overview?.totalTournaments}
          icon={Trophy}
          isLoading={overviewLoading}
          theme={metricThemes.emerald}
        />
        <MetricCard
          title="Events (24h)"
          value={auditStats?.total24h}
          icon={Activity}
          subtitle={
            auditStats
              ? `${formatNumber(auditStats.total7d)} this week`
              : undefined
          }
          isLoading={auditStatsLoading}
          theme={metricThemes.purple}
        />
      </div>

      {/* ── Main Content: Activity + Charts ────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Recent Activity */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between">
              <span className="text-base">Recent Activity</span>
              <span className="text-muted-foreground text-xs font-normal tabular-nums">
                Last 10 events
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RecentActivityFeed
              entries={recentEntries}
              isLoading={recentLoading}
            />
          </CardContent>
        </Card>

        {/* Sidebar: Charts + Funnel */}
        <div className="space-y-4 lg:col-span-2">
          <DonutBreakdownCard
            title="Tournaments by Status"
            data={tournamentStats}
            labels={TOURNAMENT_STATUS_LABELS}
            isLoading={tournamentLoading}
          />

          <DonutBreakdownCard
            title="Organizations by Status"
            data={orgStats?.byStatus}
            labels={ORG_STATUS_LABELS}
            isLoading={orgLoading}
          />

          <DonutBreakdownCard
            title="Organizations by Tier"
            data={orgStats?.byTier}
            labels={ORG_TIER_LABELS}
            isLoading={orgLoading}
          />

          <InviteFunnelCard
            inviteStats={inviteStats}
            isLoading={inviteLoading}
          />
        </div>
      </div>
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────

export default function AdminPage() {
  return (
    <Tabs defaultValue="dashboard">
      <TabsList>
        <TabsTrigger value="dashboard">
          <BarChart3 className="size-4" />
          Dashboard
        </TabsTrigger>
        <TabsTrigger value="activity">
          <Activity className="size-4" />
          Audit Log
        </TabsTrigger>
      </TabsList>

      <TabsContent value="dashboard">
        <DashboardContent />
      </TabsContent>

      <TabsContent value="activity">
        <ActivityTab />
      </TabsContent>
    </Tabs>
  );
}
