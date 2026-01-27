import { unstable_cache } from "next/cache";
import { notFound } from "next/navigation";
import { createStaticClient } from "@/lib/supabase/server";
import { getTournamentBySlug } from "@trainers/supabase";
import { CacheTags } from "@/lib/cache";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Trophy,
  Calendar,
  Users,
  Clock,
  Building2,
  ExternalLink,
} from "lucide-react";
import { TournamentTabs } from "./tournament-tabs";

// On-demand revalidation only (no time-based)
export const revalidate = false;

interface PageProps {
  params: Promise<{
    tournamentSlug: string;
  }>;
}

type TournamentStatus =
  | "draft"
  | "upcoming"
  | "active"
  | "completed"
  | "cancelled"
  | "paused";

const statusColors: Record<TournamentStatus, string> = {
  draft: "bg-gray-100 text-gray-800",
  upcoming: "bg-blue-100 text-blue-800",
  active: "bg-green-100 text-green-800",
  completed: "bg-purple-100 text-purple-800",
  cancelled: "bg-red-100 text-red-800",
  paused: "bg-yellow-100 text-yellow-800",
};

/**
 * Cached tournament fetcher
 * Uses slug-specific cache tag for granular invalidation
 */
const getCachedTournament = (slug: string) =>
  unstable_cache(
    async () => {
      const supabase = createStaticClient();
      return getTournamentBySlug(supabase, slug);
    },
    [`tournament-detail-${slug}`],
    { tags: [CacheTags.tournament(slug), CacheTags.TOURNAMENTS_LIST] }
  )();

// ============================================================================
// Helper Functions
// ============================================================================

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "TBD";
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ============================================================================
// Server Components
// ============================================================================

function Breadcrumb({ tournamentName }: { tournamentName: string }) {
  return (
    <div className="text-muted-foreground mb-4 flex items-center gap-2 text-sm">
      <Link href="/tournaments" className="hover:underline">
        Tournaments
      </Link>
      <span>/</span>
      <span className="text-foreground">{tournamentName}</span>
    </div>
  );
}

function TournamentHeader({
  tournament,
}: {
  tournament: NonNullable<Awaited<ReturnType<typeof getTournamentBySlug>>>;
}) {
  const organization = tournament.organization as {
    id: number;
    name: string;
    slug: string;
  } | null;

  const registrationCount = tournament.registrations?.length || 0;

  return (
    <div className="mb-8">
      <div className="mb-2 flex items-center gap-3">
        <h1 className="text-3xl font-bold">{tournament.name}</h1>
        <Badge className={statusColors[tournament.status as TournamentStatus]}>
          {tournament.status}
        </Badge>
      </div>

      <div className="text-muted-foreground flex flex-wrap items-center gap-4 text-sm">
        {organization && (
          <Link
            href={`/organizations/${organization.slug}`}
            className="flex items-center gap-1 hover:underline"
          >
            <Building2 className="h-4 w-4" />
            {organization.name}
          </Link>
        )}
        {tournament.format && (
          <span className="flex items-center gap-1">
            <Trophy className="h-4 w-4" />
            {tournament.format}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Users className="h-4 w-4" />
          {registrationCount}
          {tournament.max_participants
            ? ` / ${tournament.max_participants}`
            : ""}{" "}
          players
        </span>
      </div>
    </div>
  );
}

function ScheduleCard({
  tournament,
}: {
  tournament: NonNullable<Awaited<ReturnType<typeof getTournamentBySlug>>>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Schedule
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground text-sm">Start Date</p>
            <p className="font-medium">{formatDate(tournament.start_date)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-sm">End Date</p>
            <p className="font-medium">{formatDate(tournament.end_date)}</p>
          </div>
        </div>
        {tournament.registration_deadline && (
          <>
            <Separator />
            <div>
              <p className="text-muted-foreground text-sm">
                Registration Deadline
              </p>
              <p className="font-medium">
                {formatDate(tournament.registration_deadline)}
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function FormatCard({
  tournament,
}: {
  tournament: NonNullable<Awaited<ReturnType<typeof getTournamentBySlug>>>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Format
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground text-sm">Game Format</p>
            <p className="font-medium">
              {tournament.format || "Not specified"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-sm">Tournament Format</p>
            <p className="font-medium capitalize">
              {tournament.tournament_format?.replace(/_/g, " ") ||
                "Not specified"}
            </p>
          </div>
          {tournament.round_time_minutes && (
            <div>
              <p className="text-muted-foreground text-sm">Round Time</p>
              <p className="flex items-center gap-1 font-medium">
                <Clock className="h-4 w-4" />
                {tournament.round_time_minutes} minutes
              </p>
            </div>
          )}
          {tournament.swiss_rounds && (
            <div>
              <p className="text-muted-foreground text-sm">Swiss Rounds</p>
              <p className="font-medium">{tournament.swiss_rounds} rounds</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function RegistrationCard({
  tournament,
}: {
  tournament: NonNullable<Awaited<ReturnType<typeof getTournamentBySlug>>>;
}) {
  const registrationCount = tournament.registrations?.length || 0;

  if (tournament.status !== "upcoming") return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registration</CardTitle>
        <CardDescription>
          {registrationCount}
          {tournament.max_participants
            ? ` / ${tournament.max_participants}`
            : ""}{" "}
          registered
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm">
          Registration functionality is being migrated. Check back soon!
        </p>
      </CardContent>
    </Card>
  );
}

function CheckInCard({
  tournament,
}: {
  tournament: NonNullable<Awaited<ReturnType<typeof getTournamentBySlug>>>;
}) {
  if (tournament.status !== "upcoming" && tournament.status !== "active") {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Check-In</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm">
          Check-in functionality is being migrated. Check back soon!
        </p>
      </CardContent>
    </Card>
  );
}

function OrganizerCard({
  organization,
}: {
  organization: { id: number; name: string; slug: string } | null;
}) {
  if (!organization) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organizer</CardTitle>
      </CardHeader>
      <CardContent>
        <Link href={`/organizations/${organization.slug}`}>
          <Button variant="outline" className="w-full justify-start">
            <ExternalLink className="mr-2 h-4 w-4" />
            {organization.name}
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Main Page (Server Component)
// ============================================================================

export default async function TournamentPage({ params }: PageProps) {
  const { tournamentSlug } = await params;
  const tournament = await getCachedTournament(tournamentSlug);

  if (!tournament) {
    notFound();
  }

  const organization = tournament.organization as {
    id: number;
    name: string;
    slug: string;
  } | null;

  return (
    <div className="container mx-auto px-4 py-8">
      <Breadcrumb tournamentName={tournament.name} />
      <TournamentHeader tournament={tournament} />

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <TournamentTabs
            description={tournament.description}
            scheduleCard={<ScheduleCard tournament={tournament} />}
            formatCard={<FormatCard tournament={tournament} />}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <RegistrationCard tournament={tournament} />
          <CheckInCard tournament={tournament} />
          <OrganizerCard organization={organization} />
        </div>
      </div>
    </div>
  );
}
