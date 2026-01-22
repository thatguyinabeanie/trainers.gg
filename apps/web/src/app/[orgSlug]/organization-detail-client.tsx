"use client";

import { useCallback } from "react";
import { useSupabaseQuery } from "@/lib/supabase";
import { getOrganizationBySlug } from "@trainers/supabase";
import { useCurrentUser } from "@/hooks/use-current-user";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Building2,
  Trophy,
  Users,
  Calendar,
  Settings,
  Loader2,
  ArrowLeft,
  Plus,
} from "lucide-react";

interface OrganizationDetailClientProps {
  orgSlug: string;
}

type TournamentStatus =
  | "draft"
  | "upcoming"
  | "active"
  | "completed"
  | "cancelled";

const statusColors: Record<TournamentStatus, string> = {
  draft: "bg-gray-100 text-gray-800",
  upcoming: "bg-blue-100 text-blue-800",
  active: "bg-green-100 text-green-800",
  completed: "bg-purple-100 text-purple-800",
  cancelled: "bg-red-100 text-red-800",
};

export function OrganizationDetailClient({
  orgSlug,
}: OrganizationDetailClientProps) {
  const orgQueryFn = useCallback(
    (supabase: Parameters<typeof getOrganizationBySlug>[0]) =>
      getOrganizationBySlug(supabase, orgSlug),
    [orgSlug]
  );

  const { data: organization, isLoading: orgLoading } = useSupabaseQuery(
    orgQueryFn,
    [orgSlug]
  );

  const { user: currentUser } = useCurrentUser();

  if (orgLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="text-muted-foreground mb-4 h-12 w-12" />
            <h3 className="mb-2 text-lg font-semibold">
              Organization not found
            </h3>
            <p className="text-muted-foreground mb-4 text-center">
              This organization doesn&apos;t exist or has been removed
            </p>
            <Link href="/organizations">
              <Button>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Organizations
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isOwner = currentUser?.profile?.id === organization.owner_profile_id;

  // Combine all tournament types from the organization query
  const tournaments = [
    ...(organization.tournaments?.active || []),
    ...(organization.tournaments?.upcoming || []),
    ...(organization.tournaments?.completed || []),
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <div className="text-muted-foreground mb-4 flex items-center gap-2 text-sm">
        <Link href="/organizations" className="hover:underline">
          Organizations
        </Link>
        <span>/</span>
        <span className="text-foreground">{organization.name}</span>
      </div>

      {/* Header */}
      <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={organization.logo_url ?? undefined} />
            <AvatarFallback className="text-xl">
              {organization.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold">{organization.name}</h1>
              {(organization.tier === "verified" ||
                organization.tier === "partner") && (
                <Badge variant="secondary">
                  {organization.tier === "partner" ? "Partner" : "Verified"}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground mt-1">@{organization.slug}</p>
            {organization.description && (
              <p className="text-muted-foreground mt-2 max-w-xl">
                {organization.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          {isOwner && (
            <>
              <Link href={`/${orgSlug}/settings`}>
                <Button variant="outline">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Button>
              </Link>
              <Link href="/tournaments/create">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  New Tournament
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="bg-primary/10 rounded-full p-3">
              <Trophy className="text-primary h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-bold">{tournaments.length}</p>
              <p className="text-muted-foreground text-sm">Tournaments</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="bg-primary/10 rounded-full p-3">
              <Users className="text-primary h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {organization.followerCount || 0}
              </p>
              <p className="text-muted-foreground text-sm">Followers</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="bg-primary/10 rounded-full p-3">
              <Calendar className="text-primary h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {organization.created_at
                  ? new Date(organization.created_at).getFullYear()
                  : new Date().getFullYear()}
              </p>
              <p className="text-muted-foreground text-sm">Founded</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="tournaments" className="space-y-6">
        <TabsList>
          <TabsTrigger value="tournaments" className="gap-2">
            <Trophy className="h-4 w-4" />
            Tournaments
          </TabsTrigger>
          <TabsTrigger value="members" className="gap-2">
            <Users className="h-4 w-4" />
            Members
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tournaments">
          {tournaments.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Trophy className="text-muted-foreground mb-4 h-12 w-12" />
                <h3 className="mb-2 text-lg font-semibold">
                  No tournaments yet
                </h3>
                <p className="text-muted-foreground mb-4 text-center">
                  This organization hasn&apos;t created any tournaments
                </p>
                {isOwner && (
                  <Link href="/tournaments/create">
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Tournament
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {tournaments.map((tournament) => (
                <Link
                  key={tournament.id}
                  href={`/${orgSlug}/${tournament.slug}`}
                >
                  <Card className="h-full transition-shadow hover:shadow-md">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <CardTitle className="line-clamp-1 text-lg">
                          {tournament.name}
                        </CardTitle>
                        <Badge
                          className={
                            statusColors[tournament.status as TournamentStatus]
                          }
                        >
                          {tournament.status}
                        </Badge>
                      </div>
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
                            {tournament.registrationCount || 0}
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
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="members">
          <Card>
            <CardHeader>
              <CardTitle>Members</CardTitle>
              <CardDescription>
                People who are part of this organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground py-8 text-center">
                Member list coming soon
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
