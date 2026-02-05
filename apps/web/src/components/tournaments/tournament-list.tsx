import type React from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { Trophy, Users, Calendar, Swords } from "lucide-react";
import { DateChip } from "@/app/tournaments/date-chip";
import { getGameById, getFormatById } from "@/components/tournaments/shared";
import type { TournamentWithOrg } from "@trainers/supabase";

const TOURNAMENT_FORMAT_LABELS: Record<string, string> = {
  swiss_only: "Swiss",
  swiss_with_cut: "Swiss + Top Cut",
  single_elimination: "Single Elim",
  double_elimination: "Double Elim",
};

// ============================================================================
// Section Header
// ============================================================================

interface SectionHeaderProps {
  title: string;
  count: number;
}

export function SectionHeader({ title, count }: SectionHeaderProps) {
  if (count === 0) return null;

  return (
    <div className="flex items-center gap-2 pt-6 pb-3 first:pt-0">
      <h2 className="text-lg font-semibold">{title}</h2>
      <Badge variant="secondary" className="text-xs">
        {count}
      </Badge>
    </div>
  );
}

// ============================================================================
// Active Tournament Card
// ============================================================================

interface ActiveTournamentCardProps {
  tournament: TournamentWithOrg;
  linkPath?: string;
  showOrganization?: boolean;
}

