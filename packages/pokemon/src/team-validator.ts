import { TeamValidator, Dex as SimDex } from "@pkmn/sim";
import type { PokemonSet } from "./types";

// Type for Showdown's PokemonSet format
interface ShowdownPokemonSet {
  name: string;
  species: string;
  item: string;
  ability: string;
  moves: string[];
  nature: string;
  gender: string;
  evs: {
    hp: number;
    atk: number;
    def: number;
    spa: number;
    spd: number;
    spe: number;
  };
  ivs: {
    hp: number;
    atk: number;
    def: number;
    spa: number;
    spd: number;
    spe: number;
  };
  level: number;
  shiny?: boolean;
  teraType?: string;
}

// Supported competitive formats - mapping to actual Showdown format IDs
export const SUPPORTED_FORMATS = {
  // VGC (Video Game Championship) formats - using OU as fallback since VGC isn't in @pkmn/sim
  gen9vgc2024: "[Gen 9] OU",
  gen9vgc2023: "[Gen 9] OU",

  // Smogon Singles formats
  gen9ou: "[Gen 9] OU",
  gen9uu: "[Gen 9] UU",
  gen9ru: "[Gen 9] RU",
  gen9nu: "[Gen 9] NU",
  gen9pu: "[Gen 9] PU",

  // Other popular formats
  gen9nationaldex: "[Gen 9] OU", // Fallback
  gen9lc: "[Gen 9] LC",
  gen9monotype: "[Gen 9] Monotype",
  gen9anythinggoes: "[Gen 9] Anything Goes",

  // Custom formats
  gen9battlestadium: "[Gen 9] OU", // Custom fallback
} as const;

export type FormatId = keyof typeof SUPPORTED_FORMATS;

export interface TeamValidationError {
  pokemon?: number; // 0-indexed position in team
  field: string;
  message: string;
  severity: "error" | "warning";
}

export interface TeamValidationResult {
  isValid: boolean;
  errors: TeamValidationError[];
  warnings: TeamValidationError[];
  format: string;
  teamSize: number;
}

/**
 * Advanced team validation using @pkmn/sim's TeamValidator
 */
export class AdvancedTeamValidator {
  private validator: TeamValidator;
  private formatId: string;

  constructor(formatId: FormatId = "gen9vgc2024") {
    this.formatId = formatId;
    const actualFormatName = SUPPORTED_FORMATS[formatId];
    const format = SimDex.formats.get(actualFormatName);
    if (!format || !format.exists) {
      throw new Error(`Format ${formatId} (${actualFormatName}) not found`);
    }
    this.validator = new TeamValidator(format, SimDex);
  }

