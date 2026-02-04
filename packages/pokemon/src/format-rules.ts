/**
 * Pokemon format rules and validation
 * Defines rules for different competitive formats
 */

export interface FormatRule {
  id: string;
  name: string;
  description: string;
  teamSize: {
    min: number;
    max: number;
  };
  battleSize?: number; // Number of Pokemon brought to battle
  itemClause?: boolean; // No duplicate items
  speciesClause?: boolean; // No duplicate species
  levelCap?: number;
  bannedPokemon?: string[];
  bannedItems?: string[];
  bannedAbilities?: string[];
  bannedMoves?: string[];
  restrictedPokemon?: string[]; // Can only have limited number
  restrictedLimit?: number;
}

export const FORMAT_RULES: Record<string, FormatRule> = {
  vgc2024: {
    id: "vgc2024",
    name: "VGC 2024 Regulation G",
    description: "Official VGC 2024 format with restricted legendary Pokemon",
    teamSize: { min: 4, max: 6 },
    battleSize: 4,
    itemClause: true,
    speciesClause: true,
    levelCap: 50,
    restrictedPokemon: [
      "Koraidon",
      "Miraidon",
      "Mewtwo",
      "Mew",
      "Kyogre",
      "Groudon",
      "Rayquaza",
      "Dialga",
      "Palkia",
      "Giratina",
      "Reshiram",
      "Zekrom",
      "Kyurem",
      "Xerneas",
      "Yveltal",
      "Zygarde",
      "Cosmog",
      "Cosmoem",
      "Solgaleo",
      "Lunala",
      "Necrozma",
      "Zacian",
      "Zamazenta",
      "Eternatus",
      "Calyrex",
      "Terapagos",
    ],
    restrictedLimit: 1,
    bannedPokemon: [
      "Arceus",
      "Darkrai",
      "Deoxys",
      "Diancie",
      "Genesect",
      "Hoopa",
      "Jirachi",
      "Keldeo",
      "Magearna",
      "Marshadow",
      "Meltan",
      "Melmetal",
      "Meloetta",
      "Phione",
      "Manaphy",
      "Shaymin",
      "Victini",
      "Volcanion",
      "Zarude",
      "Zeraora",
      "Pecharunt",
    ],
    bannedItems: ["Skull Fossil"],
  },
  singles6v6: {
    id: "singles6v6",
    name: "Singles 6v6",
    description: "Standard singles format with 6v6 battles",
    teamSize: { min: 6, max: 6 },
    itemClause: true,
    speciesClause: true,
    levelCap: 100,
    bannedPokemon: [
      "Arceus",
      "Darkrai",
      "Deoxys",
      "Dialga",
      "Giratina",
      "Groudon",
      "Ho-Oh",
      "Kyogre",
      "Kyurem",
      "Lugia",
      "Mewtwo",
      "Palkia",
      "Rayquaza",
      "Reshiram",
      "Xerneas",
      "Yveltal",
      "Zacian",
      "Zamazenta",
      "Zekrom",
      "Zygarde",
      "Eternatus",
      "Calyrex",
      "Koraidon",
      "Miraidon",
    ],
    bannedItems: ["Skull Fossil", "King's Rock", "Razor Fang"],
    bannedAbilities: ["Moody", "Shadow Tag", "Arena Trap"],
    bannedMoves: ["Baton Pass"],
  },
  battlespot: {
    id: "battlespot",
    name: "Battle Spot Singles",
    description: "Ranked singles format with bring 6 pick 3",
    teamSize: { min: 3, max: 6 },
    battleSize: 3,
    itemClause: true,
    speciesClause: true,
    levelCap: 50,
    bannedPokemon: [
      "Mewtwo",
      "Mew",
      "Lugia",
      "Ho-Oh",
      "Celebi",
      "Kyogre",
      "Groudon",
      "Rayquaza",
      "Jirachi",
      "Deoxys",
      "Dialga",
      "Palkia",
      "Giratina",
      "Phione",
      "Manaphy",
      "Darkrai",
      "Shaymin",
      "Arceus",
      "Victini",
      "Reshiram",
      "Zekrom",
      "Kyurem",
      "Keldeo",
      "Meloetta",
      "Genesect",
      "Xerneas",
      "Yveltal",
      "Zygarde",
      "Diancie",
      "Hoopa",
      "Volcanion",
      "Cosmog",
      "Cosmoem",
      "Solgaleo",
      "Lunala",
      "Necrozma",
      "Magearna",
      "Marshadow",
      "Zeraora",
      "Meltan",
      "Melmetal",
      "Zacian",
      "Zamazenta",
      "Eternatus",
      "Zarude",
      "Calyrex",
      "Koraidon",
      "Miraidon",
    ],
  },
  anythinggoes: {
    id: "anythinggoes",
    name: "Anything Goes",
    description: "No restrictions format",
    teamSize: { min: 1, max: 6 },
    itemClause: false,
    speciesClause: false,
    levelCap: 100,
  },
};

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateTeamForFormat(
  team: {
    pokemon: Array<{
      species: string;
      heldItem?: string;
      ability: string;
      moves: string[];
      level: number;
    }>;
  },
  formatId: string
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const format = FORMAT_RULES[formatId];
  if (!format) {
    errors.push(`Unknown format: ${formatId}`);
    return { isValid: false, errors, warnings };
  }

  // Check team size
  if (team.pokemon.length < format.teamSize.min) {
    errors.push(
      `Team must have at least ${format.teamSize.min} Pokemon (has ${team.pokemon.length})`
    );
  }
  if (team.pokemon.length > format.teamSize.max) {
    errors.push(
      `Team cannot have more than ${format.teamSize.max} Pokemon (has ${team.pokemon.length})`
    );
  }

  // Check species clause
  if (format.speciesClause) {
    const species = team.pokemon.map((p) => p.species);
    const duplicates = species.filter((s, i) => species.indexOf(s) !== i);
    if (duplicates.length > 0) {
      errors.push(
        `Duplicate species not allowed: ${[...new Set(duplicates)].join(", ")}`
      );
    }
  }

  // Check item clause
  if (format.itemClause) {
    const items = team.pokemon
      .filter((p) => p.heldItem)
      .map((p) => p.heldItem!);
    const duplicates = items.filter((item, i) => items.indexOf(item) !== i);
    if (duplicates.length > 0) {
      errors.push(
        `Duplicate items not allowed: ${[...new Set(duplicates)].join(", ")}`
      );
    }
  }

  // Check banned Pokemon
  if (format.bannedPokemon) {
    const banned = team.pokemon
      .filter((p) => format.bannedPokemon!.includes(p.species))
      .map((p) => p.species);
    if (banned.length > 0) {
      errors.push(`Banned Pokemon: ${banned.join(", ")}`);
    }
  }

  // Check restricted Pokemon
  if (format.restrictedPokemon && format.restrictedLimit) {
    const restricted = team.pokemon.filter((p) =>
      format.restrictedPokemon!.includes(p.species)
    );
    if (restricted.length > format.restrictedLimit) {
      errors.push(
        `Too many restricted Pokemon (max ${format.restrictedLimit}, has ${restricted.length})`
      );
    }
  }

  // Check banned items
  if (format.bannedItems) {
    const bannedItems = team.pokemon
      .filter((p) => p.heldItem && format.bannedItems!.includes(p.heldItem))
      .map((p) => p.heldItem!);
    if (bannedItems.length > 0) {
      errors.push(`Banned items: ${bannedItems.join(", ")}`);
    }
  }

  // Check banned abilities
  if (format.bannedAbilities) {
    const bannedAbilities = team.pokemon
      .filter((p) => format.bannedAbilities!.includes(p.ability))
      .map((p) => `${p.species} with ${p.ability}`);
    if (bannedAbilities.length > 0) {
      errors.push(`Banned abilities: ${bannedAbilities.join(", ")}`);
    }
  }

  // Check banned moves
  if (format.bannedMoves) {
    for (const pokemon of team.pokemon) {
      const bannedMoves = pokemon.moves.filter((m) =>
        format.bannedMoves!.includes(m)
      );
      if (bannedMoves.length > 0) {
        errors.push(
          `${pokemon.species} has banned moves: ${bannedMoves.join(", ")}`
        );
      }
    }
  }

  // Check level cap
  if (format.levelCap) {
    const overLeveled = team.pokemon.filter((p) => p.level > format.levelCap!);
    if (overLeveled.length > 0) {
      warnings.push(
        `Pokemon over level ${format.levelCap}: ${overLeveled.map((p) => `${p.species} (Lv.${p.level})`).join(", ")}`
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

export function getFormatDescription(formatId: string): string {
  const format = FORMAT_RULES[formatId];
  if (!format) return "Unknown format";

  const parts: string[] = [format.description];

  if (format.battleSize) {
    parts.push(`Bring ${format.teamSize.max}, pick ${format.battleSize}`);
  } else {
    parts.push(`${format.teamSize.min}-${format.teamSize.max} Pokemon`);
  }

  if (format.levelCap) {
    parts.push(`Level ${format.levelCap} cap`);
  }

  if (format.itemClause) {
    parts.push("No duplicate items");
  }

  if (format.speciesClause) {
    parts.push("No duplicate species");
  }

  if (format.restrictedPokemon && format.restrictedLimit) {
    parts.push(`Max ${format.restrictedLimit} restricted legendary`);
  }

  return parts.join(" | ");
}
