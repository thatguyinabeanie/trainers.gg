"use client";

/**
 * Behavioral tests for CalcDefenderBlock.
 *
 * Covers:
 *   - "DEFENDER" eyebrow label renders
 *   - Target select renders preset options and fires resetDefenderForSpecies
 *   - Selecting a preset species triggers resetDefenderForSpecies with the preset spread
 *   - Selecting a teammate triggers resetDefenderForSpecies with just the species
 *   - Mon identity row: sprite, species name, type pills, ability/item/nature meta
 *   - No identity row when defenderSpecies is empty
 *   - EV number inputs for HP, DEF, SPD render with current values
 *   - EV input change calls setDefenderEv and clamps to 0–252
 *   - Nature select renders and calls setDefenderNature
 *   - Ability select renders and calls setDefenderAbility
 *   - Item select: quick items listed, current item included when not in list
 *   - Item select calls setDefenderItem
 *   - HP% slider renders, shows current percent, calls setDefenderHpPercent
 *   - Def and SpD stage buttons render, click calls setDefenderBoost
 *   - Legal teammates shown in "Your team" optgroup; illegal ones filtered out
 *   - Meta optgroup shown when getMetaSpeedTiers returns entries
 */

import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

import type * as TrainersPokemon from "@trainers/pokemon";
import { type Tables } from "@trainers/supabase";

// =============================================================================
// Mocks
// =============================================================================

jest.mock("../builder.module.css", () =>
  new Proxy({}, { get: (_t, k) => k })
);

// Sprite stub
jest.mock("../sprite", () => ({
  Sprite: ({ species }: { species: string }) => (
    <img data-testid="defender-sprite" alt={species} />
  ),
}));

// TypePill stub
jest.mock("../type-pill", () => ({
  TypePill: ({ t }: { t: string }) => (
    <span data-testid={`type-pill-${t}`}>{t}</span>
  ),
}));

// @trainers/pokemon — mock the functions used by CalcDefenderBlock
const mockGetSpeciesTypes = jest.fn();
const mockGetValidAbilities = jest.fn();
const mockGetValidNatures = jest.fn();
const mockGetLegalAbilities = jest.fn();
const mockGetMetaSpeedTiers = jest.fn();
const mockIsLegalSpecies = jest.fn();

jest.mock("@trainers/pokemon", () => {
  const actual = jest.requireActual<typeof TrainersPokemon>("@trainers/pokemon");
  return {
    ...actual,
    getSpeciesTypes: (...args: unknown[]) => mockGetSpeciesTypes(...args),
    getValidAbilities: (...args: unknown[]) => mockGetValidAbilities(...args),
    getValidNatures: (...args: unknown[]) => mockGetValidNatures(...args),
    getLegalAbilities: (...args: unknown[]) => mockGetLegalAbilities(...args),
    getMetaSpeedTiers: (...args: unknown[]) => mockGetMetaSpeedTiers(...args),
    isLegalSpecies: (...args: unknown[]) => mockIsLegalSpecies(...args),
  };
});

// =============================================================================
// Import after mocks
// =============================================================================

import { CalcDefenderBlock } from "../calc/calc-defender-block";
import {
  type DefenderEvs,
  type DefenderBoosts,
  type UseCalcStateReturn,
} from "../../use-calc-state";

// =============================================================================
// Fixtures
// =============================================================================

const VGC_FORMAT: TrainersPokemon.GameFormat = {
  id: "gen9vgc2026regi",
  game: "Scarlet & Violet",
  gameShort: "SV",
  generation: 9,
  category: "VGC",
  year: 2026,
  regulation: "I",
  label: "SV: Reg I",
  showdownName: "[Gen 9] VGC 2026 Reg I",
  doubles: true,
  active: true,
};

function makeEvs(overrides: Partial<DefenderEvs> = {}): DefenderEvs {
  return { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0, ...overrides };
}

function makeBoosts(overrides: Partial<DefenderBoosts> = {}): DefenderBoosts {
  return { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, ...overrides };
}

