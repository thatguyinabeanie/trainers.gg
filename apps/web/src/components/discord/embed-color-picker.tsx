"use client";

import { useEffect, useState, useTransition } from "react";
import { Palette, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateServerSettingsAction } from "@/actions/discord-integration";

const DEFAULT_COLOR = "#0D9488";
const HEX_REGEX = /^#[0-9A-Fa-f]{6}$/;

interface EmbedColorPickerProps {
  currentColor: string;
  serverId: number;
  communityId: number;
}

export function EmbedColorPicker({
  currentColor,
  serverId,
  communityId,
}: EmbedColorPickerProps) {
  const [color, setColor] = useState(currentColor);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setColor(currentColor);
  }, [currentColor]);

  const isValid = HEX_REGEX.test(color);
  const hasChanged = color !== currentColor;

  function handleSave() {
    if (!isValid) {
      toast.error("Invalid hex color. Must be # followed by 6 hex characters.");
      return;
    }

    startTransition(async () => {
      const result = await updateServerSettingsAction({
        serverId,
        communityId,
        settings: { embed_color: color },
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Embed color updated.");
    });
  }

  function handleReset() {
    setColor(DEFAULT_COLOR);

    startTransition(async () => {
      const result = await updateServerSettingsAction({
        serverId,
        communityId,
        settings: { embed_color: DEFAULT_COLOR },
      });
      if (!result.success) {
        setColor(currentColor);
        toast.error(result.error);
        return;
      }
      toast.success("Embed color reset to default.");
    });
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
      <div className="flex flex-col gap-1">
        <Label className="flex items-center gap-2 text-sm font-medium">
          <Palette className="h-4 w-4" />
          Embed Color
        </Label>
        <p className="text-muted-foreground text-sm">
          Customize the accent color on Discord notification embeds
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div
          className="h-8 w-8 rounded-md border"
          style={{ backgroundColor: isValid ? color : currentColor }}
        />
        <Input
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="w-28 font-mono text-sm"
          placeholder="#0D9488"
        />
        <Button
          onClick={handleSave}
          disabled={isPending || !isValid || !hasChanged}
          size="sm"
        >
          Save
        </Button>
        <Button
          onClick={handleReset}
          disabled={isPending || color === DEFAULT_COLOR}
          size="sm"
          variant="ghost"
        >
          <RotateCcw className="mr-1 h-3 w-3" />
          Reset
        </Button>
      </div>
    </div>
  );
}
