"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useSupabaseQuery } from "@/lib/supabase";
import { listCommunityTournaments } from "@trainers/supabase";
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
  communityId: number;
  communitySlug: string;
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
  communityId,
  communitySlug,
  initialStatus,
}: TournamentsListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentStatus = (searchParams.get("status") ||
    initialStatus ||
    "all") as TournamentStatus;

  const queryFn = (supabase: Parameters<typeof listCommunityTournaments>[0]) =>
    listCommunityTournaments(supabase, communityId, {
      status: currentStatus === "all" ? undefined : currentStatus,
      limit: 50,
    });

  const { data, isLoading, error } = useSupabaseQuery(queryFn, [
    communityId,
    currentStatus,
  ]);

  const tournaments = data?.tournaments ?? [];
  const basePath = `/dashboard/community/${communitySlug}`;
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
      {/* Page Heading */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tournaments</h1>
          <p className="text-muted-foreground text-sm">
            Manage your community&apos;s tournaments
          </p>
        </div>
        <Link href={`${basePath}/tournaments/create`}>
          <Button size="sm" className="gap-2">
            <Plus className="h-3.5 w-3.5" />
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
        <div className="flex min-h-[30vh] items-center justify-center">
          <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
        </div>
      ) : hasError ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <XCircle className="mb-3 h-10 w-10 text-red-500" />
            <h3 className="mb-1 text-base font-semibold">
              Failed to load tournaments
            </h3>
            <p className="text-muted-foreground mb-3 text-center text-sm">
              There was a problem fetching your tournaments. Please try again.
            </p>
            <Button size="sm" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : tournaments.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <TournamentListEmpty
              title="No tournaments found"
              description={
                currentStatus === "all"
                  ? "Create your first tournament to get started"
                  : `No ${currentStatus} tournaments`
              }
            />
          </CardContent>
        </Card>
      ) : currentStatus === "all" ? (
        // Show grouped view when "all" is selected
        <Card>
          <CardContent className="space-y-4 pt-6">
            {groupedTournaments.active.length > 0 && (
              <div>
                <SectionHeader
                  title="In Progress"
                  count={groupedTournaments.active.length}
                />
                <ActiveTournaments
                  tournaments={groupedTournaments.active}
                  linkPath={(t) => `${basePath}/tournaments/${t.slug}/manage`}
                  showOrganization={false}
                />
              </div>
            )}

            {groupedTournaments.upcoming.length > 0 && (
              <div>
                <SectionHeader
                  title="Upcoming"
                  count={groupedTournaments.upcoming.length}
                />
                <UpcomingTournaments
                  tournaments={groupedTournaments.upcoming}
                  linkPath={(t) => `${basePath}/tournaments/${t.slug}/manage`}
                  showOrganization={false}
                />
              </div>
            )}

            {groupedTournaments.draft.length > 0 && (
              <div>
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
              </div>
            )}

            {groupedTournaments.completed.length > 0 && (
              <div>
                <SectionHeader
                  title="Completed"
                  count={groupedTournaments.completed.length}
                />
                <CompletedTournaments
                  tournaments={groupedTournaments.completed}
                  linkPath={(t) => `${basePath}/tournaments/${t.slug}/manage`}
                  showOrganization={false}
                />
              </div>
            )}

            {groupedTournaments.cancelled.length > 0 && (
              <div>
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
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        // Show filtered view for specific status
        <Card>
          <CardContent className="pt-6">
            <TournamentCardGrid
              tournaments={tournaments}
              linkPath={(t) => `${basePath}/tournaments/${t.slug}/manage`}
              showStatus
              showOrganization={false}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
