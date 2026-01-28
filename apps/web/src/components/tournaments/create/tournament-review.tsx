"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { TournamentFormData, CutRule } from "@/lib/types/tournament";
import {
  Calendar,
  Gamepad2,
  Settings,
  Loader2,
  Layers,
  ChevronRight,
  Monitor,
  Users,
  User,
  Globe,
  Check,
  X,
} from "lucide-react";
import { getGameById, getFormatById } from "../shared";

interface TournamentReviewProps {
  formData: TournamentFormData;
  onSubmit: () => void;
  isSubmitting: boolean;
}

const phaseTypeLabels: Record<string, string> = {
  swiss: "Swiss",
  single_elimination: "Single Elim",
  double_elimination: "Double Elim",
};

const bestOfLabels: Record<number, string> = {
  1: "Bo1",
  3: "Bo3",
  5: "Bo5",
};

const cutRuleLabels: Record<CutRule, string> = {
  "x-1": "X-1",
  "x-2": "X-2",
  "x-3": "X-3",
  "top-4": "Top 4",
  "top-8": "Top 8",
  "top-16": "Top 16",
  "top-32": "Top 32",
};

export function TournamentReview({
  formData,
  onSubmit,
  isSubmitting,
}: TournamentReviewProps) {
  const formatDate = (timestamp?: number) => {
    if (!timestamp) return "Not set";
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Review Tournament Details</h3>
        <p className="text-muted-foreground text-sm">
          Please review all the information below before creating your
          tournament.
        </p>
      </div>

      <div className="space-y-6">
        {/* Row 1: Basic Information + Game Settings */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <span className="font-medium">Name:</span> {formData.name}
              </div>
              <div>
                <span className="font-medium">URL Slug:</span> {formData.slug}
              </div>
              {formData.description && (
                <div>
                  <span className="font-medium">Description:</span>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {formData.description}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Game Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {formData.platform === "showdown" ? (
                  <Monitor className="h-5 w-5" />
                ) : (
                  <Gamepad2 className="h-5 w-5" />
                )}
                Game Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">
                  {formData.game
                    ? getGameById(formData.game)?.shortName || formData.game
                    : "No game"}
                </Badge>
                <Badge variant="secondary">
                  {formData.platform === "showdown" ? "Showdown" : "Switch"}
                </Badge>
                <Badge variant="secondary">
                  {formData.game && formData.gameFormat
                    ? getFormatById(formData.game, formData.gameFormat)?.name ||
                      formData.gameFormat
                    : "No regulation"}
                </Badge>
                <Badge variant="secondary">
                  {formData.battleFormat === "doubles" ? (
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" /> Doubles
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" /> Singles
                    </span>
                  )}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Row 2: Registration + Schedule */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Registration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Registration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Globe className="text-muted-foreground h-4 w-4" />
                <span className="font-medium">Open Registration</span>
              </div>
              <div>
                <span className="font-medium">Player Cap:</span>{" "}
                {formData.playerCapEnabled && formData.maxParticipants
                  ? `${formData.maxParticipants} players`
                  : "Unlimited"}
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Check-in Required:</span>
                {formData.checkInRequired ? (
                  <Badge
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    <Check className="h-3 w-3" /> Yes
                  </Badge>
                ) : (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <X className="h-3 w-3" /> No
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Late Registration:</span>
                {formData.allowLateRegistration ? (
                  <Badge
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    <Check className="h-3 w-3" /> Allowed
                  </Badge>
                ) : (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <X className="h-3 w-3" /> Not allowed
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Schedule */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Schedule
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <span className="font-medium">Start Date:</span>{" "}
                {formatDate(formData.startDate)}
              </div>
              <div>
                <span className="font-medium">End Date:</span>{" "}
                {formatDate(formData.endDate)}
              </div>
              <div>
                <span className="font-medium">Registration Deadline:</span>{" "}
                {formatDate(formData.registrationDeadline)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Row 3: Tournament Structure (full width) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Tournament Structure
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {formData.phases.map((phase, index) => (
                <div
                  key={phase.id}
                  className="bg-muted/50 rounded-lg border p-4"
                >
                  <div className="mb-3 flex items-center gap-2">
                    <span className="bg-primary text-primary-foreground flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium">
                      {index + 1}
                    </span>
                    <span className="font-semibold">{phase.name}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                    <div className="text-muted-foreground">Format</div>
                    <div className="font-medium">
                      {phaseTypeLabels[phase.phaseType] || phase.phaseType}
                    </div>
                    <div className="text-muted-foreground">Match Type</div>
                    <div className="font-medium">
                      {bestOfLabels[phase.bestOf] || `Bo${phase.bestOf}`}
                    </div>
                    <div className="text-muted-foreground">Rounds</div>
                    <div className="font-medium">
                      {phase.plannedRounds
                        ? phase.plannedRounds
                        : phase.phaseType === "swiss"
                          ? "Auto"
                          : "—"}
                    </div>
                    {phase.cutRule && (
                      <>
                        <div className="text-muted-foreground">Cut</div>
                        <div className="font-medium">
                          {cutRuleLabels[phase.cutRule]}
                        </div>
                      </>
                    )}
                    <div className="text-muted-foreground">Round Time</div>
                    <div className="font-medium">
                      {phase.roundTimeMinutes} min
                    </div>
                    <div className="text-muted-foreground">
                      Check-in (per game)
                    </div>
                    <div className="font-medium">
                      {phase.checkInTimeMinutes} min
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      <div className="bg-muted/50 rounded-lg p-4">
        <h4 className="mb-2 font-medium">What happens next?</h4>
        <ul className="text-muted-foreground space-y-1 text-sm">
          <li>• Your tournament will be created in &quot;Draft&quot; status</li>
          <li>
            • You can edit all settings from the tournament management page
          </li>
          <li>• Open registration when you&apos;re ready to accept players</li>
          <li>• Start the tournament when all players are registered</li>
        </ul>
      </div>

      <div className="flex justify-center">
        <Button
          onClick={onSubmit}
          disabled={isSubmitting}
          size="lg"
          className="min-w-[200px]"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating Tournament...
            </>
          ) : (
            "Create Tournament"
          )}
        </Button>
      </div>
    </div>
  );
}