export function ActiveTournamentCard({
  tournament,
  linkPath,
  showOrganization = true,
}: ActiveTournamentCardProps) {
  const currentRound = tournament.current_round ?? 0;
  const totalRounds = tournament.swiss_rounds ?? 0;
  const progressPercent =
    totalRounds > 0 ? Math.round((currentRound / totalRounds) * 100) : 0;

  const formatLabel = tournament.tournament_format
    ? (TOURNAMENT_FORMAT_LABELS[tournament.tournament_format] ??
      tournament.tournament_format)
    : null;

  const gameLabel = tournament.game
    ? (getGameById(tournament.game)?.name ?? tournament.game.toUpperCase())
    : null;

  const gameFormatLabel = tournament.game_format
    ? (getFormatById(tournament.game ?? "", tournament.game_format)?.name ??
      null)
    : null;

  const href = linkPath ?? `/tournaments/${tournament.slug}`;

  return (
    <Link
      href={href}
      className="hover:bg-muted/30 group block rounded-lg border p-4 transition-colors"
    >
      {/* Top row: pulse + name */}
      <div className="mb-3 flex items-start gap-2.5">
        <span className="relative mt-1 flex h-2.5 w-2.5 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500"></span>
        </span>
        <div className="min-w-0">
          <p className="group-hover:text-primary truncate text-base font-semibold transition-colors">
            {tournament.name}
          </p>
          {showOrganization && tournament.organization && (
            <p className="text-muted-foreground truncate text-sm">
              {tournament.organization.name}
            </p>
          )}
        </div>
      </div>

      {/* Progress bar (only if we know total rounds) */}
      {totalRounds > 0 && (
        <div className="mb-3">
          <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
            <div
              className="bg-primary h-full rounded-full transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Detail chips */}
      <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <span className="flex items-center gap-1">
          <Users className="h-3.5 w-3.5" />
          {tournament.registrationCount} players
        </span>
        {formatLabel && (
          <span className="flex items-center gap-1">
            <Swords className="h-3.5 w-3.5" />
            {formatLabel}
          </span>
        )}
        {gameFormatLabel && (
          <span>
            {gameLabel} {gameFormatLabel}
          </span>
        )}
        {tournament.battle_format && (
          <span className="capitalize">{tournament.battle_format}</span>
        )}
      </div>
    </Link>
  );
}

// ============================================================================
// Active Tournaments Section
// ============================================================================

interface ActiveTournamentsProps {
  tournaments: TournamentWithOrg[];
  linkPath?: (tournament: TournamentWithOrg) => string;
  showOrganization?: boolean;
}

export function ActiveTournaments({
  tournaments,
  linkPath,
  showOrganization = true,
}: ActiveTournamentsProps) {
  if (tournaments.length === 0) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {tournaments.map((tournament) => (
        <ActiveTournamentCard
          key={tournament.id}
          tournament={tournament}
          linkPath={linkPath?.(tournament)}
          showOrganization={showOrganization}
        />
      ))}
    </div>
  );
}

// ============================================================================
// Upcoming Tournaments (Table/Card List)
// ============================================================================

interface UpcomingTournamentsProps {
  tournaments: TournamentWithOrg[];
  linkPath?: (tournament: TournamentWithOrg) => string;
  showOrganization?: boolean;
  actionSlot?: (tournament: TournamentWithOrg) => React.ReactNode;
}

export function UpcomingTournaments({
  tournaments,
  linkPath,
  showOrganization = true,
  actionSlot,
}: UpcomingTournamentsProps) {
  if (tournaments.length === 0) return null;

  return (
    <>
      {/* Mobile: Card list */}
      <div className="divide-y rounded-lg border md:hidden">
        {tournaments.map((tournament) => {
          const spotsText = tournament.max_participants
            ? `${tournament.registrationCount}/${tournament.max_participants}`
            : `${tournament.registrationCount}`;

          const date = tournament.start_date
            ? new Date(tournament.start_date)
            : null;
          const dateStr = date
            ? date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })
            : "";
          const timeStr = date
            ? date
                .toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                })
                .toLowerCase()
            : "";

          const href =
            linkPath?.(tournament) ?? `/tournaments/${tournament.slug}`;

          return (
            <div key={tournament.id} className="flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="text-muted-foreground mb-0.5 text-xs">
                  {dateStr} · {timeStr}
                </p>
                <Link
                  href={href}
                  className="hover:text-primary mb-0.5 block truncate font-semibold hover:underline"
                >
                  {tournament.name}
                </Link>
                <p className="text-muted-foreground truncate text-xs">
                  {showOrganization && tournament.organization?.name}
                  {showOrganization && tournament.organization && " · "}
                  <Users className="inline h-3 w-3" /> {spotsText}
                </p>
              </div>
              {actionSlot?.(tournament)}
            </div>
          );
        })}
      </div>

      {/* Desktop: Table */}
      <div className="hidden rounded-lg border md:block">
        <ResponsiveTable>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    Date & Time
                  </div>
                </TableHead>
                <TableHead>Name</TableHead>
                {showOrganization && <TableHead>Organization</TableHead>}
                <TableHead className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Users className="h-3.5 w-3.5" />
                    Spots
                  </div>
                </TableHead>
                {actionSlot && (
                  <TableHead className="w-25 text-center"></TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {tournaments.map((tournament) => {
                const spotsText = tournament.max_participants
                  ? `${tournament.registrationCount} / ${tournament.max_participants}`
                  : `${tournament.registrationCount}`;

                const href =
                  linkPath?.(tournament) ?? `/tournaments/${tournament.slug}`;

                return (
                  <TableRow key={tournament.id} className="hover:bg-muted/50">
                    <TableCell className="whitespace-nowrap">
                      <DateChip dateString={tournament.start_date} showTime />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <Link
                        href={href}
                        className="hover:text-primary hover:underline"
                      >
                        {tournament.name}
                      </Link>
                    </TableCell>
                    {showOrganization && (
                      <TableCell className="text-muted-foreground">
                        {tournament.organization ? (
                          <Link
                            href={`/organizations/${tournament.organization.slug}`}
                            className="hover:text-primary hover:underline"
                          >
                            {tournament.organization.name}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    )}
                    <TableCell className="text-right">
                      <span className="text-muted-foreground">{spotsText}</span>
                    </TableCell>
                    {actionSlot && (
                      <TableCell className="text-center">
                        {actionSlot(tournament)}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ResponsiveTable>
      </div>
    </>
  );
}

// ============================================================================
// Completed Tournaments (Table/Card List)
// ============================================================================

interface CompletedTournamentsProps {
  tournaments: TournamentWithOrg[];
  linkPath?: (tournament: TournamentWithOrg) => string;
  showOrganization?: boolean;
}

export function CompletedTournaments({
  tournaments,
  linkPath,
  showOrganization = true,
}: CompletedTournamentsProps) {
  if (tournaments.length === 0) return null;

  return (
    <>
      {/* Mobile: Card list */}
      <div className="divide-y rounded-lg border md:hidden">
        {tournaments.map((tournament) => {
          const date =
            tournament.end_date || tournament.start_date
              ? new Date(tournament.end_date || tournament.start_date!)
              : null;
          const dateStr = date
            ? date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })
            : "";

          const href =
            linkPath?.(tournament) ?? `/tournaments/${tournament.slug}`;

          return (
            <Link
              key={tournament.id}
              href={href}
              className="hover:bg-muted/50 flex items-center gap-3 p-3 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="text-muted-foreground mb-0.5 text-xs">
                  {dateStr}
                </p>
                <p className="mb-0.5 truncate font-semibold">
                  {tournament.name}
                </p>
                <p className="text-muted-foreground truncate text-xs">
                  {showOrganization && tournament.organization?.name}
                  {showOrganization && tournament.organization && " · "}
                  <Users className="inline h-3 w-3" />{" "}
                  {tournament.registrationCount}
                </p>
                {tournament.winner && (
                  <p className="text-primary mt-1 flex items-center gap-1 text-xs font-medium">
                    <Trophy className="h-3 w-3" />
                    {tournament.winner.display_name ||
                      tournament.winner.username}
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Desktop: Table */}
      <div className="hidden rounded-lg border md:block">
        <ResponsiveTable>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Name</TableHead>
                {showOrganization && <TableHead>Organization</TableHead>}
                <TableHead>Winner</TableHead>
                <TableHead className="text-right">Players</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tournaments.map((tournament) => {
                const href =
                  linkPath?.(tournament) ?? `/tournaments/${tournament.slug}`;

                return (
                  <TableRow key={tournament.id} className="hover:bg-muted/50">
                    <TableCell className="whitespace-nowrap">
                      <DateChip
                        dateString={
                          tournament.end_date || tournament.start_date
                        }
                        showTime={false}
                        showYear
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <Link
                        href={href}
                        className="hover:text-primary hover:underline"
                      >
                        {tournament.name}
                      </Link>
                    </TableCell>
                    {showOrganization && (
                      <TableCell className="text-muted-foreground">
                        {tournament.organization ? (
                          <Link
                            href={`/organizations/${tournament.organization.slug}`}
                            className="hover:text-primary hover:underline"
                          >
                            {tournament.organization.name}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    )}
                    <TableCell>
                      {tournament.winner ? (
                        <div className="text-primary flex items-center gap-1.5 font-medium">
                          <Trophy className="h-3.5 w-3.5" />
                          <span>
                            {tournament.winner.display_name ||
                              tournament.winner.username}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-right">
                      {tournament.registrationCount}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ResponsiveTable>
      </div>
    </>
  );
}

// ============================================================================
// Simple Card Grid (for Organization/TO Dashboard)
// ============================================================================

interface TournamentCardGridProps {
  tournaments: TournamentWithOrg[];
  linkPath?: (tournament: TournamentWithOrg) => string;
  showStatus?: boolean;
  showOrganization?: boolean;
}

export function TournamentCardGrid({
  tournaments,
  linkPath,
  showStatus = true,
  showOrganization = false,
}: TournamentCardGridProps) {
  if (tournaments.length === 0) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {tournaments.map((tournament) => {
        const href =
          linkPath?.(tournament) ?? `/tournaments/${tournament.slug}`;
        const status = (tournament.status ?? "draft") as
          | "draft"
          | "upcoming"
          | "active"
          | "completed"
          | "cancelled";

        return (
          <Link key={tournament.id} href={href}>
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardContent className="p-4">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold">
                      {tournament.name}
                    </p>
                    {showOrganization && tournament.organization && (
                      <p className="text-muted-foreground truncate text-sm">
                        {tournament.organization.name}
                      </p>
                    )}
                  </div>
                  {showStatus && <StatusBadge status={status} />}
                </div>
                <div className="text-muted-foreground space-y-2 text-sm">
                  {tournament.start_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {new Date(tournament.start_date).toLocaleDateString()}
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
  );
}

// ============================================================================
// Empty State
// ============================================================================

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

export function TournamentListEmpty({
  title = "No tournaments found",
  description = "Check back later for upcoming tournaments!",
  icon,
  children,
}: EmptyStateProps) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12">
        {icon ?? <Trophy className="text-muted-foreground mb-4 h-12 w-12" />}
        <h3 className="mb-2 text-lg font-semibold">{title}</h3>
        <p className="text-muted-foreground text-center">{description}</p>
        {children}
      </CardContent>
    </Card>
  );
}
