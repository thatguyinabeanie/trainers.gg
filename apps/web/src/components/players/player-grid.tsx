"use client";

import { PlayerCard } from "./player-card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { PlayerDirectoryEntry } from "@trainers/supabase/queries";

const PAGE_SIZE = 24;

interface PlayerGridProps {
  /** Array of player entries to display */
  players: PlayerDirectoryEntry[];
  /** Total count of matching players across all pages */
  totalCount: number;
  /** Current page number (1-indexed) */
  page: number;
  /** Callback when page changes */
  onPageChange: (page: number) => void;
  /** Whether search/filter is active */
  isSearching: boolean;
}

/**
 * Grid of player cards with pagination.
 * Shows a 2-column grid of PlayerCard components.
 */
export function PlayerGrid({
  players,
  totalCount,
  page,
  onPageChange,
  isSearching,
}: PlayerGridProps) {
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  if (players.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Users className="text-muted-foreground mb-4 h-12 w-12" />
          <h3 className="mb-2 text-lg font-semibold">No players found</h3>
          <p className="text-muted-foreground text-center">
            {isSearching
              ? "Try adjusting your search or filters"
              : "Check back later for community members."}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Player grid — 2 columns */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {players.map((player) => (
          <PlayerCard
            key={player.userId}
            username={player.username}
            avatarUrl={player.avatarUrl}
            country={player.country}
            tournamentCount={player.tournamentCount}
            winRate={player.winRate}
          />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-muted-foreground text-sm">
            Showing {(page - 1) * PAGE_SIZE + 1}–
            {Math.min(page * PAGE_SIZE, totalCount)} of {totalCount} players
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={!hasPrevPage}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Previous
            </Button>
            <span className="text-muted-foreground text-sm">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={!hasNextPage}
            >
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
