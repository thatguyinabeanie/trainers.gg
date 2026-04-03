import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap } from "lucide-react";
import { formatTimeAgo, formatDisplayUsername, isTempUsername } from "@trainers/utils";
import type { RecentlyActivePlayer } from "@trainers/supabase/queries";

interface SidebarRecentProps {
  players: RecentlyActivePlayer[];
}

/**
 * Sidebar widget showing recently active players.
 * Based on the most recent tournament registration activity.
 */
export function SidebarRecent({ players }: SidebarRecentProps) {
  if (players.length === 0) {
    return null;
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-4 w-4" />
          Recently Active
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {players.map((player) => {
          const displayUsername = formatDisplayUsername(player.username);
          return (
          <Link
            key={player.userId}
            href={`/u/${player.username}`}
            className="hover:bg-muted/50 flex items-center gap-2.5 rounded-md p-1.5 transition-colors"
          >
            {/* Avatar */}
            <Avatar size="sm">
              {player.avatarUrl && (
                <AvatarImage src={player.avatarUrl} alt={displayUsername} />
              )}
              <AvatarFallback>
                {isTempUsername(player.username) ? "NT" : player.username.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            {/* Name + last active */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{displayUsername}</p>
              <p className="text-muted-foreground text-xs">
                Active {formatTimeAgo(player.lastActiveAt)}
              </p>
            </div>
          </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}
