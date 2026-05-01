"use client";

/**
 * Behavioral tests for CalcDefenderStats and its internal DefenderStatRow.
 *
 * Covers:
 *   - Static render: stat labels, base stats, species name, type pills
 *   - No-species fallback (default 50 base stats)
 *   - Nature chevrons (▲ boosted / ▽ reduced) on correct rows
 *   - EV text input display (nature suffix, raw number)
 *   - EV text input: commit on blur, clamp, snap to step
 *   - EV text input: Enter key commits, Escape reverts
 *   - EV slider values reflect current EVs
 *   - Stage boost display (applyStage math for positive/negative/zero)
 *   - HP percent slider and HP readout
 *   - Total EV counter display
 *   - Tera chip visible only for tera-supporting formats
 *   - Ability "No abilities found" message when legalAbilities is empty
 *   - setDefenderEv and setDefenderBoost callbacks fire correctly
 *   - setDefenderHpPercent fires on HP slider change
 */

import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

import type * as TrainersPokemon from "@trainers/pokemon";
import { type GameFormat } from "@trainers/pokemon";

// =============================================================================
// Mocks
// =============================================================================

// CSS modules — identity proxy so every class lookup returns the key name.
jest.mock("../builder.module.css", () =>
  new Proxy({}, { get: (_t, k) => k })
);

// Mock heavy child pickers so they don't need their own dependencies.
jest.mock("../pickers/ability-picker", () => ({
  AbilityPicker: () => <div data-testid="ability-picker" />,
}));

jest.mock("../pickers/item-picker", () => ({
  ItemPicker: () => <div data-testid="item-picker" />,
}));

jest.mock("../pickers/nature-picker", () => ({
  NaturePicker: () => <div data-testid="nature-picker" />,
}));

jest.mock("../pickers/species-picker", () => ({
  SpeciesPicker: () => <div data-testid="species-picker" />,
}));

jest.mock("../pickers/type-picker", () => ({
  TypePicker: () => <div data-testid="type-picker" />,
}));

// Sprite — lightweight stub.
jest.mock("../sprite", () => ({
  Sprite: ({ species }: { species: string }) => (
    <img data-testid="sprite" alt={species} />
  ),
}));

// TypePill — stub that renders a visible badge.
jest.mock("../type-pill", () => ({
  TypePill: ({ t }: { t: string }) => (
    <span data-testid={`type-pill-${t}`}>{t}</span>
  ),
}));

