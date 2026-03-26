import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy } from "lucide-react";
import type { LeaderboardEntry } from "@trainers/supabase/queries";

interface SidebarLeaderboardProps {
  entries: LeaderboardEntry[];
}

/**
 * Sidebar widget showing the top 5 players by ELO rating.
 */
export function SidebarLeaderboard({ entries }: SidebarLeaderboardProps) {
  if (entries.length === 0) {
    return null;
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-4 w-4" />
          Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {entries.map((entry, index) => (
          <Link
            key={entry.userId}
            href={`/u/${entry.username}`}
            className="hover:bg-muted/50 flex items-center gap-2.5 rounded-md p-1.5 transition-colors"
          >
            {/* Rank number */}
            <span className="text-muted-foreground w-5 text-center text-xs font-medium">
              {index + 1}
            </span>

            {/* Avatar */}
            <Avatar size="sm">
              {entry.avatarUrl && (
                <AvatarImage src={entry.avatarUrl} alt={entry.username} />
              )}
              <AvatarFallback>
                {entry.username.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            {/* Name + stats */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{entry.username}</p>
              <p className="text-muted-foreground text-xs">
                {entry.rating.toLocaleString()} pts ·{" "}
                {entry.skillBracket.charAt(0).toUpperCase() +
                  entry.skillBracket.slice(1)}
              </p>
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
