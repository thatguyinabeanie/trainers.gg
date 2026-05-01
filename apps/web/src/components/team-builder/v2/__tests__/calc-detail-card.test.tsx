"use client";

/**
 * Behavioral tests for CalcDetailCard.
 *
 * Covers:
 *   - KO tier verdict label (OHKO / 2HKO / 3HKO / 4HKO+)
 *   - Damage range % display
 *   - Effectiveness multiplier in metadata row
 *   - Crit toggle multiplies damage by 1.5
 *   - Screen toggle halves damage
 *   - Spread badge visibility for spread moves when foesAlive >= 2
 *   - Target kind label and description rendered
 *   - Attacker → move → defender identity row
 *   - Tera tag visible when format supports Tera and attacker has tera_type
 *   - onClose / onChangeMove callbacks fire
 *   - Field row only rendered for spread moves
 *   - Foes alive buttons toggle spread reduction
 *   - Ally alive buttons for all-others moves
 */

import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

import { type Tables } from "@trainers/supabase";

import type * as TrainersPokemon from "@trainers/pokemon";
import { type GameFormat } from "@trainers/pokemon";

// =============================================================================
// Mocks
// =============================================================================

jest.mock("../builder.module.css", () =>
  new Proxy({}, { get: (_t, k) => k })
);

// Mock getMoveData and getSpeciesTypes from @trainers/pokemon
const mockGetMoveData = jest.fn();
const mockGetSpeciesTypes = jest.fn();
const mockFormatHasTera = jest.fn();

jest.mock("@trainers/pokemon", () => {
  const actual = jest.requireActual<typeof TrainersPokemon>("@trainers/pokemon");
  return {
    ...actual,
    getMoveData: (...args: unknown[]) => mockGetMoveData(...args),
    getSpeciesTypes: (...args: unknown[]) => mockGetSpeciesTypes(...args),
    formatHasTera: (...args: unknown[]) => mockFormatHasTera(...args),
  };
});

// Mock move-effectiveness
const mockGetMoveEffectiveness = jest.fn();
jest.mock("../calc/move-effectiveness", () => ({
  getMoveEffectiveness: (...args: unknown[]) =>
    mockGetMoveEffectiveness(...args),
}));

// Mock move-target-info
const mockGetMoveTargetInfo = jest.fn();
const mockGetMoveTargetLabel = jest.fn();
const mockGetMoveTargetDesc = jest.fn();
jest.mock("../calc/move-target-info", () => ({
  getMoveTargetInfo: (...args: unknown[]) => mockGetMoveTargetInfo(...args),
  getMoveTargetLabel: (...args: unknown[]) => mockGetMoveTargetLabel(...args),
  getMoveTargetDesc: (...args: unknown[]) => mockGetMoveTargetDesc(...args),
}));

// getVerdict from use-calc-state
const mockGetVerdict = jest.fn();
jest.mock("../../use-calc-state", () => ({
  getVerdict: (...args: unknown[]) => mockGetVerdict(...args),
}));

// TypeDot stub
jest.mock("../type-dot", () => ({
  TypeDot: ({ t }: { t: string }) => (
    <span data-testid={`type-dot-${t}`} />
  ),
}));

// format-gating
jest.mock("../format-gating", () => ({
  formatSupportsTera: jest.fn((fmt: GameFormat | undefined) =>
    fmt?.generation === 9
  ),
}));

// =============================================================================
// Import after mocks
// =============================================================================

import { CalcDetailCard } from "../calc/calc-detail-card";
import { type CalcOutput } from "../../use-calc-state";

// =============================================================================
// Fixtures
// =============================================================================

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

