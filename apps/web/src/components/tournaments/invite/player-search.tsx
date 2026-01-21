"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/lib/convex/api";
import type { Id } from "@trainers/backend-convex/convex/_generated/dataModel";
import type { SelectedPlayer } from "@/lib/types/tournament";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  UserPlus,
  Loader2,
  X,
  Users,
  Star,
} from "lucide-react";

interface PlayerSearchProps {
  tournamentId: Id<"tournaments">;
  selectedPlayers: SelectedPlayer[];
  onSelectPlayer: (player: SelectedPlayer) => void;
  onRemovePlayer: (playerId: Id<"profiles">) => void;
  excludePlayerIds?: Id<"profiles">[];
  maxSelections?: number;
}

interface SearchResult {
  _id: Id<"profiles">;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  tier?: string | null;
}

export function PlayerSearch({
  tournamentId: _tournamentId,
  selectedPlayers,
  onSelectPlayer,
  onRemovePlayer,
  excludePlayerIds = [],
  maxSelections,
}: PlayerSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Search for players when query is at least 2 characters
  const searchResults = useQuery(
    api.users.queries.searchByUsernamePrefix,
    searchQuery.length >= 2 ? { prefix: searchQuery } : "skip"
  );

  // Filter out already selected and excluded players
  const filteredResults = useMemo(() => {
    if (!searchResults) return [];

    const selectedIds = new Set(selectedPlayers.map((p) => p._id));
    const excludedIds = new Set(excludePlayerIds);

    return searchResults.filter(
      (player: SearchResult) =>
        !selectedIds.has(player._id) && !excludedIds.has(player._id)
    );
  }, [searchResults, selectedPlayers, excludePlayerIds]);

  const handleSelectPlayer = (player: SearchResult) => {
    if (maxSelections && selectedPlayers.length >= maxSelections) {
      return;
    }
    onSelectPlayer({
      _id: player._id,
      username: player.username,
      displayName: player.displayName,
      avatarUrl: player.avatarUrl ?? undefined,
      tier: undefined,
    });
    setSearchQuery("");
  };

  const isAtMaxSelections =
    maxSelections !== undefined && selectedPlayers.length >= maxSelections;

  return (
    <div className="space-y-4">
      {/* Selected Players */}
      {selectedPlayers.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">
              Selected Players ({selectedPlayers.length}
              {maxSelections ? `/${maxSelections}` : ""})
            </label>
            {selectedPlayers.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  selectedPlayers.forEach((p) => onRemovePlayer(p._id))
                }
                className="text-muted-foreground h-auto p-0 text-xs hover:text-red-600"
              >
                Clear all
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedPlayers.map((player) => (
              <Badge
                key={player._id}
                variant="secondary"
                className="flex items-center gap-1 py-1 pr-1 pl-2"
              >
                <Avatar className="h-4 w-4">
                  <AvatarImage src={player.avatarUrl} />
                  <AvatarFallback className="text-[8px]">
                    {player.displayName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="max-w-[100px] truncate">
                  {player.displayName}
                </span>
                {player.tier && <Star className="h-3 w-3 text-yellow-500" />}
                <button
                  onClick={() => onRemovePlayer(player._id)}
                  className="hover:bg-muted ml-1 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Search Input */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Search Players</label>
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            type="text"
            placeholder={
              isAtMaxSelections
                ? "Maximum players selected"
                : "Search by username..."
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={isAtMaxSelections}
            className="pl-9"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Search Results */}
      {searchQuery.length >= 2 && (
        <div className="rounded-md border">
          {searchResults === undefined ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
            </div>
          ) : filteredResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Users className="text-muted-foreground mb-2 h-8 w-8" />
              <p className="text-muted-foreground text-sm">
                {searchResults.length === 0
                  ? "No players found"
                  : "All matching players are already selected"}
              </p>
            </div>
          ) : (
            <ScrollArea className="max-h-[240px]">
              <div className="divide-y">
                {filteredResults.map((player: SearchResult) => (
                  <button
                    key={player._id}
                    onClick={() => handleSelectPlayer(player)}
                    disabled={isAtMaxSelections}
                    className="hover:bg-muted/50 flex w-full items-center justify-between p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={player.avatarUrl ?? undefined} />
                        <AvatarFallback>
                          {player.displayName.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">
                          {player.displayName}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          @{player.username}
                        </p>
                      </div>
                    </div>
                    <UserPlus className="text-muted-foreground h-4 w-4" />
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      )}

      {/* Helper text */}
      {searchQuery.length > 0 && searchQuery.length < 2 && (
        <p className="text-muted-foreground text-xs">
          Type at least 2 characters to search
        </p>
      )}
    </div>
  );
}
