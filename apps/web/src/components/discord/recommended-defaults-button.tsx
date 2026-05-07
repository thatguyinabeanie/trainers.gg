"use client";

import { useTransition } from "react";
import { Wand2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  upsertChannelMappingAction,
  updateServerSettingsAction,
} from "@/actions/discord-integration";

interface RecommendedDefaultsButtonProps {
  serverId: number;
  communityId: number;
  guildChannels: Array<{ id: string; name: string; type: number }>;
  guildRoles: Array<{ id: string; name: string; color: number }>;
  onApplied: () => void;
}

export function RecommendedDefaultsButton({
  serverId,
  communityId,
  guildChannels,
  onApplied,
}: RecommendedDefaultsButtonProps) {
  const [isPending, startTransition] = useTransition();

  const textChannels = guildChannels.filter((c) => c.type === 0);

  function handleApply() {
    startTransition(async () => {
      // Auto-detect channels
      const announcementChannel = textChannels.find((c) =>
        ["announce", "events", "tournament"].some((k) =>
          c.name.toLowerCase().includes(k)
        )
      );
      const generalChannel = textChannels.find((c) =>
        c.name.toLowerCase().includes("general")
      );

      const primaryChannel = announcementChannel ?? generalChannel;

      if (!primaryChannel) {
        toast.warning(
          "Couldn't auto-detect channels. Please configure manually."
        );
        return;
      }

      try {
        // Map tournament_created to the best channel
        await upsertChannelMappingAction({
          communityId,
          eventType: "tournament_created",
          channelId: (announcementChannel ?? generalChannel)!.id,
        });

        // Map other events to general or announcement channel
        const fallbackId = (generalChannel ?? announcementChannel)!.id;
        await upsertChannelMappingAction({
          communityId,
          eventType: "registration_opens",
          channelId: fallbackId,
        });
        await upsertChannelMappingAction({
          communityId,
          eventType: "match_result_reported",
          channelId: fallbackId,
        });

        // Mark setup as completed
        await updateServerSettingsAction({
          serverId,
          communityId,
          settings: { setup_completed: true },
        });

        const applied: string[] = [];
        if (announcementChannel) {
          applied.push(`Announcements → #${announcementChannel.name}`);
        }
        if (generalChannel) {
          applied.push(`Fallback → #${generalChannel.name}`);
        }
        applied.push("Default channel mappings applied");

        toast.success("Recommended defaults applied", {
          description: applied.join(", "),
        });

        onApplied();
      } catch {
        toast.error("Failed to apply defaults. Please try again.");
      }
    });
  }

  return (
    <Button variant="outline" onClick={handleApply} disabled={isPending}>
      <Wand2 className="mr-2 h-4 w-4" />
      {isPending ? "Applying..." : "Apply Recommended Defaults"}
    </Button>
  );
}
