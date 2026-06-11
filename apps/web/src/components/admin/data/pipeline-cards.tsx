"use client";

import { StatusBadge } from "@/components/ui/status-badge";
import type { Status } from "@/components/ui/status-badge";

export interface StageCard {
  stage: "sync" | "import" | "compile";
  title: string;
  /** import_runs status: ok | partial | error | skipped | running. */
  lastStatus: string | null;
  lastRunAt: string | null;
  /** Live progress label for the active stage, e.g. "Worlds 2024 · 214/312". */
  progress: string | null;
}

const STATUS_TO_BADGE: Record<string, Status> = {
  ok: "active",
  running: "upcoming",
  partial: "draft",
  skipped: "completed",
  error: "cancelled",
};

function relativeTime(iso: string | null): string {
  if (!iso) return "never";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

interface PipelineCardsProps {
  cards: StageCard[];
}

/** Three pipeline cards: Sync, Import, Update stats. */
export function PipelineCards({ cards }: PipelineCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {cards.map((card) => (
        <div key={card.stage} className="bg-muted/50 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">{card.title}</h3>
            <StatusBadge
              status={
                STATUS_TO_BADGE[card.lastStatus ?? "running"] ?? "completed"
              }
              label={card.lastStatus ?? "—"}
            />
          </div>
          <p className="text-muted-foreground mt-1 text-xs font-medium tracking-wide uppercase">
            Last run {relativeTime(card.lastRunAt)}
          </p>
          {card.progress ? (
            <p className="mt-2 text-sm font-medium">{card.progress}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
