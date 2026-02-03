"use client";

import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldDescription } from "@/components/ui/field";
import { ButtonGroup } from "@/components/ui/button-group";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type {
  TournamentFormData,
  RegistrationType,
} from "@/lib/types/tournament";
import { Globe, Lock, Users } from "lucide-react";

interface TournamentRegistrationProps {
  formData: TournamentFormData;
  updateFormData: (updates: Partial<TournamentFormData>) => void;
  disabled?: boolean;
}

export function TournamentRegistration({
  formData,
  updateFormData,
  disabled = false,
}: TournamentRegistrationProps) {
  const handleRegistrationTypeChange = (type: RegistrationType) => {
    updateFormData({ registrationType: type });
  };

  const handlePlayerCapToggle = (enabled: boolean) => {
    updateFormData({
      playerCapEnabled: enabled,
      maxParticipants: enabled ? formData.maxParticipants || 32 : undefined,
    });
  };

  return (
    <div className="space-y-6">
      {/* Registration Type */}
      <Field>
        <FieldLabel>Registration Type</FieldLabel>
        <FieldDescription>
          Control who can register for your tournament
        </FieldDescription>
        <ButtonGroup className="mt-2">
          <Button
            type="button"
            variant={
              formData.registrationType === "open" ? "default" : "outline"
            }
            onClick={() => handleRegistrationTypeChange("open")}
            disabled={disabled}
            size="sm"
            className="flex items-center gap-1.5"
          >
            <Globe className="h-3.5 w-3.5" />
            Open Registration
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={true}
            size="sm"
            className="flex items-center gap-1.5"
          >
            <Lock className="h-3.5 w-3.5" />
            Invite Only (coming soon)
          </Button>
        </ButtonGroup>
      </Field>

      {/* Player Cap */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="playerCap" className="text-base">
              Player Cap
            </Label>
            <p className="text-muted-foreground text-sm">
              Limit the number of participants
            </p>
          </div>
          <Switch
            id="playerCap"
            checked={formData.playerCapEnabled}
            onCheckedChange={handlePlayerCapToggle}
            disabled={disabled}
          />
        </div>

        {formData.playerCapEnabled && (
          <Field>
            <FieldLabel htmlFor="maxParticipants">Maximum Players</FieldLabel>
            <div className="flex items-center gap-2">
              <Users className="text-muted-foreground h-4 w-4" />
              <Input
                id="maxParticipants"
                type="number"
                value={formData.maxParticipants || ""}
                onChange={(e) =>
                  updateFormData({
                    maxParticipants: parseInt(e.target.value) || undefined,
                  })
                }
                placeholder="32"
                min="4"
                max="512"
                disabled={disabled}
                className="w-32"
              />
              <span className="text-muted-foreground text-sm">players</span>
            </div>
          </Field>
        )}
      </div>

      {/* Check-in Required */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="checkInRequired" className="text-base">
            Check-in Required
          </Label>
          <p className="text-muted-foreground text-sm">
            Players must check in before the tournament starts
          </p>
        </div>
        <Switch
          id="checkInRequired"
          checked={formData.checkInRequired}
          onCheckedChange={(checked) =>
            updateFormData({ checkInRequired: checked })
          }
          disabled={disabled}
        />
      </div>

      {/* Late Registration */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="lateRegistration" className="text-base">
              Late Registration
            </Label>
            <p className="text-muted-foreground text-sm">
              Allow players to register and check in after the tournament starts
            </p>
          </div>
          <Switch
            id="lateRegistration"
            checked={formData.allowLateRegistration}
            onCheckedChange={(checked) =>
              updateFormData({
                allowLateRegistration: checked,
                lateCheckInMaxRound: checked
                  ? formData.lateCheckInMaxRound || 3
                  : undefined,
              })
            }
            disabled={disabled}
          />
        </div>

        {formData.allowLateRegistration && (
          <Field>
            <FieldLabel htmlFor="lateCheckInMaxRound">
              Close After Round
            </FieldLabel>
            <FieldDescription>
              Registration and check-in close when this round begins
            </FieldDescription>
            <Input
              id="lateCheckInMaxRound"
              type="number"
              value={formData.lateCheckInMaxRound || ""}
              onChange={(e) =>
                updateFormData({
                  lateCheckInMaxRound: parseInt(e.target.value) || undefined,
                })
              }
              placeholder="3"
              min="1"
              max="10"
              disabled={disabled}
              className="mt-2 w-32"
            />
          </Field>
        )}
      </div>
    </div>
  );
}
