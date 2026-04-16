"use client";

/**
 * Discord DM Preferences Section
 *
 * Renders a settings section for managing per-event Discord DM notification
 * preferences. Each of the 11 event types gets its own checkbox row, grouped
 * into three categories: match events, team sheet events, and tournament events.
 *
 * Master toggle design: visual-only. When the master switch is OFF, all
 * checkboxes are disabled (users can see the structure but not interact). The
 * master toggle does NOT write any preferences itself — it only controls
 * whether the checkboxes accept input. This keeps the mental model simple:
 * toggling the master off does not silently disable preferences in the database.
 * The user must uncheck individual boxes to actually disable events.
 */

import { useState, useTransition } from "react";
import { AlertTriangle, Bot, ExternalLink } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { type DiscordDmEventType } from "@trainers/supabase";

import { setDmPreferenceAction } from "@/actions/discord-integration";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

// =============================================================================
// Event type metadata
// =============================================================================

interface DmEventMeta {
  eventType: DiscordDmEventType;
  label: string;
  description: string;
}

const MATCH_EVENTS: DmEventMeta[] = [
  {
    eventType: "match_ready",
    label: "Match ready",
    description: "Your opponent for this round is paired",
  },
  {
    eventType: "match_starting_soon",
    label: "Match starting soon",
    description: "Reminder ~15 min before your scheduled match",
  },
  {
    eventType: "match_result_to_confirm",
    label: "Match result to confirm",
    description: "Opponent reported — confirm or dispute",
  },
  {
    eventType: "match_disputed",
    label: "Match disputed",
    description: "Conflicting results reported",
  },
];

const TEAM_SHEET_EVENTS: DmEventMeta[] = [
  {
    eventType: "team_sheet_needed",
    label: "Team sheet needed",
    description: "Submit your team before the deadline",
  },
  {
    eventType: "team_sheet_approved",
    label: "Team sheet approved",
    description: "Your submission passed review",
  },
  {
    eventType: "team_sheet_rejected",
    label: "Team sheet rejected",
    description: "Your submission needs changes",
  },
];

const TOURNAMENT_EVENTS: DmEventMeta[] = [
  {
    eventType: "you_dropped",
    label: "You dropped",
    description: "Confirmation after you drop from a tournament",
  },
  {
    eventType: "top_cut_made",
    label: "Top cut made",
    description: "You advanced to the top cut 🎉",
  },
  {
    eventType: "tournament_starting",
    label: "Tournament starting",
    description: "Round 1 is about to begin",
  },
  {
    eventType: "tournament_cancelled",
    label: "Tournament cancelled",
    description: "Organizer cancelled the event",
  },
];

// =============================================================================
// Props
// =============================================================================

export interface DiscordDmPreferencesSectionProps {
  /** Discord display handle (e.g. "myname#1234" or "myname") — null when not linked */
  discordHandle: string | null;
  /** All 11 event types with their current enabled state (default false for each) */
  initialPreferences: Record<DiscordDmEventType, boolean>;
  /**
   * users.discord_dm_warn_until timestamp.
   * When this is > now(), a privacy warning banner is shown.
   */
  discordDmWarnUntil: string | null;
}

// =============================================================================
// Sub-components
// =============================================================================

interface CategoryGroupProps {
  title: string;
  events: DmEventMeta[];
  prefs: Record<DiscordDmEventType, boolean>;
  masterEnabled: boolean;
  isPending: boolean;
  onToggle: (eventType: DiscordDmEventType, next: boolean) => void;
}

