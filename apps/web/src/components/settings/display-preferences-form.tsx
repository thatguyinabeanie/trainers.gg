"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { PokemonSprite } from "@/components/tournament/pokemon-sprite";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { updateSpritePreferenceAction } from "@/actions/users";
import { type SpritePreference } from "@trainers/pokemon/sprites";

const SPRITE_OPTIONS: {
  value: SpritePreference;
  label: string;
  description: string;
}[] = [
  {
    value: "gen5",
    label: "Gen 5 Pixel",
    description: "Static pixel art sprites (Black/White style)",
  },
  {
    value: "gen5ani",
    label: "Gen 5 Animated",
    description: "Animated pixel art sprites (Black/White animated)",
  },
  {
    value: "ani",
    label: "Modern Animated",
    description: "Modern animated sprites (3D-style animations)",
  },
];

interface DisplayPreferencesFormProps {
  initialPreference: SpritePreference;
}

export function DisplayPreferencesForm({
  initialPreference,
}: DisplayPreferencesFormProps) {
  const [isPending, startTransition] = useTransition();
  const [spritePreference, setSpritePreference] =
    useState<SpritePreference>(initialPreference);

  const handleSave = () => {
    startTransition(async () => {
      const result = await updateSpritePreferenceAction(spritePreference);

      if (result.success) {
        toast.success("Display preferences updated");
        // Reload to apply changes throughout the app
        window.location.reload();
      } else {
        toast.error(result.error);
      }
    });
  };

  const hasChanges = spritePreference !== initialPreference;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Display Preferences</CardTitle>
        <CardDescription>
          Customize how Pokemon sprites are displayed throughout the app
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <Label className="text-base font-semibold">
            Pokemon Sprite Style
          </Label>
          <p className="text-muted-foreground text-sm">
            Choose your preferred sprite style for Pokemon displays
          </p>

          <RadioGroup
            value={spritePreference}
            onValueChange={(value) =>
              setSpritePreference(value as SpritePreference)
            }
          >
            {SPRITE_OPTIONS.map((option) => (
              <div
                key={option.value}
                className="hover:bg-muted/50 flex items-start space-x-3 rounded-lg border p-4 transition-colors"
              >
                <RadioGroupItem value={option.value} id={option.value} />
                <div className="flex-1 space-y-2">
                  <Label
                    htmlFor={option.value}
                    className="cursor-pointer font-medium"
                  >
                    {option.label}
                  </Label>
                  <p className="text-muted-foreground text-sm">
                    {option.description}
                  </p>
                  <div className="flex gap-2 pt-2">
                    <PokemonSprite
                      species="pikachu"
                      spriteStyle={option.value}
                      size={68}
                    />
                    <PokemonSprite
                      species="charizard"
                      spriteStyle={option.value}
                      size={68}
                    />
                    <PokemonSprite
                      species="mewtwo"
                      spriteStyle={option.value}
                      size={68}
                    />
                  </div>
                </div>
              </div>
            ))}
          </RadioGroup>
        </div>

        <Button onClick={handleSave} disabled={isPending || !hasChanges}>
          {isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Changes
        </Button>
      </CardContent>
    </Card>
  );
}
