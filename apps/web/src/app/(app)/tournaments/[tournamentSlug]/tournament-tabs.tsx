"use client";

import { type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

const VALID_TABS = [
  "overview",
  "register",
  "details",
  "pairings",
  "standings",
] as const;

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
  const statusStyles: Record<string, string> = {
    active: "border-primary/40 bg-primary/5 shadow-sm",
    completed: "border-border bg-muted/20",
    pending: "border-border bg-muted/40",
  };

  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        statusStyles[phase.status] || statusStyles.pending
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <h4 className="font-semibold">{phase.name}</h4>
        {phase.status === "active" && (
          <span className="bg-primary/10 text-primary rounded-full px-2.5 py-0.5 text-xs font-medium">
            In Progress
          </span>
        )}
        {phase.status === "completed" && (
          <span className="bg-muted text-muted-foreground rounded-full px-2.5 py-0.5 text-xs font-medium">
            Completed
          </span>
        )}
      </div>

      <div className="text-muted-foreground grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div className="flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5 shrink-0" />
          {phase.phaseTypeLabel}
        </div>
        {phase.plannedRounds && (
          <div className="flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 shrink-0" />
            {phase.plannedRounds} rounds
          </div>
        )}
        {phase.bestOf != null && (
          <div className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 shrink-0" />
            Best of {phase.bestOf}
          </div>
        )}
        {phase.roundTimeMinutes != null && (
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            {phase.roundTimeMinutes} min
          </div>
        )}
        {phase.checkInTimeMinutes && (
          <div className="flex items-center gap-1.5">
            <Timer className="h-3.5 w-3.5 shrink-0" />
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
    <div className="bg-muted/30 rounded-xl p-5">
      <h3 className="mb-4 text-lg font-semibold">Tournament Structure</h3>
      <div className="space-y-0">
        {phases.map((phase, index) => (
          <div key={phase.id}>
            <PhaseCard phase={phase} />

            {/* Arrow connector with cut rule between phases */}
            {index < phases.length - 1 && (
              <div className="flex flex-col items-center py-2">
                <div className="bg-border h-4 w-px" />
                <ArrowDown className="text-muted-foreground h-4 w-4" />
                {phases[index + 1]?.cutRule && (
                  <span className="text-primary mt-0.5 text-xs font-medium">
                    {formatCutRule(phases[index + 1]!.cutRule!)}
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
          <TabsTrigger value="register" id="tournament-tab-register">
            Register
          </TabsTrigger>
          <TabsTrigger value="details" id="tournament-tab-details">
            Details
          </TabsTrigger>
          <TabsTrigger value="pairings" id="tournament-tab-pairings">
            Pairings
          </TabsTrigger>
          <TabsTrigger value="standings" id="tournament-tab-standings">
            Standings
          </TabsTrigger>
        </TabsList>

        {/* Overview — organizer description */}
        <TabsContent
          value="overview"
          id="tournament-panel-overview"
          className="space-y-6"
        >
          {description ? (
            <div className="bg-muted/20 rounded-xl p-5 sm:p-6">
              <MarkdownContent content={description} />
            </div>
          ) : (
            <div className="bg-muted/20 rounded-xl px-6 py-12 text-center">
              <p className="text-muted-foreground text-sm">
                No description provided by the organizer yet.
              </p>
            </div>
          )}
        </TabsContent>

        {/* Register — registration, team submission, check-in */}
        <TabsContent value="register" id="tournament-panel-register">
          {sidebarCard}
        </TabsContent>

        {/* Details — format, schedule, tournament structure */}
        <TabsContent
          value="details"
          id="tournament-panel-details"
          className="space-y-6"
        >
          {/* Tournament structure visual */}
          <TournamentStructure phases={phases} />

          {/* Format and schedule side by side */}
          <div className="grid gap-4 lg:grid-cols-2">
            {formatCard}
            {scheduleCard}
          </div>
        </TabsContent>

        {/* Pairings */}
        <TabsContent value="pairings" id="tournament-panel-pairings">
          {isPreTournament ? (
            <div className="bg-muted/20 rounded-xl px-6 py-12 text-center">
              <p className="text-muted-foreground text-sm">
                Pairings will be available once the tournament begins.
              </p>
            </div>
          ) : (
            <PublicPairings
              tournamentId={tournamentId}
              tournamentSlug={tournamentSlug}
              canManage={canManage}
            />
          )}
        </TabsContent>

        {/* Standings */}
        <TabsContent value="standings" id="tournament-panel-standings">
          {isPreTournament ? (
            <div className="bg-muted/20 rounded-xl px-6 py-12 text-center">
              <p className="text-muted-foreground text-sm">
                Standings will appear once the tournament begins.
              </p>
            </div>
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
