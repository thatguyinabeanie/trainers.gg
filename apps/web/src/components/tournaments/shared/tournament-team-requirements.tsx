"use client";

import { Switch } from "@/components/ui/switch";
import { Field, FieldLabel, FieldDescription } from "@/components/ui/field";

export interface TournamentTeamRequirementsProps {
  rentalTeamPhotosEnabled: boolean;
  rentalTeamPhotosRequired: boolean;
  onChange: (updates: {
    rentalTeamPhotosEnabled?: boolean;
    rentalTeamPhotosRequired?: boolean;
  }) => void;
  disabled?: boolean;
}

export function TournamentTeamRequirements({
  rentalTeamPhotosEnabled,
  rentalTeamPhotosRequired,
  onChange,
  disabled = false,
}: TournamentTeamRequirementsProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Team Requirements</h3>

      <Field orientation="horizontal">
        <Switch
          id="rentalTeamPhotosEnabled"
          checked={rentalTeamPhotosEnabled}
          onCheckedChange={(checked: boolean) =>
            onChange({ rentalTeamPhotosEnabled: checked })
          }
          disabled={disabled}
        />
        <FieldLabel htmlFor="rentalTeamPhotosEnabled">
          Enable Rental Team Photos
          <FieldDescription>
            Allow players to submit photos of their rental teams
          </FieldDescription>
        </FieldLabel>
      </Field>

      {rentalTeamPhotosEnabled && (
        <Field orientation="horizontal">
          <Switch
            id="rentalTeamPhotosRequired"
            checked={rentalTeamPhotosRequired}
            onCheckedChange={(checked: boolean) =>
              onChange({ rentalTeamPhotosRequired: checked })
            }
            disabled={disabled}
          />
          <FieldLabel htmlFor="rentalTeamPhotosRequired">
            Require Rental Team Photos
            <FieldDescription>
              Make rental team photos mandatory for registration
            </FieldDescription>
          </FieldLabel>
        </Field>
      )}
    </div>
  );
}
