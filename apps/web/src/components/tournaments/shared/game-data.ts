/**
 * Pokemon game and format data — pure lookups with no React dependencies.
 * Safe to import from both Server and Client Components.
 */

export interface GameOption {
  id: string;
  name: string;
  shortName: string;
}

export interface FormatOption {
  id: string;
  name: string;
}

/**
 * Pokemon video games supported for tournaments
 */
export const POKEMON_GAMES: GameOption[] = [
  { id: "champions", name: "Pokémon Champions", shortName: "Champions" },
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
];

/**
 * Formats available for each game (newest first)
 */
export const GAME_FORMATS: Record<string, FormatOption[]> = {
  champions: [{ id: "reg-m-a", name: "Regulation M-A" }],
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

export function getFormatsForGame(gameId: string): FormatOption[] {
  return GAME_FORMATS[gameId] ?? [];
}

export function getGameById(gameId: string): GameOption | undefined {
  return POKEMON_GAMES.find((g) => g.id === gameId);
}

export function getFormatById(
  gameId: string,
  formatId: string
): FormatOption | undefined {
  const formats = GAME_FORMATS[gameId];
  return formats?.find((f) => f.id === formatId);
}
