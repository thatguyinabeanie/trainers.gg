/**
 * @jest-environment node
 */

// ---------------------------------------------------------------------------
// Mock setup — all jest.mock() calls must be hoisted above imports
// ---------------------------------------------------------------------------

// Mock @trainers/pokemon — getLegalSpecies is the only dependency
const mockGetLegalSpecies = jest.fn<() => Set<string> | undefined>();

jest.mock("@trainers/pokemon", () => ({
  getLegalSpecies: (...args: unknown[]) => mockGetLegalSpecies(...args),
}));

// ---------------------------------------------------------------------------
// Imports — must come after all jest.mock() calls
// ---------------------------------------------------------------------------

import { describe, it, expect, jest, beforeEach } from "@jest/globals";

import {
  checkFormatChangeLegality,
  type TeamPokemonSlot,
} from "../format-legality-guard";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a team slot with a named species. */
function slot(species: string): TeamPokemonSlot {
  return { pokemon: { species } };
}

/** Build a team slot where pokemon is null. */
function nullSlot(): TeamPokemonSlot {
  return { pokemon: null };
}

/** Build a team slot where pokemon.species is null. */
function nullSpeciesSlot(): TeamPokemonSlot {
  return { pokemon: { species: null } };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("checkFormatChangeLegality", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // No-op when format is unchanged
  // -------------------------------------------------------------------------

  it("returns ok:true immediately when targetFormat equals currentFormat", () => {
    const result = checkFormatChangeLegality(
      [slot("Charizard"), slot("Pikachu")],
      "gen9vgc2025regg",
      "gen9vgc2025regg"
    );

    expect(result).toEqual({ ok: true });
    // getLegalSpecies must not be called — no work needed
    expect(mockGetLegalSpecies).not.toHaveBeenCalled();
  });

  it("treats null currentFormat as a different format (no-op bypass does not apply)", () => {
    mockGetLegalSpecies.mockReturnValue(new Set(["Charizard"]));

    const result = checkFormatChangeLegality(
      [slot("Charizard")],
      null,
      "gen9vgc2025regg"
    );

    expect(result).toEqual({ ok: true });
    expect(mockGetLegalSpecies).toHaveBeenCalledWith("gen9vgc2025regg");
  });

  // -------------------------------------------------------------------------
  // Permissive when format is unknown
  // -------------------------------------------------------------------------

  it("returns ok:true when getLegalSpecies returns undefined (unknown format)", () => {
    mockGetLegalSpecies.mockReturnValue(undefined);

    const result = checkFormatChangeLegality(
      [slot("AncientLegendary"), slot("MadeUp")],
      "gen9vgc2025regg",
      "unknownformat2099"
    );

    expect(result).toEqual({ ok: true });
    expect(mockGetLegalSpecies).toHaveBeenCalledWith("unknownformat2099");
  });

  // -------------------------------------------------------------------------
  // All-legal team
  // -------------------------------------------------------------------------

  it("returns ok:true when all species are in the legal set", () => {
    mockGetLegalSpecies.mockReturnValue(
      new Set(["Charizard", "Pikachu", "Incineroar"])
    );

    const result = checkFormatChangeLegality(
      [slot("Charizard"), slot("Pikachu"), slot("Incineroar")],
      "gen9vgc2025regg",
      "gen9vgc2025regh"
    );

    expect(result).toEqual({ ok: true });
  });

  // -------------------------------------------------------------------------
  // Illegal species detection
  // -------------------------------------------------------------------------

  it("returns ok:false with the illegal species when one slot has a banned species", () => {
    mockGetLegalSpecies.mockReturnValue(new Set(["Pikachu", "Incineroar"]));

    const result = checkFormatChangeLegality(
      [slot("Pikachu"), slot("Mewtwo")],
      "gen9vgc2025regg",
      "gen9vgc2025regh"
    );

    expect(result).toEqual({ ok: false, illegal: ["Mewtwo"] });
  });

  it("returns ok:false listing all unique illegal species when multiple slots fail", () => {
    mockGetLegalSpecies.mockReturnValue(new Set(["Pikachu"]));

    const result = checkFormatChangeLegality(
      [slot("Pikachu"), slot("Mewtwo"), slot("Rayquaza")],
      null,
      "gen9vgc2025regh"
    );

    expect(result).toEqual({ ok: false, illegal: ["Mewtwo", "Rayquaza"] });
  });

  // -------------------------------------------------------------------------
  // Deduplication
  // -------------------------------------------------------------------------

  it("deduplicates illegal species that appear in multiple slots", () => {
    mockGetLegalSpecies.mockReturnValue(new Set(["Pikachu"]));

    const result = checkFormatChangeLegality(
      [slot("Mewtwo"), slot("Mewtwo"), slot("Pikachu"), slot("Mewtwo")],
      "gen9vgc2025regg",
      "gen9vgc2025regh"
    );

    expect(result).toEqual({ ok: false, illegal: ["Mewtwo"] });
  });

  it("deduplicates when two different illegal species each appear twice", () => {
    mockGetLegalSpecies.mockReturnValue(new Set());

    const result = checkFormatChangeLegality(
      [slot("Mewtwo"), slot("Rayquaza"), slot("Mewtwo"), slot("Rayquaza")],
      null,
      "gen9vgc2025regh"
    );

    if (!result.ok) {
      // Order follows first-occurrence insertion into the Set
      expect(result.illegal).toEqual(["Mewtwo", "Rayquaza"]);
    } else {
      throw new Error("Expected ok:false");
    }
  });

  // -------------------------------------------------------------------------
  // Null slot / null species filtering
  // -------------------------------------------------------------------------

  it("ignores slots where pokemon is null — does not crash", () => {
    mockGetLegalSpecies.mockReturnValue(new Set(["Pikachu"]));

    const result = checkFormatChangeLegality(
      [slot("Pikachu"), nullSlot(), nullSlot()],
      null,
      "gen9vgc2025regh"
    );

    expect(result).toEqual({ ok: true });
  });

  it("ignores slots where pokemon.species is null", () => {
    mockGetLegalSpecies.mockReturnValue(new Set(["Pikachu"]));

    const result = checkFormatChangeLegality(
      [slot("Pikachu"), nullSpeciesSlot(), nullSpeciesSlot()],
      null,
      "gen9vgc2025regh"
    );

    expect(result).toEqual({ ok: true });
  });

  it("returns ok:false only for the real illegal species when mixed with null slots", () => {
    mockGetLegalSpecies.mockReturnValue(new Set(["Pikachu"]));

    const result = checkFormatChangeLegality(
      [slot("Pikachu"), nullSlot(), nullSpeciesSlot(), slot("Mewtwo")],
      null,
      "gen9vgc2025regh"
    );

    expect(result).toEqual({ ok: false, illegal: ["Mewtwo"] });
  });

  // -------------------------------------------------------------------------
  // Empty team
  // -------------------------------------------------------------------------

  it("returns ok:true for an empty team (no species to check)", () => {
    mockGetLegalSpecies.mockReturnValue(new Set(["Pikachu"]));

    const result = checkFormatChangeLegality([], null, "gen9vgc2025regh");

    expect(result).toEqual({ ok: true });
    // getLegalSpecies is still called — we just find no illegal species
    expect(mockGetLegalSpecies).toHaveBeenCalledWith("gen9vgc2025regh");
  });

  it("returns ok:true for a team of only null slots", () => {
    mockGetLegalSpecies.mockReturnValue(new Set());

    const result = checkFormatChangeLegality(
      [nullSlot(), nullSlot(), nullSlot()],
      null,
      "gen9vgc2025regh"
    );

    expect(result).toEqual({ ok: true });
  });

  // -------------------------------------------------------------------------
  // Format argument forwarding
  // -------------------------------------------------------------------------

  it("passes targetFormat (not currentFormat) to getLegalSpecies", () => {
    mockGetLegalSpecies.mockReturnValue(new Set(["Pikachu"]));

    checkFormatChangeLegality([slot("Pikachu")], "gen9vgc2025regg", "gen9ou");

    expect(mockGetLegalSpecies).toHaveBeenCalledTimes(1);
    expect(mockGetLegalSpecies).toHaveBeenCalledWith("gen9ou");
  });

  // -------------------------------------------------------------------------
  // Parameterized: legal-set edge cases
  // -------------------------------------------------------------------------

  it.each([
    {
      label: "legal set is empty — every species illegal",
      legalSet: new Set<string>(),
      team: [slot("Pikachu"), slot("Charizard")],
      expected: { ok: false as const, illegal: ["Pikachu", "Charizard"] },
    },
    {
      label: "legal set has exactly the species on the team — all legal",
      legalSet: new Set(["Pikachu", "Charizard"]),
      team: [slot("Pikachu"), slot("Charizard")],
      expected: { ok: true as const },
    },
    {
      label: "legal set is a superset of the team — all legal",
      legalSet: new Set(["Pikachu", "Charizard", "Incineroar", "Kingambit"]),
      team: [slot("Pikachu"), slot("Charizard")],
      expected: { ok: true as const },
    },
  ])("$label", ({ legalSet, team, expected }) => {
    mockGetLegalSpecies.mockReturnValue(legalSet);

    const result = checkFormatChangeLegality(team, null, "gen9vgc2025regh");

    expect(result).toEqual(expected);
  });
});
