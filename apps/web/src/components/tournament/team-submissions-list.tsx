"use client";

import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { PokemonSprite } from "./pokemon-sprite";
import { TeamPreview } from "./team-preview";
import { cn } from "@/lib/utils";

interface TeamSubmissionPokemon {
  species: string;
  nickname?: string | null;
  held_item?: string | null;
  ability?: string;
  tera_type?: string | null;
}

interface TeamSubmissionData {
  altId: number;
  playerName: string;
  teamName: string | null;
  pokemon: TeamSubmissionPokemon[];
}

interface TeamSubmissionsListProps {
  teams: TeamSubmissionData[];
}

export function TeamSubmissionsList({ teams }: TeamSubmissionsListProps) {
  if (teams.length === 0) return null;

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Team Submissions</h2>
        <span className="text-muted-foreground text-sm">
          {teams.length} {teams.length === 1 ? "team" : "teams"}
        </span>
      </div>
      <div className="bg-card rounded-xl">
        <Accordion>
          {teams.map((team) => (
            <AccordionItem
              key={team.altId}
              value={String(team.altId)}
              className={cn("px-4")}
            >
              <AccordionTrigger className="hover:no-underline">
                <div className="flex w-full items-center gap-3">
                  <span className="min-w-0 flex-shrink truncate text-left text-sm font-medium">
                    {team.playerName}
                  </span>
                  <div className="flex shrink-0 items-center gap-0.5">
                    {team.pokemon.slice(0, 6).map((mon, i) => (
                      <Tooltip key={i}>
                        <TooltipTrigger className="cursor-default">
                          <PokemonSprite species={mon.species} size={28} />
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          <div className="space-y-0.5">
                            <div className="font-medium">{mon.species}</div>
                            {mon.held_item && (
                              <div className="text-muted">{mon.held_item}</div>
                            )}
                            {mon.tera_type && <div>Tera: {mon.tera_type}</div>}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="pb-2">
                  {team.teamName && (
                    <p className="text-muted-foreground mb-2 text-xs">
                      {team.teamName}
                    </p>
                  )}
                  <TeamPreview pokemon={team.pokemon} />
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