function makePokemon(overrides: Partial<Tables<"pokemon">> = {}): Tables<"pokemon"> {
  return {
    id: 1,
    species: "Incineroar",
    ability: "Intimidate",
    nature: "Careful",
    move1: "Knock Off",
    move2: "Fake Out",
    move3: null,
    move4: null,
    ev_hp: 252,
    ev_attack: 0,
    ev_defense: 4,
    ev_special_attack: 0,
    ev_special_defense: 252,
    ev_speed: 0,
    iv_hp: 31,
    iv_attack: 31,
    iv_defense: 31,
    iv_special_attack: 31,
    iv_special_defense: 31,
    iv_speed: 31,
    level: 50,
    held_item: "Sitrus Berry",
    nickname: null,
    notes: null,
    tera_type: "Fire",
    is_shiny: null,
    gender: null,
    format_legal: null,
    created_at: null,
    ...overrides,
  };
}

interface RenderProps {
  defenderSpecies?: string;
  defenderAbility?: string;
  defenderItem?: string;
  defenderNature?: string;
  defenderEvs?: DefenderEvs;
  defenderBoosts?: DefenderBoosts;
  defenderHpPercent?: number;
  setDefenderSpecies?: jest.Mock;
  setDefenderAbility?: jest.Mock;
  setDefenderItem?: jest.Mock;
  setDefenderNature?: jest.Mock;
  setDefenderEv?: jest.Mock;
  setDefenderBoost?: jest.Mock;
  setDefenderHpPercent?: jest.Mock;
  resetDefenderForSpecies?: jest.Mock;
  format?: TrainersPokemon.GameFormat | undefined;
  teammates?: Tables<"pokemon">[];
}

function renderBlock(props: RenderProps = {}) {
  const setDefenderSpecies = props.setDefenderSpecies ?? jest.fn();
  const setDefenderAbility = props.setDefenderAbility ?? jest.fn();
  const setDefenderItem = props.setDefenderItem ?? jest.fn();
  const setDefenderNature = props.setDefenderNature ?? jest.fn();
  const setDefenderEv = props.setDefenderEv ?? jest.fn();
  const setDefenderBoost = props.setDefenderBoost ?? jest.fn();
  const setDefenderHpPercent = props.setDefenderHpPercent ?? jest.fn();
  const resetDefenderForSpecies =
    props.resetDefenderForSpecies ?? (jest.fn() as jest.Mock & UseCalcStateReturn["resetDefenderForSpecies"]);

  const result = render(
    <CalcDefenderBlock
      defenderSpecies={props.defenderSpecies ?? "Incineroar"}
      defenderAbility={props.defenderAbility ?? "Intimidate"}
      defenderItem={props.defenderItem ?? "Sitrus Berry"}
      defenderNature={props.defenderNature ?? "Careful"}
      defenderEvs={props.defenderEvs ?? makeEvs({ hp: 252, spd: 252 })}
      defenderBoosts={props.defenderBoosts ?? makeBoosts()}
      defenderHpPercent={props.defenderHpPercent ?? 100}
      setDefenderSpecies={setDefenderSpecies}
      setDefenderAbility={setDefenderAbility}
      setDefenderItem={setDefenderItem}
      setDefenderNature={setDefenderNature}
      setDefenderEv={setDefenderEv}
      setDefenderBoost={setDefenderBoost}
      setDefenderHpPercent={setDefenderHpPercent}
      resetDefenderForSpecies={resetDefenderForSpecies as UseCalcStateReturn["resetDefenderForSpecies"]}
      format={props.format ?? VGC_FORMAT}
      teammates={props.teammates ?? []}
    />
  );

  return {
    ...result,
    setDefenderSpecies,
    setDefenderAbility,
    setDefenderItem,
    setDefenderNature,
    setDefenderEv,
    setDefenderBoost,
    setDefenderHpPercent,
    resetDefenderForSpecies,
  };
}

// =============================================================================
// Setup
// =============================================================================

beforeEach(() => {
  jest.clearAllMocks();
  mockGetSpeciesTypes.mockReturnValue(["Fire", "Dark"]);
  mockGetValidAbilities.mockReturnValue(["Intimidate", "Blaze", "Flash Fire"]);
  mockGetValidNatures.mockReturnValue(["Hardy", "Adamant", "Jolly", "Timid", "Careful", "Modest"]);
  mockGetLegalAbilities.mockReturnValue(null); // falls through to getValidAbilities
  mockGetMetaSpeedTiers.mockReturnValue([]);
  // Default: all species are legal
  mockIsLegalSpecies.mockReturnValue(true);
});

// =============================================================================
// Tests
// =============================================================================

describe("CalcDefenderBlock — header", () => {
  it("renders the DEFENDER eyebrow label", () => {
    renderBlock();
    expect(screen.getByText("DEFENDER")).toBeInTheDocument();
  });

  it("renders the target select with aria-label", () => {
    renderBlock();
    expect(screen.getByRole("combobox", { name: "Defender target" })).toBeInTheDocument();
  });
});

