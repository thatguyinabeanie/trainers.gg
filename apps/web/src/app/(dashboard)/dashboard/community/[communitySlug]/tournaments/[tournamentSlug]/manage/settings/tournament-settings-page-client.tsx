"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { useQuery } from "@tanstack/react-query";

import {
  getTournamentBySlug,
  type getCommunityBySlug,
} from "@trainers/supabase";
import { useApiQuery } from "@trainers/supabase/react-query";

import { useCurrentUser } from "@/hooks/use-current-user";
import { useSupabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/query-keys";
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
  const supabase = useSupabase();
  const {
    user: currentUser,
    isLoading: userLoading,
    error: userError,
  } = useCurrentUser();

  // Auth is enforced server-side by the (dashboard) layout; do not redirect
  // from this client (causes a /sign-in ↔ /dashboard race).

  // Fetch the community that owns this tournament via the auth-gated
  // `/api/v1/communities/[slug]` route (Phase 2 S-bucket migration).
  // The route returns the community object directly (not ActionResult-wrapped).
  type CommunityDetail = NonNullable<
    Awaited<ReturnType<typeof getCommunityBySlug>>
  >;

  const {
    data: organization,
    isLoading: orgLoading,
    isError: orgError,
  } = useApiQuery<CommunityDetail | null>(
    ["community", communitySlug],
    async () => {
      const res = await fetch(
        `/api/v1/communities/${encodeURIComponent(communitySlug)}`
      );
      if (!res.ok) {
        return { success: false as const, error: `HTTP ${res.status}` };
      }
      const data = (await res.json()) as CommunityDetail | null;
      return { success: true as const, data };
    },
    { staleTime: 30_000 }
  );

  const { data: tournament, isLoading: tournamentLoading } = useQuery({
    queryKey: queryKeys.tournament.bySlug(tournamentSlug),
    queryFn: () => getTournamentBySlug(supabase, tournamentSlug),
    staleTime: 30_000,
  });

  const phases = tournament?.phases ?? [];

  // Loading state
  if (userLoading || orgLoading || tournamentLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Org fetch error
  if (orgError) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <ShieldAlert className="text-muted-foreground mb-4 h-12 w-12" />
          <h3 className="mb-2 text-lg font-semibold">
            Couldn&apos;t load community
          </h3>
          <p className="text-muted-foreground mb-4 text-center">
            Try refreshing the page. If this keeps happening, contact support.
          </p>
          <Button onClick={() => router.refresh()}>Retry</Button>
        </CardContent>
      </Card>
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

  if (userError) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <ShieldAlert className="text-muted-foreground mb-4 h-12 w-12" />
          <h3 className="mb-2 text-lg font-semibold">
            Couldn&apos;t load your account
          </h3>
          <p className="text-muted-foreground mb-4 text-center">
            Try refreshing the page. If this keeps happening, contact support.
          </p>
          <Button onClick={() => router.refresh()}>Retry</Button>
        </CardContent>
      </Card>
    );
  }

  if (!currentUser) {
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

  const tournamentForSettings = {
    id: tournament.id,
    name: tournament.name,
    slug: tournament.slug,
    description: tournament.description,
    status: tournament.status ?? "draft",
    game: tournament.game,
    game_format: tournament.game_format,
    platform: tournament.platform,
    battle_format: tournament.battle_format,
    max_participants: tournament.max_participants,
    start_date: tournament.start_date,
    end_date: tournament.end_date,
    registration_type: tournament.registration_type,
    check_in_required: tournament.check_in_required,
    allow_late_registration: tournament.allow_late_registration,
    late_check_in_max_round: tournament.late_check_in_max_round,
  };

  return (
    <TournamentSettings
      tournament={tournamentForSettings}
      phases={phases}
      communitySlug={communitySlug}
    />
  );
}
