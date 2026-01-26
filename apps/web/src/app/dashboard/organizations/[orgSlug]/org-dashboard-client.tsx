"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Building2,
  Trophy,
  Users,
  Settings,
  Loader2,
  ArrowLeft,
  Plus,
  ExternalLink,
  Calendar,
  ShieldAlert,
} from "lucide-react";

interface OrgDashboardClientProps {
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

export function OrgDashboardClient({ orgSlug }: OrgDashboardClientProps) {
  const router = useRouter();

  const orgQueryFn = useCallback(
    (supabase: Parameters<typeof getOrganizationBySlug>[0]) =>
      getOrganizationBySlug(supabase, orgSlug),
    [orgSlug]
  );

  const { data: organization, isLoading: orgLoading } = useSupabaseQuery(
    orgQueryFn,
    [orgSlug]
  );

  const { user: currentUser, isLoading: userLoading } = useCurrentUser();

  if (orgLoading || userLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!organization) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Building2 className="text-muted-foreground mb-4 h-12 w-12" />
          <h3 className="mb-2 text-lg font-semibold">Organization not found</h3>
          <p className="text-muted-foreground mb-4 text-center">
            This organization doesn&apos;t exist or has been removed
          </p>
          <Link href="/dashboard/organizations">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Organizations
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  // Auth check
  if (!currentUser) {
    router.push("/sign-in");
    return null;
  }

  // Permission check
  const isOwner = currentUser.id === organization.owner_user_id;

  if (!isOwner) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <ShieldAlert className="text-muted-foreground mb-4 h-12 w-12" />
          <h3 className="mb-2 text-lg font-semibold">Access Denied</h3>
          <p className="text-muted-foreground mb-4 text-center">
            You don&apos;t have permission to manage this organization
          </p>
          <Link href={`/organizations/${orgSlug}`}>
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              View Organization
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  // Combine all tournament types
  const tournaments = [
    ...(organization.tournaments?.active || []),
    ...(organization.tournaments?.upcoming || []),
    ...(organization.tournaments?.completed || []),
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <h1 className="text-2xl font-bold">{organization.name}</h1>
            {(organization.tier === "verified" ||
              organization.tier === "partner") && (
              <Badge variant="secondary">
                {organization.tier === "partner" ? "Partner" : "Verified"}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground text-sm">
            Manage your organization
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/organizations/${orgSlug}`}>
            <Button variant="outline" size="sm">
              <ExternalLink className="mr-2 h-4 w-4" />
              View Public Page
            </Button>
          </Link>
          <Link href={`/dashboard/organizations/${orgSlug}/tournaments/create`}>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              New Tournament
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
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
                {organization.tournaments?.active?.length || 0}
              </p>
              <p className="text-muted-foreground text-sm">Active</p>
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
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="h-4 w-4" />
            Settings
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
                  Create your first tournament to get started
                </p>
                <Link
                  href={`/dashboard/organizations/${orgSlug}/tournaments/create`}
                >
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Tournament
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {tournaments.map((tournament) => (
                <Link
                  key={tournament.id}
                  href={`/dashboard/organizations/${orgSlug}/tournaments/${tournament.slug}/manage`}
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
                Manage your organization&apos;s team members
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground py-8 text-center">
                Member management coming soon
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Organization Settings</CardTitle>
              <CardDescription>
                Configure your organization&apos;s settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground py-8 text-center">
                Settings coming soon
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