describe("CalcDefenderBlock — target select", () => {
  it("shows preset species as select options", () => {
    renderBlock();
    const select = screen.getByRole("combobox", { name: "Defender target" });
    // Incineroar is in CALC_TARGETS
    expect(select).toContainHTML("Incineroar");
  });

  it("selecting a preset species calls resetDefenderForSpecies with preset spread", () => {
    const resetDefenderForSpecies = jest.fn();
    renderBlock({ resetDefenderForSpecies, defenderSpecies: "" });
    const select = screen.getByRole("combobox", { name: "Defender target" });
    fireEvent.change(select, { target: { value: "Incineroar" } });
    expect(resetDefenderForSpecies).toHaveBeenCalledWith(
      "Incineroar",
      expect.objectContaining({
        ability: "Intimidate",
        item: "Sitrus Berry",
        nature: "Careful",
      })
    );
  });

  it("selecting a species not in presets (teammate) calls resetDefenderForSpecies with just species", () => {
    const resetDefenderForSpecies = jest.fn();
    const teammate = makePokemon({ id: 99, species: "Gardevoir" });
    // Make the preset filter exclude Gardevoir — isLegalSpecies returns true for all
    // but Gardevoir is not in CALC_TARGETS, so it's a teammate-only option
    renderBlock({
      resetDefenderForSpecies,
      teammates: [teammate],
      defenderSpecies: "Incineroar",
    });
    const select = screen.getByRole("combobox", { name: "Defender target" });
    fireEvent.change(select, { target: { value: "Gardevoir" } });
    expect(resetDefenderForSpecies).toHaveBeenCalledWith("Gardevoir");
    // No spread object as second arg
    expect(resetDefenderForSpecies.mock.calls[0].length).toBe(1);
  });

  it("shows 'Your team' optgroup when legal teammates exist", () => {
    const teammate = makePokemon({ id: 2, species: "Gardevoir" });
    renderBlock({ teammates: [teammate] });
    // optgroup is rendered in the DOM
    const optgroup = document.querySelector("optgroup[label='Your team']");
    expect(optgroup).toBeInTheDocument();
  });

  it("does NOT show 'Your team' optgroup when no teammates", () => {
    renderBlock({ teammates: [] });
    const optgroup = document.querySelector("optgroup[label='Your team']");
    expect(optgroup).not.toBeInTheDocument();
  });

  it("filters out illegal teammates from the 'Your team' optgroup", () => {
    const legalTeammate = makePokemon({ id: 2, species: "Garchomp" });
    const illegalTeammate = makePokemon({ id: 3, species: "Calyrex-Shadow" });
    // Make Calyrex-Shadow illegal for the format
    mockIsLegalSpecies.mockImplementation((species: string) => species !== "Calyrex-Shadow");
    renderBlock({ teammates: [legalTeammate, illegalTeammate] });
    const optgroup = document.querySelector("optgroup[label='Your team']");
    expect(optgroup).toBeInTheDocument();
    expect(optgroup?.innerHTML).toContain("Garchomp");
    expect(optgroup?.innerHTML).not.toContain("Calyrex-Shadow");
  });

  it("shows Meta optgroup when getMetaSpeedTiers returns entries", () => {
    mockGetMetaSpeedTiers.mockReturnValue([
      { species: "Garchomp", displayName: "Garchomp (Meta)" },
    ]);
    renderBlock();
    const optgroup = document.querySelector("optgroup[label='Meta']");
    expect(optgroup).toBeInTheDocument();
  });

  it("does NOT show Meta optgroup when getMetaSpeedTiers returns empty array", () => {
    mockGetMetaSpeedTiers.mockReturnValue([]);
    renderBlock();
    const optgroup = document.querySelector("optgroup[label='Meta']");
    expect(optgroup).not.toBeInTheDocument();
  });
});

