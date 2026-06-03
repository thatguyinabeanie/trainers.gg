import Link from "next/link";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy } from "lucide-react";
import {
  getCountryName,
  formatDisplayUsername,
  isTempUsername,
} from "@trainers/utils";
import { type CoachBadgeInfo } from "@trainers/supabase/queries";
import { NewTrainerBadge } from "@/components/ui/new-trainer-badge";
import { CoachBadge } from "@/components/ui/coach-badge";

interface PlayerCardProps {
  username: string;
  avatarUrl: string | null;
  country: string | null;
  tournamentCount: number;
  winRate: number;
  /**
   * Coach-badge visibility for this player's primary alt. Renders the badge
   * only when showCoachBadge is true AND coachHandle is non-null. The badge
   * links via coachHandle (the account's canonical handle), never username.
   */
  coachBadge?: CoachBadgeInfo;
  className?: string;
}

/**
 * Player card for the directory grid.
 * Displays avatar, username, country flag, tournament count, and win rate.
 * Links to the player's profile page at /@[handle].
 */
export function PlayerCard({
  username,
  avatarUrl,
  country,
  tournamentCount,
  winRate,
  coachBadge,
  className,
}: PlayerCardProps) {
  // Get first two characters of display name for avatar fallback
  const displayUsername = formatDisplayUsername(username);
  const isTemp = isTempUsername(username);
  const initials = isTemp ? "NT" : displayUsername.slice(0, 2).toUpperCase();
  const countryName = country ? getCountryName(country) : null;

  return (
    <Card
      size="sm"
      className={cn(
        "hover:bg-muted/50 relative transition-colors duration-150",
        className
      )}
    >
      <CardContent className="flex items-center gap-3">
        {/* Primary navigation target — overlay link covering the whole card.
            Kept as a sibling (not a wrapper) so the CoachBadge's own link is
            not nested inside this anchor (nested <a> is invalid HTML). */}
        <Link
          href={`/@${username}`}
          aria-label={displayUsername}
          className="absolute inset-0"
        />

        {/* Avatar */}
        <Avatar size="lg">
          {avatarUrl && <AvatarImage src={avatarUrl} alt={username} />}
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>

        {/* Info */}
        <div className="min-w-0 flex-1">
          {/* Username + country flag */}
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-medium">
              {displayUsername}
            </span>
            {isTemp && <NewTrainerBadge />}
            {coachBadge?.showCoachBadge && coachBadge.coachHandle && (
              <CoachBadge
                handle={coachBadge.coachHandle}
                iconOnly
                className="relative z-10 shrink-0"
              />
            )}
            {country && (
              <span
                className="shrink-0 text-sm"
                title={countryName ?? country}
                role="img"
                aria-label={countryName ?? country}
              >
                {countryCodeToFlag(country)}
              </span>
            )}
          </div>

          {/* Stats row */}
          <div className="text-muted-foreground mt-0.5 flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1">
              <Trophy className="h-3 w-3" />
              {tournamentCount}{" "}
              {tournamentCount === 1 ? "tournament" : "tournaments"}
            </span>
            {tournamentCount > 0 && <span>{winRate.toFixed(1)}% WR</span>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Convert an ISO 3166-1 alpha-2 country code to a flag emoji.
 * Uses regional indicator symbols: each letter maps to a Unicode regional indicator.
 */
function countryCodeToFlag(code: string): string {
  const upper = code.toUpperCase();
  if (upper.length !== 2) return "";
  const first = upper.charCodeAt(0);
  const second = upper.charCodeAt(1);
  // Regional indicator A starts at 0x1F1E6, offset from 'A' (65)
  return (
    String.fromCodePoint(first - 65 + 0x1f1e6) +
    String.fromCodePoint(second - 65 + 0x1f1e6)
  );
}
