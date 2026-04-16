"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { type DiscordServer } from "@trainers/supabase";

import { getDiscordInstallUrlAction } from "@/actions/discord-integration";
import { DiscordIcon } from "@/components/icons/discord-icon";
import { Button } from "@/components/ui/button";
import { formatDate } from "@trainers/utils";

import { ConfirmDisconnectDialog } from "./confirm-disconnect-dialog";

// =============================================================================
// Types
// =============================================================================

interface StatusHeaderProps {
  server: DiscordServer;
  communitySlug: string;
  communityId: number;
}

// =============================================================================
// Component
// =============================================================================

export function StatusHeader({
  server,
  communitySlug: _communitySlug,
  communityId,
}: StatusHeaderProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleReinstall() {
    startTransition(async () => {
      const result = await getDiscordInstallUrlAction(communityId);
      if (result.success) {
        window.location.href = result.data.url;
      } else {
        toast.error(result.error ?? "Failed to generate install URL");
      }
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
      {/* Left: install info */}
      <div className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[#5865F2]/10">
          <DiscordIcon className="size-5 text-[#5865F2]" />
        </span>
        <div>
          <p className="flex items-center gap-1.5 text-sm font-medium">
            <span className="size-2 shrink-0 rounded-full bg-emerald-500" />
            Installed in{" "}
            <span className="font-semibold">{server.guild_id}</span>
            {/* TODO: show guild name once stored locally — currently only guild_id is persisted */}
          </p>
          <p className="text-muted-foreground text-xs">
            Added {formatDate(server.created_at)}
            {/* TODO: show installer username — requires a user lookup by server.installed_by (uuid) */}
          </p>
        </div>
      </div>

      {/* Right: actions */}
      <div className="flex shrink-0 items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleReinstall}
          disabled={isPending}
        >
          Reinstall
        </Button>
        <ConfirmDisconnectDialog serverId={server.id} router={router} />
      </div>
    </div>
  );
}
