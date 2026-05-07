"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  Trophy,
  Clock,
  ChevronRight,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Upload,
  Swords,
  Plus,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { checkIn } from "@/actions/tournaments";

// =============================================================================
// Types
// =============================================================================

interface Tournament {
  id: number;
  name: string;
  slug: string;
  startDate: number | null;
  status: string;
  hasTeam: boolean;
  registrationStatus: string | null;
  registrationId: number | null;
  lateCheckInMaxRound: number | null;
}

interface Activity {
  id: number;
  tournamentName: string;
  opponentName: string;
  result: string;
  date: number;
}

interface DashboardActivityProps {
  myTournaments: Tournament[];
  recentActivity: Activity[];
}

// =============================================================================
// Upcoming Tournaments
// =============================================================================

function UpcomingTournamentsList({
  tournaments,
}: {
  tournaments: Tournament[];
}) {
  const [isPending, startTransition] = useTransition();
  const [checkingInId, setCheckingInId] = useState<number | null>(null);
  const [now] = useState(() => Date.now());

  const formatDate = (timestamp: number | null) => {
    if (!timestamp) return "Date TBD";
    const date = new Date(timestamp);
    const diffDays = Math.ceil(
      (date.getTime() - now) / (1000 * 60 * 60 * 24)
    );
    if (diffDays < 0) return "In Progress";
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays <= 7) return `In ${diffDays} days`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const getStatusInfo = (tournament: Tournament) => {
    const startDate = tournament.startDate ?? null;
    const hoursUntilStart = startDate
      ? (startDate - now) / (1000 * 60 * 60)
      : null;
    const isUrgent =
      hoursUntilStart !== null && hoursUntilStart > 0 && hoursUntilStart < 24;
    const isCheckedIn = tournament.registrationStatus === "checked_in";
    const isActive = tournament.status === "active";

    if (!tournament.hasTeam) {
      return {
        icon: AlertCircle,
        label: "Team Required",
        color: "text-amber-600 dark:text-amber-400",
        bgColor: "bg-amber-500/10",
        isUrgent,
      };
    }

    if (isActive && !isCheckedIn) {
      return {
        icon: AlertCircle,
        label: "Check in now!",
        color: "text-red-600 dark:text-red-400",
        bgColor: "bg-red-500/10",
        isUrgent: true,
      };
    }

    if (tournament.hasTeam && !isCheckedIn) {
      return {
        icon: Clock,
        label: "Ready for Check-in",
        color: "text-blue-600 dark:text-blue-400",
        bgColor: "bg-blue-500/10",
        isUrgent: false,
      };
    }

    return {
      icon: CheckCircle2,
      label: "Checked In",
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-500/10",
      isUrgent: false,
    };
  };

  const handleCheckIn = (tournamentId: number) => {
    setCheckingInId(tournamentId);
    startTransition(async () => {
      try {
        const result = await checkIn(tournamentId);
        if (result.success) {
          toast.success("Successfully checked in!");
        } else {
          toast.error(result.error || "Failed to check in");
        }
      } catch {
        toast.error("Failed to check in");
      } finally {
        setCheckingInId(null);
      }
    });
  };

  // Sort: urgent first, then by start date
  const sorted = [...tournaments].sort((a, b) => {
    const aStatus = getStatusInfo(a);
    const bStatus = getStatusInfo(b);
    if (aStatus.isUrgent && !bStatus.isUrgent) return -1;
    if (!aStatus.isUrgent && bStatus.isUrgent) return 1;
    return (a.startDate ?? Infinity) - (b.startDate ?? Infinity);
  });

  if (tournaments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <Trophy className="text-muted-foreground size-8" />
        <p className="text-muted-foreground mt-3 text-sm font-medium">
          No upcoming tournaments
        </p>
        <p className="text-muted-foreground mt-1 text-xs">
          Browse available tournaments to join
        </p>
        <Button
          size="sm"
          variant="outline"
          className="mt-4"
          render={<Link href="/tournaments" />}
          nativeButton={false}
        >
          <Plus className="mr-1.5 size-3.5" />
          Find Tournaments
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {sorted.slice(0, 4).map((tournament) => {
        const statusInfo = getStatusInfo(tournament);
        const StatusIcon = statusInfo.icon;
        const canCheckIn =
          tournament.hasTeam &&
          tournament.registrationStatus !== "checked_in";
        const isCheckedIn = tournament.registrationStatus === "checked_in";

        return (
          <div
            key={tournament.id}
            className={cn(
              "group flex items-center gap-3 rounded-lg p-3 transition-colors",
              statusInfo.isUrgent
                ? "bg-amber-500/5 hover:bg-amber-500/10"
                : "hover:bg-muted/50"
            )}
          >
            {/* Status icon */}
            <div
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-lg",
                statusInfo.bgColor
              )}
            >
              <StatusIcon className={cn("size-4", statusInfo.color)} />
            </div>

            {/* Content */}
            <Link
              href={`/tournaments/${tournament.slug}`}
              className="min-w-0 flex-1"
            >
              <p className="group-hover:text-primary truncate text-sm font-medium transition-colors">
                {tournament.name}
              </p>
              <div className="mt-0.5 flex items-center gap-2">
                <div className="text-muted-foreground flex items-center gap-1 text-xs">
                  <Calendar className="size-3" />
                  <span>{formatDate(tournament.startDate)}</span>
                </div>
                <div
                  className={cn(
                    "flex items-center gap-1 text-xs font-medium",
                    statusInfo.color
                  )}
                >
                  <StatusIcon className="size-3" />
                  <span>{statusInfo.label}</span>
                </div>
              </div>
            </Link>

            {/* Actions */}
            <div className="shrink-0">
              {!tournament.hasTeam && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  render={<Link href={`/tournaments/${tournament.slug}`} />}
                  nativeButton={false}
                >
                  <Upload className="mr-1 size-3" />
                  Submit Team
                </Button>
              )}
              {canCheckIn && (
                <Button
                  size="sm"
                  variant={statusInfo.isUrgent ? "default" : "outline"}
                  className="h-7 text-xs"
                  onClick={() => handleCheckIn(tournament.id)}
                  disabled={isPending && checkingInId === tournament.id}
                >
                  <CheckCircle2 className="mr-1 size-3" />
                  {isPending && checkingInId === tournament.id
                    ? "..."
                    : "Check In"}
                </Button>
              )}
              {isCheckedIn && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  render={<Link href={`/tournaments/${tournament.slug}`} />}
                  nativeButton={false}
                >
                  View
                  <ChevronRight className="ml-0.5 size-3" />
                </Button>
              )}
            </div>
          </div>
        );
      })}

      {tournaments.length > 4 && (
        <Button
          size="sm"
          variant="ghost"
          className="w-full text-xs"
          render={<Link href="/dashboard/tournaments" />}
          nativeButton={false}
        >
          View all {tournaments.length} tournaments
          <ChevronRight className="ml-1 size-3" />
        </Button>
      )}
    </div>
  );
}

