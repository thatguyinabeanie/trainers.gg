import { notFound } from "next/navigation";
import { cacheTag, cacheLife } from "next/cache";
import Link from "next/link";
import { ArrowLeft, Trophy, Swords, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { createStaticClient } from "@/lib/supabase/server";
import { CacheTags } from "@/lib/cache";
import { StandingsTable } from "@/components/limitless/limitless-standings";
import { MatchesTable } from "@/components/limitless/limitless-matches";

// ---------------------------------------------------------------------------
// Cached data fetchers
// Historical data — never changes after import. Cache aggressively with "max".
// ---------------------------------------------------------------------------

async function getCachedTournament(tournamentId: string) {
  "use cache";
  cacheTag(CacheTags.limitlessTournament(tournamentId));
  cacheLife("max");
  const supabase = createStaticClient();
  const { data, error } = await supabase
    .schema("limitless")
    .from("tournaments")
    .select("*")
    .eq("tournament_id", tournamentId)
    .single();
  if (error || !data) return null;
  return data;
}

async function getCachedPhases(tournamentId: string) {
  "use cache";
  cacheTag(CacheTags.limitlessTournament(tournamentId));
  cacheLife("max");
  const supabase = createStaticClient();
  const { data } = await supabase
    .schema("limitless")
    .from("phases")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("phase_number");
  return data ?? [];
}

async function getCachedStandings(tournamentId: string) {
  "use cache";
  cacheTag(CacheTags.limitlessTournament(tournamentId));
  cacheLife("max");
  const supabase = createStaticClient();
  const { data } = await supabase
    .schema("limitless")
    .from("standings")
    .select(
      `
      id,
      placement,
      record_wins,
      record_losses,
      record_ties,
      drop_round,
      player:players!standings_player_id_fkey (
        id,
        username,
        display_name,
        country
      ),
      team_pokemon (
        position,
        species,
        ability,
        held_item,
        tera_type,
        moves
      )
    `
    )
    .eq("tournament_id", tournamentId)
    .order("placement");
  return data ?? [];
}

async function getCachedMatches(tournamentId: string) {
  "use cache";
  cacheTag(CacheTags.limitlessTournament(tournamentId));
  cacheLife("max");
  const supabase = createStaticClient();
  const { data } = await supabase
    .schema("limitless")
    .from("match_results")
    .select(
      `
      id,
      phase,
      round,
      table_number,
      match_label,
      player1:players!match_results_player1_id_fkey (
        id,
        username,
        display_name
      ),
      player2:players!match_results_player2_id_fkey (
        id,
        username,
        display_name
      ),
      winner_id
    `
    )
    .eq("tournament_id", tournamentId)
    .order("phase")
    .order("round");
  return data ?? [];
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

interface PageProps {
  params: Promise<{ tournamentId: string }>;
}

export default async function LimitlessTournamentPage({ params }: PageProps) {
  const { tournamentId } = await params;

  // Fetch all data in parallel — all cached independently
  const [tournament, phases, standings, matches] = await Promise.all([
    getCachedTournament(tournamentId),
    getCachedPhases(tournamentId),
    getCachedStandings(tournamentId),
    getCachedMatches(tournamentId),
  ]);

  if (!tournament) notFound();

  return (
    <div className="space-y-6">
      {/* Back button + header */}
      <div className="flex items-start gap-4">
        <Link href="/admin/data">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold">{tournament.name}</h2>
            <a
              href={`https://play.limitlesstcg.com/tournament/${tournamentId}/standings`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
          <p className="text-muted-foreground text-sm">
            {tournament.date} &middot; {tournament.player_count} players
            &middot; {tournament.format_id}
          </p>
        </div>
      </div>

      {/* Meta badges */}
      <div className="flex flex-wrap gap-2">
        {tournament.platform && (
          <Badge variant="secondary">{tournament.platform}</Badge>
        )}
        <Badge variant="secondary">
          {tournament.is_online ? "Online" : "In-person"}
        </Badge>
        {tournament.decklists && <Badge variant="default">Team sheets</Badge>}
        {tournament.organizer_name && (
          <Badge variant="outline">{tournament.organizer_name}</Badge>
        )}
        {!tournament.data_imported_at && (
          <Badge variant="destructive">
            Metadata only — not fully imported
          </Badge>
        )}
      </div>

      {/* Phases */}
      {phases.length > 0 && (
        <div className="space-y-1">
          <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Phases
          </h3>
          <div className="flex flex-wrap gap-2">
            {phases.map((p) => (
              <Badge key={p.phase_number} variant="outline" className="text-xs">
                {p.type} &middot; {p.rounds}R &middot; {p.mode}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Tabs: Standings / Matches */}
      {tournament.data_imported_at ? (
        <Tabs defaultValue="standings">
          <TabsList variant="line">
            <TabsTrigger value="standings">
              <Trophy className="mr-1.5 h-3.5 w-3.5" />
              Standings ({standings.length})
            </TabsTrigger>
            <TabsTrigger value="matches">
              <Swords className="mr-1.5 h-3.5 w-3.5" />
              Matches ({matches.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="standings" className="pt-4">
            {standings.length > 0 ? (
              <StandingsTable standings={standings} />
            ) : (
              <p className="text-muted-foreground py-8 text-center text-sm">
                No standings data.
              </p>
            )}
          </TabsContent>

          <TabsContent value="matches" className="pt-4">
            {matches.length > 0 ? (
              <MatchesTable matches={matches} />
            ) : (
              <p className="text-muted-foreground py-8 text-center text-sm">
                No match data.
              </p>
            )}
          </TabsContent>
        </Tabs>
      ) : (
        <p className="text-muted-foreground py-8 text-center text-sm">
          This tournament has only been synced (metadata). Import it from the
          Import tab to see standings and matches.
        </p>
      )}
    </div>
  );
}
