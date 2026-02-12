"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  AlertCircle,
  Trophy,
  Sparkles,
  Search,
  Plus,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import type { DashboardTournament } from "@/types/dashboard";

type OverviewMode =
  | "active-competition"
  | "pre-tournament"
  | "post-tournament"
  | "idle";

interface WhatsNextProps {
  mode: OverviewMode;
  tournaments: DashboardTournament[];
}

interface ActionItem {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
  href?: string;
  variant: "urgent" | "important" | "discovery";
  action?: () => void;
  count?: number;
}

export function WhatsNext({ mode, tournaments }: WhatsNextProps) {
  const actions = getActionItems(mode, tournaments);

  if (actions.length === 0) return null;

  return (
    <Card className="border-primary/20 relative overflow-hidden">
      <div className="from-primary/5 absolute inset-0 bg-gradient-to-r via-transparent to-transparent" />
      <CardContent className="relative p-6">
        <div className="mb-4 flex items-center gap-2">
          <div className="bg-primary/10 flex size-8 items-center justify-center rounded-lg">
            <Sparkles className="text-primary size-4" />
          </div>
          <h3 className="font-semibold">What&apos;s Next?</h3>
        </div>

        <div className="space-y-3">
          {actions.map((action) => (
            <ActionCard key={action.id} action={action} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ActionCard({ action }: { action: ActionItem }) {
  const Icon = action.icon;
  const isUrgent = action.variant === "urgent";
  const isImportant = action.variant === "important";

  const content = (
    <div
      className={`group relative flex items-center gap-4 rounded-lg border p-4 transition-all ${
        isUrgent
          ? "border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10"
          : isImportant
            ? "border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10"
            : "border-border bg-card hover:border-primary/50 hover:shadow-sm"
      }`}
    >
      {/* Accent line for urgent items */}
      {isUrgent && (
        <div className="absolute top-0 left-0 h-full w-1 rounded-l-lg bg-amber-500" />
      )}

      {/* Icon */}
      <div
        className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${
          isUrgent
            ? "bg-amber-500/10"
            : isImportant
              ? "bg-blue-500/10"
              : "bg-primary/10"
        }`}
      >
        <Icon
          className={`size-5 ${
            isUrgent
              ? "text-amber-600 dark:text-amber-400"
              : isImportant
                ? "text-blue-600 dark:text-blue-400"
                : "text-primary"
          }`}
        />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h4 className="group-hover:text-primary font-semibold">
            {action.title}
          </h4>
          {action.count && action.count > 1 && (
            <Badge variant="secondary" className="text-xs">
              {action.count}
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground mt-0.5 text-sm">
          {action.description}
        </p>
      </div>

      {/* Action indicator */}
      <ChevronRight className="text-muted-foreground group-hover:text-primary size-5 shrink-0 transition-transform group-hover:translate-x-1" />
    </div>
  );

  if (action.href) {
    return (
      <Link href={action.href} className="block">
        {content}
      </Link>
    );
  }

  if (action.action) {
    return (
      <button onClick={action.action} className="block w-full text-left">
        {content}
      </button>
    );
  }

  return content;
}

function getActionItems(
  mode: OverviewMode,
  tournaments: DashboardTournament[]
): ActionItem[] {
  const now = Date.now();
  const actions: ActionItem[] = [];

  // Calculate tournaments needing action
  const needsTeam = tournaments.filter((t) => !t.hasTeam);
  const needsCheckIn = tournaments.filter((t) => {
    // This is simplified - actual check-in logic would check registration status
    return t.status === "upcoming" && t.hasTeam;
  });

  // Determine urgency (< 24 hours)
  const urgentTeamSubmissions = needsTeam.filter((t) => {
    if (!t.startDate) return false;
    const hoursUntilStart = (t.startDate - now) / (1000 * 60 * 60);
    return hoursUntilStart > 0 && hoursUntilStart < 24;
  });

  const urgentCheckIns = needsCheckIn.filter((t) => {
    if (!t.startDate) return false;
    const hoursUntilStart = (t.startDate - now) / (1000 * 60 * 60);
    return hoursUntilStart > 0 && hoursUntilStart < 24;
  });

  // Mode-specific actions
  if (mode === "active-competition") {
    // During active match, focus on next actions after match
    if (needsTeam.length > 0) {
      actions.push({
        id: "submit-teams",
        icon: AlertCircle,
        title: "Submit teams for upcoming tournaments",
        description: `${needsTeam.length} tournament${needsTeam.length > 1 ? "s" : ""} awaiting team submissions`,
        href: "/dashboard/overview#tournaments",
        variant: "important",
        count: needsTeam.length,
      });
    }
    return actions;
  }

  if (mode === "pre-tournament") {
    // Urgent team submissions
    if (urgentTeamSubmissions.length > 0) {
      actions.push({
        id: "urgent-teams",
        icon: AlertCircle,
        title: "Urgent: Submit teams",
        description: `${urgentTeamSubmissions.length} tournament${urgentTeamSubmissions.length > 1 ? "s" : ""} starting soon (< 24 hrs)`,
        href: "/dashboard/overview#tournaments",
        variant: "urgent",
        count: urgentTeamSubmissions.length,
      });
    } else if (needsTeam.length > 0) {
      // Non-urgent team submissions
      actions.push({
        id: "submit-teams",
        icon: Plus,
        title: "Submit teams",
        description: `${needsTeam.length} tournament${needsTeam.length > 1 ? "s" : ""} awaiting team submissions`,
        href: "/dashboard/overview#tournaments",
        variant: "important",
        count: needsTeam.length,
      });
    }

    // Check-in reminders
    if (urgentCheckIns.length > 0) {
      actions.push({
        id: "urgent-checkin",
        icon: Clock,
        title: "Check in soon",
        description: `${urgentCheckIns.length} tournament${urgentCheckIns.length > 1 ? "s" : ""} opening check-in soon`,
        href: "/dashboard/overview#tournaments",
        variant: urgentCheckIns.length > 0 ? "urgent" : "important",
        count: urgentCheckIns.length,
      });
    } else if (needsCheckIn.length > 0) {
      actions.push({
        id: "checkin",
        icon: Clock,
        title: "Check-in available",
        description: `${needsCheckIn.length} tournament${needsCheckIn.length > 1 ? "s" : ""} ready for check-in`,
        href: "/dashboard/overview#tournaments",
        variant: "important",
        count: needsCheckIn.length,
      });
    }

    return actions;
  }

  if (mode === "post-tournament") {
    // After tournaments, encourage discovery
    if (tournaments.length === 0) {
      actions.push({
        id: "find-tournaments",
        icon: Search,
        title: "Discover your next tournament",
        description:
          "Browse available competitions and find your next challenge",
        href: "/tournaments",
        variant: "discovery",
      });
    } else if (tournaments.length < 3) {
      actions.push({
        id: "more-tournaments",
        icon: Trophy,
        title: "Join more tournaments",
        description: "Find additional competitions to compete in",
        href: "/tournaments",
        variant: "discovery",
      });
    }

    return actions;
  }

  if (mode === "idle") {
    // New user or no activity - discovery mode
    actions.push(
      {
        id: "browse-tournaments",
        icon: Search,
        title: "Browse tournaments",
        description: "Discover upcoming competitions and join your first event",
        href: "/tournaments",
        variant: "discovery",
      },
      {
        id: "create-team",
        icon: Plus,
        title: "Build your first team",
        description: "Use the Team Builder to create your competitive roster",
        href: "/teams",
        variant: "discovery",
      },
      {
        id: "leaderboards",
        icon: Trophy,
        title: "View leaderboards",
        description: "Check out top players and tournament champions",
        href: "/leaderboards",
        variant: "discovery",
      }
    );

    return actions.slice(0, 2); // Show top 2 for discovery
  }

  return actions;
}