  /**
   * Validate a complete team for a specific format
   */
  validateTeam(team: PokemonSet[], formatId?: FormatId): TeamValidationResult {
    const format = formatId || this.formatId;

    // Update validator if format changed
    if (format !== this.formatId) {
      this.formatId = format;
      const actualFormatName = SUPPORTED_FORMATS[format as FormatId];
      const formatObj = SimDex.formats.get(actualFormatName);
      if (!formatObj || !formatObj.exists) {
        throw new Error(`Format ${format} (${actualFormatName}) not found`);
      }
      this.validator = new TeamValidator(formatObj, SimDex);
    }

    const errors: TeamValidationError[] = [];
    const warnings: TeamValidationError[] = [];

    try {
      // Convert our PokemonSet format to Showdown's Team format
      const showdownTeam = team.map((pokemon) =>
        this.convertToShowdownSet(pokemon)
      );

      // Run the team validator
      const issues = this.validator.validateTeam(showdownTeam);

      // Process validation issues
      for (const issue of issues || []) {
        const issueStr = String(issue);
        const error: TeamValidationError = {
          field: "team",
          message: issueStr,
          severity: this.categorizeSeverity(issueStr),
        };

        // Try to extract Pokemon index from error message
        const pokemonMatch = issueStr.match(/Pokemon #(\d+)/);
        if (pokemonMatch && pokemonMatch[1]) {
          const pokemonIndex = parseInt(pokemonMatch[1]) - 1; // Convert to 0-indexed
          error.pokemon = pokemonIndex;
          error.field = `pokemon[${pokemonIndex}]`;
        }

        if (error.severity === "error") {
          errors.push(error);
        } else {
          warnings.push(error);
        }
      }

      // Additional format-specific validations
      this.addFormatSpecificValidation(team, format, errors, warnings);
    } catch (error) {
      errors.push({
        field: "team",
        message: `Team validation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        severity: "error",
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      format: SUPPORTED_FORMATS[format as FormatId] || format,
      teamSize: team.length,
    };
  }

  /**
   * Validate a single Pokemon for a specific format
   */
  validatePokemon(
    pokemon: PokemonSet,
    formatId?: FormatId
  ): TeamValidationResult {
    return this.validateTeam([pokemon], formatId);
  }

  /**
   * Convert our PokemonSet to Showdown's set format
   */
  private convertToShowdownSet(pokemon: PokemonSet): ShowdownPokemonSet {
    return {
      name: pokemon.nickname || pokemon.species,
      species: pokemon.species,
      item: pokemon.heldItem || "",
      ability: pokemon.ability,
      moves: [
        pokemon.moves.move1,
        pokemon.moves.move2,
        pokemon.moves.move3,
        pokemon.moves.move4,
      ].filter(Boolean) as string[],
      nature: pokemon.nature,
      evs: {
        hp: pokemon.evs.hp,
        atk: pokemon.evs.attack,
        def: pokemon.evs.defense,
        spa: pokemon.evs.specialAttack,
        spd: pokemon.evs.specialDefense,
        spe: pokemon.evs.speed,
      },
      ivs: {
        hp: pokemon.ivs.hp,
        atk: pokemon.ivs.attack,
        def: pokemon.ivs.defense,
        spa: pokemon.ivs.specialAttack,
        spd: pokemon.ivs.specialDefense,
        spe: pokemon.ivs.speed,
      },
      level: pokemon.level,
      gender: pokemon.gender?.charAt(0) || "",
      shiny: pokemon.isShiny,
      teraType: pokemon.teraType,
    };
  }

  /**
   * Categorize validation issues by severity
   */
  private categorizeSeverity(message: string): "error" | "warning" {
    const errorKeywords = [
      "illegal",
      "banned",
      "not allowed",
      "invalid",
      "cannot",
      "unavailable",
      "incompatible",
      "exceeds",
      "too many",
      "duplicate",
    ];

    const lowerMessage = message.toLowerCase();

    return errorKeywords.some((keyword) => lowerMessage.includes(keyword))
      ? "error"
      : "warning";
  }

  /**
   * Add format-specific validation rules
   */
  private addFormatSpecificValidation(
    team: PokemonSet[],
    format: string,
    errors: TeamValidationError[],
    warnings: TeamValidationError[]
  ): void {
    // VGC specific rules
    if (format.includes("vgc")) {
      this.validateVGCRules(team, errors, warnings);
    }

    // Smogon Singles specific rules
    if (
      format.includes("ou") ||
      format.includes("uu") ||
      format.includes("ru")
    ) {
      this.validateSmogonSinglesRules(team, errors, warnings);
    }

    // Battle Stadium custom rules
    if (format.includes("battlestadium")) {
      this.validateBattleStadiumRules(team, errors, warnings);
    }
  }

  /**
   * VGC format validation
   */
  private validateVGCRules(
    team: PokemonSet[],
    errors: TeamValidationError[],
    _warnings: TeamValidationError[]
  ): void {
    // Team size (4-6 Pokemon)
    if (team.length < 4) {
      errors.push({
        field: "team",
        message: "VGC teams must have at least 4 Pokemon",
        severity: "error",
      });
    }

    if (team.length > 6) {
      errors.push({
        field: "team",
        message: "VGC teams cannot have more than 6 Pokemon",
        severity: "error",
      });
    }

    // Level restrictions
    for (const [index, pokemon] of team.entries()) {
      if (pokemon.level !== 50) {
        errors.push({
          pokemon: index,
          field: "level",
          message: "All Pokemon must be level 50 in VGC",
          severity: "error",
        });
      }
    }

    // Species clause (no duplicate Pokemon)
    const speciesCount = new Map<string, number[]>();
    for (const [index, pokemon] of team.entries()) {
      const species = pokemon.species.toLowerCase();
      if (!speciesCount.has(species)) {
        speciesCount.set(species, []);
      }
      speciesCount.get(species)!.push(index);
    }

    for (const [species, indices] of speciesCount.entries()) {
      if (indices.length > 1) {
        for (const index of indices) {
          errors.push({
            pokemon: index,
            field: "species",
            message: `Duplicate species ${species} not allowed in VGC`,
            severity: "error",
          });
        }
      }
    }

    // Item clause (no duplicate items, except null items)
    const itemCount = new Map<string, number[]>();
    for (const [index, pokemon] of team.entries()) {
      if (pokemon.heldItem) {
        const item = pokemon.heldItem.toLowerCase();
        if (!itemCount.has(item)) {
          itemCount.set(item, []);
        }
        itemCount.get(item)!.push(index);
      }
    }

    for (const [item, indices] of itemCount.entries()) {
      if (indices.length > 1) {
        for (const index of indices) {
          errors.push({
            pokemon: index,
            field: "heldItem",
            message: `Duplicate item ${item} not allowed in VGC`,
            severity: "error",
          });
        }
      }
    }
  }

  /**
   * Smogon Singles format validation
   */
  private validateSmogonSinglesRules(
    team: PokemonSet[],
    errors: TeamValidationError[],
    warnings: TeamValidationError[]
  ): void {
    // Team size (exactly 6 Pokemon)
    if (team.length !== 6) {
      errors.push({
        field: "team",
        message: "Smogon Singles teams must have exactly 6 Pokemon",
        severity: "error",
      });
    }

    // Sleep clause (max 1 sleep-inducing move per team)
    const sleepMoves = [
      "spore",
      "sleep powder",
      "lovely kiss",
      "dark void",
      "hypnosis",
      "sing",
    ];
    let sleepMoveCount = 0;

    for (const [index, pokemon] of team.entries()) {
      const moves = [
        pokemon.moves.move1,
        pokemon.moves.move2,
        pokemon.moves.move3,
        pokemon.moves.move4,
      ]
        .filter(Boolean)
        .map((move) => move!.toLowerCase());

      for (const move of moves) {
        if (sleepMoves.includes(move)) {
          sleepMoveCount++;
          if (sleepMoveCount > 1) {
            warnings.push({
              pokemon: index,
              field: "moves",
              message: "Multiple sleep-inducing moves may violate Sleep Clause",
              severity: "warning",
            });
          }
        }
      }
    }
  }

  /**
   * Battle Stadium custom format validation
   */
  private validateBattleStadiumRules(
    team: PokemonSet[],
    errors: TeamValidationError[],
    _warnings: TeamValidationError[]
  ): void {
    // Custom rules for Battle Stadium tournaments
    // These can be configured per tournament

    // Example: Restricted legendary limit
    const restrictedLegendaries = [
      "mewtwo",
      "lugia",
      "ho-oh",
      "kyogre",
      "groudon",
      "rayquaza",
      "dialga",
      "palkia",
      "giratina",
      "arceus",
      "reshiram",
      "zekrom",
      "kyurem",
      "xerneas",
      "yveltal",
      "zygarde",
      "cosmog",
      "cosmoem",
      "solgaleo",
      "lunala",
      "necrozma",
      "zacian",
      "zamazenta",
      "eternatus",
      "calyrex",
      "koraidon",
      "miraidon",
    ];

    let restrictedCount = 0;
    for (const [index, pokemon] of team.entries()) {
      if (restrictedLegendaries.includes(pokemon.species.toLowerCase())) {
        restrictedCount++;
        if (restrictedCount > 2) {
          errors.push({
            pokemon: index,
            field: "species",
            message: "Maximum 2 restricted legendary Pokemon allowed",
            severity: "error",
          });
        }
      }
    }
  }

  /**
   * Get all available formats
   */
  static getAvailableFormats(): Array<{ id: FormatId; name: string }> {
    return Object.entries(SUPPORTED_FORMATS).map(([id, name]) => ({
      id: id as FormatId,
      name,
    }));
  }

  /**
   * Validate move combinations and interactions
   */
  validateMoveInteractions(pokemon: PokemonSet): TeamValidationError[] {
    const errors: TeamValidationError[] = [];

    const moves = [
      pokemon.moves.move1,
      pokemon.moves.move2,
      pokemon.moves.move3,
      pokemon.moves.move4,
    ].filter(Boolean) as string[];

    // Check for contradictory moves
    const restMoves = ["rest"];
    const insomniaAbilities = ["insomnia", "vital spirit"];

    if (
      moves.some((move) => restMoves.includes(move.toLowerCase())) &&
      insomniaAbilities.includes(pokemon.ability.toLowerCase())
    ) {
      errors.push({
        field: "moves",
        message: "Rest is incompatible with Insomnia/Vital Spirit abilities",
        severity: "warning",
      });
    }

    // Check for ability-move synergies
    if (pokemon.ability.toLowerCase() === "contrary") {
      const contraryMoves = [
        "overheat",
        "superpower",
        "v-create",
        "leaf storm",
      ];
      const hasContraryMove = moves.some((move) =>
        contraryMoves.includes(move.toLowerCase())
      );

      if (!hasContraryMove) {
        errors.push({
          field: "ability",
          message: "Contrary ability works best with stat-lowering moves",
          severity: "warning",
        });
      }
    }

    return errors;
  }

  /**
   * Validate item interactions
   */
  validateItemInteractions(pokemon: PokemonSet): TeamValidationError[] {
    const errors: TeamValidationError[] = [];

    if (!pokemon.heldItem) return errors;

    const item = pokemon.heldItem.toLowerCase();

    // Choice items with status moves
    const choiceItems = ["choice band", "choice specs", "choice scarf"];
    const statusMoves = [
      "toxic",
      "thunder wave",
      "will-o-wisp",
      "sleep powder",
    ];

    if (choiceItems.includes(item)) {
      const moves = [
        pokemon.moves.move1,
        pokemon.moves.move2,
        pokemon.moves.move3,
        pokemon.moves.move4,
      ].filter(Boolean) as string[];

      const hasStatusMove = moves.some((move) =>
        statusMoves.includes(move.toLowerCase())
      );

      if (hasStatusMove && moves.length > 1) {
        errors.push({
          field: "heldItem",
          message:
            "Choice items lock you into one move; status moves may be suboptimal",
          severity: "warning",
        });
      }
    }

    // Assault Vest with status moves
    if (item === "assault vest") {
      const moves = [
        pokemon.moves.move1,
        pokemon.moves.move2,
        pokemon.moves.move3,
        pokemon.moves.move4,
      ].filter(Boolean) as string[];

      const hasStatusMove = moves.some((move) =>
        statusMoves.includes(move.toLowerCase())
      );

      if (hasStatusMove) {
        errors.push({
          field: "heldItem",
          message: "Assault Vest prevents the use of status moves",
          severity: "error",
        });
      }
    }

    return errors;
  }
}
