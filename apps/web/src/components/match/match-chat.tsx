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
import {
  sendMatchMessageAction,
  requestJudgeAction,
  cancelJudgeRequestAction,
  clearJudgeRequestAction,
} from "@/actions/matches";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Check,
  Gavel,
  Loader2,
  MessageSquare,
  Send,
  ShieldAlert,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  onStaffRequestChange?: (requested: boolean) => void;
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
  onStaffRequestChange,
  viewers,
  typingUsers,
  onTypingStart,
  onTypingStop,
}: MatchChatProps) {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isRequestingJudge, setIsRequestingJudge] = useState(false);
  const [isClearingJudge, setIsClearingJudge] = useState(false);
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
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
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
      onStaffRequestChange?.(true);
      toast.success("Judge has been requested");
    } else {
      toast.error(result.error);
    }
  };

  const handleCancelJudgeRequest = async () => {
    setIsRequestingJudge(true);
    const result = await cancelJudgeRequestAction(matchId, tournamentId);
    setIsRequestingJudge(false);

    if (result.success) {
      onStaffRequestChange?.(false);
      toast.success("Judge request cancelled");
    } else {
      toast.error(result.error);
    }
  };

  const handleClearJudgeRequest = async () => {
    setIsClearingJudge(true);
    const result = await clearJudgeRequestAction(matchId, tournamentId);
    setIsClearingJudge(false);

    if (result.success) {
      onStaffRequestChange?.(false);
      toast.success("Judge request resolved");
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

  const hasMessages = messages && messages.length > 0;

  return (
    <Card className="flex h-full min-h-[300px] flex-col">
      <CardHeader className="shrink-0 pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-4 w-4" />
            Match Chat
          </CardTitle>
          {viewers.length > 0 && <ViewerAvatars viewers={viewers} />}
        </div>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col p-0">
        {/* Judge requested banner */}
        {staffRequested && (
          <div className="mx-3 mt-1 flex items-center justify-between gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
            <div className="flex items-center gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
              <span className="font-medium">A judge has been requested</span>
            </div>
            {isStaff && (
              <Button
                variant="outline"
                size="sm"
                className="h-6 shrink-0 gap-1 border-amber-500/25 px-2 text-[11px] text-amber-700 hover:bg-amber-500/10 dark:text-amber-300"
                onClick={handleClearJudgeRequest}
                disabled={isClearingJudge}
              >
                {isClearingJudge ? (
                  <Loader2 className="h-2.5 w-2.5 animate-spin" />
                ) : (
                  <Check className="h-2.5 w-2.5" />
                )}
                Resolve
              </Button>
            )}
          </div>
        )}
        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4">
          {messagesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
            </div>
          ) : !hasMessages ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 py-8">
              <MessageSquare className="text-muted-foreground/30 h-8 w-8" />
              <p className="text-muted-foreground text-sm">
                {canChat
                  ? "Send a message to your opponent"
                  : "No messages yet"}
              </p>
            </div>
          ) : (
            <div className="space-y-3 py-3">
              {messages.map((msg) => {
                const msgAlt = msg.alt as {
                  id: number;
                  display_name: string | null;
                  username: string;
                  avatar_url: string | null;
                } | null;
                const isSystem = msg.message_type === "system";
                const isJudge = msg.message_type === "judge";
                const isOwnMessage = msgAlt?.id === userAltId;
                const time = msg.created_at
                  ? new Date(msg.created_at as string).toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                    })
                  : null;

                if (isSystem) {
                  return (
                    <div
                      key={msg.id}
                      className="text-muted-foreground text-center text-xs italic"
                    >
                      {msg.content}
                      {time && (
                        <span className="text-muted-foreground/50 ml-1.5 text-[10px] not-italic">
                          {time}
                        </span>
                      )}
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    className={cn(
                      "animate-in fade-in flex flex-col duration-200",
                      isOwnMessage ? "items-end" : "items-start"
                    )}
                  >
                    {/* Name row */}
                    <div
                      className={cn(
                        "mb-0.5 flex items-center gap-1",
                        isOwnMessage && "flex-row-reverse"
                      )}
                    >
                      <span className="text-muted-foreground text-xs font-medium">
                        {msgAlt?.display_name ?? msgAlt?.username ?? "Unknown"}
                      </span>
                      {isJudge && (
                        <Badge
                          variant="secondary"
                          className="h-4 px-1 text-[10px]"
                        >
                          <Gavel className="mr-0.5 h-2.5 w-2.5" />
                          Judge
                        </Badge>
                      )}
                    </div>
                    {/* Avatar + bubble + timestamp row */}
                    <div
                      className={cn(
                        "flex items-end gap-2",
                        isOwnMessage && "flex-row-reverse"
                      )}
                    >
                      <Avatar className="h-7 w-7 shrink-0">
                        <AvatarImage src={msgAlt?.avatar_url ?? undefined} />
                        <AvatarFallback className="text-[10px]">
                          <User className="h-3 w-3" />
                        </AvatarFallback>
                      </Avatar>
                      <div
                        className={cn(
                          "max-w-[75%] rounded-lg px-3 py-2 text-sm",
                          isOwnMessage
                            ? "bg-primary text-primary-foreground"
                            : isJudge
                              ? "bg-amber-50 text-amber-900 ring-1 ring-amber-500/20 dark:bg-amber-950 dark:text-amber-100"
                              : "bg-muted"
                        )}
                      >
                        {msg.content}
                      </div>
                      {time && (
                        <span className="text-muted-foreground/50 self-end text-[10px]">
                          {time}
                        </span>
                      )}
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

        {/* Input + Actions */}
        {canChat && userAltId && (
          <div className="shrink-0 space-y-2 border-t p-3">
            <div className="flex gap-2">
              <Input
                placeholder={
                  isStaff && !isParticipant
                    ? "Message as judge..."
                    : "Type a message..."
                }
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
              {/* Call / Cancel Judge — icon button next to send */}
              {isParticipant && matchStatus === "active" && (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        size="icon"
                        variant={staffRequested ? "secondary" : "outline"}
                        aria-label={
                          staffRequested ? "Cancel judge request" : "Call judge"
                        }
                        onClick={
                          staffRequested
                            ? handleCancelJudgeRequest
                            : handleRequestJudge
                        }
                        disabled={isRequestingJudge}
                        className={cn(
                          staffRequested
                            ? "text-amber-600 hover:bg-amber-500/10 dark:text-amber-400"
                            : "text-amber-600 hover:bg-amber-500/10 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
                        )}
                      >
                        {isRequestingJudge ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <ShieldAlert className="h-4 w-4" />
                        )}
                      </Button>
                    }
                  />
                  <TooltipContent>
                    {staffRequested ? "Cancel judge request" : "Call a judge"}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
        )}
        {canChat && !userAltId && (
          <div className="text-muted-foreground shrink-0 border-t p-3 text-center text-xs">
            Unable to send messages — no player identity linked.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
