"use client";

import { useTransition } from "react";
import { Play, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { sendTestNotificationAction } from "@/actions/discord-integration";
import type { DiscordChannelEventType } from "@trainers/supabase";

interface TestNotificationButtonProps {
  serverId: number;
  channelId: string;
  eventType: DiscordChannelEventType;
}

export function TestNotificationButton({
  serverId,
  channelId,
  eventType,
}: TestNotificationButtonProps) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await sendTestNotificationAction({ serverId, channelId, eventType });
      if (!result.success) {
        toast.error(result.error ?? "Failed to send test notification");
        return;
      }
      toast.success("Test notification sent!");
    });
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={isPending}
    >
      {isPending ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <Play className="size-3.5" />
      )}
      Test
    </Button>
  );
}
