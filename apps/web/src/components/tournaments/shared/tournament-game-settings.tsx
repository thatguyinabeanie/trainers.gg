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

interface GameOption {
  id: string;
  name: string;
  shortName: string;
}

interface FormatOption {
  id: string;
  name: string;
}

/**
 * Pokemon video games supported for tournaments
 * Currently limited to Nintendo Switch titles
 */
export const POKEMON_GAMES: GameOption[] = [
  { id: "sv", name: "Pokémon Scarlet & Violet", shortName: "Scarlet/Violet" },
  { id: "swsh", name: "Pokémon Sword & Shield", shortName: "Sword/Shield" },
  {
    id: "bdsp",
    name: "Pokémon Brilliant Diamond & Shining Pearl",
    shortName: "BDSP",
  },
  {
    id: "lgpe",
    name: "Pokémon Let's Go, Pikachu! & Eevee!",
    shortName: "Let's Go",
  },
  // 3DS titles - uncomment when Showdown support is added
  // { id: "usum", name: "Pokémon Ultra Sun & Ultra Moon", shortName: "USUM" },
  // { id: "sm", name: "Pokémon Sun & Moon", shortName: "Sun/Moon" },
  // { id: "oras", name: "Pokémon Omega Ruby & Alpha Sapphire", shortName: "ORAS" },
  // { id: "xy", name: "Pokémon X & Y", shortName: "X/Y" },
];

/**
 * Formats available for each game
 * Listed in reverse chronological order (newest first)
 */
export const GAME_FORMATS: Record<string, FormatOption[]> = {
  sv: [
    { id: "reg-i", name: "Regulation I" },
    { id: "reg-h", name: "Regulation H" },
    { id: "reg-g", name: "Regulation G" },
    { id: "reg-f", name: "Regulation F" },
    { id: "reg-e", name: "Regulation E" },
    { id: "reg-d", name: "Regulation D" },
    { id: "reg-c", name: "Regulation C" },
    { id: "reg-b", name: "Regulation B" },
    { id: "reg-a", name: "Regulation A" },
  ],
  swsh: [
    { id: "series-13", name: "Series 13" },
    { id: "series-12", name: "Series 12" },
    { id: "series-11", name: "Series 11" },
    { id: "series-10", name: "Series 10" },
    { id: "series-9", name: "Series 9" },
    { id: "series-8", name: "Series 8" },
    { id: "series-7", name: "Series 7" },
    { id: "series-6", name: "Series 6" },
    { id: "series-5", name: "Series 5" },
    { id: "series-4", name: "Series 4" },
    { id: "series-3", name: "Series 3" },
    { id: "series-2", name: "Series 2" },
    { id: "series-1", name: "Series 1" },
  ],
  bdsp: [
    { id: "bdsp-doubles", name: "Doubles" },
    { id: "bdsp-singles", name: "Singles" },
  ],
  lgpe: [
    { id: "lgpe-doubles", name: "Doubles" },
    { id: "lgpe-singles", name: "Singles" },
  ],
  usum: [
    { id: "vgc-2019-ultra", name: "VGC 2019 Ultra Series" },
    { id: "vgc-2019-moon", name: "VGC 2019 Moon Series" },
    { id: "vgc-2019-sun", name: "VGC 2019 Sun Series" },
    { id: "vgc-2018", name: "VGC 2018" },
  ],
  sm: [{ id: "vgc-2017", name: "VGC 2017" }],
  oras: [
    { id: "vgc-2016", name: "VGC 2016" },
    { id: "vgc-2015", name: "VGC 2015" },
  ],
  xy: [{ id: "vgc-2014", name: "VGC 2014" }],
};

/**
 * Get available formats for a given game
 */
export function getFormatsForGame(gameId: string): FormatOption[] {
  return GAME_FORMATS[gameId] ?? [];
}

/**
 * Get game info by ID
 */
export function getGameById(gameId: string): GameOption | undefined {
  return POKEMON_GAMES.find((g) => g.id === gameId);
}

/**
 * Get format info by game and format ID
 */
export function getFormatById(
  gameId: string,
  formatId: string
): FormatOption | undefined {
  const formats = GAME_FORMATS[gameId];
  return formats?.find((f) => f.id === formatId);
}

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
