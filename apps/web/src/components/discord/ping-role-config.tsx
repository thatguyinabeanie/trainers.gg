"use client";

import { useTransition } from "react";
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

const EVENT_TYPE_LABELS: Record<string, string> = {
  tournament_created: "Tournament Created",
  registration_opens: "Registration Opens",
  registration_closing_soon: "Registration Closing Soon",
  tournament_ended: "Tournament Ended",
  match_result_reported: "Match Result",
  round_posted: "Round Posted",
  standings_posted: "Standings Posted",
  check_in_opened: "Check-in Opened",
};

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

  function handleRoleChange(mappingId: number, value: string) {
    const pingRoleId = value === "none" ? null : value;

    startTransition(async () => {
      const result = await updateChannelPingRoleAction({
        mappingId,
        pingRoleId,
        communityId,
      });
      if (!result.success) {
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
          {channelMappings.map((mapping) => (
            <div
              key={mapping.id}
              className="flex items-center justify-between gap-4"
            >
              <span className="text-sm font-medium">
                {EVENT_TYPE_LABELS[mapping.eventType] ??
                  mapping.eventType
                    .replace(/_/g, " ")
                    .replace(/\b\w/g, (c) => c.toUpperCase())}
              </span>
              <Select
                value={mapping.pingRoleId ?? "none"}
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
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
