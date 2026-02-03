"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSupabase } from "@/lib/supabase";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Gavel, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RealtimeChannel } from "@supabase/supabase-js";

// ============================================================================
// Types
// ============================================================================

interface PresenceUser {
  username: string;
  displayName: string | null;
  isStaff: boolean;
  isParticipant: boolean;
  isTyping: boolean;
}

interface PresenceIndicatorProps {
  matchId: number;
  username: string | null;
  displayName: string | null;
  isStaff: boolean;
  isParticipant: boolean;
  onTypingUsersChange?: (typingUsers: string[]) => void;
}

// ============================================================================
// Hook: useMatchPresence
// ============================================================================

export function useMatchPresence({
  matchId,
  username,
  displayName,
  isStaff,
  isParticipant,
}: Omit<PresenceIndicatorProps, "onTypingUsersChange">) {
  const supabase = useSupabase();
  const [viewers, setViewers] = useState<PresenceUser[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const presenceRef = useRef<Omit<PresenceUser, "isTyping">>({
    username: username ?? "",
    displayName,
    isStaff,
    isParticipant,
  });

  useEffect(() => {
    if (!username) return;

    const channel = supabase.channel(`match-presence-${matchId}`);
    channelRef.current = channel;

    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState<PresenceUser>();
      const allUsers: PresenceUser[] = [];
      const typing: string[] = [];

      for (const presences of Object.values(state)) {
        for (const presence of presences) {
          // Don't include self
          if (presence.username !== username) {
            allUsers.push(presence);
            if (presence.isTyping) {
              typing.push(presence.displayName ?? presence.username);
            }
          }
        }
      }

      setViewers(allUsers);
      setTypingUsers(typing);
    });

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({
          username,
          displayName,
          isStaff,
          isParticipant,
          isTyping: false,
        });
      }
    });

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [supabase, matchId, username, displayName, isStaff, isParticipant]);

  const setTyping = useCallback(
    async (isTyping: boolean) => {
      if (!channelRef.current || !username) return;
      await channelRef.current.track({
        ...presenceRef.current,
        isTyping,
      });
    },
    [username]
  );

  return { viewers, typingUsers, setTyping };
}

// ============================================================================
// Viewer Avatars
// ============================================================================

export function ViewerAvatars({
  viewers,
  className,
}: {
  viewers: PresenceUser[];
  className?: string;
}) {
  if (viewers.length === 0) return null;

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <div className="flex -space-x-1.5">
        {viewers.slice(0, 5).map((viewer) => (
          <Avatar
            key={viewer.username}
            className={cn(
              "ring-background h-5 w-5 ring-2",
              viewer.isStaff && "ring-amber-500/50"
            )}
          >
            <AvatarFallback className="text-[8px]">
              {viewer.isStaff ? (
                <Gavel className="h-2.5 w-2.5" />
              ) : (
                <User className="h-2.5 w-2.5" />
              )}
            </AvatarFallback>
          </Avatar>
        ))}
      </div>
      <span className="text-muted-foreground text-[10px]">
        {viewers.length === 1
          ? `${viewers[0]!.displayName ?? viewers[0]!.username} is viewing`
          : `${viewers.length} viewing`}
      </span>
    </div>
  );
}

// ============================================================================
// Typing Indicator
// ============================================================================

export function TypingIndicator({
  typingUsers,
  className,
}: {
  typingUsers: string[];
  className?: string;
}) {
  if (typingUsers.length === 0) return null;

  const text =
    typingUsers.length === 1
      ? `${typingUsers[0]} is typing`
      : `${typingUsers.slice(0, 2).join(" and ")} are typing`;

  return (
    <div
      className={cn(
        "text-muted-foreground flex items-center gap-1.5 text-xs",
        className
      )}
    >
      {/* Animated dots */}
      <span className="flex gap-0.5">
        <span className="h-1 w-1 animate-bounce rounded-full bg-current [animation-delay:0ms]" />
        <span className="h-1 w-1 animate-bounce rounded-full bg-current [animation-delay:150ms]" />
        <span className="h-1 w-1 animate-bounce rounded-full bg-current [animation-delay:300ms]" />
      </span>
      <span>{text}...</span>
    </div>
  );
}