function makePokemon(
  overrides: Partial<Tables<"pokemon">> = {}
): Tables<"pokemon"> {
  return {
    id: 1,
    species: "Gardevoir",
    ability: "Telepathy",
    nature: "Timid",
    move1: "Moonblast",
    move2: null,
    move3: null,
    move4: null,
    ev_hp: 0,
    ev_attack: 0,
    ev_defense: 0,
    ev_special_attack: 252,
    ev_special_defense: 4,
    ev_speed: 252,
    iv_hp: 31,
    iv_attack: 0,
    iv_defense: 31,
    iv_special_attack: 31,
    iv_special_defense: 31,
    iv_speed: 31,
    level: 50,
    held_item: "Choice Specs",
    nickname: null,
    notes: null,
    tera_type: null,
    is_shiny: null,
    gender: null,
    format_legal: null,
    created_at: null,
    ...overrides,
  };
}

function makeBaseOutput(
  overrides: Partial<CalcOutput> = {}
): CalcOutput {
  return {
    minPercent: 50.0,
    maxPercent: 60.0,
    desc: "Test desc",
    rolls: [100, 105, 110, 115, 120],
    defenderMaxHP: 200,
    ...overrides,
  };
}

interface RenderProps {
  attacker?: Tables<"pokemon">;
  moveName?: string;
  baseOutput?: CalcOutput;
  defenderSpecies?: string;
  defenderAbility?: string;
  defenderItem?: string;
  defenderNature?: string;
  format?: GameFormat | undefined;
  foesAlive?: 1 | 2;
  allyAlive?: boolean;
  weather?: string | null;
  onClose?: jest.Mock;
  onChangeMove?: jest.Mock;
}

function renderCard(props: RenderProps = {}) {
  const onClose = props.onClose ?? jest.fn();
  const onChangeMove = props.onChangeMove ?? jest.fn();
  return render(
    <CalcDetailCard
      attacker={props.attacker ?? makePokemon()}
      moveName={props.moveName ?? "Moonblast"}
      baseOutput={props.baseOutput ?? makeBaseOutput()}
      defender={{
        species: props.defenderSpecies ?? "Incineroar",
        ability: props.defenderAbility ?? "Intimidate",
        item: props.defenderItem ?? "Sitrus Berry",
        nature: props.defenderNature ?? "Careful",
      }}
      format={props.format === undefined && !("format" in props) ? VGC_FORMAT : props.format}
      foesAlive={props.foesAlive ?? 2}
      allyAlive={props.allyAlive ?? true}
      weather={props.weather ?? null}
      onClose={onClose}
      onChangeMove={onChangeMove}
    />
  );
}

// =============================================================================
// Setup
// =============================================================================

beforeEach(() => {
  jest.clearAllMocks();
  mockGetMoveData.mockReturnValue({
    type: "Fairy",
    category: "Special",
    basePower: 95,
    accuracy: 100,
  });
  mockGetSpeciesTypes.mockReturnValue(["Psychic", "Fairy"]);
  mockGetMoveEffectiveness.mockReturnValue(1);
  mockGetMoveTargetInfo.mockReturnValue({ kind: "single-foe", isSpread: false });
  mockGetMoveTargetLabel.mockReturnValue("SINGLE-FOE");
  mockGetMoveTargetDesc.mockReturnValue("Single target — never spreads.");
  mockGetVerdict.mockReturnValue("2HKO");
  mockFormatHasTera.mockReturnValue(false);
});

// =============================================================================
// Tests — basic render
// =============================================================================

