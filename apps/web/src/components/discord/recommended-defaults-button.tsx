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

      // Map tournament_created to the best channel
      const r1 = await upsertChannelMappingAction({
        communityId,
        eventType: "tournament_created",
        channelId: primaryChannel.id,
      });
      if (!r1.success) {
        toast.error(r1.error);
        return;
      }

      // Map other events to general or announcement channel
      const fallbackId = (generalChannel ?? announcementChannel ?? primaryChannel).id;
      const r2 = await upsertChannelMappingAction({
        communityId,
        eventType: "registration_opens",
        channelId: fallbackId,
      });
      if (!r2.success) {
        toast.error(r2.error);
        return;
      }

      const r3 = await upsertChannelMappingAction({
        communityId,
        eventType: "match_result_reported",
        channelId: fallbackId,
      });
      if (!r3.success) {
        toast.error(r3.error);
        return;
      }

      // Mark setup as completed
      const r4 = await updateServerSettingsAction({
        serverId,
        communityId,
        settings: { setup_completed: true },
      });
      if (!r4.success) {
        toast.error(r4.error);
        return;
      }

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
    });
  }

  return (
    <Button variant="outline" onClick={handleApply} disabled={isPending}>
      <Wand2 className="mr-2 h-4 w-4" />
      {isPending ? "Applying..." : "Apply Recommended Defaults"}
    </Button>
  );
}
