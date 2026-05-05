"use client";

/**
 * Behavioral tests for CalcDefenderBlock.
 *
 * Covers:
 *   - "DEFENDER" eyebrow label renders
 *   - Target picker trigger button renders with aria-label
 *   - Picking a preset species triggers resetDefenderForSpecies with the preset spread
 *   - Picking a non-preset species triggers resetDefenderForSpecies with just the species
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
 */

import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

import type * as TrainersPokemon from "@trainers/pokemon";
import { type Tables } from "@trainers/supabase";

// =============================================================================
// Mocks
// =============================================================================


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

// Dialog — render content inline so the species picker is always queryable.
jest.mock("@/components/ui/dialog", () => ({
  Dialog: ({
    children,
    open,
  }: {
    children: React.ReactNode;
    open?: boolean;
  }) => (
    <div data-testid="dialog" data-open={String(!!open)}>
      {children}
    </div>
  ),
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
}));

// SpeciesPicker stub — exposes preset and non-preset pick buttons so we can
// drive resetDefenderForSpecies from the test without rendering the full
// virtualized table. "Incineroar" is in CALC_TARGETS (preset), "Gardevoir"
// isn't — that lets us cover both branches of handleTargetChange.
jest.mock("../pickers/species-picker", () => ({
  SpeciesPicker: ({
    value,
    onPick,
    onClose,
  }: {
    value: string | null;
    onPick: (s: string) => void;
    onClose: () => void;
  }) => (
    <div data-testid="species-picker" data-value={value ?? ""}>
      <button onClick={() => onPick("Incineroar")}>pick-incineroar</button>
      <button onClick={() => onPick("Gardevoir")}>pick-gardevoir</button>
      <button onClick={onClose}>close-species</button>
    </div>
  ),
}));

// @trainers/pokemon — mock the functions used by CalcDefenderBlock
const mockGetSpeciesTypes = jest.fn();
const mockGetValidAbilities = jest.fn();
const mockGetValidNatures = jest.fn();
const mockGetLegalAbilities = jest.fn();

jest.mock("@trainers/pokemon", () => {
  const actual = jest.requireActual<typeof TrainersPokemon>("@trainers/pokemon");
  return {
    ...actual,
    getSpeciesTypes: (...args: unknown[]) => mockGetSpeciesTypes(...args),
    getValidAbilities: (...args: unknown[]) => mockGetValidAbilities(...args),
    getValidNatures: (...args: unknown[]) => mockGetValidNatures(...args),
    getLegalAbilities: (...args: unknown[]) => mockGetLegalAbilities(...args),
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
});

// =============================================================================
// Tests
// =============================================================================

describe("CalcDefenderBlock — header", () => {
  it("renders the DEFENDER eyebrow label", () => {
    renderBlock();
    expect(screen.getByText("DEFENDER")).toBeInTheDocument();
  });

  it("renders the target picker trigger button with aria-label", () => {
    renderBlock();
    expect(screen.getByRole("button", { name: "Defender target" })).toBeInTheDocument();
  });

  it("shows the placeholder when no species is set", () => {
    renderBlock({ defenderSpecies: "" });
    const trigger = screen.getByRole("button", { name: "Defender target" });
    expect(trigger.textContent).toContain("Choose species…");
  });

  it("shows the species name in the trigger when defenderSpecies is set", () => {
    renderBlock({ defenderSpecies: "Incineroar" });
    const trigger = screen.getByRole("button", { name: "Defender target" });
    expect(trigger.textContent).toContain("Incineroar");
  });
});

describe("CalcDefenderBlock — target picker", () => {
  it("forwards the current defenderSpecies to the SpeciesPicker as `value`", () => {
    renderBlock({ defenderSpecies: "Incineroar" });
    expect(screen.getByTestId("species-picker")).toHaveAttribute(
      "data-value",
      "Incineroar"
    );
  });

  it("picking a preset species calls resetDefenderForSpecies with the preset spread", () => {
    const resetDefenderForSpecies = jest.fn();
    renderBlock({ resetDefenderForSpecies, defenderSpecies: "" });
    fireEvent.click(screen.getByText("pick-incineroar"));
    expect(resetDefenderForSpecies).toHaveBeenCalledWith(
      "Incineroar",
      expect.objectContaining({
        ability: "Intimidate",
        item: "Sitrus Berry",
        nature: "Careful",
      })
    );
  });

  it("picking a non-preset species calls resetDefenderForSpecies with just the species", () => {
    const resetDefenderForSpecies = jest.fn();
    renderBlock({ resetDefenderForSpecies, defenderSpecies: "Incineroar" });
    fireEvent.click(screen.getByText("pick-gardevoir"));
    expect(resetDefenderForSpecies).toHaveBeenCalledWith("Gardevoir");
    expect(resetDefenderForSpecies.mock.calls[0].length).toBe(1);
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
