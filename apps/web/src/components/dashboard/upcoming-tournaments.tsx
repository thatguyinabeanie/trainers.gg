"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Trophy,
  Plus,
  ChevronRight,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { checkIn } from "@/actions/tournaments";
import type { DashboardTournament } from "@/types/dashboard";

export function UpcomingTournaments({
  myTournaments,
}: {
  myTournaments: DashboardTournament[];
}) {
  const [isPending, startTransition] = useTransition();
  const [checkingInId, setCheckingInId] = useState<number | null>(null);

  const formatDate = (timestamp: number | null) => {
    if (!timestamp) return "Date TBD";
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.ceil(
      (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays < 0) return "In Progress";
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays <= 7) return `In ${diffDays} days`;

    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const getStatusInfo = (tournament: DashboardTournament) => {
    const now = Date.now();
    const startDate = tournament.startDate ?? null;
    const hoursUntilStart = startDate
      ? (startDate - now) / (1000 * 60 * 60)
      : null;
    const isUrgent =
      hoursUntilStart !== null && hoursUntilStart > 0 && hoursUntilStart < 24;

    // Check if checked in
    const isCheckedIn = tournament.registrationStatus === "checked_in";

    // Check if tournament is active (in progress)
    const isActive = tournament.status === "active";

    // Check if needs team
    if (!tournament.hasTeam) {
      return {
        icon: AlertCircle,
        label: "Team Required",
        variant: "urgent" as const,
        color: "text-amber-600 dark:text-amber-400",
        bgColor: "bg-amber-500/10",
        isUrgent,
        subtitle: null as string | null,
      };
    }

    // Active tournament + not checked in = urgent check-in needed
    if (isActive && tournament.hasTeam && !isCheckedIn) {
      const lateRound = tournament.lateCheckInMaxRound;
      return {
        icon: AlertCircle,
        label: "Check in now!",
        variant: "urgent" as const,
        color: "text-red-600 dark:text-red-400",
        bgColor: "bg-red-500/10",
        isUrgent: true,
        subtitle: lateRound
          ? `Late check-in closes after Round ${lateRound}`
          : null,
      };
    }

    // Check if can check in (has team and not checked in)
    if (tournament.hasTeam && !isCheckedIn) {
      return {
        icon: Clock,
        label: "Ready for Check-in",
        variant: "important" as const,
        color: "text-blue-600 dark:text-blue-400",
        bgColor: "bg-blue-500/10",
        isUrgent: false,
        subtitle: null as string | null,
      };
    }

    // Checked in and ready
    return {
      icon: CheckCircle2,
      label: "Checked In",
      variant: "ready" as const,
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-500/10",
      isUrgent: false,
      subtitle: null as string | null,
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

  // Sort tournaments: urgent first, then needs action, then ready
  const sortedTournaments = [...myTournaments].sort((a, b) => {
    const statusA = getStatusInfo(a);
    const statusB = getStatusInfo(b);

    // Urgent items first
    if (statusA.isUrgent && !statusB.isUrgent) return -1;
    if (!statusA.isUrgent && statusB.isUrgent) return 1;

    // Then by variant priority: urgent > important > ready
    const variantOrder = { urgent: 0, important: 1, ready: 2 };
    const orderA = variantOrder[statusA.variant];
    const orderB = variantOrder[statusB.variant];
    if (orderA !== orderB) return orderA - orderB;

    // Then by start date (earlier first)
    const dateA = a.startDate ?? Infinity;
    const dateB = b.startDate ?? Infinity;
    return dateA - dateB;
  });

  // Group tournaments by urgency if there are many needing action
  const needsActionCount = sortedTournaments.filter((t) => {
    const status = getStatusInfo(t);
    return status.variant !== "ready";
  }).length;

  const shouldGroup = needsActionCount >= 5;

  const urgentGroup = shouldGroup
    ? sortedTournaments.filter((t) => getStatusInfo(t).isUrgent)
    : [];
  const thisWeekGroup = shouldGroup
    ? sortedTournaments.filter((t) => {
        const status = getStatusInfo(t);
        const now = Date.now();
        const startDate = t.startDate ?? null;
        const hoursUntilStart = startDate
          ? (startDate - now) / (1000 * 60 * 60)
          : null;
        return (
          !status.isUrgent &&
          status.variant !== "ready" &&
          hoursUntilStart !== null &&
          hoursUntilStart > 0 &&
          hoursUntilStart < 168
        ); // 7 days
      })
    : [];
  const laterGroup = shouldGroup
    ? sortedTournaments.filter(
        (t) =>
          !urgentGroup.includes(t) &&
          !thisWeekGroup.includes(t) &&
          getStatusInfo(t).variant !== "ready"
      )
    : [];
  const readyGroup = sortedTournaments.filter(
    (t) => getStatusInfo(t).variant === "ready"
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="text-primary size-5" />
              Upcoming Tournaments
            </CardTitle>
            <CardDescription>Your registered competitions</CardDescription>
          </div>
          <Link href="/tournaments">
            <Button variant="ghost" size="sm">
              View all
              <ChevronRight className="ml-1 size-4" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {myTournaments.length === 0 ? (
          <div className="bg-muted/30 flex flex-col items-center justify-center rounded-lg py-16">
            <div className="bg-muted flex size-16 items-center justify-center rounded-full">
              <Trophy className="text-muted-foreground size-8" />
            </div>
            <h3 className="mt-4 font-semibold">No upcoming tournaments</h3>
            <p className="text-muted-foreground mt-1 text-sm">
              Browse available tournaments to join
            </p>
            <Link href="/tournaments">
              <Button size="sm" className="mt-4">
                <Plus className="mr-2 size-4" />
                Find Tournaments
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {shouldGroup ? (
              <>
                {urgentGroup.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                      ⚠️ Urgent (&lt; 24 hours)
                    </h4>
                    {urgentGroup.map((tournament) => (
                      <TournamentCard
                        key={tournament.id}
                        tournament={tournament}
                        formatDate={formatDate}
                        getStatusInfo={getStatusInfo}
                        handleCheckIn={handleCheckIn}
                        checkingInId={checkingInId}
                        isPending={isPending}
                      />
                    ))}
                  </div>
                )}
                {thisWeekGroup.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-muted-foreground text-sm font-semibold">
                      This Week
                    </h4>
                    {thisWeekGroup.map((tournament) => (
                      <TournamentCard
                        key={tournament.id}
                        tournament={tournament}
                        formatDate={formatDate}
                        getStatusInfo={getStatusInfo}
                        handleCheckIn={handleCheckIn}
                        checkingInId={checkingInId}
                        isPending={isPending}
                      />
                    ))}
                  </div>
                )}
                {laterGroup.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-muted-foreground text-sm font-semibold">
                      Later
                    </h4>
                    {laterGroup.map((tournament) => (
                      <TournamentCard
                        key={tournament.id}
                        tournament={tournament}
                        formatDate={formatDate}
                        getStatusInfo={getStatusInfo}
                        handleCheckIn={handleCheckIn}
                        checkingInId={checkingInId}
                        isPending={isPending}
                      />
                    ))}
                  </div>
                )}
                {readyGroup.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                      ✅ Ready
                    </h4>
                    {readyGroup.map((tournament) => (
                      <TournamentCard
                        key={tournament.id}
                        tournament={tournament}
                        formatDate={formatDate}
                        getStatusInfo={getStatusInfo}
                        handleCheckIn={handleCheckIn}
                        checkingInId={checkingInId}
                        isPending={isPending}
                      />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-3">
                {sortedTournaments.map((tournament) => (
                  <TournamentCard
                    key={tournament.id}
                    tournament={tournament}
                    formatDate={formatDate}
                    getStatusInfo={getStatusInfo}
                    handleCheckIn={handleCheckIn}
                    checkingInId={checkingInId}
                    isPending={isPending}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TournamentCard({
  tournament,
  formatDate,
  getStatusInfo,
  handleCheckIn,
  checkingInId,
  isPending,
}: {
  tournament: DashboardTournament;
  formatDate: (timestamp: number | null) => string;
  getStatusInfo: (tournament: DashboardTournament) => {
    icon: React.ElementType;
    label: string;
    variant: "urgent" | "important" | "ready";
    color: string;
    bgColor: string;
    isUrgent: boolean;
    subtitle: string | null;
  };
  handleCheckIn: (tournamentId: number) => void;
  checkingInId: number | null;
  isPending: boolean;
}) {
  const statusInfo = getStatusInfo(tournament);
  const StatusIcon = statusInfo.icon;
  const canCheckIn =
    tournament.hasTeam && tournament.registrationStatus !== "checked_in";
  const isCheckedIn = tournament.registrationStatus === "checked_in";

  return (
    <div className="group bg-card hover:border-primary/50 relative overflow-hidden rounded-lg border transition-all hover:shadow-md">
      {/* Accent line for urgent items */}
      {statusInfo.isUrgent && (
        <div
          className={cn(
            "absolute top-0 left-0 h-full w-1",
            statusInfo.variant === "urgent" &&
              statusInfo.label === "Check in now!"
              ? "bg-red-500"
              : "bg-amber-500"
          )}
        />
      )}

      <div className="flex items-start justify-between gap-4 p-4">
        <Link href={`/tournaments/${tournament.id}`} className="min-w-0 flex-1">
          <div className="space-y-2">
            <div className="flex items-start gap-3">
              <div
                className={`mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-lg ${statusInfo.bgColor}`}
              >
                <Trophy className={`size-5 ${statusInfo.color}`} />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="group-hover:text-primary truncate font-semibold">
                  {tournament.name}
                </h4>
                <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-2 text-sm">
                  <div className="flex items-center gap-1">
                    <Calendar className="size-3" />
                    <span>{formatDate(tournament.startDate ?? null)}</span>
                  </div>
                  {tournament.status && (
                    <Badge variant="outline" className="text-xs">
                      {tournament.status}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Status indicator */}
            <div className="space-y-0.5 pl-13">
              <div
                className={`flex items-center gap-1.5 text-xs font-medium ${statusInfo.color}`}
              >
                <StatusIcon className="size-3.5" />
                <span>{statusInfo.label}</span>
              </div>
              {statusInfo.subtitle && (
                <p className="text-muted-foreground text-xs">
                  {statusInfo.subtitle}
                </p>
              )}
            </div>
          </div>
        </Link>

        {/* Action buttons */}
        <div className="flex shrink-0 flex-col gap-2">
          {!tournament.hasTeam && (
            <Link href={`/tournaments/${tournament.id}`}>
              <Button
                variant="default"
                size="sm"
                className="bg-amber-500 hover:bg-amber-600"
              >
                <Upload className="mr-1.5 size-3.5" />
                Submit Team
              </Button>
            </Link>
          )}
          {canCheckIn && (
            <Button
              variant={statusInfo.isUrgent ? "default" : "outline"}
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                handleCheckIn(tournament.id);
              }}
              disabled={isPending && checkingInId === tournament.id}
            >
              {isPending && checkingInId === tournament.id ? (
                <>
                  <Clock className="mr-1.5 size-3.5 animate-spin" />
                  Checking In...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-1.5 size-3.5" />
                  Check In
                </>
              )}
            </Button>
          )}
          {isCheckedIn && (
            <Link href={`/tournaments/${tournament.id}`}>
              <Button variant="ghost" size="sm">
                View
                <ChevronRight className="ml-1 size-4" />
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
