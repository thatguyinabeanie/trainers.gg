"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Tournament Dates</h3>
        <p className="text-muted-foreground text-sm">
          Set the schedule for your tournament. All dates are optional and can
          be updated later.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="startDate">Start Date & Time</Label>
          <Input
            id="startDate"
            type="datetime-local"
            value={formatDateForInput(formData.startDate)}
            onChange={(e) =>
              updateFormData({ startDate: parseInputDate(e.target.value) })
            }
          />
          <p className="text-muted-foreground text-sm">
            When the tournament begins
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="endDate">End Date & Time</Label>
          <Input
            id="endDate"
            type="datetime-local"
            value={formatDateForInput(formData.endDate)}
            onChange={(e) =>
              updateFormData({ endDate: parseInputDate(e.target.value) })
            }
            min={formatDateForInput(formData.startDate)}
          />
          <p className="text-muted-foreground text-sm">
            Expected end time (optional)
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="registrationDeadline">Registration Deadline</Label>
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
        />
        <p className="text-muted-foreground text-sm">
          When registration closes (defaults to tournament start time)
        </p>
      </div>

      <div className="bg-muted/50 rounded-lg p-4">
        <h4 className="mb-2 font-medium">Schedule Tips</h4>
        <ul className="text-muted-foreground space-y-1 text-sm">
          <li>
            • All dates can be updated later from the tournament management page
          </li>
          <li>
            • Registration will automatically close at the deadline or
            tournament start
          </li>
          <li>
            • Consider time zones when setting dates for online tournaments
          </li>
          <li>
            • Allow buffer time between registration deadline and tournament
            start
          </li>
        </ul>
      </div>
    </div>
  );
}
