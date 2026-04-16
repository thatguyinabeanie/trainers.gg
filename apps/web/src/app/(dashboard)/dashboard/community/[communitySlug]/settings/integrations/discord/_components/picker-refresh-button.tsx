"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { refreshDiscordGuildCacheAction } from "@/actions/discord-integration";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PickerRefreshButtonProps {
  /** The internal discord_servers.id for this community's server. */
  serverId: number;
  className?: string;
}

/**
 * Forces Next.js to drop the 5-minute cached Discord channel + role lists for
 * this server and re-fetches from Discord on the next render. Used next to
 * channel / role pickers that depend on those lists.
 */
export function PickerRefreshButton({
  serverId,
  className,
}: PickerRefreshButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      const result = await refreshDiscordGuildCacheAction(serverId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Refreshed Discord channels and roles");
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={onClick}
      disabled={pending}
      aria-label="Refresh Discord channels and roles"
      className={cn("size-8", className)}
    >
      <RefreshCw className={cn("size-4", pending && "animate-spin")} />
    </Button>
  );
}