describe("CalcDefenderBlock — mon identity row", () => {
  it("renders defender sprite when species is set", () => {
    renderBlock({ defenderSpecies: "Incineroar" });
    expect(screen.getByTestId("defender-sprite")).toBeInTheDocument();
  });

  it("renders species name in the identity row", () => {
    renderBlock({ defenderSpecies: "Incineroar" });
    // May appear in target select and identity row — at least one occurrence
    expect(screen.getAllByText("Incineroar").length).toBeGreaterThanOrEqual(1);
  });

  it("renders type pills for the defender's types", () => {
    mockGetSpeciesTypes.mockReturnValue(["Fire", "Dark"]);
    renderBlock({ defenderSpecies: "Incineroar" });
    expect(screen.getByTestId("type-pill-Fire")).toBeInTheDocument();
    expect(screen.getByTestId("type-pill-Dark")).toBeInTheDocument();
  });

  it("renders ability in the meta line", () => {
    renderBlock({ defenderSpecies: "Incineroar", defenderAbility: "Intimidate" });
    // "Intimidate" appears in both the meta line <span> and the ability <select>
    expect(screen.getAllByText("Intimidate").length).toBeGreaterThanOrEqual(1);
  });

  it("renders item in the meta line with @ prefix", () => {
    renderBlock({ defenderSpecies: "Incineroar", defenderItem: "Sitrus Berry" });
    expect(screen.getByText(/@ Sitrus Berry/)).toBeInTheDocument();
  });

  it("shows 'None' when no item is set", () => {
    renderBlock({ defenderSpecies: "Incineroar", defenderItem: "" });
    expect(screen.getByText(/@ None/)).toBeInTheDocument();
  });

  it("renders nature in the meta line", () => {
    renderBlock({ defenderSpecies: "Incineroar", defenderNature: "Calm" });
    expect(screen.getByText("Calm")).toBeInTheDocument();
  });

  it("does NOT render the identity row when defenderSpecies is empty", () => {
    renderBlock({ defenderSpecies: "" });
    expect(screen.queryByTestId("defender-sprite")).not.toBeInTheDocument();
  });
});

describe("CalcDefenderBlock — EV inputs (HP, DEF, SPD)", () => {
  it("renders HP EV input with aria-label", () => {
    renderBlock({ defenderEvs: makeEvs({ hp: 252 }) });
    const input = screen.getByRole("spinbutton", { name: "HP EVs" });
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue(252);
  });

  it("renders DEF EV input with aria-label", () => {
    renderBlock({ defenderEvs: makeEvs({ def: 100 }) });
    const input = screen.getByRole("spinbutton", { name: "DEF EVs" });
    expect(input).toHaveValue(100);
  });

  it("renders SPD EV input with aria-label", () => {
    renderBlock({ defenderEvs: makeEvs({ spd: 128 }) });
    const input = screen.getByRole("spinbutton", { name: "SPD EVs" });
    expect(input).toHaveValue(128);
  });

  it("changing HP EV input calls setDefenderEv('hp', value)", () => {
    const setDefenderEv = jest.fn();
    renderBlock({ setDefenderEv });
    const input = screen.getByRole("spinbutton", { name: "HP EVs" });
    fireEvent.change(input, { target: { value: "200" } });
    expect(setDefenderEv).toHaveBeenCalledWith("hp", 200);
  });

  it("clamps EV input to 252 max", () => {
    const setDefenderEv = jest.fn();
    renderBlock({ setDefenderEv });
    const input = screen.getByRole("spinbutton", { name: "HP EVs" });
    fireEvent.change(input, { target: { value: "999" } });
    expect(setDefenderEv).toHaveBeenCalledWith("hp", 252);
  });

  it("clamps EV input to 0 min", () => {
    const setDefenderEv = jest.fn();
    renderBlock({ setDefenderEv });
    const input = screen.getByRole("spinbutton", { name: "DEF EVs" });
    fireEvent.change(input, { target: { value: "-10" } });
    expect(setDefenderEv).toHaveBeenCalledWith("def", 0);
  });

  it("does NOT call setDefenderEv when value is non-numeric (NaN guard)", () => {
    const setDefenderEv = jest.fn();
    renderBlock({ setDefenderEv });
    const input = screen.getByRole("spinbutton", { name: "HP EVs" });
    fireEvent.change(input, { target: { value: "" } });
    expect(setDefenderEv).not.toHaveBeenCalled();
  });

  it.each([
    ["HP EVs", "hp", 196],
    ["DEF EVs", "def", 52],
    ["SPD EVs", "spd", 100],
  ] as const)(
    "%s input with value %i calls setDefenderEv correctly",
    (label, stat, value) => {
      const setDefenderEv = jest.fn();
      renderBlock({ setDefenderEv });
      const input = screen.getByRole("spinbutton", { name: label });
      fireEvent.change(input, { target: { value: String(value) } });
      expect(setDefenderEv).toHaveBeenCalledWith(stat, value);
    }
  );
});