describe("CalcDetailCard — basic render", () => {
  it("renders the DAMAGE CALC eyebrow", () => {
    renderCard();
    expect(screen.getByText("DAMAGE CALC")).toBeInTheDocument();
  });

  it("renders the move name in the identity row", () => {
    renderCard({ moveName: "Moonblast" });
    expect(screen.getByText("Moonblast")).toBeInTheDocument();
  });

  it("renders attacker species in the identity row", () => {
    renderCard({ attacker: makePokemon({ species: "Gardevoir", nickname: null }) });
    expect(screen.getByText("Gardevoir")).toBeInTheDocument();
  });

  it("renders attacker nickname when present", () => {
    renderCard({
      attacker: makePokemon({ nickname: "Misty", species: "Gardevoir" }),
    });
    expect(screen.getByText("Misty")).toBeInTheDocument();
  });

  it("renders defender species in the identity row", () => {
    renderCard({ defenderSpecies: "Incineroar" });
    expect(screen.getByText("Incineroar")).toBeInTheDocument();
  });

  it("renders the base power (BP) when moveData has basePower", () => {
    renderCard();
    expect(screen.getByText("BP 95")).toBeInTheDocument();
  });

  it("does NOT render BP when basePower is 0", () => {
    mockGetMoveData.mockReturnValue({
      type: "Normal",
      category: "Status",
      basePower: 0,
      accuracy: true,
    });
    renderCard({ moveName: "Protect" });
    expect(screen.queryByText(/BP/)).not.toBeInTheDocument();
  });

  it("renders the target label from getMoveTargetLabel", () => {
    renderCard();
    expect(screen.getByText("SINGLE-FOE")).toBeInTheDocument();
  });

  it("renders the target description from getMoveTargetDesc", () => {
    renderCard();
    expect(screen.getByText("Single target — never spreads.")).toBeInTheDocument();
  });

  it("renders the footer hint text", () => {
    renderCard();
    expect(
      screen.getByText(/Click outside to close/i)
    ).toBeInTheDocument();
  });
});

// =============================================================================
// Tests — damage range
// =============================================================================

describe("CalcDetailCard — damage range", () => {
  it("renders min–max percent from baseOutput", () => {
    renderCard({
      baseOutput: makeBaseOutput({ minPercent: 45.2, maxPercent: 53.8 }),
    });
    // The big-pct div renders as separate text nodes + sep span; match by container
    const bigPct = document.querySelector(".mvdetail-bigpct");
    expect(bigPct?.textContent).toContain("45.2");
    expect(bigPct?.textContent).toContain("53.8");
  });

  it("renders the % unit label", () => {
    renderCard();
    expect(screen.getByText("%")).toBeInTheDocument();
  });

  it("renders raw damage range from rolls", () => {
    renderCard({
      baseOutput: makeBaseOutput({ rolls: [80, 85, 90, 95, 100], defenderMaxHP: 200 }),
    });
    // dmgMin = rolls[0] = 80, dmgMax = rolls[4] = 100
    expect(screen.getByText(/80–100 dmg/)).toBeInTheDocument();
  });

  it("renders vs defenderMaxHP", () => {
    renderCard({
      baseOutput: makeBaseOutput({ defenderMaxHP: 200 }),
    });
    expect(screen.getByText(/vs 200 HP/)).toBeInTheDocument();
  });
});

// =============================================================================
// Tests — effectiveness
// =============================================================================

describe("CalcDetailCard — effectiveness", () => {
  it("renders effectiveness from getMoveEffectiveness in meta row", () => {
    mockGetMoveEffectiveness.mockReturnValue(2);
    renderCard();
    expect(screen.getByText(/2× eff/)).toBeInTheDocument();
  });

  it("renders 1× eff when effectiveness is neutral", () => {
    mockGetMoveEffectiveness.mockReturnValue(1);
    renderCard();
    expect(screen.getByText(/1× eff/)).toBeInTheDocument();
  });

  it("renders 0× eff for immune", () => {
    mockGetMoveEffectiveness.mockReturnValue(0);
    renderCard();
    expect(screen.getByText(/0× eff/)).toBeInTheDocument();
  });
});

// =============================================================================
// Tests — KO verdict
// =============================================================================

