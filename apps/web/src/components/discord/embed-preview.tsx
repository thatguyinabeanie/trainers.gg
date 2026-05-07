"use client";

import { Badge } from "@/components/ui/badge";

interface EmbedPreviewProps {
  embedColor?: string;
  eventType: string;
  communityName: string;
}

function getSampleMessage(eventType: string): string {
  switch (eventType) {
    case "tournament_created":
      return "🏆 **Spring Championship** registration is now open! 32 spots available. [Register now]()";
    case "tournament_started":
      return "🎮 **Spring Championship** has started! Round 1 pairings are live. Good luck trainers!";
    case "match_ready":
      return "⚔️ Your match is ready! **You** vs **Opponent** — Table 4. Please report to your station.";
    case "round_posted":
      return "📋 **Round 3** pairings have been posted. Check your matchup and get ready!";
    case "results_posted":
      return "🏅 **Spring Championship** results are in! Congratulations to all participants.";
    default:
      return `📢 New **${eventType}** notification from your community.`;
  }
}

export function EmbedPreview({
  embedColor = "#0D9488",
  eventType,
  communityName,
}: EmbedPreviewProps) {
  const message = getSampleMessage(eventType);
  const now = new Date().toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="rounded-lg bg-[#2B2D31] p-4">
      {/* Bot header */}
      <div className="mb-2 flex items-center gap-2">
        <div className="size-6 rounded-full bg-teal-600" />
        <span className="text-sm font-semibold text-white">Beanie Bot</span>
        <Badge className="h-4 rounded bg-[#5865F2] px-1 text-[10px] text-white hover:bg-[#5865F2]">
          BOT
        </Badge>
      </div>

      {/* Embed */}
      <div
        className="ml-8 rounded border-l-4 bg-[#2F3136] p-3"
        style={{ borderLeftColor: embedColor }}
      >
        <p className="text-sm text-gray-200">{message}</p>
        <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-400">
          <span>{communityName}</span>
          <span>•</span>
          <span>{now}</span>
        </div>
      </div>
    </div>
  );
}
