import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPlus } from "lucide-react";
import {
  formatTimeAgo,
  formatDisplayUsername,
  isTempUsername,
} from "@trainers/utils";
import type { NewMemberEntry } from "@trainers/supabase/queries";

interface SidebarNewMembersProps {
  members: NewMemberEntry[];
}

/**
 * Sidebar widget showing the newest community members.
 * Based on account creation date.
 */
export function SidebarNewMembers({ members }: SidebarNewMembersProps) {
  if (members.length === 0) {
    return null;
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          New Members
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {members.map((member) => {
          const displayUsername = formatDisplayUsername(member.username);
          return (
            <Link
              key={member.userId}
              href={`/u/${member.username}`}
              className="hover:bg-muted/50 flex items-center gap-2.5 rounded-md p-1.5 transition-colors"
            >
              {/* Avatar */}
              <Avatar size="sm">
                {member.avatarUrl && (
                  <AvatarImage src={member.avatarUrl} alt={displayUsername} />
                )}
                <AvatarFallback>
                  {isTempUsername(member.username)
                    ? "NT"
                    : member.username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              {/* Name + join date */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {displayUsername}
                </p>
                <p className="text-muted-foreground text-xs">
                  Joined {formatTimeAgo(member.joinedAt)}
                </p>
              </div>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}