describe("CalcDetailCard — KO verdict label", () => {
  it.each([
    ["OHKO"],
    ["2HKO"],
    ["3HKO"],
  ] as const)(
    "renders '%s' verdict label",
    (verdict) => {
      mockGetVerdict.mockReturnValue(verdict);
      renderCard();
      expect(screen.getByText(verdict)).toBeInTheDocument();
    }
  );

  it("does NOT render a KO label when verdict is null", () => {
    mockGetVerdict.mockReturnValue(null);
    renderCard();
    expect(screen.queryByText(/HKO/)).not.toBeInTheDocument();
  });
});

// =============================================================================
// Tests — crit toggle
// =============================================================================

describe("CalcDetailCard — crit toggle", () => {
  it("renders the Crit checkbox unchecked by default", () => {
    renderCard();
    const critCheckbox = screen.getByRole("checkbox", { name: /Crit/i });
    expect(critCheckbox).not.toBeChecked();
  });

  it("checking Crit multiplies damage range by 1.5", () => {
    // baseOutput: min=40.0 max=50.0, factor=1.5 → min=60.0 max=75.0
    renderCard({
      baseOutput: makeBaseOutput({ minPercent: 40.0, maxPercent: 50.0 }),
    });
    const critCheckbox = screen.getByRole("checkbox", { name: /Crit/i });
    fireEvent.click(critCheckbox);
    const bigPct = document.querySelector(".mvdetail-bigpct");
    expect(bigPct?.textContent).toContain("60.0");
    expect(bigPct?.textContent).toContain("75.0");
  });

  it("unchecking Crit restores original damage range", () => {
    renderCard({
      baseOutput: makeBaseOutput({ minPercent: 40.0, maxPercent: 50.0 }),
    });
    const critCheckbox = screen.getByRole("checkbox", { name: /Crit/i });
    fireEvent.click(critCheckbox);
    fireEvent.click(critCheckbox);
    const bigPct = document.querySelector(".mvdetail-bigpct");
    expect(bigPct?.textContent).toContain("40.0");
    expect(bigPct?.textContent).toContain("50.0");
  });
});

// =============================================================================
// Tests — screen toggle
// =============================================================================

describe("CalcDetailCard — screen toggle", () => {
  it("renders the Screen up checkbox unchecked by default", () => {
    renderCard();
    const screenCheckbox = screen.getByRole("checkbox", { name: /Screen up/i });
    expect(screenCheckbox).not.toBeChecked();
  });

  it("checking Screen halves the damage range", () => {
    // baseOutput: min=60.0 max=80.0, factor=0.5 → min=30.0 max=40.0
    renderCard({
      baseOutput: makeBaseOutput({ minPercent: 60.0, maxPercent: 80.0 }),
    });
    const screenCheckbox = screen.getByRole("checkbox", { name: /Screen up/i });
    fireEvent.click(screenCheckbox);
    const bigPct = document.querySelector(".mvdetail-bigpct");
    expect(bigPct?.textContent).toContain("30.0");
    expect(bigPct?.textContent).toContain("40.0");
  });
});

// =============================================================================
// Tests — spread mechanics
// =============================================================================

