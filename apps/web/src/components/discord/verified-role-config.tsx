"use client";

import { useState, useTransition } from "react";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { updateVerifiedRoleAction } from "@/actions/discord-integration";

interface GuildRole {
  id: string;
  name: string;
  color: number;
}

interface VerifiedRoleConfigProps {
  currentRoleId: string | null;
  guildRoles: GuildRole[];
  serverId: number;
  communityId: number;
  enabled: boolean;
}

export function VerifiedRoleConfig({
  currentRoleId,
  guildRoles,
  serverId,
  communityId,
  enabled: initialEnabled,
}: VerifiedRoleConfigProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [roleId, setRoleId] = useState(currentRoleId);
  const [isPending, startTransition] = useTransition();

  function handleToggle(checked: boolean) {
    setEnabled(checked);

    // When enabling with no role selected, just show the Select locally.
    // The server persist will happen when a role is chosen via handleRoleChange.
    if (checked && !roleId) return;

    startTransition(async () => {
      const result = await updateVerifiedRoleAction({
        serverId,
        communityId,
        enabled: checked,
        roleId,
      });
      if (!result.success) {
        setEnabled(!checked);
        toast.error(result.error ?? "An error occurred");
        return;
      }
      toast.success(
        checked ? "Verified role enabled." : "Verified role disabled."
      );
    });
  }

  function handleRoleChange(value: string | null) {
    if (!value) return;
    const newRoleId = value === "none" ? null : value;
    const newEnabled = newRoleId === null ? false : enabled;
    setRoleId(newRoleId);
    if (!newEnabled) setEnabled(false);

    startTransition(async () => {
      const result = await updateVerifiedRoleAction({
        serverId,
        communityId,
        enabled: newEnabled,
        roleId: newRoleId,
      });
      if (!result.success) {
        setRoleId(roleId);
        if (!newEnabled) setEnabled(enabled);
        toast.error(result.error ?? "An error occurred");
        return;
      }
      toast.success(
        newRoleId ? "Verified role updated." : "Verified role disabled."
      );
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          Account Verification
        </CardTitle>
        <p className="text-muted-foreground text-sm">
          Automatically assign a Discord role when members link their
          trainers.gg account
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="verified-role-toggle" className="text-sm font-medium">
            Enable verified role
          </Label>
          <Switch
            id="verified-role-toggle"
            checked={enabled}
            onCheckedChange={handleToggle}
            disabled={isPending}
          />
        </div>

        {enabled && (
          <>
            <Select
              value={roleId ?? "none"}
              onValueChange={handleRoleChange}
              disabled={isPending}
            >
              <SelectTrigger>
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

            <p className="text-muted-foreground text-xs">
              Members who run /link and connect their account will receive this
              role automatically.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
