"use client";

import { useEffect, useId, useRef, useTransition, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bot } from "lucide-react";
import { toast } from "sonner";
import {
  upsertChannelMappingAction,
  deleteChannelMappingAction,
  upsertDmSettingAction,
  deleteDmSettingAction,
  updateServerSettingsAction,
} from "@/actions/discord-integration";

interface GuildChannel {
  id: string;
  name: string;
  type: number;
}

interface TournamentAutomationSettingsProps {
  serverId: number;
  communityId: number;
  guildChannels: GuildChannel[];
  settings: {
    roundPostedChannel: string | null;
    roundPostedMappingId: number | null;
    standingsChannel: string | null;
    standingsMappingId: number | null;
    registrationReminderChannel: string | null;
    registrationReminderMappingId: number | null;
    registrationReminderMinutes: number | null;
    checkInReminderEnabled: boolean;
  };
}

export function TournamentAutomationSettings({
  serverId,
  communityId,
  guildChannels,
  settings,
}: TournamentAutomationSettingsProps) {
  const [isPending, startTransition] = useTransition();
  const roundPostedId = useId();
  const standingsId = useId();
  const registrationReminderId = useId();
  const checkInReminderId = useId();

  const [roundPostedEnabled, setRoundPostedEnabled] = useState(
    !!settings.roundPostedChannel
  );
  const [roundPostedChannel, setRoundPostedChannel] = useState(
    settings.roundPostedChannel ?? ""
  );

  const [standingsEnabled, setStandingsEnabled] = useState(
    !!settings.standingsChannel
  );
  const [standingsChannel, setStandingsChannel] = useState(
    settings.standingsChannel ?? ""
  );

  const [registrationReminderEnabled, setRegistrationReminderEnabled] =
    useState(
      settings.registrationReminderMinutes !== null &&
        !!settings.registrationReminderChannel
    );
  const [registrationReminderMinutes, setRegistrationReminderMinutes] =
    useState(settings.registrationReminderMinutes ?? 60);
  const [registrationReminderChannel, setRegistrationReminderChannel] =
    useState(settings.registrationReminderChannel ?? "");

  const [checkInReminderEnabled, setCheckInReminderEnabled] = useState(
    settings.checkInReminderEnabled
  );

  // Track mapping IDs locally so toggle-off can delete even before revalidation
  const [roundPostedMappingId, setRoundPostedMappingId] = useState<
    number | null
  >(settings.roundPostedMappingId);
  const [standingsMappingId, setStandingsMappingId] = useState<number | null>(
    settings.standingsMappingId
  );
  const [registrationReminderMappingId, setRegistrationReminderMappingId] =
    useState<number | null>(settings.registrationReminderMappingId);

  // Sync local state when settings prop changes (e.g., after router.refresh())
  const prevSettingsRef = useRef(settings);
  useEffect(() => {
    if (prevSettingsRef.current !== settings) {
      prevSettingsRef.current = settings;
      setRoundPostedEnabled(!!settings.roundPostedChannel);
      setRoundPostedChannel(settings.roundPostedChannel ?? "");
      setStandingsEnabled(!!settings.standingsChannel);
      setStandingsChannel(settings.standingsChannel ?? "");
      setRegistrationReminderEnabled(
        settings.registrationReminderMinutes !== null &&
          !!settings.registrationReminderChannel
      );
      setRegistrationReminderMinutes(settings.registrationReminderMinutes ?? 60);
      setRegistrationReminderChannel(settings.registrationReminderChannel ?? "");
      setCheckInReminderEnabled(settings.checkInReminderEnabled);
      setRoundPostedMappingId(settings.roundPostedMappingId);
      setStandingsMappingId(settings.standingsMappingId);
      setRegistrationReminderMappingId(settings.registrationReminderMappingId);
    }
  }, [settings]);

  // Only show text channels (type === 0)
  const textChannels = guildChannels.filter((c) => c.type === 0);

  function handleChannelMapping(
    channelId: string,
    eventType: Parameters<typeof upsertChannelMappingAction>[0]["eventType"],
    onMappingId?: (id: number) => void,
    onRollback?: () => void
  ) {
    startTransition(async () => {
      const result = await upsertChannelMappingAction({
        communityId,
        channelId,
        eventType,
      });
      if (!result.success) {
        onRollback?.();
        toast.error(result.error ?? "An error occurred");
      } else {
        onMappingId?.(result.data.mappingId);
        toast.success("Channel mapping saved");
      }
    });
  }

  function handleDmSetting(enabled: boolean) {
    setCheckInReminderEnabled(enabled);
    if (!enabled) {
      startTransition(async () => {
        const result = await deleteDmSettingAction({
          communityId,
          eventType: "check_in_reminder",
        });
        if (!result.success) {
          setCheckInReminderEnabled(true); // rollback
          toast.error(result.error ?? "An error occurred");
        }
      });
      return;
    }
    startTransition(async () => {
      const result = await upsertDmSettingAction({
        communityId,
        eventType: "check_in_reminder",
        deliveryMode: "dm_only",
      });
      if (!result.success) {
        setCheckInReminderEnabled(false); // rollback
        toast.error(result.error ?? "An error occurred");
      } else {
        toast.success("DM reminders enabled");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="size-5" />
          Tournament Automation
        </CardTitle>
        <CardDescription>
          Automatically post updates during tournament lifecycle.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Round Posted Announcements */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Switch
              id={roundPostedId}
              checked={roundPostedEnabled}
              onCheckedChange={(checked) => {
                if (!checked) {
                  const prevChannel = roundPostedChannel;
                  setRoundPostedEnabled(false);
                  setRoundPostedChannel("");
                  if (roundPostedMappingId) {
                    startTransition(async () => {
                      const result = await deleteChannelMappingAction(roundPostedMappingId);
                      if (!result.success) {
                        // Rollback on failure
                        setRoundPostedEnabled(true);
                        setRoundPostedChannel(prevChannel);
                        toast.error(result.error ?? "An error occurred");
                      } else {
                        setRoundPostedMappingId(null);
                      }
                    });
                  }
                } else {
                  setRoundPostedEnabled(true);
                }
              }}
              disabled={isPending}
            />
            <Label htmlFor={roundPostedId} className="font-medium">Round Posted Announcements</Label>
          </div>
          <p className="text-muted-foreground ml-11 text-sm">
            Auto-post a message when new round pairings are published
          </p>
          {roundPostedEnabled && (
            <div className="ml-11">
              <Select
                value={roundPostedChannel}
                onValueChange={(value) => {
                  if (!value) return;
                  const prevChannel = roundPostedChannel;
                  setRoundPostedChannel(value);
                  handleChannelMapping(value, "round_posted", (id) =>
                    setRoundPostedMappingId(id),
                    () => setRoundPostedChannel(prevChannel)
                  );
                }}
                disabled={isPending}
              >
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select channel" />
                </SelectTrigger>
                <SelectContent>
                  {textChannels.map((channel) => (
                    <SelectItem key={channel.id} value={channel.id}>
                      # {channel.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Standings Auto-Post */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Switch
              id={standingsId}
              checked={standingsEnabled}
              onCheckedChange={(checked) => {
                if (!checked) {
                  const prevChannel = standingsChannel;
                  setStandingsEnabled(false);
                  setStandingsChannel("");
                  if (standingsMappingId) {
                    startTransition(async () => {
                      const result = await deleteChannelMappingAction(standingsMappingId);
                      if (!result.success) {
                        // Rollback on failure
                        setStandingsEnabled(true);
                        setStandingsChannel(prevChannel);
                        toast.error(result.error ?? "An error occurred");
                      } else {
                        setStandingsMappingId(null);
                      }
                    });
                  }
                } else {
                  setStandingsEnabled(true);
                }
              }}
              disabled={isPending}
            />
            <Label htmlFor={standingsId} className="font-medium">Standings Auto-Post</Label>
          </div>
          <p className="text-muted-foreground ml-11 text-sm">
            Post top standings after each round completes
          </p>
          {standingsEnabled && (
            <div className="ml-11">
              <Select
                value={standingsChannel}
                onValueChange={(value) => {
                  if (!value) return;
                  const prevChannel = standingsChannel;
                  setStandingsChannel(value);
                  handleChannelMapping(value, "standings_posted", (id) =>
                    setStandingsMappingId(id),
                    () => setStandingsChannel(prevChannel)
                  );
                }}
                disabled={isPending}
              >
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select channel" />
                </SelectTrigger>
                <SelectContent>
                  {textChannels.map((channel) => (
                    <SelectItem key={channel.id} value={channel.id}>
                      # {channel.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Registration Closing Reminder */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Switch
              id={registrationReminderId}
              checked={registrationReminderEnabled}
              onCheckedChange={(checked) => {
                if (!checked) {
                  const prevChannel = registrationReminderChannel;
                  setRegistrationReminderEnabled(false);
                  // Persist the disable: delete mapping first, then clear minutes
                  startTransition(async () => {
                    if (registrationReminderMappingId) {
                      const deleteResult = await deleteChannelMappingAction(registrationReminderMappingId);
                      if (!deleteResult.success) {
                        // Rollback: re-enable since mapping still exists
                        setRegistrationReminderEnabled(true);
                        setRegistrationReminderChannel(prevChannel);
                        toast.error(deleteResult.error ?? "An error occurred");
                        return;
                      }
                      setRegistrationReminderMappingId(null);
                    }
                    const settingsResult = await updateServerSettingsAction({
                      serverId,
                      communityId,
                      settings: { registration_reminder_minutes: null },
                    });
                    if (!settingsResult.success) {
                      // Mapping already deleted — surface error but don't re-enable
                      toast.error(settingsResult.error ?? "An error occurred");
                    } else {
                      toast.success("Registration reminder disabled");
                    }
                    setRegistrationReminderChannel("");
                  });
                } else {
                  setRegistrationReminderEnabled(true);
                }
              }}
              disabled={isPending}
            />
            <Label htmlFor={registrationReminderId} className="font-medium">Registration Closing Reminder</Label>
          </div>
          <p className="text-muted-foreground ml-11 text-sm">
            Post a reminder before registration closes
          </p>
          {registrationReminderEnabled && (
            <div className="ml-11 space-y-2">
              <Select
                value={registrationReminderChannel}
                onValueChange={(value) => {
                  if (!value) return;
                  const prevChannel = registrationReminderChannel;
                  setRegistrationReminderChannel(value);
                  handleChannelMapping(
                    value,
                    "registration_closing_soon",
                    (id) => setRegistrationReminderMappingId(id),
                    () => setRegistrationReminderChannel(prevChannel)
                  );
                }}
                disabled={isPending}
              >
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select channel" />
                </SelectTrigger>
                <SelectContent>
                  {textChannels.map((channel) => (
                    <SelectItem key={channel.id} value={channel.id}>
                      # {channel.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  value={registrationReminderMinutes}
                  onChange={(e) => {
                    const parsed = parseInt(e.target.value, 10);
                    if (!Number.isNaN(parsed) && parsed > 0) {
                      setRegistrationReminderMinutes(parsed);
                    } else if (e.target.value === "") {
                      // Allow clearing the field temporarily (will revert on blur)
                      setRegistrationReminderMinutes(0);
                    }
                  }}
                  onBlur={() => {
                    // Guard: only persist valid positive integers
                    if (registrationReminderMinutes <= 0) {
                      setRegistrationReminderMinutes(
                        settings.registrationReminderMinutes ?? 60
                      );
                      return;
                    }
                    startTransition(async () => {
                      const result = await updateServerSettingsAction({
                        serverId,
                        communityId,
                        settings: {
                          registration_reminder_minutes:
                            registrationReminderMinutes,
                        },
                      });
                      if (!result.success) {
                        toast.error(result.error ?? "An error occurred");
                      }
                    });
                  }}
                  className="w-20"
                  disabled={isPending}
                />
                <span className="text-muted-foreground text-sm">
                  minutes before close
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Check-in Reminder DMs */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Switch
              id={checkInReminderId}
              checked={checkInReminderEnabled}
              onCheckedChange={(checked) => {
                handleDmSetting(checked);
              }}
              disabled={isPending}
            />
            <Label htmlFor={checkInReminderId} className="font-medium">Check-in Reminder DMs</Label>
          </div>
          <p className="text-muted-foreground ml-11 text-sm">
            DM registered players when check-in opens for their tournament
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