describe("CalcDetailCard — spread badge", () => {
  it("does NOT render the field row for single-target moves", () => {
    mockGetMoveTargetInfo.mockReturnValue({ kind: "single-foe", isSpread: false });
    renderCard();
    expect(screen.queryByText("FIELD")).not.toBeInTheDocument();
  });

  it("renders the field row for spread (all-foes) moves", () => {
    mockGetMoveTargetInfo.mockReturnValue({ kind: "all-foes", isSpread: true });
    renderCard({ foesAlive: 2 });
    expect(screen.getByText("FIELD")).toBeInTheDocument();
  });

  it("renders spread badge when foesAlive=2 for all-foes move", () => {
    mockGetMoveTargetInfo.mockReturnValue({ kind: "all-foes", isSpread: true });
    mockGetVerdict.mockReturnValue("2HKO");
    renderCard({ foesAlive: 2 });
    expect(screen.getByText(/spread −25%/)).toBeInTheDocument();
  });

  it("does NOT render spread badge when foesAlive=1 for all-foes move", () => {
    mockGetMoveTargetInfo.mockReturnValue({ kind: "all-foes", isSpread: true });
    mockGetVerdict.mockReturnValue("2HKO");
    renderCard({ foesAlive: 1 });
    // "spread −25%" badge should not be shown; "spreads" in the target desc is fine
    expect(screen.queryByText(/spread −25%/)).not.toBeInTheDocument();
  });

  it("Foes buttons toggle spread application (1 vs 2)", () => {
    mockGetMoveTargetInfo.mockReturnValue({ kind: "all-foes", isSpread: true });
    renderCard({ foesAlive: 2 });
    // Initially 2 foes — spread active
    expect(screen.getByText(/spread −25%/)).toBeInTheDocument();
    // Click "1" foes button
    const foes1Btn = screen.getByRole("button", { name: "1" });
    fireEvent.click(foes1Btn);
    expect(screen.queryByText(/spread −25%/)).not.toBeInTheDocument();
  });

  it("renders Ally buttons for all-others moves", () => {
    mockGetMoveTargetInfo.mockReturnValue({ kind: "all-others", isSpread: true });
    renderCard({ foesAlive: 1, allyAlive: true });
    expect(screen.getByRole("button", { name: "alive" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "fainted" })).toBeInTheDocument();
  });

  it("does NOT render Ally buttons for all-foes moves", () => {
    mockGetMoveTargetInfo.mockReturnValue({ kind: "all-foes", isSpread: true });
    renderCard({ foesAlive: 2 });
    expect(screen.queryByRole("button", { name: "alive" })).not.toBeInTheDocument();
  });
});

// =============================================================================
// Tests — Tera tag
// =============================================================================

describe("CalcDetailCard — Tera tag", () => {
  it("renders Tera tag when format supports Tera and attacker has tera_type", () => {
    jest.requireMock("../format-gating").formatSupportsTera.mockReturnValue(true);
    renderCard({
      attacker: makePokemon({ tera_type: "Fairy" }),
      format: VGC_FORMAT,
    });
    expect(screen.getByText("◇ Tera")).toBeInTheDocument();
  });

  it("does NOT render Tera tag when attacker has no tera_type", () => {
    jest.requireMock("../format-gating").formatSupportsTera.mockReturnValue(true);
    renderCard({
      attacker: makePokemon({ tera_type: null }),
      format: VGC_FORMAT,
    });
    expect(screen.queryByText("◇ Tera")).not.toBeInTheDocument();
  });

  it("does NOT render Tera tag in Gen 8 format", () => {
    jest.requireMock("../format-gating").formatSupportsTera.mockReturnValue(false);
    renderCard({
      attacker: makePokemon({ tera_type: "Fire" }),
      format: GEN8_FORMAT,
    });
    expect(screen.queryByText("◇ Tera")).not.toBeInTheDocument();
  });
});

// =============================================================================
// Tests — callbacks
// =============================================================================

describe("CalcDetailCard — callbacks", () => {
  it("calls onClose when close button is clicked", () => {
    const onClose = jest.fn();
    renderCard({ onClose });
    fireEvent.click(screen.getByRole("button", { name: /Close damage detail/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onChangeMove when 'Change move' button is clicked", () => {
    const onChangeMove = jest.fn();
    renderCard({ onChangeMove });
    fireEvent.click(screen.getByRole("button", { name: /Change move/i }));
    expect(onChangeMove).toHaveBeenCalledTimes(1);
  });
});

// =============================================================================
// Tests — empty state (empty rolls)
// =============================================================================

describe("CalcDetailCard — empty rolls", () => {
  it("renders 0–0 dmg when rolls array is empty", () => {
    renderCard({
      baseOutput: makeBaseOutput({ rolls: [], defenderMaxHP: 200 }),
    });
    expect(screen.getByText(/0–0 dmg/)).toBeInTheDocument();
  });
});
