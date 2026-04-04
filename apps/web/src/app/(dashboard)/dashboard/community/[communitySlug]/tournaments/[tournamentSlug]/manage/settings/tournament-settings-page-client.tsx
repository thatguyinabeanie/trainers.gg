"use client";

import { useRouter } from "next/navigation";
import { useSupabaseQuery } from "@/lib/supabase";
import {
  getTournamentBySlug,
  getCommunityBySlug,
  getTournamentPhases,
} from "@trainers/supabase";
import { useCurrentUser } from "@/hooks/use-current-user";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TournamentSettings } from "@/components/tournaments";
import {
  ArrowLeft,
  Loader2,
  Building2,
  Trophy,
  ShieldAlert,
} from "lucide-react";

interface TournamentSettingsPageClientProps {
  communitySlug: string;
  tournamentSlug: string;
}

export function TournamentSettingsPageClient({
  communitySlug,
  tournamentSlug,
}: TournamentSettingsPageClientProps) {
  const router = useRouter();
  const { user: currentUser, isLoading: userLoading } = useCurrentUser();

  // Fetch organization by slug
  const orgQueryFn = (supabase: Parameters<typeof getCommunityBySlug>[0]) =>
    getCommunityBySlug(supabase, communitySlug);

  const { data: organization, isLoading: orgLoading } = useSupabaseQuery(
    orgQueryFn,
    [communitySlug]
  );

  // Fetch tournament by slug
  const tournamentQueryFn = (
    supabase: Parameters<typeof getTournamentBySlug>[0]
  ) => getTournamentBySlug(supabase, tournamentSlug);

  const { data: tournament, isLoading: tournamentLoading } = useSupabaseQuery(
    tournamentQueryFn,
    [tournamentSlug]
  );

  // Fetch tournament phases (depends on tournament being loaded)
  const phasesQueryFn = (
    supabase: Parameters<typeof getTournamentPhases>[0]
  ) =>
    tournament
      ? getTournamentPhases(supabase, tournament.id)
      : Promise.resolve([]);

  const { data: phases = [] } = useSupabaseQuery(phasesQueryFn, [
    tournament?.id,
  ]);

  // Loading state
  if (userLoading || orgLoading || tournamentLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Org not found
  if (!organization) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Building2 className="text-muted-foreground mb-4 h-12 w-12" />
          <h3 className="mb-2 text-lg font-semibold">Organization not found</h3>
          <p className="text-muted-foreground mb-4 text-center">
            This organization doesn&apos;t exist or has been removed
          </p>
          <Link href="/dashboard/community">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Communities
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  // Tournament not found
  if (!tournament) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Trophy className="text-muted-foreground mb-4 h-12 w-12" />
          <h3 className="mb-2 text-lg font-semibold">Tournament not found</h3>
          <p className="text-muted-foreground mb-4 text-center">
            This tournament doesn&apos;t exist or has been removed
          </p>
          <Link href={`/dashboard/community/${communitySlug}/tournaments`}>
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Tournaments
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

  // Permission check - must be org owner
  const isOwner = currentUser.id === organization.owner_user_id;

  if (!isOwner) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <ShieldAlert className="text-muted-foreground mb-4 h-12 w-12" />
          <h3 className="mb-2 text-lg font-semibold">Access Denied</h3>
          <p className="text-muted-foreground mb-4 text-center">
            You don&apos;t have permission to manage this tournament
          </p>
          <Link href={`/tournaments/${tournamentSlug}`}>
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              View Tournament
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  // Build the tournament settings props
  const tournamentForSettings = {
    id: tournament.id,
    name: tournament.name,
    slug: tournament.slug,
    description: tournament.description,
    status: tournament.status ?? "draft",
    format: tournament.format,
    max_participants: tournament.max_participants,
    start_date: tournament.start_date,
    end_date: tournament.end_date,
    round_time_minutes: tournament.round_time_minutes,
    // Registration settings
    registration_type: tournament.registration_type,
    check_in_required: tournament.check_in_required,
    allow_late_registration: tournament.allow_late_registration,
    late_check_in_max_round: tournament.late_check_in_max_round,
  };

  return (
    <TournamentSettings tournament={tournamentForSettings} phases={phases} />
  );
}
