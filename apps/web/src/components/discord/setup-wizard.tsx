"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  updateServerSettingsAction,
  upsertChannelMappingAction,
  upsertRoleMappingAction,
} from "@/actions/discord-integration";

interface SetupWizardProps {
  serverId: number;
  communityId: number;
  communityName: string;
  guildChannels: Array<{ id: string; name: string; type: number }>;
  guildRoles: Array<{ id: string; name: string; color: number }>;
  onComplete: () => void;
}

interface ChannelMapping {
  tournamentAnnouncements: string;
  registrationUpdates: string;
  matchResults: string;
}

interface RoleMapping {
  participant: { enabled: boolean; roleId: string };
  winner: { enabled: boolean; roleId: string };
  verified: { enabled: boolean; roleId: string };
}

function findChannelByKeywords(
  channels: Array<{ id: string; name: string; type: number }>,
  keywords: string[]
): string {
  const textChannels = channels.filter((c) => c.type === 0);
  const match = textChannels.find((c) =>
    keywords.some((k) => c.name.toLowerCase().includes(k))
  );
  return match?.id ?? "";
}

export function SetupWizard({
  serverId,
  communityId,
  communityName,
  guildChannels,
  guildRoles,
  onComplete,
}: SetupWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPending, startTransition] = useTransition();

  const textChannels = guildChannels.filter((c) => c.type === 0);

  const [channels, setChannels] = useState<ChannelMapping>(() => ({
    tournamentAnnouncements: findChannelByKeywords(guildChannels, [
      "tournament",
      "announce",
      "events",
    ]),
    registrationUpdates: findChannelByKeywords(guildChannels, [
      "tournament",
      "announce",
      "events",
    ]),
    matchResults: findChannelByKeywords(guildChannels, [
      "tournament",
      "announce",
      "events",
    ]),
  }));

  const [roles, setRoles] = useState<RoleMapping>({
    participant: { enabled: false, roleId: "" },
    winner: { enabled: false, roleId: "" },
    verified: { enabled: false, roleId: "" },
  });

  function handleFinish() {
    startTransition(async () => {
      const errors: string[] = [];

      // Apply channel mappings
      if (channels.tournamentAnnouncements) {
        const r = await upsertChannelMappingAction({
          communityId,
          eventType: "tournament_created",
          channelId: channels.tournamentAnnouncements,
        });
        if (!r.success) errors.push(r.error);
      }
      if (channels.registrationUpdates) {
        const r = await upsertChannelMappingAction({
          communityId,
          eventType: "registration_opens",
          channelId: channels.registrationUpdates,
        });
        if (!r.success) errors.push(r.error);
      }
      if (channels.matchResults) {
        const r = await upsertChannelMappingAction({
          communityId,
          eventType: "match_result_reported",
          channelId: channels.matchResults,
        });
        if (!r.success) errors.push(r.error);
      }

      // Apply role mappings
      if (roles.participant.enabled && roles.participant.roleId) {
        const r = await upsertRoleMappingAction({
          communityId,
          roleType: "participant",
          discordRoleId: roles.participant.roleId,
        });
        if (!r.success) errors.push(r.error);
      }
      if (roles.winner.enabled && roles.winner.roleId) {
        const r = await upsertRoleMappingAction({
          communityId,
          roleType: "winner",
          discordRoleId: roles.winner.roleId,
        });
        if (!r.success) errors.push(r.error);
      }
      if (roles.verified.enabled && roles.verified.roleId) {
        const r = await upsertRoleMappingAction({
          communityId,
          roleType: "verified",
          discordRoleId: roles.verified.roleId,
        });
        if (!r.success) errors.push(r.error);
      }

      if (errors.length > 0) {
        toast.error(errors[0]);
        return;
      }

      // Mark setup as completed only if no errors
      const settingsResult = await updateServerSettingsAction({
        serverId,
        communityId,
        settings: { setup_completed: true },
      });
      if (!settingsResult.success) {
        toast.error(settingsResult.error);
        return;
      }

      toast.success("Setup complete! Your Discord integration is ready.");
      onComplete();
    });
  }

  function handleSkip() {
    startTransition(async () => {
      const result = await updateServerSettingsAction({
        serverId,
        communityId,
        settings: { setup_completed: true },
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      onComplete();
    });
  }

  const steps = ["Notifications", "Roles", "Confirm"];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Set up Discord for {communityName}</CardTitle>
        <CardDescription>
          Configure how Beanie Bot integrates with your server
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-0">
          {steps.map((label, i) => (
            <div key={label} className="flex items-center">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium",
                    i <= currentStep
                      ? "bg-teal-600 text-white"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {i < currentStep ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                <span className="text-muted-foreground text-xs">{label}</span>
              </div>
              {i < steps.length - 1 && (
                <div
                  className={cn(
                    "mx-2 mb-5 h-0.5 w-12",
                    i < currentStep ? "bg-teal-600" : "bg-muted"
                  )}
                />
              )}
            </div>
          ))}
        </div>

        <Separator />

        {/* Step 1: Notifications */}
        {currentStep === 0 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">
                Where should Beanie Bot post?
              </h3>
              <p className="text-muted-foreground text-sm">
                Choose channels for tournament announcements
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-medium">
                  Tournament announcements
                </span>
                <Select
                  value={channels.tournamentAnnouncements}
                  onValueChange={(v) => {
                    if (v)
                      setChannels((s) => ({
                        ...s,
                        tournamentAnnouncements: v,
                      }));
                  }}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select channel" />
                  </SelectTrigger>
                  <SelectContent>
                    {textChannels.map((ch) => (
                      <SelectItem key={ch.id} value={ch.id}>
                        #{ch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-medium">
                  Registration updates
                </span>
                <Select
                  value={channels.registrationUpdates}
                  onValueChange={(v) => {
                    if (v)
                      setChannels((s) => ({ ...s, registrationUpdates: v }));
                  }}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select channel" />
                  </SelectTrigger>
                  <SelectContent>
                    {textChannels.map((ch) => (
                      <SelectItem key={ch.id} value={ch.id}>
                        #{ch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-medium">Match results</span>
                <Select
                  value={channels.matchResults}
                  onValueChange={(v) => {
                    if (v) setChannels((s) => ({ ...s, matchResults: v }));
                  }}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select channel" />
                  </SelectTrigger>
                  <SelectContent>
                    {textChannels.map((ch) => (
                      <SelectItem key={ch.id} value={ch.id}>
                        #{ch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => setCurrentStep(1)}>Next</Button>
            </div>
          </div>
        )}

        {/* Step 2: Roles */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Role Sync</h3>
              <p className="text-muted-foreground text-sm">
                Assign Discord roles based on trainers.gg status
              </p>
            </div>

            <div className="space-y-4">
              {(
                [
                  {
                    key: "participant" as const,
                    label: "Participant (active tournament)",
                  },
                  { key: "winner" as const, label: "Winner" },
                  {
                    key: "verified" as const,
                    label: "Verified (linked account)",
                  },
                ] as const
              ).map(({ key, label }) => (
                <div
                  key={key}
                  className="flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <Switch
                      id={`role-sync-${key}`}
                      checked={roles[key].enabled}
                      onCheckedChange={(checked) =>
                        setRoles((s) => ({
                          ...s,
                          [key]: { ...s[key], enabled: checked },
                        }))
                      }
                    />
                    <Label htmlFor={`role-sync-${key}`} className="text-sm font-medium">{label}</Label>
                  </div>
                  <Select
                    value={roles[key].roleId}
                    onValueChange={(v) => {
                      if (v)
                        setRoles((s) => ({
                          ...s,
                          [key]: { ...s[key], roleId: v },
                        }));
                    }}
                    disabled={!roles[key].enabled}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
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

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep(0)}>
                Back
              </Button>
              <Button onClick={() => setCurrentStep(2)}>Next</Button>
            </div>
          </div>
        )}

        {/* Step 3: Confirm */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">You&apos;re all set!</h3>
              <p className="text-muted-foreground text-sm">
                Here&apos;s a summary of your configuration
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Notifications</p>
              <div className="flex flex-wrap gap-2">
                {channels.tournamentAnnouncements && (
                  <Badge variant="secondary">
                    Announcements → #
                    {
                      textChannels.find(
                        (c) => c.id === channels.tournamentAnnouncements
                      )?.name
                    }
                  </Badge>
                )}
                {channels.registrationUpdates && (
                  <Badge variant="secondary">
                    Registration → #
                    {
                      textChannels.find(
                        (c) => c.id === channels.registrationUpdates
                      )?.name
                    }
                  </Badge>
                )}
                {channels.matchResults && (
                  <Badge variant="secondary">
                    Results → #
                    {
                      textChannels.find((c) => c.id === channels.matchResults)
                        ?.name
                    }
                  </Badge>
                )}
              </div>

              <Separator className="my-3" />

              <p className="text-sm font-medium">Role Sync</p>
              <div className="flex flex-wrap gap-2">
                {roles.participant.enabled && roles.participant.roleId && (
                  <Badge variant="secondary">
                    Participant →{" "}
                    {
                      guildRoles.find((r) => r.id === roles.participant.roleId)
                        ?.name
                    }
                  </Badge>
                )}
                {roles.winner.enabled && roles.winner.roleId && (
                  <Badge variant="secondary">
                    Winner →{" "}
                    {guildRoles.find((r) => r.id === roles.winner.roleId)?.name}
                  </Badge>
                )}
                {roles.verified.enabled && roles.verified.roleId && (
                  <Badge variant="secondary">
                    Verified →{" "}
                    {
                      guildRoles.find((r) => r.id === roles.verified.roleId)
                        ?.name
                    }
                  </Badge>
                )}
                {!roles.participant.enabled &&
                  !roles.winner.enabled &&
                  !roles.verified.enabled && (
                    <span className="text-muted-foreground text-sm">
                      No roles configured
                    </span>
                  )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={() => setCurrentStep(1)}>
                Back
              </Button>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground text-sm underline"
                  onClick={handleSkip}
                  disabled={isPending}
                >
                  Skip for now
                </button>
                <Button onClick={handleFinish} disabled={isPending}>
                  {isPending ? "Saving..." : "Finish Setup"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
