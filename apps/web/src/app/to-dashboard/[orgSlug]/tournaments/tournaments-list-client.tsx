"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useSupabaseQuery } from "@/lib/supabase";
import { listOrganizationTournaments } from "@trainers/supabase";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Trophy,
  Plus,
  Calendar,
  Users,
  Loader2,
  FileEdit,
  Clock,
  CheckCircle,
  XCircle,
  LayoutGrid,
  List,
} from "lucide-react";
import { cn } from "@/lib/utils";

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

const statusConfig: Record<
  Exclude<TournamentStatus, "all">,
  { color: string; icon: typeof Trophy; label: string }
> = {
  draft: { color: "bg-gray-100 text-gray-800", icon: FileEdit, label: "Draft" },
  upcoming: {
    color: "bg-blue-100 text-blue-800",
    icon: Clock,
    label: "Upcoming",
  },
  active: {
    color: "bg-green-100 text-green-800",
    icon: Trophy,
    label: "Active",
  },
  completed: {
    color: "bg-purple-100 text-purple-800",
    icon: CheckCircle,
    label: "Completed",
  },
  cancelled: {
    color: "bg-red-100 text-red-800",
    icon: XCircle,
    label: "Cancelled",
  },
};

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
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

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

      {/* Status Tabs and View Toggle */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={currentStatus} onValueChange={handleStatusChange}>
          <TabsList>
            {statusTabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex gap-1 rounded-md border p-1">
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setViewMode("grid")}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

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
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Trophy className="text-muted-foreground mb-4 h-12 w-12" />
            <h3 className="mb-2 text-lg font-semibold">No tournaments found</h3>
            <p className="text-muted-foreground mb-4 text-center">
              {currentStatus === "all"
                ? "Create your first tournament to get started"
                : `No ${currentStatus} tournaments`}
            </p>
            <Link href={`${basePath}/tournaments/create`}>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Tournament
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tournaments.map((tournament) => {
            const status = (tournament.status ?? "draft") as Exclude<
              TournamentStatus,
              "all"
            >;
            const config = statusConfig[status] ?? statusConfig.draft;

            return (
              <Link
                key={tournament.id}
                href={`${basePath}/tournaments/${tournament.slug}/manage`}
              >
                <Card className="h-full transition-shadow hover:shadow-md">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="line-clamp-1 text-lg">
                        {tournament.name}
                      </CardTitle>
                      <Badge className={config.color}>{config.label}</Badge>
                    </div>
                    {tournament.description && (
                      <CardDescription className="line-clamp-2">
                        {tournament.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="text-muted-foreground space-y-2 text-sm">
                      {tournament.start_date && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {new Date(
                              tournament.start_date
                            ).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span>
                          {tournament.registrationCount}
                          {tournament.max_participants
                            ? ` / ${tournament.max_participants}`
                            : ""}{" "}
                          players
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="divide-y p-0">
            {tournaments.map((tournament) => {
              const status = (tournament.status ?? "draft") as Exclude<
                TournamentStatus,
                "all"
              >;
              const config = statusConfig[status] ?? statusConfig.draft;

              return (
                <Link
                  key={tournament.id}
                  href={`${basePath}/tournaments/${tournament.slug}/manage`}
                  className={cn(
                    "hover:bg-muted flex items-center justify-between p-4 transition-colors"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-medium">{tournament.name}</p>
                      <div className="text-muted-foreground flex items-center gap-4 text-sm">
                        {tournament.start_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(
                              tournament.start_date
                            ).toLocaleDateString()}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {tournament.registrationCount}
                          {tournament.max_participants
                            ? ` / ${tournament.max_participants}`
                            : ""}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Badge className={config.color}>{config.label}</Badge>
                </Link>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
