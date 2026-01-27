"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { TournamentFormData, CutRule } from "@/lib/types/tournament";
import {
  Calendar,
  Users,
  Trophy,
  Settings,
  Loader2,
  Layers,
  ChevronRight,
} from "lucide-react";

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

      <div className="grid gap-6">
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

        {/* Format & Structure */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Format & Structure
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="font-medium">Game Format:</span>
              <Badge variant="secondary">{formData.format}</Badge>
            </div>
            {formData.maxParticipants && (
              <div className="text-sm">
                <span className="font-medium">Max Participants:</span>{" "}
                {formData.maxParticipants}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tournament Phases */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Tournament Phases
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-2">
              {formData.phases.map((phase, index) => (
                <div key={phase.id} className="flex items-center gap-2">
                  <div className="bg-muted rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <span className="bg-primary text-primary-foreground flex h-5 w-5 items-center justify-center rounded-full text-xs font-medium">
                        {index + 1}
                      </span>
                      <span className="font-medium">{phase.name}</span>
                    </div>
                    <div className="text-muted-foreground mt-1 flex flex-wrap gap-2 text-xs">
                      <Badge variant="outline" className="text-xs">
                        {phaseTypeLabels[phase.phaseType] || phase.phaseType}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {bestOfLabels[phase.bestOf] || `Bo${phase.bestOf}`}
                      </Badge>
                      {phase.plannedRounds ? (
                        <Badge variant="outline" className="text-xs">
                          {phase.plannedRounds} rounds
                        </Badge>
                      ) : phase.phaseType === "swiss" ? (
                        <Badge variant="outline" className="text-xs">
                          Auto rounds
                        </Badge>
                      ) : null}
                      {phase.cutRule && (
                        <Badge variant="outline" className="text-xs">
                          {cutRuleLabels[phase.cutRule]}
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {phase.roundTimeMinutes}min rounds
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {phase.checkInTimeMinutes}min check-in
                      </Badge>
                    </div>
                  </div>
                  {index < formData.phases.length - 1 && (
                    <ChevronRight className="text-muted-foreground h-4 w-4" />
                  )}
                </div>
              ))}
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

        {/* Team Requirements */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Requirements
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="font-medium">Rental Team Photos:</span>
              <Badge
                variant={
                  formData.rentalTeamPhotosEnabled ? "default" : "secondary"
                }
              >
                {formData.rentalTeamPhotosEnabled ? "Enabled" : "Disabled"}
              </Badge>
            </div>
            {formData.rentalTeamPhotosEnabled && (
              <div className="flex items-center gap-2">
                <span className="font-medium">Photos Required:</span>
                <Badge
                  variant={
                    formData.rentalTeamPhotosRequired ? "default" : "secondary"
                  }
                >
                  {formData.rentalTeamPhotosRequired ? "Required" : "Optional"}
                </Badge>
              </div>
            )}
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
