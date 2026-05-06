import { render, screen } from "@testing-library/react";

import type * as TrainersPokemon from "@trainers/pokemon";
import userEvent from "@testing-library/user-event";
import React from "react";

// =============================================================================
// Mock @trainers/pokemon ability functions
// =============================================================================

const mockGetValidAbilities = jest.fn();
const mockGetLegalAbilities = jest.fn();
const mockGetAbilityShortDesc = jest.fn();

jest.mock("@trainers/pokemon", () => ({
  ...jest.requireActual<typeof TrainersPokemon>("@trainers/pokemon"),
  getValidAbilities: (...args: unknown[]) => mockGetValidAbilities(...args),
  getLegalAbilities: (...args: unknown[]) => mockGetLegalAbilities(...args),
  getAbilityShortDesc: (...args: unknown[]) => mockGetAbilityShortDesc(...args),
}));

import { AbilityPicker } from "../pickers/ability-picker";
import { type GameFormat } from "@trainers/pokemon";

// =============================================================================
// Helpers
// =============================================================================

function makeMockFormat(): GameFormat {
  return {
    id: "gen9vgc2024reg",
    label: "VGC 2024 Reg G",
    generation: 9,
    isChampions: false,
    isChampionsTeamSize: false,
    legalLevelCap: 50,
  } as unknown as GameFormat;
}

const GARCHOMP_ABILITIES = ["Rough Skin", "Sand Veil", "Sand Force"];

// =============================================================================
// AbilityPicker tests
// =============================================================================

describe("AbilityPicker", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetValidAbilities.mockReturnValue(GARCHOMP_ABILITIES);
    mockGetLegalAbilities.mockReturnValue(null); // fallback to valid abilities
    mockGetAbilityShortDesc.mockImplementation((ability: string) => {
      if (ability === "Rough Skin") return "Damages on contact.";
      if (ability === "Sand Veil") return "Raises evasion in sandstorm.";
      return undefined;
    });
  });

  // ---------------------------------------------------------------------------
  // Basic render
  // ---------------------------------------------------------------------------

  it("renders the title 'Ability'", () => {
    render(
      <AbilityPicker
        value={null}
        species="Garchomp"
        format={undefined}
        onPick={jest.fn()}
        onClose={jest.fn()}
      />
    );
    expect(screen.getByText("Ability")).toBeInTheDocument();
  });

  it("renders all abilities returned by getValidAbilities", () => {
    render(
      <AbilityPicker
        value={null}
        species="Garchomp"
        format={undefined}
        onPick={jest.fn()}
        onClose={jest.fn()}
      />
    );
    for (const ability of GARCHOMP_ABILITIES) {
      expect(screen.getByText(ability)).toBeInTheDocument();
    }
  });

  it("renders ability short descriptions when available", () => {
    render(
      <AbilityPicker
        value={null}
        species="Garchomp"
        format={undefined}
        onPick={jest.fn()}
        onClose={jest.fn()}
      />
    );
    expect(screen.getByText("Damages on contact.")).toBeInTheDocument();
    expect(screen.getByText("Raises evasion in sandstorm.")).toBeInTheDocument();
  });

  it("renders the search input with placeholder 'Search abilities…'", () => {
    render(
      <AbilityPicker
        value={null}
        species="Garchomp"
        format={undefined}
        onPick={jest.fn()}
        onClose={jest.fn()}
      />
    );
    expect(screen.getByPlaceholderText("Search abilities…")).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Format-aware fetching
  // ---------------------------------------------------------------------------

  it("calls getLegalAbilities when format is provided", () => {
    const format = makeMockFormat();
    mockGetLegalAbilities.mockReturnValue(new Set(["Rough Skin"]));
    render(
      <AbilityPicker
        value={null}
        species="Garchomp"
        format={format}
        onPick={jest.fn()}
        onClose={jest.fn()}
      />
    );
    expect(mockGetLegalAbilities).toHaveBeenCalledWith("Garchomp", format.id);
  });

  it("falls back to getValidAbilities when getLegalAbilities returns null", () => {
    const format = makeMockFormat();
    mockGetLegalAbilities.mockReturnValue(null);
    render(
      <AbilityPicker
        value={null}
        species="Garchomp"
        format={format}
        onPick={jest.fn()}
        onClose={jest.fn()}
      />
    );
    expect(mockGetValidAbilities).toHaveBeenCalledWith("Garchomp");
  });

  // ---------------------------------------------------------------------------
  // Search filtering
  // ---------------------------------------------------------------------------

  it("filters ability list as user types in search", async () => {
    const user = userEvent.setup();
    render(
      <AbilityPicker
        value={null}
        species="Garchomp"
        format={undefined}
        onPick={jest.fn()}
        onClose={jest.fn()}
      />
    );
    const input = screen.getByPlaceholderText("Search abilities…");
    await user.type(input, "rough");
    // Only matching abilities should remain
    expect(screen.getByText("Rough Skin")).toBeInTheDocument();
    expect(screen.queryByText("Sand Veil")).not.toBeInTheDocument();
  });

  it("shows 'No abilities found' when search matches nothing", async () => {
    const user = userEvent.setup();
    render(
      <AbilityPicker
        value={null}
        species="Garchomp"
        format={undefined}
        onPick={jest.fn()}
        onClose={jest.fn()}
      />
    );
    const input = screen.getByPlaceholderText("Search abilities…");
    await user.type(input, "zzz");
    expect(screen.getByText("No abilities found")).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Selection
  // ---------------------------------------------------------------------------

  it("clicking an ability calls onPick with the ability name and then onClose", async () => {
    const user = userEvent.setup();
    const onPick = jest.fn();
    const onClose = jest.fn();
    render(
      <AbilityPicker
        value={null}
        species="Garchomp"
        format={undefined}
        onPick={onPick}
        onClose={onClose}
      />
    );
    await user.click(screen.getByRole("button", { name: /rough skin/i }));
    expect(onPick).toHaveBeenCalledWith("Rough Skin");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("the currently selected ability button has a highlighted style class", () => {
    render(
      <AbilityPicker
        value="Rough Skin"
        species="Garchomp"
        format={undefined}
        onPick={jest.fn()}
        onClose={jest.fn()}
      />
    );
    const button = screen.getByRole("button", { name: /rough skin/i });
    expect(button.className).toContain("bg-accent");
  });

  // ---------------------------------------------------------------------------
  // Close
  // ---------------------------------------------------------------------------

  it("clicking close calls onClose without calling onPick", async () => {
    const user = userEvent.setup();
    const onPick = jest.fn();
    const onClose = jest.fn();
    render(
      <AbilityPicker
        value={null}
        species="Garchomp"
        format={undefined}
        onPick={onPick}
        onClose={onClose}
      />
    );
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onPick).not.toHaveBeenCalled();
  });
});
