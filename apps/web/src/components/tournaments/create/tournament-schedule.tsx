"use client";

import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldDescription } from "@/components/ui/field";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Lightbulb } from "lucide-react";
import type { TournamentFormData } from "@/lib/types/tournament";

interface TournamentScheduleProps {
  formData: TournamentFormData;
  updateFormData: (updates: Partial<TournamentFormData>) => void;
}

export function TournamentSchedule({
  formData,
  updateFormData,
}: TournamentScheduleProps) {
  const formatDateForInput = (timestamp?: number) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM format
  };

  const parseInputDate = (dateString: string) => {
    if (!dateString) return undefined;
    return new Date(dateString).getTime();
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="startDate">Start Date & Time</FieldLabel>
          <Input
            id="startDate"
            type="datetime-local"
            value={formatDateForInput(formData.startDate)}
            onChange={(e) =>
              updateFormData({ startDate: parseInputDate(e.target.value) })
            }
          />
          <FieldDescription>When the tournament begins</FieldDescription>
        </Field>

        <Field>
          <FieldLabel htmlFor="endDate">End Date & Time</FieldLabel>
          <Input
            id="endDate"
            type="datetime-local"
            value={formatDateForInput(formData.endDate)}
            onChange={(e) =>
              updateFormData({ endDate: parseInputDate(e.target.value) })
            }
            min={formatDateForInput(formData.startDate)}
          />
          <FieldDescription>Expected end time (optional)</FieldDescription>
        </Field>
      </div>

      <Field>
        <FieldLabel htmlFor="registrationDeadline">
          Registration Deadline
        </FieldLabel>
        <Input
          id="registrationDeadline"
          type="datetime-local"
          value={formatDateForInput(formData.registrationDeadline)}
          onChange={(e) =>
            updateFormData({
              registrationDeadline: parseInputDate(e.target.value),
            })
          }
          max={formatDateForInput(formData.startDate)}
          className="max-w-sm"
        />
        <FieldDescription>
          When registration closes (defaults to tournament start time)
        </FieldDescription>
      </Field>

      <Alert>
        <Lightbulb className="h-4 w-4" />
        <AlertTitle>Schedule Tips</AlertTitle>
        <AlertDescription>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>All dates can be updated later from tournament management</li>
            <li>
              Registration closes at the deadline or tournament start time
            </li>
            <li>Consider time zones for online tournaments</li>
            <li>Allow buffer time between registration close and start</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
}