// =============================================================================
// Helpers
// =============================================================================

/** Format a timestamp as a relative age string (e.g. "5m ago", "2d ago") */
function formatAge(timestamp: number) {
  const diffMs = Date.now() - timestamp;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

// =============================================================================
// Recent Activity List
// =============================================================================

function RecentActivityList({ activities }: { activities: Activity[] }) {
  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <Swords className="text-muted-foreground size-8" />
        <p className="text-muted-foreground mt-3 text-sm font-medium">
          No recent battles
        </p>
        <p className="text-muted-foreground mt-1 text-xs">
          Play in a tournament to see your results here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {activities.map((activity) => {
        const isWin = activity.result === "won";

        return (
          <div
            key={activity.id}
            className="flex items-center gap-3 rounded-lg p-2.5"
          >
            {/* Win/Loss indicator */}
            <div
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-md font-mono text-xs font-bold",
                isWin
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-red-500/10 text-red-600 dark:text-red-400"
              )}
            >
              {isWin ? "W" : "L"}
            </div>

            {/* Match info */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {activity.tournamentName}
              </p>
              <p className="text-muted-foreground text-xs">
                vs{" "}
                <span className="font-medium">{activity.opponentName}</span>
              </p>
            </div>

            {/* Time */}
            <span className="text-muted-foreground shrink-0 text-xs">
              {formatAge(activity.date)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function DashboardActivity({
  myTournaments,
  recentActivity,
}: DashboardActivityProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Upcoming Tournaments */}
      <div className="rounded-xl bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="text-primary size-4" />
            <h3 className="text-sm font-semibold">Upcoming Tournaments</h3>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs"
            render={<Link href="/tournaments" />}
            nativeButton={false}
          >
            Browse
            <ChevronRight className="ml-0.5 size-3" />
          </Button>
        </div>
        <UpcomingTournamentsList tournaments={myTournaments} />
      </div>

      {/* Recent Activity */}
      <div className="rounded-xl bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="text-muted-foreground size-4" />
            <h3 className="text-sm font-semibold">Recent Activity</h3>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs"
            render={<Link href="/dashboard/tournaments" />}
            nativeButton={false}
          >
            History
            <ChevronRight className="ml-0.5 size-3" />
          </Button>
        </div>
        <RecentActivityList activities={recentActivity} />
      </div>
    </div>
  );
}
