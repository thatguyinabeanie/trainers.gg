"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { DiscordIcon } from "@/components/icons/discord-icon";
import { setShowDiscordPubliclyAction } from "@/actions/discord-integration";

interface DiscordProfilePrivacyRowProps {
  initialEnabled: boolean;
}

export function DiscordProfilePrivacyRow({
  initialEnabled,
}: DiscordProfilePrivacyRowProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [pending, startTransition] = useTransition();

  function onToggle(next: boolean) {
    // Optimistic update
    setEnabled(next);
    startTransition(async () => {
      try {
        const result = await setShowDiscordPubliclyAction(next);
        if (!result.success) {
          // Rollback on failure
          setEnabled(!next);
          toast.error(result.error);
          return;
        }
        toast.success(
          next
            ? "Discord handle will show on your profile"
            : "Discord handle hidden"
        );
      } catch (error) {
        // Server Action threw (network error, unexpected server error) — the
        // {success:false} path above only handles returned failures. Rollback
        // optimistic state and surface a fallback toast so the switch never
        // gets stuck in the wrong position without feedback.
        setEnabled(!next);
        toast.error("Something went wrong. Please try again.");
        console.error("[DiscordProfilePrivacyRow] Toggle failed:", error);
      }
    });
  }

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-start gap-3">
        <DiscordIcon className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
        <div className="space-y-0.5">
          <Label
            htmlFor="show-discord-publicly"
            className="text-sm font-medium"
          >
            Show Discord handle on profile
          </Label>
          <p className="text-muted-foreground text-xs">
            Your public profile will show your Discord username next to your
            display name. Default: off.
          </p>
        </div>
      </div>
      <Switch
        id="show-discord-publicly"
        aria-label="Show Discord handle on profile"
        checked={enabled}
        onCheckedChange={onToggle}
        disabled={pending}
      />
    </div>
  );
}
