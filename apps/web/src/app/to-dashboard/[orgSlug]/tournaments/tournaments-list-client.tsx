"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useSupabaseQuery } from "@/lib/supabase";
import { listOrganizationTournaments } from "@trainers/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Loader2, XCircle } from "lucide-react";
import {
  SectionHeader,
  ActiveTournaments,
  UpcomingTournaments,
  CompletedTournaments,
  TournamentListEmpty,
  TournamentCardGrid,
} from "@/components/tournaments/tournament-list";

interface TournamentsListClientProps {
  organizationId: number;
  orgSlug: string;
  initialStatus?: string;
}

type TournamentStatus =
  | "all"
  | "draft"
  | "upcoming"
  | "active"
  | "completed"
  | "cancelled";

const statusTabs: { value: TournamentStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "upcoming", label: "Upcoming" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export function TournamentsListClient({
  organizationId,
  orgSlug,
  initialStatus,
}: TournamentsListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentStatus = (searchParams.get("status") ||
    initialStatus ||
    "all") as TournamentStatus;

  const queryFn = (
    supabase: Parameters<typeof listOrganizationTournaments>[0]
  ) =>
    listOrganizationTournaments(supabase, organizationId, {
      status: currentStatus === "all" ? undefined : currentStatus,
      limit: 50,
    });

  const { data, isLoading, error } = useSupabaseQuery(queryFn, [
    organizationId,
    currentStatus,
  ]);

  const tournaments = data?.tournaments ?? [];
  const basePath = `/to-dashboard/${orgSlug}`;
  const hasError = !!error;

  const handleStatusChange = (status: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (status === "all") {
      params.delete("status");
    } else {
      params.set("status", status);
    }
    router.push(`${basePath}/tournaments?${params.toString()}`);
  };

  // Group tournaments by status for sectioned view
  const groupedTournaments = {
    active: tournaments.filter((t) => t.status === "active"),
    upcoming: tournaments.filter((t) => t.status === "upcoming"),
    draft: tournaments.filter((t) => t.status === "draft"),
    completed: tournaments.filter((t) => t.status === "completed"),
    cancelled: tournaments.filter((t) => t.status === "cancelled"),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Tournaments</h2>
          <p className="text-muted-foreground text-sm">
            Manage your organization&apos;s tournaments
          </p>
        </div>
        <Link href={`${basePath}/tournaments/create`}>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Create Tournament
          </Button>
        </Link>
      </div>

      {/* Status Tabs */}
      <Tabs value={currentStatus} onValueChange={handleStatusChange}>
        <TabsList>
          {statusTabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Content */}
      {isLoading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
        </div>
      ) : hasError ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <XCircle className="mb-4 h-12 w-12 text-red-500" />
            <h3 className="mb-2 text-lg font-semibold">
              Failed to load tournaments
            </h3>
            <p className="text-muted-foreground mb-4 text-center">
              There was a problem fetching your tournaments. Please try again.
            </p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </CardContent>
        </Card>
      ) : tournaments.length === 0 ? (
        <TournamentListEmpty
          title="No tournaments found"
          description={
            currentStatus === "all"
              ? "Create your first tournament to get started"
              : `No ${currentStatus} tournaments`
          }
        />
      ) : currentStatus === "all" ? (
        // Show grouped view when "all" is selected
        <div className="space-y-2">
          {groupedTournaments.active.length > 0 && (
            <>
              <SectionHeader
                title="In Progress"
                count={groupedTournaments.active.length}
              />
              <ActiveTournaments
                tournaments={groupedTournaments.active}
                linkPath={(t) => `${basePath}/tournaments/${t.slug}/manage`}
                showOrganization={false}
              />
            </>
          )}

          {groupedTournaments.upcoming.length > 0 && (
            <>
              <SectionHeader
                title="Upcoming"
                count={groupedTournaments.upcoming.length}
              />
              <UpcomingTournaments
                tournaments={groupedTournaments.upcoming}
                linkPath={(t) => `${basePath}/tournaments/${t.slug}/manage`}
                showOrganization={false}
              />
            </>
          )}

          {groupedTournaments.draft.length > 0 && (
            <>
              <SectionHeader
                title="Draft"
                count={groupedTournaments.draft.length}
              />
              <TournamentCardGrid
                tournaments={groupedTournaments.draft}
                linkPath={(t) => `${basePath}/tournaments/${t.slug}/manage`}
                showStatus
                showOrganization={false}
              />
            </>
          )}

          {groupedTournaments.completed.length > 0 && (
            <>
              <SectionHeader
                title="Completed"
                count={groupedTournaments.completed.length}
              />
              <CompletedTournaments
                tournaments={groupedTournaments.completed}
                linkPath={(t) => `${basePath}/tournaments/${t.slug}/manage`}
                showOrganization={false}
              />
            </>
          )}

          {groupedTournaments.cancelled.length > 0 && (
            <>
              <SectionHeader
                title="Cancelled"
                count={groupedTournaments.cancelled.length}
              />
              <TournamentCardGrid
                tournaments={groupedTournaments.cancelled}
                linkPath={(t) => `${basePath}/tournaments/${t.slug}/manage`}
                showStatus
                showOrganization={false}
              />
            </>
          )}
        </div>
      ) : (
        // Show filtered view for specific status
        <TournamentCardGrid
          tournaments={tournaments}
          linkPath={(t) => `${basePath}/tournaments/${t.slug}/manage`}
          showStatus
          showOrganization={false}
        />
      )}
    </div>
  );
}