describe("CalcDefenderBlock — nature select", () => {
  it("renders the nature select with aria-label", () => {
    renderBlock();
    expect(screen.getByRole("combobox", { name: "Defender nature" })).toBeInTheDocument();
  });

  it("current nature is selected", () => {
    renderBlock({ defenderNature: "Timid" });
    const select = screen.getByRole("combobox", { name: "Defender nature" });
    expect(select).toHaveValue("Timid");
  });

  it("changing nature calls setDefenderNature", () => {
    const setDefenderNature = jest.fn();
    renderBlock({ setDefenderNature });
    const select = screen.getByRole("combobox", { name: "Defender nature" });
    fireEvent.change(select, { target: { value: "Adamant" } });
    expect(setDefenderNature).toHaveBeenCalledWith("Adamant");
  });
});

describe("CalcDefenderBlock — ability select", () => {
  it("renders the ability select with aria-label", () => {
    renderBlock();
    expect(screen.getByRole("combobox", { name: "Defender ability" })).toBeInTheDocument();
  });

  it("current ability is selected", () => {
    renderBlock({ defenderAbility: "Intimidate" });
    const select = screen.getByRole("combobox", { name: "Defender ability" });
    expect(select).toHaveValue("Intimidate");
  });

  it("changing ability calls setDefenderAbility", () => {
    const setDefenderAbility = jest.fn();
    renderBlock({ setDefenderAbility });
    const select = screen.getByRole("combobox", { name: "Defender ability" });
    fireEvent.change(select, { target: { value: "Flash Fire" } });
    expect(setDefenderAbility).toHaveBeenCalledWith("Flash Fire");
  });

  it("uses getLegalAbilities abilities when format is provided and returns non-null", () => {
    mockGetLegalAbilities.mockReturnValue(new Set(["Intimidate", "Flash Fire"]));
    renderBlock({ format: VGC_FORMAT });
    const select = screen.getByRole("combobox", { name: "Defender ability" });
    expect(select.innerHTML).toContain("Intimidate");
    expect(select.innerHTML).toContain("Flash Fire");
  });

  it("falls back to getValidAbilities when getLegalAbilities returns null", () => {
    mockGetLegalAbilities.mockReturnValue(null);
    renderBlock({ format: VGC_FORMAT });
    expect(mockGetValidAbilities).toHaveBeenCalledWith("Incineroar");
  });
});

describe("CalcDefenderBlock — item select", () => {
  it("renders the item select with aria-label", () => {
    renderBlock();
    expect(screen.getByRole("combobox", { name: "Defender item" })).toBeInTheDocument();
  });

  it("shows quick items in the select", () => {
    renderBlock({ defenderItem: "" });
    const select = screen.getByRole("combobox", { name: "Defender item" });
    expect(select.innerHTML).toContain("Sitrus Berry");
    expect(select.innerHTML).toContain("Leftovers");
    expect(select.innerHTML).toContain("Assault Vest");
  });

  it("prepends a custom item that's not in QUICK_ITEMS", () => {
    renderBlock({ defenderItem: "Choice Band" });
    const select = screen.getByRole("combobox", { name: "Defender item" });
    expect(select.innerHTML).toContain("Choice Band");
  });

  it("does not duplicate the item when it IS in QUICK_ITEMS", () => {
    renderBlock({ defenderItem: "Sitrus Berry" });
    const select = screen.getByRole("combobox", { name: "Defender item" });
    // Count <option> elements that contain "Sitrus Berry" as text content (not value attr)
    const options = Array.from(select.querySelectorAll("option")).filter(
      (opt) => opt.textContent === "Sitrus Berry"
    );
    expect(options.length).toBe(1);
  });

  it("changing item calls setDefenderItem with the selected value", () => {
    const setDefenderItem = jest.fn();
    renderBlock({ setDefenderItem, defenderItem: "" });
    const select = screen.getByRole("combobox", { name: "Defender item" });
    fireEvent.change(select, { target: { value: "Leftovers" } });
    expect(setDefenderItem).toHaveBeenCalledWith("Leftovers");
  });
});

