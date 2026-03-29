"use client";

import { DateTimeField } from "@/components/ui/date-time-field";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Lightbulb } from "lucide-react";
import type { TournamentFormData } from "@trainers/tournaments/types";

interface TournamentScheduleProps {
  formData: TournamentFormData;
  updateFormData: (updates: Partial<TournamentFormData>) => void;
}

export function TournamentSchedule({
  formData,
  updateFormData,
}: TournamentScheduleProps) {
  const startDate = formData.startDate
    ? new Date(formData.startDate)
    : undefined;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <DateTimeField
          label="Start Date & Time"
          description="When the tournament begins"
          value={formData.startDate}
          onChange={(val) =>
            updateFormData({ startDate: val as number | undefined })
          }
        />

        <DateTimeField
          label="End Date & Time"
          description="Expected end time (optional)"
          value={formData.endDate}
          onChange={(val) =>
            updateFormData({ endDate: val as number | undefined })
          }
          minDate={startDate}
        />
      </div>

      <Alert>
        <Lightbulb className="h-4 w-4" />
        <AlertTitle>Schedule Tips</AlertTitle>
        <AlertDescription>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>All dates can be updated later from tournament management</li>
            <li>Registration closes when the tournament starts</li>
            <li>Consider time zones for online tournaments</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
}
