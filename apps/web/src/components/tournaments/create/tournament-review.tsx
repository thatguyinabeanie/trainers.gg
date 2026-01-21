"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { TournamentFormData } from "@/lib/types/tournament";
import { Calendar, Users, Trophy, Settings, Loader2 } from "lucide-react";

interface TournamentReviewProps {
  formData: TournamentFormData;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export function TournamentReview({
  formData,
  onSubmit,
  isSubmitting,
}: TournamentReviewProps) {
  const formatDate = (timestamp?: number) => {
    if (!timestamp) return "Not set";
    return new Date(timestamp).toLocaleString();
  };

  const getTournamentFormatLabel = (format: string) => {
    switch (format) {
      case "swiss_only":
        return "Swiss Only";
      case "swiss_with_cut":
        return "Swiss + Top Cut";
      case "single_elimination":
        return "Single Elimination";
      case "double_elimination":
        return "Double Elimination";
      default:
        return format;
    }
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
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="font-medium">Game Format:</span>
              <Badge variant="secondary">{formData.format}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">Tournament Structure:</span>
              <Badge>
                {getTournamentFormatLabel(formData.tournamentFormat)}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {formData.maxParticipants && (
                <div>
                  <span className="font-medium">Max Participants:</span>{" "}
                  {formData.maxParticipants}
                </div>
              )}
              <div>
                <span className="font-medium">Round Time:</span>{" "}
                {formData.roundTimeMinutes} minutes
              </div>
              {formData.swissRounds && (
                <div>
                  <span className="font-medium">Swiss Rounds:</span>{" "}
                  {formData.swissRounds}
                </div>
              )}
              {formData.topCutSize && (
                <div>
                  <span className="font-medium">Top Cut:</span> Top{" "}
                  {formData.topCutSize}
                </div>
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