function CategoryGroup({
  title,
  events,
  prefs,
  masterEnabled,
  isPending,
  onToggle,
}: CategoryGroupProps) {
  return (
    <div className="space-y-2">
      <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
        {title}
      </p>
      <div className="bg-card divide-y rounded-lg border">
        {events.map(({ eventType, label, description }) => {
          const checked = prefs[eventType] ?? false;
          const disabled = !masterEnabled || isPending;

          return (
            <div key={eventType} className="flex items-center gap-3 px-4 py-3">
              <Checkbox
                // aria-label is required: Base UI renders the checkbox as a <span>
                // with a generated id, so a Label's htmlFor does not associate
                // correctly with the visible interactive element.
                aria-label={label}
                checked={checked}
                disabled={disabled}
                onCheckedChange={(value) => {
                  onToggle(eventType, value === true);
                }}
              />
              <div className="flex-1 space-y-0.5">
                <Label
                  className={cn(
                    "text-sm font-medium",
                    disabled && "text-muted-foreground"
                  )}
                >
                  {label}
                </Label>
                <p className="text-muted-foreground text-xs">{description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// =============================================================================
// Main component
// =============================================================================

export function DiscordDmPreferencesSection({
  discordHandle,
  initialPreferences,
  discordDmWarnUntil,
}: DiscordDmPreferencesSectionProps) {
  const [prefs, setPrefs] =
    useState<Record<DiscordDmEventType, boolean>>(initialPreferences);
  const [masterEnabled, setMasterEnabled] = useState(
    Object.values(initialPreferences).some(Boolean)
  );
  const [isPending, startTransition] = useTransition();

  const showWarn =
    discordDmWarnUntil !== null && new Date(discordDmWarnUntil) > new Date();

  function onToggle(eventType: DiscordDmEventType, next: boolean) {
    // Optimistic update
    setPrefs((p) => ({ ...p, [eventType]: next }));

    startTransition(async () => {
      const result = await setDmPreferenceAction({ eventType, enabled: next });
      if (!result.success) {
        // Rollback on failure
        setPrefs((p) => ({ ...p, [eventType]: !next }));
        toast.error(result.error ?? "Failed to save preference");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="bg-muted mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg">
            <Bot className="size-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-base font-medium">Discord direct messages</h3>
            {discordHandle ? (
              <p className="text-muted-foreground text-sm">
                Connected as{" "}
                <span className="font-medium">@{discordHandle}</span>
              </p>
            ) : (
              <p className="text-muted-foreground text-sm">
                <Link
                  href="/dashboard/settings/account"
                  className="text-primary hover:underline"
                >
                  Link Discord
                </Link>{" "}
                to receive DM notifications
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Label
            htmlFor="discord-dm-master"
            className="text-muted-foreground text-sm"
          >
            Enable
          </Label>
          <Switch
            id="discord-dm-master"
            checked={masterEnabled}
            onCheckedChange={setMasterEnabled}
            aria-label="Enable Discord DM notifications"
            disabled={!discordHandle}
          />
        </div>
      </div>

      {/* Privacy warning banner */}
      {showWarn && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertDescription>
            Your Discord DMs appear to be blocked from server members. Update
            your Discord privacy settings (Server Settings → Privacy → Allow
            direct messages from server members) to receive alerts.{" "}
            {/* External link to Discord's official DMs privacy help article — best-effort, stable URL */}
            <a
              href="https://support.discord.com/hc/en-us/articles/217916488"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 font-medium underline underline-offset-2"
            >
              Learn how
              <ExternalLink className="size-3" aria-hidden="true" />
            </a>
          </AlertDescription>
        </Alert>
      )}

      {/* Category groups */}
      <div className="space-y-5">
        <CategoryGroup
          title="Match events"
          events={MATCH_EVENTS}
          prefs={prefs}
          masterEnabled={masterEnabled}
          isPending={isPending}
          onToggle={onToggle}
        />
        <CategoryGroup
          title="Team sheet events"
          events={TEAM_SHEET_EVENTS}
          prefs={prefs}
          masterEnabled={masterEnabled}
          isPending={isPending}
          onToggle={onToggle}
        />
        <CategoryGroup
          title="Tournament events"
          events={TOURNAMENT_EVENTS}
          prefs={prefs}
          masterEnabled={masterEnabled}
          isPending={isPending}
          onToggle={onToggle}
        />
      </div>
    </div>
  );
}