describe("CalcDefenderBlock — HP% slider", () => {
  it("renders the HP% slider with aria-label", () => {
    renderBlock();
    expect(screen.getByRole("slider", { name: "Defender HP percent" })).toBeInTheDocument();
  });

  it("slider reflects current HP percent", () => {
    renderBlock({ defenderHpPercent: 75 });
    const slider = screen.getByRole("slider", { name: "Defender HP percent" });
    expect(slider).toHaveValue("75");
  });

  it("slider min=1 max=100", () => {
    renderBlock();
    const slider = screen.getByRole("slider", { name: "Defender HP percent" });
    expect(slider).toHaveAttribute("min", "1");
    expect(slider).toHaveAttribute("max", "100");
  });

  it("shows HP% readout label", () => {
    renderBlock({ defenderHpPercent: 60 });
    expect(screen.getByText("60%")).toBeInTheDocument();
  });

  it("changing slider calls setDefenderHpPercent", () => {
    const setDefenderHpPercent = jest.fn();
    renderBlock({ setDefenderHpPercent });
    const slider = screen.getByRole("slider", { name: "Defender HP percent" });
    fireEvent.change(slider, { target: { value: "50" } });
    expect(setDefenderHpPercent).toHaveBeenCalledWith(50);
  });
});

describe("CalcDefenderBlock — stage buttons (Def and SpD)", () => {
  it("renders stage buttons for Def row", () => {
    renderBlock();
    // Each row has a label — find DEF label in stage section
    expect(screen.getByText("Def")).toBeInTheDocument();
  });

  it("renders stage buttons for SpD row", () => {
    renderBlock();
    expect(screen.getByText("SpD")).toBeInTheDocument();
  });

  it("the active Def stage is aria-pressed=true", () => {
    renderBlock({ defenderBoosts: makeBoosts({ def: 2 }) });
    // Find buttons with +2 text and aria-pressed attribute (stage buttons)
    const plus2Buttons = screen.getAllByRole("button").filter(
      (btn) => btn.textContent === "+2" && btn.getAttribute("aria-pressed") !== null
    );
    const activeButton = plus2Buttons.find(
      (btn) => btn.getAttribute("aria-pressed") === "true"
    );
    expect(activeButton).toBeDefined();
  });

  it("clicking a Def stage button calls setDefenderBoost('def', value)", () => {
    const setDefenderBoost = jest.fn();
    renderBlock({ setDefenderBoost });
    // DEF stage buttons are the first row of stage buttons
    // Find all +1 buttons (aria-pressed) — first occurrence is DEF row
    const plus1Buttons = screen.getAllByRole("button").filter(
      (btn) => btn.textContent === "+1" && btn.getAttribute("aria-pressed") !== null
    );
    fireEvent.click(plus1Buttons[0]); // Def row is first
    expect(setDefenderBoost).toHaveBeenCalledWith("def", 1);
  });

  it("clicking a SpD stage button calls setDefenderBoost('spd', value)", () => {
    const setDefenderBoost = jest.fn();
    renderBlock({ setDefenderBoost });
    const minus1Buttons = screen.getAllByRole("button").filter(
      (btn) => btn.textContent === "-1" && btn.getAttribute("aria-pressed") !== null
    );
    // SpD is the second stage row
    fireEvent.click(minus1Buttons[1]);
    expect(setDefenderBoost).toHaveBeenCalledWith("spd", -1);
  });

  it.each([
    [0, "def", 3, "+3"],
    [1, "spd", -3, "-3"],
  ] as const)(
    "row %i stat '%s' clicking '%s' fires setDefenderBoost(stat, %i)",
    (rowIdx, stat, value, label) => {
      const setDefenderBoost = jest.fn();
      renderBlock({ setDefenderBoost });
      const buttons = screen.getAllByRole("button").filter(
        (btn) => btn.textContent === label && btn.getAttribute("aria-pressed") !== null
      );
      fireEvent.click(buttons[rowIdx]);
      expect(setDefenderBoost).toHaveBeenCalledWith(stat, value);
    }
  );
});

describe("CalcDefenderBlock — format-aware abilities", () => {
  it("uses getValidAbilities directly when no format is provided", () => {
    renderBlock({ format: undefined });
    expect(mockGetValidAbilities).toHaveBeenCalledWith("Incineroar");
  });

  it("calls getLegalAbilities with species and format id when format is provided", () => {
    mockGetLegalAbilities.mockReturnValue(new Set(["Intimidate"]));
    renderBlock({ format: VGC_FORMAT });
    expect(mockGetLegalAbilities).toHaveBeenCalledWith("Incineroar", VGC_FORMAT.id);
  });
});
