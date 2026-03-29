"use client";

import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ButtonGroup } from "@/components/ui/button-group";
import { Button } from "@/components/ui/button";
import { Gamepad2, Monitor, User, Users } from "lucide-react";

/**
 * Platform where battles take place
 */
export type BattlePlatform = "cartridge" | "showdown";

/**
 * Battle format (singles or doubles)
 */
export type BattleFormat = "singles" | "doubles";

export interface TournamentGameSettingsProps {
  game?: string;
  gameFormat?: string;
  platform?: BattlePlatform;
  battleFormat?: BattleFormat;
  maxParticipants?: number;
  onGameChange: (value: string | undefined) => void;
  onGameFormatChange: (value: string | undefined) => void;
  onPlatformChange: (value: BattlePlatform) => void;
  onBattleFormatChange: (value: BattleFormat) => void;
  onMaxParticipantsChange?: (value: number | undefined) => void;
  disabled?: boolean;
}

// Re-export pure data and lookups from the server-safe module
export {
  type GameOption,
  type FormatOption,
  POKEMON_GAMES,
  GAME_FORMATS,
  getFormatsForGame,
  getGameById,
  getFormatById,
} from "./game-data";
import {
  POKEMON_GAMES,
  getFormatsForGame,
  getGameById,
  getFormatById,
} from "./game-data";

export function TournamentGameSettings({
  game,
  gameFormat,
  platform = "cartridge",
  battleFormat = "doubles",
  onGameChange,
  onGameFormatChange,
  onPlatformChange,
  onBattleFormatChange,
  disabled = false,
}: TournamentGameSettingsProps) {
  const availableFormats = game ? getFormatsForGame(game) : [];
  const hasFormats = availableFormats.length > 0;

  const handleGameChange = (value: string | null) => {
    onGameChange(value || undefined);
    // Clear format when game changes
    onGameFormatChange(undefined);
  };

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <Field>
        <FieldLabel htmlFor="game">Game</FieldLabel>
        <Select
          value={game}
          onValueChange={handleGameChange}
          disabled={disabled}
        >
          <SelectTrigger id="game" className="w-full">
            <SelectValue placeholder="Select...">
              {game ? getGameById(game)?.shortName : "Select..."}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {POKEMON_GAMES.map((g) => (
              <SelectItem key={g.id} value={g.id}>
                {g.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field>
        <FieldLabel htmlFor="gameFormat">Regulation</FieldLabel>
        <Select
          value={gameFormat}
          onValueChange={(v) => onGameFormatChange(v || undefined)}
          disabled={disabled || !hasFormats}
        >
          <SelectTrigger id="gameFormat" className="w-full">
            <SelectValue placeholder={game ? "Select..." : "—"}>
              {game && gameFormat
                ? getFormatById(game, gameFormat)?.name
                : game
                  ? "Select..."
                  : "—"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {availableFormats.map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {f.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field>
        <FieldLabel>Platform</FieldLabel>
        <ButtonGroup className="mt-1.5">
          <Button
            type="button"
            variant={platform === "cartridge" ? "default" : "outline"}
            onClick={() => onPlatformChange("cartridge")}
            disabled={disabled}
            size="sm"
            className="flex items-center gap-1.5"
          >
            <Gamepad2 className="h-3.5 w-3.5" />
            Switch
          </Button>
          <Button
            type="button"
            variant={platform === "showdown" ? "default" : "outline"}
            onClick={() => onPlatformChange("showdown")}
            disabled={disabled}
            size="sm"
            className="flex items-center gap-1.5"
          >
            <Monitor className="h-3.5 w-3.5" />
            Showdown
          </Button>
        </ButtonGroup>
      </Field>

      <Field>
        <FieldLabel>Battle Format</FieldLabel>
        <ButtonGroup className="mt-1.5">
          <Button
            type="button"
            variant={battleFormat === "doubles" ? "default" : "outline"}
            onClick={() => onBattleFormatChange("doubles")}
            disabled={disabled}
            size="sm"
            className="flex items-center gap-1.5"
          >
            <Users className="h-3.5 w-3.5" />
            Doubles
          </Button>
          <Button
            type="button"
            variant={battleFormat === "singles" ? "default" : "outline"}
            onClick={() => onBattleFormatChange("singles")}
            disabled={disabled}
            size="sm"
            className="flex items-center gap-1.5"
          >
            <User className="h-3.5 w-3.5" />
            Singles
          </Button>
        </ButtonGroup>
      </Field>
    </div>
  );
}
