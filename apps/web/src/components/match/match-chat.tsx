"use client";

import {
  type KeyboardEvent,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { useSupabaseQuery } from "@/lib/supabase";
import { getMatchMessages } from "@trainers/supabase";
import type { TypedSupabaseClient } from "@trainers/supabase";
import { sendMatchMessageAction, requestJudgeAction } from "@/actions/matches";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, MessageSquare, Send, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  ViewerAvatars,
  TypingIndicator,
  type useMatchPresence,
} from "./presence-indicator";

// ============================================================================
// Types
// ============================================================================

interface MatchChatProps {
  matchId: number;
  userAltId: number | null;
  isStaff: boolean;
  isParticipant: boolean;
  matchStatus: string;
  staffRequested: boolean;
  tournamentId: number;
  messagesRefreshKey: number;
  // Presence
  viewers: ReturnType<typeof useMatchPresence>["viewers"];
  typingUsers: string[];
  onTypingStart: () => void;
  onTypingStop: () => void;
}

// ============================================================================
// Match Chat
// ============================================================================

export function MatchChat({
  matchId,
  userAltId,
  isStaff,
  isParticipant,
  matchStatus,
  staffRequested,
  tournamentId,
  messagesRefreshKey,
  viewers,
  typingUsers,
  onTypingStart,
  onTypingStop,
}: MatchChatProps) {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isRequestingJudge, setIsRequestingJudge] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const messagesQueryFn = useCallback(
    (client: TypedSupabaseClient) => getMatchMessages(client, matchId),
    [matchId]
  );

  const {
    data: messages,
    isLoading: messagesLoading,
    refetch: refetchMessages,
  } = useSupabaseQuery(messagesQueryFn, [matchId, messagesRefreshKey]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Clean up typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Typing indicator management
  const handleInputChange = (value: string) => {
    setMessage(value);

    if (value.trim()) {
      onTypingStart();
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      // Stop typing after 2 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        onTypingStop();
      }, 2000);
    } else {
      onTypingStop();
    }
  };

  const handleSend = async () => {
    if (!message.trim() || !userAltId) return;
    setIsSending(true);
    onTypingStop();

    const messageType = isStaff && !isParticipant ? "judge" : "player";
    const result = await sendMatchMessageAction(
      matchId,
      userAltId,
      message.trim(),
      messageType
    );

    setIsSending(false);

    if (result.success) {
      setMessage("");
      refetchMessages();
    } else {
      toast.error(result.error);
    }
  };

  const handleRequestJudge = async () => {
    setIsRequestingJudge(true);
    const result = await requestJudgeAction(matchId, tournamentId);
    setIsRequestingJudge(false);

    if (result.success) {
      toast.success("Judge has been requested");
    } else {
      toast.error(result.error);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const canChat =
    (isParticipant || isStaff) &&
    matchStatus !== "completed" &&
    matchStatus !== "cancelled";

  return (
    <Card className="flex h-[500px] flex-col lg:h-[600px]">
      <CardHeader className="shrink-0 pb-3">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-4 w-4" />
              Match Chat
            </CardTitle>
            <ViewerAvatars viewers={viewers} />
          </div>
          {isParticipant && !staffRequested && matchStatus === "active" && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRequestJudge}
              disabled={isRequestingJudge}
            >
              {isRequestingJudge ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ShieldAlert className="mr-2 h-4 w-4" />
              )}
              Call Judge
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col p-0">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4">
          {messagesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
            </div>
          ) : !messages || messages.length === 0 ? (
            <div className="text-muted-foreground py-8 text-center text-sm">
              No messages yet
            </div>
          ) : (
            <div className="space-y-3 py-3">
              {messages.map((msg) => {
                const msgAlt = msg.alt as {
                  id: number;
                  display_name: string | null;
                  username: string;
                } | null;
                const isSystem = msg.message_type === "system";
                const isJudge = msg.message_type === "judge";
                const isOwnMessage = msgAlt?.id === userAltId;

                if (isSystem) {
                  return (
                    <div
                      key={msg.id}
                      className="text-muted-foreground text-center text-xs italic"
                    >
                      {msg.content}
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex flex-col",
                      isOwnMessage ? "items-end" : "items-start"
                    )}
                  >
                    <div className="mb-0.5 flex items-center gap-1">
                      <span className="text-muted-foreground text-xs font-medium">
                        {msgAlt?.display_name ?? msgAlt?.username ?? "Unknown"}
                      </span>
                      {isJudge && (
                        <Badge
                          variant="secondary"
                          className="h-4 px-1 text-[10px]"
                        >
                          Judge
                        </Badge>
                      )}
                    </div>
                    <div
                      className={cn(
                        "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                        isOwnMessage
                          ? "bg-primary text-primary-foreground"
                          : isJudge
                            ? "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100"
                            : "bg-muted"
                      )}
                    >
                      {msg.content}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Typing indicator */}
        <TypingIndicator typingUsers={typingUsers} className="px-4 py-1" />

        {/* Input */}
        {canChat && userAltId && (
          <div className="shrink-0 border-t p-3">
            <div className="flex gap-2">
              <Input
                placeholder="Type a message..."
                value={message}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
                maxLength={500}
                disabled={isSending}
              />
              <Button
                size="icon"
                aria-label="Send message"
                onClick={handleSend}
                disabled={isSending || !message.trim()}
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
