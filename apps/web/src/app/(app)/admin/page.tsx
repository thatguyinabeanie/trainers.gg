/**
 * Admin Dashboard page — Server Component.
 *
 * Phase 2 Task 9 (T3g) — converted from a "use client" page with 6 one-shot
 * `useSupabaseQuery` reads to a server component that fetches all 6 dashboard
 * stats via `Promise.all` using the service-role client, then passes them as
 * props to the client rendering layer.
 *
 * WHY: Once `REVOKE SELECT ... FROM anon, authenticated` lands on S-bucket base
 * tables (including `users`, `audit_log`, `communities`, `tournaments`), the
 * browser-keyed reads would silently return zero rows. Running the reads
 * server-side with service-role bypasses the revoke safely because the admin
 * layout's `requireSiteAdmin()` guard already enforces that only admins reach
 * this page.
 *
 * NO 'use cache': admin dashboard data includes PII and admin-sensitive counts
 * — it is per-admin-session data and must never be cached in a shared CDN or
 * browser cache.
 */

import { Label, Pie, PieChart } from "recharts";
import {
  Users,
  Activity,
  Building2,
  Trophy,
  UserCheck,
  BarChart3,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  getPlatformOverview,
  getActiveUserStats,
  getAuditLogStats,
  getAuditLog,
  getOrganizationStats,
  getTournamentStats,
  type PlatformOverview,
  type ActiveUserStats,
  type OrganizationStats,
} from "@trainers/supabase";
import type { Database } from "@trainers/supabase";
import { createServiceRoleClient } from "@/lib/supabase/server";
import {
  AuditActionBadge,
  getActionPrefix,
} from "./activity/audit-action-badge";
import { ActivityTab } from "./activity-tab";
import {
  CHART_COLORS,
  TOURNAMENT_STATUS_LABELS,
  ORG_STATUS_LABELS,
  ORG_TIER_LABELS,
  DEFAULT_FILL,
  formatNumber,
  relativeTime,
  humanLabel,
  buildChartData,
} from "./helpers";

type AuditAction = Database["public"]["Enums"]["audit_action"];

// Derive return types from the query functions for use as prop types below.
type AuditLogStats = Awaited<ReturnType<typeof getAuditLogStats>>;
type AuditLogResult = Awaited<ReturnType<typeof getAuditLog>>;

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

interface MetricCardProps {
  title: string;
  value: number | undefined;
  icon: LucideIcon;
  subtitle?: string;
  theme: MetricTheme;
}

function MetricCard({ title, value, icon: Icon, subtitle, theme }: MetricCardProps) {
  return (
    <Card className={cn("border-l-[3px]", theme.border)}>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              {title}
            </p>
            <p className="text-3xl font-semibold tracking-tight tabular-nums">
              {formatNumber(value ?? 0)}
            </p>
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

interface DonutBreakdownCardProps {
  title: string;
  data: Record<string, number> | undefined;
  labels: Record<string, string>;
}

function DonutBreakdownCard({ title, data, labels }: DonutBreakdownCardProps) {
  const { chartData, chartConfig, total } = buildChartData(data, labels);

  return (
    <Card>
      <CardHeader className="pb-0">
        <CardTitle className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <div className="flex flex-col items-center">
            {/* Donut chart */}
            <ChartContainer
              config={chartConfig}
              className="aspect-square h-36"
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
                                CHART_COLORS[name as string] ?? DEFAULT_FILL,
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

interface RecentActivityFeedProps {
  entries: RecentEntry[];
}

function RecentActivityFeed({ entries }: RecentActivityFeedProps) {
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

// ── Dashboard Stats Content ─────────────────────────────────────────

interface DashboardContentProps {
  overview: PlatformOverview | null;
  activeUsers: ActiveUserStats | null;
  auditStats: AuditLogStats | null;
  recentLog: AuditLogResult | null;
  communityStats: OrganizationStats | null;
  tournamentStats: Record<string, number> | null;
  hasError: boolean;
}

function DashboardContent({
  overview,
  activeUsers,
  auditStats,
  recentLog,
  communityStats,
  tournamentStats,
  hasError,
}: DashboardContentProps) {
  const recentEntries = (recentLog?.data ?? []) as RecentEntry[];
  const pendingCommunities = communityStats?.byStatus?.pending ?? 0;

  return (
    <div className="space-y-8">
      {/* Error banner */}
      {hasError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          Failed to load dashboard data. Please try again.
        </div>
      )}

      {/* ── Pending Org Alert ──────────────────────────────────── */}
      {pendingCommunities > 0 && (
        <Link href="/admin/communities">
          <Card className="group border-amber-500/30 bg-amber-500/5 transition-colors hover:border-amber-500/50">
            <CardContent className="flex items-center gap-4 pt-5">
              <div className="rounded-lg bg-amber-500/10 p-2.5">
                <Building2 className="size-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">
                  {pendingCommunities} community request
                  {pendingCommunities !== 1 ? "s" : ""} pending approval
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
          theme={metricThemes.blue}
        />
        <MetricCard
          title="Communities"
          value={overview?.totalOrganizations}
          icon={Building2}
          theme={metricThemes.amber}
        />
        <MetricCard
          title="Tournaments"
          value={overview?.totalTournaments}
          icon={Trophy}
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
            <RecentActivityFeed entries={recentEntries} />
          </CardContent>
        </Card>

        {/* Sidebar: Charts */}
        <div className="space-y-4 lg:col-span-2">
          <DonutBreakdownCard
            title="Tournaments by Status"
            data={tournamentStats ?? undefined}
            labels={TOURNAMENT_STATUS_LABELS}
          />

          <DonutBreakdownCard
            title="Communities by Status"
            data={communityStats?.byStatus}
            labels={ORG_STATUS_LABELS}
          />

          <DonutBreakdownCard
            title="Communities by Tier"
            data={communityStats?.byTier}
            labels={ORG_TIER_LABELS}
          />
        </div>
      </div>
    </div>
  );
}

// ── Main Page (Server Component) ────────────────────────────────────

/**
 * Admin dashboard page. Server component — fetches all 6 stat reads in parallel
 * via service-role (safe because the admin layout's `requireSiteAdmin()` gate
 * already ensures only site admins reach this page).
 */
export default async function AdminPage() {
  const supabase = createServiceRoleClient();

  // Fetch all 6 dashboard stats in parallel. `.catch(() => null)` lets the
  // page render a partial error state instead of throwing a full 500.
  const [
    overview,
    activeUsers,
    auditStats,
    recentLog,
    communityStats,
    tournamentStats,
  ] = await Promise.all([
    getPlatformOverview(supabase).catch(() => null),
    getActiveUserStats(supabase).catch(() => null),
    getAuditLogStats(supabase).catch(() => null),
    getAuditLog(supabase, { limit: 10, offset: 0 }).catch(() => null),
    getOrganizationStats(supabase).catch(() => null),
    getTournamentStats(supabase).catch(() => null),
  ]);

  const hasError =
    overview === null ||
    activeUsers === null ||
    auditStats === null ||
    recentLog === null ||
    communityStats === null ||
    tournamentStats === null;

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
        <DashboardContent
          overview={overview}
          activeUsers={activeUsers}
          auditStats={auditStats}
          recentLog={recentLog}
          communityStats={communityStats}
          tournamentStats={tournamentStats}
          hasError={hasError}
        />
      </TabsContent>

      <TabsContent value="activity">
        <ActivityTab />
      </TabsContent>
    </Tabs>
  );
}
