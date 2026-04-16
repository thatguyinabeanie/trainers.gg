"use client";

import { useState } from "react";
import { X } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function DiscordNotificationsInfoBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <Alert className="border-primary/20 bg-primary/5 mb-4 flex items-start gap-3">
      <span className="text-xl leading-none">🤖</span>
      <AlertDescription className="flex-1">
        Discord notifications are configured for this community — announcements
        will auto-post to mapped channels.
      </AlertDescription>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="-m-1 size-7"
      >
        <X className="size-4" />
      </Button>
    </Alert>
  );
}
