"use client";

import { useState } from "react";

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
      <div className="rounded-xl border bg-white p-12 text-center">
        {/* Bot icon */}
        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[#e6f4f1] to-[#cfe9e4] text-4xl">
          🤖
        </div>

        <h2 className="mb-2 text-2xl font-bold tracking-tight text-gray-900">
          Add Beanie Bot to your Discord
        </h2>

        <p className="mx-auto mb-6 max-w-md leading-relaxed text-gray-500">
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

        <p className="mt-4 text-xs text-gray-400">
          Requires a Discord server where you have Manage Server permission.
        </p>
      </div>

      {/* Feature grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {FEATURES.map((feature) => (
          <div key={feature.title} className="rounded-lg border bg-white p-5">
            <div className="mb-2 text-2xl">{feature.icon}</div>
            <div className="mb-1 font-semibold text-gray-900">
              {feature.title}
            </div>
            <div className="text-xs leading-relaxed text-gray-500">
              {feature.description}
            </div>
          </div>
        ))}
      </div>

      {/* Slash commands strip */}
      <div className="rounded-lg border bg-white px-5 py-4">
        <div className="mb-3 font-semibold text-gray-900">
          Plus 13 slash commands for your members
        </div>
        <div className="flex flex-wrap gap-1.5">
          {SLASH_COMMANDS.map((cmd) => (
            <code
              key={cmd}
              className="rounded bg-gray-100 px-2 py-0.5 text-xs text-teal-700"
            >
              {cmd}
            </code>
          ))}
        </div>
      </div>
    </div>
  );
}
