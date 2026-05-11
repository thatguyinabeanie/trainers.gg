"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Standing {
  id: number;
  placement: number;
  record_wins: number;
  record_losses: number;
  record_ties: number;
  drop_round: number | null;
  player: {
    id: number;
    username: string;
    display_name: string | null;
    country: string | null;
  };
  team_pokemon: {
    position: number;
    species: string;
    ability: string | null;
    held_item: string | null;
    tera_type: string | null;
    moves: string[] | null;
  }[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StandingsTable({
  standings,
}: {
  // Accept the raw Supabase query shape — cast in parent
  standings: unknown[];
}) {
  const rows = standings as Standing[];
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  function toggleExpand(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">#</TableHead>
          <TableHead>Player</TableHead>
          <TableHead className="w-24">Record</TableHead>
          <TableHead className="w-16">Team</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((s) => {
          const isExpanded = expanded.has(s.id);
          const hasTeam = s.team_pokemon && s.team_pokemon.length > 0;
          const player = s.player;

          return (
            <StandingRow
              key={s.id}
              standing={s}
              player={player}
              hasTeam={hasTeam}
              isExpanded={isExpanded}
              onToggle={() => toggleExpand(s.id)}
            />
          );
        })}
      </TableBody>
    </Table>
  );
}

// ---------------------------------------------------------------------------
// Standing row (extracted to avoid fragment key issues)
// ---------------------------------------------------------------------------

function StandingRow({
  standing: s,
  player,
  hasTeam,
  isExpanded,
  onToggle,
}: {
  standing: Standing;
  player: Standing["player"];
  hasTeam: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <TableRow
        className={hasTeam ? "cursor-pointer" : undefined}
        onClick={() => hasTeam && onToggle()}
      >
        <TableCell className="font-mono text-sm font-medium">
          {s.placement}
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            {player.country && (
              <span className="text-xs" title={player.country}>
                {countryFlag(player.country)}
              </span>
            )}
            <div>
              <div className="text-sm font-medium">
                {player.display_name ?? player.username}
              </div>
              {player.display_name && (
                <div className="text-muted-foreground text-xs">
                  {player.username}
                </div>
              )}
            </div>
          </div>
        </TableCell>
        <TableCell className="font-mono text-sm">
          {s.record_wins}-{s.record_losses}
          {s.record_ties > 0 ? `-${s.record_ties}` : ""}
          {s.drop_round != null && (
            <span className="text-muted-foreground ml-1 text-xs">
              (drop R{s.drop_round})
            </span>
          )}
        </TableCell>
        <TableCell>
          {hasTeam ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={(e) => {
                e.stopPropagation();
                onToggle();
              }}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          ) : (
            <span className="text-muted-foreground text-xs">—</span>
          )}
        </TableCell>
      </TableRow>

      {/* Expanded team details */}
      {isExpanded && hasTeam && (
        <TableRow>
          <TableCell colSpan={4} className="bg-muted/50 p-0">
            <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3 lg:grid-cols-6">
              {[...s.team_pokemon]
                .sort((a, b) => a.position - b.position)
                .map((mon) => (
                  <div
                    key={mon.position}
                    className="bg-background rounded-md p-2 text-xs"
                  >
                    <div className="font-medium capitalize">{mon.species}</div>
                    {mon.tera_type && (
                      <div className="text-muted-foreground">
                        Tera: {mon.tera_type}
                      </div>
                    )}
                    {mon.ability && (
                      <div className="text-muted-foreground">{mon.ability}</div>
                    )}
                    {mon.held_item && (
                      <div className="text-muted-foreground">
                        {mon.held_item}
                      </div>
                    )}
                    {mon.moves && mon.moves.length > 0 && (
                      <div className="text-muted-foreground mt-1">
                        {mon.moves.join(", ")}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert an ISO alpha-2 country code to a flag emoji. */
function countryFlag(code: string): string {
  return code
    .toUpperCase()
    .split("")
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("");
}
