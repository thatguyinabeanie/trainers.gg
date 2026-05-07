"use client";

import { useState } from "react";

import Image from "next/image";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { getDiscordInstallUrlAction } from "@/actions/discord-integration";
import { Button } from "@/components/ui/button";
import { DiscordIcon } from "@/components/icons/discord-icon";

// =============================================================================
// Constants
// =============================================================================

const FEATURES = [
  {
    icon: "📢",
    title: "Channel announcements",
    description:
      "Auto-post tournament creation, registration open, and final standings to your configured channels.",
  },
  {
    icon: "💬",
    title: "Player DMs",
    description:
      "Match ready, result to confirm, team sheet status, drops — routed to each player's DMs with channel fallback.",
  },
  {
    icon: "🎭",
    title: "Role sync",
    description:
      "Staff, Member, Winner, and Currently Playing roles stay in sync automatically every 15 minutes.",
  },
] as const;

const SLASH_COMMANDS = [
  "/tournament",
  "/standings",
  "/pairings",
  "/events",
  "/player",
  "/team",
  "/leaderboard",
  "/drop",
  "/link",
  "/setchannel",
  "/unsetchannel",
  "/channels",
  "/help",
] as const;

// =============================================================================
// Types
// =============================================================================

interface InstallCardProps {
  communityId: number;
}

// =============================================================================
// Component
// =============================================================================

export function InstallCard({ communityId }: InstallCardProps) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleInstall() {
    setIsLoading(true);
    try {
      const result = await getDiscordInstallUrlAction(communityId);
      if (result.success) {
        window.location.href = result.data.url;
      } else {
        toast.error("Failed to start installation. Please try again.");
      }
    } catch {
      toast.error("Failed to start installation. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Hero card */}
      <div className="rounded-xl border border-border bg-card p-12 text-center">
        {/* Bot icon */}
        <div className="mx-auto mb-5 flex size-40 items-center justify-center rounded-3xl bg-primary/10">
          <Image
            src="/icons/beanie_logo.png"
            alt="Beanie Bot"
            width={128}
            height={128}
            className="size-32"
          />
        </div>

        <h2 className="mb-2 text-2xl font-bold tracking-tight">
          Add Beanie Bot to your Discord
        </h2>

        <p className="text-muted-foreground mx-auto mb-6 max-w-md leading-relaxed">
          Install the bot in a Discord server you manage. You&apos;ll be able to
          map tournament events to channels, sync roles, and control DM
          notifications — all from this page.
        </p>

        <Button
          onClick={handleInstall}
          disabled={isLoading}
          className={cn(
            "gap-2 bg-[#5865F2] px-6 py-3 text-white hover:bg-[#5865F2]/90",
            isLoading && "cursor-not-allowed opacity-60"
          )}
          aria-label="Add Beanie Bot to your Discord server"
        >
          <DiscordIcon className="size-4 text-white" />
          {isLoading ? "Redirecting…" : "Add to your server"}
        </Button>

        <p className="text-muted-foreground/70 mt-4 text-xs">
          Requires a Discord server where you have Manage Server permission.
        </p>
      </div>

      {/* Feature grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {FEATURES.map((feature) => (
          <div key={feature.title} className="rounded-xl border border-border bg-card p-5">
            <div className="mb-2 text-2xl">{feature.icon}</div>
            <div className="mb-1 font-semibold">
              {feature.title}
            </div>
            <div className="text-muted-foreground text-xs leading-relaxed">
              {feature.description}
            </div>
          </div>
        ))}
      </div>

      {/* Slash commands strip */}
      <div className="rounded-xl border border-border bg-card px-5 py-4">
        <div className="mb-3 font-semibold">
          Plus 13 slash commands for your members
        </div>
        <div className="flex flex-wrap gap-1.5">
          {SLASH_COMMANDS.map((cmd) => (
            <code
              key={cmd}
              className="rounded bg-muted px-2 py-0.5 text-xs text-primary"
            >
              {cmd}
            </code>
          ))}
        </div>
      </div>
    </div>
  );
}