// StageDropdown — render a simple select so we can fire change events.
jest.mock("../calc/stage-dropdown", () => ({
  StageDropdown: ({
    value,
    onChange,
    statKey,
  }: {
    value: number;
    onChange: (v: number) => void;
    statKey: string;
  }) => (
    <select
      data-testid={`stage-${statKey}`}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      aria-label={`${statKey.toUpperCase()} stat stage`}
    >
      {[-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6].map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  ),
}));

// Popover — render children inline so popover content is always queryable.
jest.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PopoverTrigger: ({
    children,
    className,
    ...rest
  }: {
    children: React.ReactNode;
    className?: string;
    [key: string]: unknown;
  }) => (
    <button type="button" className={className} {...rest}>
      {children}
    </button>
  ),
  PopoverContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

// Mock @trainers/pokemon with deterministic implementations.
const mockGetBaseStats = jest.fn();
const mockGetSpeciesTypes = jest.fn();
const mockGetLegalAbilities = jest.fn();
const mockGetValidAbilities = jest.fn();
const mockGetNatureMultiplier = jest.fn();
const mockFindStatBreakpoints = jest.fn();
const mockIsChampionsFormat = jest.fn();

jest.mock("@trainers/pokemon", () => {
  const actual = jest.requireActual<typeof TrainersPokemon>("@trainers/pokemon");
  return {
    ...actual,
    getBaseStats: (...args: unknown[]) => mockGetBaseStats(...args),
    getSpeciesTypes: (...args: unknown[]) => mockGetSpeciesTypes(...args),
    getLegalAbilities: (...args: unknown[]) => mockGetLegalAbilities(...args),
    getValidAbilities: (...args: unknown[]) => mockGetValidAbilities(...args),
    getNatureMultiplier: (...args: unknown[]) =>
      mockGetNatureMultiplier(...args),
    findStatBreakpoints: (...args: unknown[]) =>
      mockFindStatBreakpoints(...args),
    isChampionsFormat: (...args: unknown[]) => mockIsChampionsFormat(...args),
    // Use real NATURE_EFFECTS so nature chevron logic works correctly.
    NATURE_EFFECTS: actual.NATURE_EFFECTS,
  };
});

// Import AFTER mocks.
import { CalcDefenderStats } from "../calc/calc-defender-stats";
import {
  type DefenderEvs,
  type DefenderIvs,
  type DefenderBoosts,
} from "../../use-calc-state";

// =============================================================================
// Fixtures
// =============================================================================

/** Garchomp base stats (used by mockGetBaseStats). */
const GARCHOMP_BASE = {
  hp: 108,
  attack: 130,
  defense: 95,
  specialAttack: 80,
  specialDefense: 85,
  speed: 102,
};

/** A VGC format that supports Tera. */
const VGC_FORMAT: GameFormat = {
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

/** A format that does NOT support Tera (Gen 8). */
const GEN8_FORMAT: GameFormat = {
  id: "gen8vgc2022",
  game: "Sword & Shield",
  gameShort: "SwSh",
  generation: 8,
  category: "VGC",
  year: 2022,
  regulation: "D",
  label: "SwSh: Reg D",
  showdownName: "[Gen 8] VGC 2022 Series 12",
  doubles: true,
  active: false,
};

function makeDefaultEvs(overrides: Partial<DefenderEvs> = {}): DefenderEvs {
  return { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0, ...overrides };
}

function makeDefaultIvs(overrides: Partial<DefenderIvs> = {}): DefenderIvs {
  return {
    hp: 31,
    atk: 31,
    def: 31,
    spa: 31,
    spd: 31,
    spe: 31,
    ...overrides,
  };
}

function makeDefaultBoosts(
  overrides: Partial<DefenderBoosts> = {}
): DefenderBoosts {
  return { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, ...overrides };
}

/** Sentinel so callers can explicitly pass format=undefined without the helper defaulting to VGC_FORMAT. */
const UNDEFINED_FORMAT = Symbol("undefined-format");

interface RenderProps {
  defenderSpecies?: string;
  defenderAbility?: string;
  defenderItem?: string;
  defenderNature?: string;
  defenderTera?: string;
  defenderEvs?: DefenderEvs;
  defenderIvs?: DefenderIvs;
  defenderBoosts?: DefenderBoosts;
  defenderHpPercent?: number;
  /** Pass `undefined` to use no format; omit to default to VGC_FORMAT. */
  format?: GameFormat | typeof UNDEFINED_FORMAT;
  setDefenderSpecies?: jest.Mock;
  setDefenderAbility?: jest.Mock;
  setDefenderItem?: jest.Mock;
  setDefenderNature?: jest.Mock;
  setDefenderTera?: jest.Mock;
  setDefenderEv?: jest.Mock;
  setDefenderBoost?: jest.Mock;
  setDefenderHpPercent?: jest.Mock;
}

function renderComponent(props: RenderProps = {}) {
  const setDefenderSpecies = props.setDefenderSpecies ?? jest.fn();
  const setDefenderAbility = props.setDefenderAbility ?? jest.fn();
  const setDefenderItem = props.setDefenderItem ?? jest.fn();
  const setDefenderNature = props.setDefenderNature ?? jest.fn();
  const setDefenderTera = props.setDefenderTera ?? jest.fn();
  const setDefenderEv = props.setDefenderEv ?? jest.fn();
  const setDefenderBoost = props.setDefenderBoost ?? jest.fn();
  const setDefenderHpPercent = props.setDefenderHpPercent ?? jest.fn();

  // Resolve format: caller may explicitly pass UNDEFINED_FORMAT to mean undefined.
  const resolvedFormat: GameFormat | undefined =
    props.format === UNDEFINED_FORMAT
      ? undefined
      : props.format === undefined
        ? VGC_FORMAT
        : (props.format as GameFormat);

  const result = render(
    <CalcDefenderStats
      defenderSpecies={props.defenderSpecies ?? "Garchomp"}
      defenderAbility={props.defenderAbility ?? "Rough Skin"}
      defenderItem={props.defenderItem ?? ""}
      defenderNature={props.defenderNature ?? "Hardy"}
      defenderTera={props.defenderTera ?? ""}
      defenderEvs={props.defenderEvs ?? makeDefaultEvs()}
      defenderIvs={props.defenderIvs ?? makeDefaultIvs()}
      defenderBoosts={props.defenderBoosts ?? makeDefaultBoosts()}
      defenderHpPercent={props.defenderHpPercent ?? 100}
      format={resolvedFormat}
      setDefenderSpecies={setDefenderSpecies}
      setDefenderAbility={setDefenderAbility}
      setDefenderItem={setDefenderItem}
      setDefenderNature={setDefenderNature}
      setDefenderTera={setDefenderTera}
      setDefenderEv={setDefenderEv}
      setDefenderBoost={setDefenderBoost}
      setDefenderHpPercent={setDefenderHpPercent}
    />
  );

  return {
    ...result,
    setDefenderSpecies,
    setDefenderAbility,
    setDefenderItem,
    setDefenderNature,
    setDefenderTera,
    setDefenderEv,
    setDefenderBoost,
    setDefenderHpPercent,
  };
}

// =============================================================================
// Setup
// =============================================================================

beforeEach(() => {
  jest.clearAllMocks();
  mockGetBaseStats.mockReturnValue(GARCHOMP_BASE);
  mockGetSpeciesTypes.mockReturnValue(["Dragon", "Ground"]);
  mockGetLegalAbilities.mockReturnValue(null); // falls back to valid
  mockGetValidAbilities.mockReturnValue(["Rough Skin", "Sand Veil", "Sand Force"]);
  mockGetNatureMultiplier.mockReturnValue(1.0);
  mockFindStatBreakpoints.mockReturnValue([]);
  // Default VGC_FORMAT is not Champions.
  mockIsChampionsFormat.mockReturnValue(false);
});

// =============================================================================
// Tests
// =============================================================================

describe("CalcDefenderStats — basic render", () => {
  it("renders all 6 stat labels", () => {
    renderComponent();
    // HP appears twice (stat label row + HP percent slider label) — use getAllByText
    expect(screen.getAllByText("HP").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Atk")).toBeInTheDocument();
    expect(screen.getByText("Def")).toBeInTheDocument();
    expect(screen.getByText("SpA")).toBeInTheDocument();
    expect(screen.getByText("SpD")).toBeInTheDocument();
    expect(screen.getByText("Spe")).toBeInTheDocument();
  });

  it("renders the species name as the trigger label", () => {
    renderComponent({ defenderSpecies: "Garchomp" });
    expect(screen.getByText("Garchomp")).toBeInTheDocument();
  });

  it("shows '—' when species is empty", () => {
    mockGetBaseStats.mockReturnValue(null);
    mockGetSpeciesTypes.mockReturnValue([]);
    renderComponent({ defenderSpecies: "", format: UNDEFINED_FORMAT });
    // The species trigger renders '—' (other empty chips may also render '—')
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(1);
  });

  it("renders the sprite", () => {
    renderComponent();
    expect(screen.getByTestId("sprite")).toBeInTheDocument();
  });

  it("renders type pills for each species type", () => {
    mockGetSpeciesTypes.mockReturnValue(["Dragon", "Ground"]);
    renderComponent();
    expect(screen.getByTestId("type-pill-Dragon")).toBeInTheDocument();
    expect(screen.getByTestId("type-pill-Ground")).toBeInTheDocument();
  });

  it("renders no type pills when species has no types", () => {
    mockGetSpeciesTypes.mockReturnValue([]);
    mockGetBaseStats.mockReturnValue(null);
    renderComponent({ defenderSpecies: "", format: UNDEFINED_FORMAT });
    expect(screen.queryByTestId(/^type-pill-/)).not.toBeInTheDocument();
  });

  it("renders the Garchomp HP base stat (108)", () => {
    renderComponent();
    // 108 appears in the base-stat column for HP
    expect(screen.getAllByText("108").length).toBeGreaterThanOrEqual(1);
  });

  it("renders 6 EV text inputs (one per stat)", () => {
    renderComponent();
    const inputs = screen.getAllByRole("textbox");
    expect(inputs.length).toBe(6);
  });

  it("renders 6 EV sliders (one per stat)", () => {
    renderComponent();
    const sliders = screen.getAllByRole("slider");
    // 6 EV sliders + 1 HP percent slider = 7 total
    expect(sliders.length).toBe(7);
  });

  it("renders the 'Spread' header label", () => {
    renderComponent();
    expect(screen.getByText("Spread")).toBeInTheDocument();
  });
});

// =============================================================================
// No-species fallback
// =============================================================================

describe("CalcDefenderStats — no-species fallback", () => {
  it("falls back to 50 base stats when getBaseStats returns null", () => {
    mockGetBaseStats.mockReturnValue(null);
    renderComponent({ defenderSpecies: "" });
    // All base stats columns should show 50
    const fifties = screen.getAllByText("50");
    expect(fifties.length).toBeGreaterThanOrEqual(6);
  });
});

// =============================================================================
// Nature chevrons
// =============================================================================

describe("CalcDefenderStats — nature chevrons", () => {
  it("renders ▲ on Atk row and ▽ on SpA row for Adamant nature", () => {
    renderComponent({ defenderNature: "Adamant" }); // +Atk / −SpA
    const upChevrons = screen.getAllByText("▲");
    expect(upChevrons).toHaveLength(1);
    const downChevrons = screen.getAllByText("▽");
    expect(downChevrons).toHaveLength(1);
  });

  it("renders no nature chevrons for Hardy (neutral nature)", () => {
    renderComponent({ defenderNature: "Hardy" });
    expect(screen.queryByText("▲")).not.toBeInTheDocument();
    expect(screen.queryByText("▽")).not.toBeInTheDocument();
  });

  it("uses Hardy as default when defenderNature is empty string", () => {
    renderComponent({ defenderNature: "" });
    // No nature chevrons — defaults to Hardy which is neutral
    expect(screen.queryByText("▲")).not.toBeInTheDocument();
    expect(screen.queryByText("▽")).not.toBeInTheDocument();
  });

  it.each([
    ["Modest", "SpA", "Atk"], // +SpA / −Atk
    ["Jolly", "Spe", "SpA"], // +Spe / −SpA
    ["Timid", "Spe", "Atk"], // +Spe / −Atk
    ["Bold", "Def", "Atk"], // +Def / −Atk
  ])(
    "%s nature shows ▲ on %s row and ▽ on %s row",
    (nature, boostedLabel, reducedLabel) => {
      renderComponent({ defenderNature: nature });
      expect(screen.getAllByText("▲")).toHaveLength(1);
      expect(screen.getAllByText("▽")).toHaveLength(1);
      // Verify the chevron is adjacent to the correct label text
      const boostedEl = screen.getByText(boostedLabel);
      expect(boostedEl.closest("span")?.textContent).toContain("▲");
      const reducedEl = screen.getByText(reducedLabel);
      expect(reducedEl.closest("span")?.textContent).toContain("▽");
    }
  );
});

// =============================================================================
// EV text input display
// =============================================================================

describe("CalcDefenderStats — EV input display values", () => {
  it.each([
    // [evKey, ev, nature, expectedDisplay]
    ["HP", 0, "Hardy", ""],
    ["HP", 100, "Hardy", "100"],
    ["Atk", 0, "Adamant", "+"],  // Adamant = +Atk
    ["Atk", 252, "Adamant", "252+"],
    ["SpA", 0, "Adamant", "−"],  // Adamant = −SpA
    ["SpA", 100, "Adamant", "100−"],
  ] as const)(
    "%s EV=%i nature=%s → input shows '%s'",
    (statLabel, ev, nature, expected) => {
      const evKeyMap: Record<string, keyof DefenderEvs> = {
        HP: "hp",
        Atk: "atk",
        SpA: "spa",
      };
      const evKey = evKeyMap[statLabel] as keyof DefenderEvs;
      renderComponent({
        defenderNature: nature,
        defenderEvs: makeDefaultEvs({ [evKey]: ev }),
      });

      const input = screen.getByRole("textbox", {
        name: new RegExp(`${statLabel} EVs`, "i"),
      });
      expect(input).toHaveValue(expected);
    }
  );
});

// =============================================================================
// EV input — commit on blur
// =============================================================================

describe("CalcDefenderStats — EV input commit", () => {
  it("calls setDefenderEv with snapped value when HP input is blurred", () => {
    const setDefenderEv = jest.fn();
    renderComponent({ setDefenderEv });

    const hpInput = screen.getByRole("textbox", { name: /HP EVs/i });
    fireEvent.focus(hpInput);
    fireEvent.change(hpInput, { target: { value: "100" } });
    fireEvent.blur(hpInput, { target: { value: "100" } });

    // 100 is already a multiple of 4
    expect(setDefenderEv).toHaveBeenCalledWith("hp", 100);
  });

  it("snaps to nearest multiple of 4 on blur", () => {
    const setDefenderEv = jest.fn();
    renderComponent({ setDefenderEv });

    const hpInput = screen.getByRole("textbox", { name: /HP EVs/i });
    fireEvent.focus(hpInput);
    fireEvent.change(hpInput, { target: { value: "13" } });
    fireEvent.blur(hpInput, { target: { value: "13" } });

    // 13 rounds to 12 (nearest multiple of 4)
    expect(setDefenderEv).toHaveBeenCalledWith("hp", 12);
  });

  it("clamps value to 252 (EV_PER_STAT_MAX) on blur", () => {
    const setDefenderEv = jest.fn();
    renderComponent({ setDefenderEv });

    const hpInput = screen.getByRole("textbox", { name: /HP EVs/i });
    fireEvent.focus(hpInput);
    fireEvent.change(hpInput, { target: { value: "999" } });
    fireEvent.blur(hpInput, { target: { value: "999" } });

    expect(setDefenderEv).toHaveBeenCalledWith("hp", 252);
  });

  it("treats empty input as 0 on blur", () => {
    const setDefenderEv = jest.fn();
    renderComponent({ setDefenderEv });

    const hpInput = screen.getByRole("textbox", { name: /HP EVs/i });
    fireEvent.focus(hpInput);
    fireEvent.change(hpInput, { target: { value: "" } });
    fireEvent.blur(hpInput, { target: { value: "" } });

    expect(setDefenderEv).toHaveBeenCalledWith("hp", 0);
  });

  it("strips trailing +/−/− suffix before parsing on blur", () => {
    const setDefenderEv = jest.fn();
    renderComponent({ defenderNature: "Adamant", setDefenderEv });

    // Atk input shows "+" (boosted, EV=0) — user types "200+" and blurs
    const atkInput = screen.getByRole("textbox", { name: /Atk EVs/i });
    fireEvent.focus(atkInput);
    fireEvent.change(atkInput, { target: { value: "200+" } });
    fireEvent.blur(atkInput, { target: { value: "200+" } });

    expect(setDefenderEv).toHaveBeenCalledWith("atk", 200);
  });

  it("treats non-numeric input as 0 on blur", () => {
    const setDefenderEv = jest.fn();
    renderComponent({ setDefenderEv });

    const hpInput = screen.getByRole("textbox", { name: /HP EVs/i });
    fireEvent.focus(hpInput);
    fireEvent.change(hpInput, { target: { value: "abc" } });
    fireEvent.blur(hpInput, { target: { value: "abc" } });

    expect(setDefenderEv).toHaveBeenCalledWith("hp", 0);
  });
});

// =============================================================================
// EV input — keyboard interactions
// =============================================================================

describe("CalcDefenderStats — EV input keyboard", () => {
  it("Enter key blurs the input and commits the value", () => {
    const setDefenderEv = jest.fn();
    renderComponent({ setDefenderEv });

    const hpInput = screen.getByRole("textbox", { name: /HP EVs/i });
    fireEvent.focus(hpInput);
    fireEvent.change(hpInput, { target: { value: "52" } });
    fireEvent.keyDown(hpInput, { key: "Enter" });
    fireEvent.blur(hpInput, { target: { value: "52" } });

    expect(setDefenderEv).toHaveBeenCalledWith("hp", 52);
  });

  it("Escape key reverts the input buffer without calling setDefenderEv again", () => {
    const setDefenderEv = jest.fn();
    renderComponent({ defenderEvs: makeDefaultEvs({ hp: 0 }), setDefenderEv });

    const hpInput = screen.getByRole("textbox", { name: /HP EVs/i });
    fireEvent.focus(hpInput);
    fireEvent.change(hpInput, { target: { value: "88" } });
    // Pressing Escape should clear the buffer — no commit
    fireEvent.keyDown(hpInput, { key: "Escape" });
    // After Escape the buffer clears; blur may fire but value should be 0 (original)
    fireEvent.blur(hpInput, { target: { value: "" } });

    // setDefenderEv might be called with 0 on blur, but never with 88
    const calls = setDefenderEv.mock.calls.map((c: unknown[]) => c[1]);
    expect(calls).not.toContain(88);
  });
});

// =============================================================================
// EV slider
// =============================================================================

describe("CalcDefenderStats — EV slider", () => {
  it("HP slider value reflects the current hp EV", () => {
    renderComponent({ defenderEvs: makeDefaultEvs({ hp: 252 }) });
    const hpSlider = screen.getByRole("slider", { name: /HP EV slider/i });
    expect(hpSlider).toHaveValue("252");
  });

  it("Atk slider value reflects the current atk EV", () => {
    renderComponent({ defenderEvs: makeDefaultEvs({ atk: 100 }) });
    const atkSlider = screen.getByRole("slider", { name: /Atk EV slider/i });
    expect(atkSlider).toHaveValue("100");
  });

  it("slider max is 252", () => {
    renderComponent();
    const hpSlider = screen.getByRole("slider", { name: /HP EV slider/i });
    expect(hpSlider).toHaveAttribute("max", "252");
  });

  it("slider step is 4", () => {
    renderComponent();
    const hpSlider = screen.getByRole("slider", { name: /HP EV slider/i });
    expect(hpSlider).toHaveAttribute("step", "4");
  });

  it("moving slider calls setDefenderEv with snapped value", () => {
    const setDefenderEv = jest.fn();
    renderComponent({ setDefenderEv });
    const hpSlider = screen.getByRole("slider", { name: /HP EV slider/i });
    fireEvent.change(hpSlider, { target: { value: "252" } });
    expect(setDefenderEv).toHaveBeenCalledWith("hp", 252);
  });
});

// =============================================================================
// Boost stage dropdown
// =============================================================================

describe("CalcDefenderStats — boost stage dropdown", () => {
  it("renders stage dropdowns for all non-HP stats", () => {
    renderComponent();
    // HP has no boost — the other 5 stats do
    expect(screen.getByTestId("stage-atk")).toBeInTheDocument();
    expect(screen.getByTestId("stage-def")).toBeInTheDocument();
    expect(screen.getByTestId("stage-spa")).toBeInTheDocument();
    expect(screen.getByTestId("stage-spd")).toBeInTheDocument();
    expect(screen.getByTestId("stage-spe")).toBeInTheDocument();
  });

  it("does NOT render a stage dropdown for HP", () => {
    renderComponent();
    expect(screen.queryByTestId("stage-hp")).not.toBeInTheDocument();
  });

  it("calls setDefenderBoost when Atk stage dropdown changes", () => {
    const setDefenderBoost = jest.fn();
    renderComponent({ setDefenderBoost });
    const atkStage = screen.getByTestId("stage-atk");
    fireEvent.change(atkStage, { target: { value: "2" } });
    expect(setDefenderBoost).toHaveBeenCalledWith("atk", 2);
  });

  it("calls setDefenderBoost with negative value for negative stage", () => {
    const setDefenderBoost = jest.fn();
    renderComponent({ setDefenderBoost });
    const defStage = screen.getByTestId("stage-def");
    fireEvent.change(defStage, { target: { value: "-3" } });
    expect(setDefenderBoost).toHaveBeenCalledWith("def", -3);
  });

  describe("applyStage math — final stat display", () => {
    it.each([
      // [boost, expectedMultiplierBehavior description]
      // We verify the stage value is passed through correctly to the dropdown
      [0, "0"],
      [2, "2"],
      [-1, "-1"],
    ] as const)(
      "stage=%i renders the stage dropdown with value %s",
      (boost, expectedValue) => {
        renderComponent({ defenderBoosts: makeDefaultBoosts({ atk: boost }) });
        expect(screen.getByTestId("stage-atk")).toHaveValue(expectedValue);
      }
    );
  });
});

// =============================================================================
// HP percent slider and readout
// =============================================================================

describe("CalcDefenderStats — HP slider", () => {
  it("renders the HP percent slider with current value", () => {
    renderComponent({ defenderHpPercent: 75 });
    const hpSlider = screen.getByRole("slider", {
      name: /Defender HP percent/i,
    });
    expect(hpSlider).toHaveValue("75");
  });

  it("renders the HP percent label (e.g., 75%)", () => {
    renderComponent({ defenderHpPercent: 75 });
    expect(screen.getByText("75%")).toBeInTheDocument();
  });

  it("calls setDefenderHpPercent when slider changes", () => {
    const setDefenderHpPercent = jest.fn();
    renderComponent({ defenderHpPercent: 100, setDefenderHpPercent });
    const hpSlider = screen.getByRole("slider", {
      name: /Defender HP percent/i,
    });
    fireEvent.change(hpSlider, { target: { value: "50" } });
    expect(setDefenderHpPercent).toHaveBeenCalledWith(50);
  });

  it("HP slider min is 1 and max is 100", () => {
    renderComponent();
    const hpSlider = screen.getByRole("slider", {
      name: /Defender HP percent/i,
    });
    expect(hpSlider).toHaveAttribute("min", "1");
    expect(hpSlider).toHaveAttribute("max", "100");
  });

  it("renders the current/max HP readout (x/y HP)", () => {
    // HP% = 100, so currentHP = maxHP
    renderComponent({
      defenderHpPercent: 100,
      defenderEvs: makeDefaultEvs({ hp: 0 }),
      defenderIvs: makeDefaultIvs({ hp: 31 }),
    });
    // The readout should contain "/ ... HP"
    const readout = screen.getByText(/\/.*HP/);
    expect(readout).toBeInTheDocument();
  });
});

// =============================================================================
// Total EV counter
// =============================================================================

describe("CalcDefenderStats — total EV counter", () => {
  it("shows 0/510 when no EVs are invested", () => {
    renderComponent({ defenderEvs: makeDefaultEvs() });
    // "/510" is rendered in a nested span; just verify it exists
    expect(screen.getByText("/510")).toBeInTheDocument();
  });

  it("shows correct total when EVs are partially invested", () => {
    renderComponent({
      defenderEvs: makeDefaultEvs({ hp: 252, spe: 252 }),
    });
    expect(screen.getByText("504")).toBeInTheDocument();
  });

  it("shows 510/510 when fully invested", () => {
    renderComponent({
      defenderEvs: makeDefaultEvs({ hp: 252, atk: 252, def: 6 }),
    });
    expect(screen.getByText("510")).toBeInTheDocument();
  });
});

// =============================================================================
// Tera chip visibility
// =============================================================================

describe("CalcDefenderStats — Tera chip", () => {
  it("renders the tera chip in a format that supports Tera", () => {
    // VGC_FORMAT is gen 9 which supports Tera via @trainers/pokemon's formatHasTera
    renderComponent({ format: VGC_FORMAT, defenderTera: "Fire" });
    // The chip shows "Fire tera" when tera is set
    expect(screen.getByText(/Fire tera/i)).toBeInTheDocument();
  });

  it("shows '—' for tera chip when tera is not selected", () => {
    renderComponent({ format: VGC_FORMAT, defenderTera: "" });
    // tera chip label = "tera", value = "—"
    expect(screen.getByText("tera")).toBeInTheDocument();
  });

  it("does NOT render the tera chip for Gen 8 format (no Tera)", () => {
    renderComponent({ format: GEN8_FORMAT });
    expect(screen.queryByText("tera")).not.toBeInTheDocument();
  });

  it("does NOT render the tera chip when format is undefined", () => {
    renderComponent({ format: UNDEFINED_FORMAT });
    expect(screen.queryByText("tera")).not.toBeInTheDocument();
  });
});

// =============================================================================
// Loadout chips
// =============================================================================

describe("CalcDefenderStats — loadout chips", () => {
  it("renders the item chip with the item name", () => {
    renderComponent({ defenderItem: "Sitrus Berry" });
    expect(screen.getByText("Sitrus Berry")).toBeInTheDocument();
  });

  it("renders '—' for item chip when item is empty", () => {
    renderComponent({ defenderItem: "" });
    // Multiple "—" may appear (item and other empty chips) — just verify at least one
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThanOrEqual(1);
  });

  it("renders the ability chip label", () => {
    renderComponent({ defenderAbility: "Intimidate" });
    expect(screen.getByText("Intimidate")).toBeInTheDocument();
    expect(screen.getByText("abil")).toBeInTheDocument();
  });

  it("renders the nature chip label", () => {
    renderComponent({ defenderNature: "Timid" });
    expect(screen.getByText("Timid")).toBeInTheDocument();
    expect(screen.getByText("nat")).toBeInTheDocument();
  });

  it("renders the item chip prefix label 'item'", () => {
    renderComponent();
    expect(screen.getByText("item")).toBeInTheDocument();
  });
});

// =============================================================================
// Ability "no abilities found" message
// =============================================================================

describe("CalcDefenderStats — ability not found", () => {
  it("shows 'No abilities found for format' when legalAbilities is empty array", () => {
    // getLegalAbilities returns an empty Set (not null) so the Array.from branch executes
    mockGetLegalAbilities.mockReturnValue(new Set([]));
    renderComponent({
      format: VGC_FORMAT,
      defenderSpecies: "Garchomp",
    });
    expect(
      screen.getByText("No abilities found for format")
    ).toBeInTheDocument();
  });

  it("does NOT show the message when abilities are found", () => {
    mockGetLegalAbilities.mockReturnValue(
      new Set(["Rough Skin", "Sand Veil"])
    );
    renderComponent({ format: VGC_FORMAT, defenderSpecies: "Garchomp" });
    expect(
      screen.queryByText("No abilities found for format")
    ).not.toBeInTheDocument();
  });

  it("does NOT show the message when defenderSpecies is empty", () => {
    mockGetBaseStats.mockReturnValue(null);
    mockGetSpeciesTypes.mockReturnValue([]);
    mockGetValidAbilities.mockReturnValue([]);
    renderComponent({ defenderSpecies: "", format: UNDEFINED_FORMAT });
    expect(
      screen.queryByText("No abilities found for format")
    ).not.toBeInTheDocument();
  });
});

// =============================================================================
// Ability list — format-aware fetch
// =============================================================================

describe("CalcDefenderStats — ability list fetch", () => {
  it("calls getLegalAbilities with species and format.id when format is provided", () => {
    mockGetLegalAbilities.mockReturnValue(new Set(["Rough Skin"]));
    renderComponent({ format: VGC_FORMAT, defenderSpecies: "Garchomp" });
    expect(mockGetLegalAbilities).toHaveBeenCalledWith(
      "Garchomp",
      VGC_FORMAT.id
    );
  });

  it("falls back to getValidAbilities when getLegalAbilities returns null", () => {
    mockGetLegalAbilities.mockReturnValue(null);
    renderComponent({ format: VGC_FORMAT, defenderSpecies: "Garchomp" });
    expect(mockGetValidAbilities).toHaveBeenCalledWith("Garchomp");
  });

  it("calls getValidAbilities directly when format is undefined", () => {
    renderComponent({ format: UNDEFINED_FORMAT, defenderSpecies: "Garchomp" });
    expect(mockGetValidAbilities).toHaveBeenCalledWith("Garchomp");
  });
});

// =============================================================================
// Champions format
// =============================================================================

describe("CalcDefenderStats — Champions format", () => {
  it("passes isChampions=true through to stats computation", () => {
    mockIsChampionsFormat.mockReturnValue(true);
    // The component uses computeStat which calls calculateChampionsHP etc.
    // We just verify it renders without error with champions active.
    renderComponent();
    expect(screen.getAllByText("HP").length).toBeGreaterThanOrEqual(1);
  });

  it("calls isChampionsFormat with the format object", () => {
    renderComponent({ format: VGC_FORMAT });
    expect(mockIsChampionsFormat).toHaveBeenCalledWith(VGC_FORMAT);
  });
});

// =============================================================================
// Breakpoint ticks — only rendered on +nature stat when findStatBreakpoints returns values
// =============================================================================

describe("CalcDefenderStats — breakpoint ticks", () => {
  it("calls findStatBreakpoints only for the nature-boosted stat (Adamant = +Atk)", () => {
    mockFindStatBreakpoints.mockReturnValue([4, 100, 200]);
    renderComponent({ defenderNature: "Adamant" });
    // findStatBreakpoints should be called once (for the boosted stat only)
    expect(mockFindStatBreakpoints).toHaveBeenCalledTimes(1);
    expect(mockFindStatBreakpoints).toHaveBeenCalledWith(
      expect.objectContaining({ statKey: "attack" })
    );
  });

  it("does not call findStatBreakpoints when nature is neutral", () => {
    renderComponent({ defenderNature: "Hardy" });
    expect(mockFindStatBreakpoints).not.toHaveBeenCalled();
  });
});
