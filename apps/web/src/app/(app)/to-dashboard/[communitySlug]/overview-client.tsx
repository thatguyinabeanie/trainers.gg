"use client";

import Link from "next/link";
import {
  Trophy,
  Plus,
  Activity,
  UserPlus,
  Play,
  UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Status } from "@/components/ui/status-badge";

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrganizationWithStats {
  id: number;
  name: string;
  slug: string;
  created_at: string | null;
  tournamentCounts: Record<string, number>;
  totalTournaments: number;
  totalParticipants: number;
  staffCount: number;
}

interface Tournament {
  id: number;
  name: string;
  slug: string;
  status: string | null;
  start_date: string | null;
  end_date: string | null;
  max_participants: number | null;
  registrationCount: number;
  // current_round is optional — may not be present in all query results
  current_round?: number | null;
  total_rounds?: number | null;
}

interface OverviewClientProps {
  organization: OrganizationWithStats;
  recentTournaments: Tournament[];
  communitySlug: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatFoundedDate(createdAt: string | null): string {
  if (!createdAt) return "—";
  return new Date(createdAt).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

function getTournamentMeta(tournament: Tournament): string {
  if (tournament.status === "active") {
    if (tournament.current_round != null && tournament.total_rounds != null) {
      return `R${tournament.current_round} of ${tournament.total_rounds}`;
    }
    return `${tournament.registrationCount} players`;
  }
  if (tournament.status === "upcoming") {
    const cap = tournament.max_participants;
    return cap
      ? `${tournament.registrationCount}/${cap}`
      : `${tournament.registrationCount}`;
  }
  if (tournament.status === "completed") {
    return `${tournament.registrationCount}`;
  }
  // draft / cancelled
  return `${tournament.registrationCount}`;
}

// ─── Activity Feed placeholder types ─────────────────────────────────────────

type ActivityType = "registration" | "round_start" | "staff_join" | "completed";

interface ActivityItem {
  id: string;
  type: ActivityType;
  text: React.ReactNode;
  timeAgo: string;
}

const activityIconConfig: Record<
  ActivityType,
  { icon: typeof Activity; bg: string; color: string }
> = {
  registration: {
    icon: UserPlus,
    bg: "bg-emerald-500/10",
    color: "text-emerald-600",
  },
  round_start: {
    icon: Play,
    bg: "bg-blue-500/10",
    color: "text-blue-600",
  },
  staff_join: {
    icon: UserCheck,
    bg: "bg-amber-500/10",
    color: "text-amber-600",
  },
  completed: {
    icon: Trophy,
    bg: "bg-emerald-500/10",
    color: "text-emerald-600",
  },
};

// ─── Subcomponents ────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
}

function StatCard({ label, value, sub }: StatCardProps) {
  return (
    <div className="bg-muted/50 rounded-md px-2.5 py-2">
      <p className="text-muted-foreground mb-0.5 text-[9px] font-semibold tracking-widest uppercase">
        {label}
      </p>
      <p className="font-mono text-base leading-none font-bold">{value}</p>
      {sub && <p className="text-muted-foreground mt-0.5 text-[8px]">{sub}</p>}
    </div>
  );
}

interface LiveNowCardProps {
  tournament: Tournament;
  manageHref: string;
}

function LiveNowCard({ tournament, manageHref }: LiveNowCardProps) {
  const roundText =
    tournament.current_round != null && tournament.total_rounds != null
      ? `Round ${tournament.current_round} of ${tournament.total_rounds}`
      : null;

  return (
    <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2.5">
      {/* Live indicator */}
      <div className="mb-1.5 flex items-center gap-1.5">
        <span className="relative flex size-1.5 shrink-0">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-75" />
          <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
        </span>
        <span className="text-[10px] font-semibold tracking-wide text-emerald-700 uppercase">
          Live Now
        </span>
      </div>

      {/* Tournament info + Manage button */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-emerald-900">
            {tournament.name}
          </p>
          <p className="text-[11px] text-emerald-700">
            {roundText && <span>{roundText} · </span>}
            {tournament.registrationCount} players
          </p>
        </div>
        <Link
          href={manageHref}
          className="shrink-0 rounded-md bg-emerald-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-emerald-700"
        >
          Manage →
        </Link>
      </div>
    </div>
  );
}

interface TournamentRowProps {
  tournament: Tournament;
  href: string;
}

function TournamentRow({ tournament, href }: TournamentRowProps) {
  const status = (tournament.status ?? "draft") as Status;
  const meta = getTournamentMeta(tournament);

  return (
    <Link
      href={href}
      className="hover:bg-muted/50 flex items-center gap-2 rounded px-1 py-1.5 text-xs transition-colors"
    >
      <StatusBadge status={status} className="shrink-0 px-1 py-0 text-[9px]" />
      <span className="min-w-0 flex-1 truncate font-medium">
        {tournament.name}
      </span>
      <span className="text-muted-foreground shrink-0 font-mono text-[10px]">
        {meta}
      </span>
    </Link>
  );
}

interface ActivityRowProps {
  item: ActivityItem;
}

function ActivityRow({ item }: ActivityRowProps) {
  const config = activityIconConfig[item.type];
  const Icon = config.icon;

  return (
    <div className="flex items-start gap-2 py-1.5 text-xs">
      <div
        className={cn(
          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded",
          config.bg
        )}
      >
        <Icon className={cn("size-3", config.color)} />
      </div>
      <span className="text-foreground min-w-0 flex-1 leading-snug">
        {item.text}
      </span>
      <span className="text-muted-foreground shrink-0 text-[10px]">
        {item.timeAgo}
      </span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function OverviewClient({
  organization,
  recentTournaments,
  communitySlug,
}: OverviewClientProps) {
  const basePath = `/dashboard/community/${communitySlug}`;

  // Find the active tournament for the Live Now card
  const activeTournament = recentTournaments.find((t) => t.status === "active");

  // Tournaments to display in the table (all, limited to 5)
  const displayTournaments = recentTournaments.slice(0, 5);

  // Founded date
  const foundedText = formatFoundedDate(organization.created_at);

  // Active count sub-label
  const activeCount = organization.tournamentCounts.active ?? 0;
  const tournamentsSubText =
    activeCount > 0 ? `${activeCount} active` : undefined;

  // Placeholder activity feed — no query exists yet for community activity
  const activityItems: ActivityItem[] = [];

  return (
    <div className="flex flex-col gap-3">
      {/* Stats row */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatCard
          label="Tournaments"
          value={organization.totalTournaments}
          sub={tournamentsSubText}
        />
        <StatCard label="Players" value={organization.totalParticipants} />
        <StatCard label="Staff" value={organization.staffCount} />
        <StatCard label="Founded" value={foundedText} />
      </div>

      {/* Live Now card — only when a tournament is active */}
      {activeTournament && (
        <LiveNowCard
          tournament={activeTournament}
          manageHref={`${basePath}/tournaments/${activeTournament.slug}/manage`}
        />
      )}

      {/* Two-column layout: Tournaments + Activity Feed */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Tournaments section */}
        <div>
          {/* Section heading with + Create button */}
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase">
              Tournaments
            </span>
            <Link
              href={`${basePath}/tournaments/create`}
              className="flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] font-medium text-teal-600 hover:bg-teal-50 hover:text-teal-700"
            >
              <Plus className="size-3" />
              Create
            </Link>
          </div>

          {/* Tournament rows */}
          <div className="bg-card rounded-md border px-2 py-1">
            {displayTournaments.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-1 py-6 text-center">
                <Trophy className="text-muted-foreground size-6" />
                <p className="text-muted-foreground text-xs">
                  No tournaments yet
                </p>
                <Link
                  href={`${basePath}/tournaments/create`}
                  className="mt-1 text-[11px] text-teal-600 hover:underline"
                >
                  Create your first →
                </Link>
              </div>
            ) : (
              <>
                {displayTournaments.map((tournament) => (
                  <TournamentRow
                    key={tournament.id}
                    tournament={tournament}
                    href={`${basePath}/tournaments/${tournament.slug}/manage`}
                  />
                ))}
                {recentTournaments.length > 5 && (
                  <div className="border-t pt-1.5 pb-0.5 text-right">
                    <Link
                      href={`${basePath}/tournaments`}
                      className="text-[11px] text-teal-600 hover:underline"
                    >
                      View all →
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Activity Feed section */}
        <div>
          <div className="mb-1.5">
            <span className="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase">
              Recent Activity
            </span>
          </div>

          <div className="bg-card rounded-md border px-2 py-1">
            {activityItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-1 py-6 text-center">
                <Activity className="text-muted-foreground size-6" />
                <p className="text-muted-foreground text-xs">
                  No recent activity
                </p>
              </div>
            ) : (
              <div className="divide-border/50 divide-y">
                {activityItems.map((item) => (
                  <ActivityRow key={item.id} item={item} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
