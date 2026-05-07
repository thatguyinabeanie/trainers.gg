"use client";

import { type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MarkdownContent } from "@/components/ui/markdown-content";
import { PublicPairings } from "./public-pairings";
import { TournamentStandings } from "@/components/tournaments/manage/tournament-standings";
import { CurrentMatchBanner } from "./current-match-banner";
import { ArrowDown, Clock, Layers, Shield, Timer, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface PhaseData {
  id: number;
  name: string;
  phaseType: string;
  phaseTypeLabel: string;
  status: string;
  plannedRounds: number | null;
  bestOf: number | null;
  roundTimeMinutes: number | null;
  checkInTimeMinutes: number | null;
  cutRule: string | null;
}

interface TournamentTabsProps {
  description: string | null;
  scheduleCard: ReactNode;
  formatCard: ReactNode;
  sidebarCard: ReactNode;
  phases: PhaseData[];
  tournamentId: number;
  tournamentSlug: string;
  tournamentStatus: string;
  canManage?: boolean;
}

const VALID_TABS = ["overview", "pairings", "standings"] as const;

type ValidTab = (typeof VALID_TABS)[number];

function isValidTab(tab: string | null): tab is ValidTab {
  return VALID_TABS.includes(tab as ValidTab);
}

// ============================================================================
// Tournament Structure Visual
// ============================================================================

function formatCutRule(cutRule: string): string {
  // Convert "top-8" -> "Top 8 advance", "top-4" -> "Top 4 advance"
  const match = cutRule.match(/^top-(\d+)$/);
  if (match) return `Top ${match[1]} advance`;
  return cutRule;
}

function PhaseCard({ phase }: { phase: PhaseData }) {
  const statusColors: Record<string, string> = {
    active: "border-primary/30 bg-primary/5",
    completed: "border-border bg-muted/30",
    pending: "border-border bg-muted/50",
  };

  return (
    <div
      className={cn(
        "rounded-lg border p-4",
        statusColors[phase.status] || statusColors.pending
      )}
    >
      <div className="mb-2 flex items-center justify-between">
        <h4 className="font-semibold">{phase.name}</h4>
        {phase.status === "active" && (
          <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs font-medium">
            In Progress
          </span>
        )}
        {phase.status === "completed" && (
          <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs font-medium">
            Completed
          </span>
        )}
      </div>

      <div className="text-muted-foreground grid grid-cols-2 gap-2 text-sm">
        <div className="flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5" />
          {phase.phaseTypeLabel}
        </div>
        {phase.plannedRounds && (
          <div className="flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5" />
            {phase.plannedRounds} rounds
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" />
          Best of {phase.bestOf}
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          {phase.roundTimeMinutes} min
        </div>
        {phase.checkInTimeMinutes && (
          <div className="flex items-center gap-1.5">
            <Timer className="h-3.5 w-3.5" />
            {phase.checkInTimeMinutes} min check-in
          </div>
        )}
      </div>
    </div>
  );
}

function TournamentStructure({ phases }: { phases: PhaseData[] }) {
  if (phases.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold">Tournament Structure</h3>
      <div className="space-y-0">
        {phases.map((phase, index) => (
          <div key={phase.id}>
            <PhaseCard phase={phase} />

            {/* Arrow connector with cut rule between phases */}
            {index < phases.length - 1 && (
              <div className="flex flex-col items-center py-2">
                <ArrowDown className="text-muted-foreground h-5 w-5" />
                {phase.cutRule && (
                  <span className="text-muted-foreground mt-0.5 text-xs font-medium">
                    {formatCutRule(phase.cutRule)}
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Main Tabs Component
// ============================================================================

export function TournamentTabs({
  description,
  scheduleCard,
  formatCard,
  sidebarCard,
  phases,
  tournamentId,
  tournamentSlug,
  tournamentStatus,
  canManage = false,
}: TournamentTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isPreTournament =
    tournamentStatus === "draft" || tournamentStatus === "upcoming";

  // Get active tab from URL or default to overview
  const tabParam = searchParams.get("tab");
  const activeTab: ValidTab = isValidTab(tabParam) ? tabParam : "overview";

  // Handle tab change - update URL without page reload
  const handleTabChange = (value: string) => {
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set("tab", value);
    router.replace(`?${newParams.toString()}`, { scroll: false });
  };

  return (
    <>
      {!isPreTournament && (
        <CurrentMatchBanner
          tournamentId={tournamentId}
          tournamentSlug={tournamentSlug}
        />
      )}
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="w-full"
      >
        <TabsList className="mb-4">
          <TabsTrigger value="overview" id="tournament-tab-overview">
            Overview
          </TabsTrigger>
          <TabsTrigger value="pairings" id="tournament-tab-pairings">
            Pairings
          </TabsTrigger>
          <TabsTrigger value="standings" id="tournament-tab-standings">
            Standings
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="overview"
          id="tournament-panel-overview"
          className="space-y-6"
        >
          {/* Description — rendered as markdown */}
          {description && (
            <MarkdownContent content={description} className="text-muted-foreground" />
          )}

          {/* Tournament structure visual */}
          <TournamentStructure phases={phases} />

          {/* Format and schedule cards side by side on larger screens */}
          <div className="grid gap-6 lg:grid-cols-2">
            {formatCard}
            {scheduleCard}
          </div>

          {/* Registration — full width */}
          {sidebarCard}
        </TabsContent>

        <TabsContent value="pairings" id="tournament-panel-pairings">
          {isPreTournament ? (
            <Card>
              <CardHeader>
                <CardTitle>Pairings</CardTitle>
                <CardDescription>
                  Tournament pairings and results
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground py-8 text-center">
                  Pairings will be available once the tournament begins
                </p>
              </CardContent>
            </Card>
          ) : (
            <PublicPairings
              tournamentId={tournamentId}
              tournamentSlug={tournamentSlug}
              canManage={canManage}
            />
          )}
        </TabsContent>

        <TabsContent value="standings" id="tournament-panel-standings">
          {isPreTournament ? (
            <Card>
              <CardHeader>
                <CardTitle>Standings</CardTitle>
                <CardDescription>Current tournament standings</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground py-8 text-center">
                  Standings will appear once the tournament begins
                </p>
              </CardContent>
            </Card>
          ) : (
            <TournamentStandings
              tournament={{ id: tournamentId, status: tournamentStatus }}
            />
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}
