/**
 * @jest-environment node
 *
 * Unit tests for `findLegalityViolation` — covers ordering invariant
 * (species → item → ability → moves → tera) and species-context behavior
 * (ability/moves are skipped when species is null).
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";

// Mock legality predicates from @trainers/pokemon so we can drive each branch
// independently. Each mock returns true (legal) unless we explicitly override.
const mockIsLegalSpecies =
  jest.fn<(species: string, format: string) => boolean>();
const mockIsLegalItem = jest.fn<(item: string, format: string) => boolean>();
const mockIsLegalAbility =
  jest.fn<(ability: string, species: string, format: string) => boolean>();
const mockIsLegalMove =
  jest.fn<(move: string, species: string, format: string) => boolean>();
const mockIsLegalTeraType =
  jest.fn<(tera: string, format: string) => boolean>();

jest.mock("@trainers/pokemon", () => ({
  isLegalSpecies: (...args: [string, string]) => mockIsLegalSpecies(...args),
  isLegalItem: (...args: [string, string]) => mockIsLegalItem(...args),
  isLegalAbility: (...args: [string, string, string]) =>
    mockIsLegalAbility(...args),
  isLegalMove: (...args: [string, string, string]) => mockIsLegalMove(...args),
  isLegalTeraType: (...args: [string, string]) => mockIsLegalTeraType(...args),
}));

import { findLegalityViolation } from "../_legality";

// =============================================================================

describe("findLegalityViolation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: everything legal
    mockIsLegalSpecies.mockReturnValue(true);
    mockIsLegalItem.mockReturnValue(true);
    mockIsLegalAbility.mockReturnValue(true);
    mockIsLegalMove.mockReturnValue(true);
    mockIsLegalTeraType.mockReturnValue(true);
  });

  describe("all legal", () => {
    it("returns null when every field is legal", () => {
      const result = findLegalityViolation(
        {
          species: "Pikachu",
          held_item: "Light Ball",
          ability: "Static",
          move1: "Thunderbolt",
          move2: "Quick Attack",
          tera_type: "Electric",
        },
        "gen9vgc2024regh"
      );
      expect(result).toBeNull();
    });

    it("returns null for a fully empty pokemon (every field null/undefined)", () => {
      const result = findLegalityViolation({}, "gen9vgc2024regh");
      expect(result).toBeNull();
    });
  });

  describe("ordering invariant: species → item → ability → moves → tera", () => {
    it("reports species violation first when species AND item AND move AND tera are all illegal", () => {
      mockIsLegalSpecies.mockReturnValue(false);
      mockIsLegalItem.mockReturnValue(false);
      mockIsLegalMove.mockReturnValue(false);
      mockIsLegalTeraType.mockReturnValue(false);

      const result = findLegalityViolation(
        {
          species: "Miraidon",
          held_item: "Leftovers",
          move1: "Thunderbolt",
          tera_type: "Electric",
        },
        "gen9vgc2024regh"
      );
      expect(result).toMatch(/Miraidon isn't legal/);
      // Short-circuit: later predicates should not run
      expect(mockIsLegalItem).not.toHaveBeenCalled();
      expect(mockIsLegalMove).not.toHaveBeenCalled();
      expect(mockIsLegalTeraType).not.toHaveBeenCalled();
    });

    it("reports item violation before ability/moves/tera when species is legal", () => {
      mockIsLegalItem.mockReturnValue(false);
      mockIsLegalAbility.mockReturnValue(false);
      mockIsLegalMove.mockReturnValue(false);
      mockIsLegalTeraType.mockReturnValue(false);

      const result = findLegalityViolation(
        {
          species: "Pikachu",
          held_item: "Booster Energy",
          ability: "Static",
          move1: "Thunderbolt",
          tera_type: "Electric",
        },
        "gen9vgc2024regh"
      );
      expect(result).toMatch(/Booster Energy isn't a legal item/);
      expect(mockIsLegalAbility).not.toHaveBeenCalled();
      expect(mockIsLegalMove).not.toHaveBeenCalled();
      expect(mockIsLegalTeraType).not.toHaveBeenCalled();
    });

    it("reports ability violation before moves/tera", () => {
      mockIsLegalAbility.mockReturnValue(false);
      mockIsLegalMove.mockReturnValue(false);
      mockIsLegalTeraType.mockReturnValue(false);

      const result = findLegalityViolation(
        {
          species: "Pikachu",
          ability: "Lightning Rod",
          move1: "Thunderbolt",
          tera_type: "Electric",
        },
        "gen9vgc2024regh"
      );
      expect(result).toMatch(
        /Pikachu can't legally have Lightning Rod in this format/
      );
      expect(mockIsLegalMove).not.toHaveBeenCalled();
      expect(mockIsLegalTeraType).not.toHaveBeenCalled();
    });

    it("returns the FIRST illegal move and stops checking later slots + tera", () => {
      // Only the move in slot move2 is illegal; move1/move3/move4 are legal
      mockIsLegalMove.mockImplementation((move) => move !== "Surf");
      mockIsLegalTeraType.mockReturnValue(false);

      const result = findLegalityViolation(
        {
          species: "Pikachu",
          move1: "Thunderbolt",
          move2: "Surf",
          move3: "Quick Attack",
          move4: "Volt Tackle",
          tera_type: "Electric",
        },
        "gen9vgc2024regh"
      );
      expect(result).toMatch(/Pikachu can't legally use Surf/);
      expect(mockIsLegalTeraType).not.toHaveBeenCalled();
    });

    it("reports tera type violation when species/item/ability/moves are all legal", () => {
      mockIsLegalTeraType.mockReturnValue(false);

      const result = findLegalityViolation(
        {
          species: "Pikachu",
          tera_type: "Fairy",
        },
        "gen9vgc2024regh"
      );
      expect(result).toMatch(/Tera type Fairy isn't allowed/);
    });
  });

  describe("species-context short-circuits", () => {
    it("skips ability check when species is null (no species context)", () => {
      mockIsLegalAbility.mockReturnValue(false);

      const result = findLegalityViolation(
        { species: null, ability: "Static" },
        "gen9vgc2024regh"
      );
      expect(result).toBeNull();
      expect(mockIsLegalAbility).not.toHaveBeenCalled();
    });

    it("skips every move check when species is null", () => {
      mockIsLegalMove.mockReturnValue(false);

      const result = findLegalityViolation(
        {
          species: null,
          move1: "Thunderbolt",
          move2: "Surf",
          move3: "Ice Beam",
          move4: "Earthquake",
        },
        "gen9vgc2024regh"
      );
      expect(result).toBeNull();
      expect(mockIsLegalMove).not.toHaveBeenCalled();
    });
  });

  describe("null/empty fields treated as legal", () => {
    it("treats empty-string item as no item (does not invoke the predicate)", () => {
      const result = findLegalityViolation(
        { species: "Pikachu", held_item: "" },
        "gen9vgc2024regh"
      );
      expect(result).toBeNull();
      expect(mockIsLegalItem).not.toHaveBeenCalled();
    });

    it("treats null move slots as absent", () => {
      const result = findLegalityViolation(
        {
          species: "Pikachu",
          move1: null,
          move2: null,
          move3: null,
          move4: null,
        },
        "gen9vgc2024regh"
      );
      expect(result).toBeNull();
      expect(mockIsLegalMove).not.toHaveBeenCalled();
    });

    it("treats null tera_type as no tera", () => {
      const result = findLegalityViolation(
        { species: "Pikachu", tera_type: null },
        "gen9vgc2024regh"
      );
      expect(result).toBeNull();
      expect(mockIsLegalTeraType).not.toHaveBeenCalled();
    });
  });
});
