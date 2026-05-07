"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateChannelPingRoleAction } from "@/actions/discord-integration";
import { getEventLabel } from "@/components/discord/channel-mapping-shared";

interface ChannelMapping {
  id: number;
  eventType: string;
  channelId: string;
  pingRoleId: string | null;
}

interface GuildRole {
  id: string;
  name: string;
  color: number;
}

interface PingRoleConfigProps {
  channelMappings: ChannelMapping[];
  guildRoles: GuildRole[];
  communityId: number;
}

export function PingRoleConfig({
  channelMappings,
  guildRoles,
  communityId,
}: PingRoleConfigProps) {
  const [isPending, startTransition] = useTransition();
  // Optimistic state: track local overrides for role selections
  const [optimisticRoles, setOptimisticRoles] = useState<
    Record<number, string | null>
  >({});

  function handleRoleChange(mappingId: number, value: string) {
    const pingRoleId = value === "none" ? null : value;

    // Optimistically update the displayed value
    setOptimisticRoles((prev) => ({ ...prev, [mappingId]: pingRoleId }));

    startTransition(async () => {
      const result = await updateChannelPingRoleAction({
        mappingId,
        pingRoleId,
        communityId,
      });
      if (!result.success) {
        // Revert optimistic update on failure
        setOptimisticRoles((prev) => {
          const next = { ...prev };
          delete next[mappingId];
          return next;
        });
        toast.error(result.error ?? "Failed to update ping role.");
        return;
      }
      toast.success("Ping role updated.");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Role Pings</CardTitle>
        <p className="text-muted-foreground text-sm">
          Optionally @mention a Discord role when notifications fire.
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {channelMappings.map((mapping) => {
            // Use optimistic value if available, otherwise prop value
            const currentRoleId =
              mapping.id in optimisticRoles
                ? optimisticRoles[mapping.id]
                : mapping.pingRoleId;

            return (
              <div
                key={mapping.id}
                className="flex items-center justify-between gap-4"
              >
                <span className="text-sm font-medium">
                  {getEventLabel(mapping.eventType)}
                </span>
                <Select
                  value={currentRoleId ?? "none"}
                  onValueChange={(value) => {
                    if (value) handleRoleChange(mapping.id, value);
                  }}
                  disabled={isPending}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {guildRoles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
