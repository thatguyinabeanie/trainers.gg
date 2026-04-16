"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";
import { getDiscordInstallUrlAction } from "@/actions/discord-integration";

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
      }
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

        <button
          onClick={handleInstall}
          disabled={isLoading}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-white transition-opacity",
            "bg-[#5865F2] hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
            isLoading && "cursor-not-allowed opacity-60"
          )}
          aria-label="Add Beanie Bot to your Discord server"
        >
          <DiscordIcon className="size-4 text-white" />
          {isLoading ? "Redirecting…" : "Add to your server"}
        </button>

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

// =============================================================================
// Sub-components
// =============================================================================

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 127 96"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M107.7 8.1A105.2 105.2 0 0 0 81.5 0c-1.1 2-2.4 4.7-3.3 6.8a97.4 97.4 0 0 0-29.3 0A73.9 73.9 0 0 0 45.5 0a106.1 106.1 0 0 0-26.2 8.1C2.6 32.9-2 57 0.3 80.7a107 107 0 0 0 32.2 16.2c2.6-3.5 4.9-7.2 6.9-11.1a69 69 0 0 1-10.8-5.1c.9-.7 1.8-1.4 2.7-2.1a75 75 0 0 0 64.2 0c.9.7 1.8 1.4 2.7 2.1a69 69 0 0 1-10.9 5.1c2 3.9 4.3 7.6 6.9 11.1a107 107 0 0 0 32.2-16.2c2.8-27.6-4.7-51.4-18.7-72.6zM42.4 66.4c-6.3 0-11.5-5.7-11.5-12.7 0-7 5.1-12.7 11.5-12.7 6.4 0 11.6 5.7 11.5 12.7 0 7-5.1 12.7-11.5 12.7zm42.5 0c-6.3 0-11.5-5.7-11.5-12.7 0-7 5.1-12.7 11.5-12.7 6.4 0 11.6 5.7 11.5 12.7 0 7-5.1 12.7-11.5 12.7z" />
    </svg>
  );
}
