"use client";

/**
 * Behavioral tests for CalcDetailCard (read-only info panel).
 *
 * Covers:
 *   - "DAMAGE CALC" eyebrow label
 *   - Identity row: attacker → move → defender (names, BP)
 *   - Result block: % range, KO verdict label, KO-chance display
 *   - Meta row: dmg range, vs HP, effectiveness
 *   - Recovery suffix in KO label
 *   - Tera tag visibility
 *   - Target classification label and description
 *   - Empty rolls boundary condition
 */

import { render, screen } from "@testing-library/react";
import React from "react";

import { type Tables } from "@trainers/supabase";

import type * as TrainersPokemon from "@trainers/pokemon";
import { type GameFormat } from "@trainers/pokemon";

// =============================================================================
// Mocks
// =============================================================================

const mockGetMoveData = jest.fn();
const mockGetSpeciesTypes = jest.fn();

jest.mock("@trainers/pokemon", () => {
  const actual =
    jest.requireActual<typeof TrainersPokemon>("@trainers/pokemon");
  return {
    ...actual,
    getMoveData: (...args: unknown[]) => mockGetMoveData(...args),
    getSpeciesTypes: (...args: unknown[]) => mockGetSpeciesTypes(...args),
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
jest.mock("../use-calc-state", () => ({
  getVerdict: (...args: unknown[]) => mockGetVerdict(...args),
}));

// TypeDot stub
jest.mock("../type-dot", () => ({
  TypeDot: ({ t }: { t: string }) => <span data-testid={`type-dot-${t}`} />,
}));

// format-gating
jest.mock("../format-gating", () => ({
  formatSupportsTera: jest.fn(
    (fmt: GameFormat | undefined) => fmt?.generation === 9
  ),
}));

// =============================================================================
// Import after mocks
// =============================================================================

import { CalcDetailCard } from "../calc/calc-detail-card";
import { type CalcOutput } from "../use-calc-state";

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

function makeBaseOutput(overrides: Partial<CalcOutput> = {}): CalcOutput {
  return {
    minPercent: 50.0,
    maxPercent: 60.0,
    desc: "Test desc",
    rolls: [100, 105, 110, 115, 120],
    defenderMaxHP: 200,
    recoverySuffix: "",
    recoveryTier: null,
    koChance: null,
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
  weather?: string | null;
}

function renderCard(props: RenderProps = {}) {
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
      format={
        props.format === undefined && !("format" in props)
          ? VGC_FORMAT
          : props.format
      }
      weather={props.weather ?? null}
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
  mockGetMoveTargetInfo.mockReturnValue({
    kind: "single-foe",
    isSpread: false,
  });
  mockGetMoveTargetLabel.mockReturnValue("SINGLE-FOE");
  mockGetMoveTargetDesc.mockReturnValue("Single target — never spreads.");
  mockGetVerdict.mockReturnValue("2HKO");
});

// =============================================================================
// Tests — eyebrow
// =============================================================================

describe("CalcDetailCard — eyebrow", () => {
  it("renders the DAMAGE CALC eyebrow", () => {
    renderCard();
    expect(screen.getByText("DAMAGE CALC")).toBeInTheDocument();
  });
});

// =============================================================================
// Tests — identity row
// =============================================================================

describe("CalcDetailCard — identity row", () => {
  it("renders the move name", () => {
    renderCard({ moveName: "Moonblast" });
    expect(screen.getByText("Moonblast")).toBeInTheDocument();
  });

  it("renders attacker species when no nickname", () => {
    renderCard({
      attacker: makePokemon({ species: "Gardevoir", nickname: null }),
    });
    expect(screen.getByText("Gardevoir")).toBeInTheDocument();
  });

  it("renders attacker nickname when present", () => {
    renderCard({
      attacker: makePokemon({ nickname: "Misty", species: "Gardevoir" }),
    });
    expect(screen.getByText("Misty")).toBeInTheDocument();
  });

  it("renders defender species", () => {
    renderCard({ defenderSpecies: "Incineroar" });
    expect(screen.getByText("Incineroar")).toBeInTheDocument();
  });

  it("renders BP when moveData has basePower", () => {
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

  it("renders arrow separators between attacker, move, and defender", () => {
    renderCard();
    const arrows = screen.getAllByText("→");
    expect(arrows).toHaveLength(2);
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
      baseOutput: makeBaseOutput({
        rolls: [80, 85, 90, 95, 100],
        defenderMaxHP: 200,
      }),
    });
    // dmgMin = rolls[0] = 80, dmgMax = rolls[4] = 100
    expect(screen.getByText(/80–100 dmg/)).toBeInTheDocument();
  });

  it("renders vs defenderMaxHP in meta row", () => {
    renderCard({
      baseOutput: makeBaseOutput({ defenderMaxHP: 200 }),
    });
    expect(screen.getByText(/vs 200 HP/)).toBeInTheDocument();
  });

  it("renders 0–0 dmg when rolls array is empty", () => {
    renderCard({
      baseOutput: makeBaseOutput({ rolls: [], defenderMaxHP: 200 }),
    });
    expect(screen.getByText(/0–0 dmg/)).toBeInTheDocument();
  });
});

// =============================================================================
// Tests — effectiveness
// =============================================================================

describe("CalcDetailCard — effectiveness", () => {
  it.each([
    [0, "0× eff"],
    [0.5, "0.5× eff"],
    [1, "1× eff"],
    [2, "2× eff"],
    [4, "4× eff"],
  ])("renders %s× eff in meta row", (eff, expectedText) => {
    mockGetMoveEffectiveness.mockReturnValue(eff);
    renderCard();
    expect(
      screen.getByText(new RegExp(expectedText.replace("×", "×")))
    ).toBeInTheDocument();
  });
});

// =============================================================================
// Tests — KO verdict label
// =============================================================================

describe("CalcDetailCard — KO verdict label", () => {
  it.each([["OHKO"], ["2HKO"], ["3HKO"]] as const)(
    "renders '%s' verdict from getVerdict",
    (verdict) => {
      mockGetVerdict.mockReturnValue(verdict);
      renderCard();
      expect(screen.getByText(verdict)).toBeInTheDocument();
    }
  );

  it("does NOT render a KO label when verdict is null and no recoveryTier", () => {
    mockGetVerdict.mockReturnValue(null);
    renderCard({ baseOutput: makeBaseOutput({ recoveryTier: null }) });
    expect(screen.queryByText(/HKO/)).not.toBeInTheDocument();
  });

  it("prefers recoveryTier over getVerdict when present", () => {
    mockGetVerdict.mockReturnValue("2HKO");
    renderCard({
      baseOutput: makeBaseOutput({
        recoveryTier: "3HKO",
        recoverySuffix: "after Sitrus Berry",
      }),
    });
    // recoveryTier = "3HKO" wins; getVerdict's "2HKO" should not be shown as sole label
    expect(screen.getByText("3HKO")).toBeInTheDocument();
  });

  it("renders koChance text when koChance is between 0 and 100 exclusive", () => {
    mockGetVerdict.mockReturnValue("OHKO");
    renderCard({
      baseOutput: makeBaseOutput({ koChance: 93.75 }),
    });
    expect(screen.getByText(/93\.8% chance to OHKO/)).toBeInTheDocument();
  });

  it("renders koChance as integer when it has no fractional part", () => {
    mockGetVerdict.mockReturnValue("OHKO");
    renderCard({
      baseOutput: makeBaseOutput({ koChance: 75 }),
    });
    expect(screen.getByText(/75% chance to OHKO/)).toBeInTheDocument();
  });

  it("renders plain verdict when koChance is 0", () => {
    mockGetVerdict.mockReturnValue("4HKO");
    renderCard({
      baseOutput: makeBaseOutput({ koChance: 0 }),
    });
    expect(screen.getByText("4HKO")).toBeInTheDocument();
    expect(screen.queryByText(/chance to OHKO/)).not.toBeInTheDocument();
  });

  it("renders plain verdict when koChance is 100", () => {
    mockGetVerdict.mockReturnValue("OHKO");
    renderCard({
      baseOutput: makeBaseOutput({ koChance: 100 }),
    });
    expect(screen.getByText("OHKO")).toBeInTheDocument();
    expect(screen.queryByText(/chance to OHKO/)).not.toBeInTheDocument();
  });
});

// =============================================================================
// Tests — recovery suffix
// =============================================================================

describe("CalcDetailCard — recovery suffix", () => {
  it("renders recoverySuffix appended to the KO label when present", () => {
    mockGetVerdict.mockReturnValue("2HKO");
    renderCard({
      baseOutput: makeBaseOutput({ recoverySuffix: "after Sitrus Berry" }),
    });
    expect(screen.getByText(/after Sitrus Berry/)).toBeInTheDocument();
  });

  it("does NOT render recovery suffix element when recoverySuffix is empty", () => {
    mockGetVerdict.mockReturnValue("2HKO");
    renderCard({
      baseOutput: makeBaseOutput({ recoverySuffix: "" }),
    });
    expect(screen.queryByText(/after/)).not.toBeInTheDocument();
  });
});

// =============================================================================
// Tests — Tera tag
// =============================================================================

describe("CalcDetailCard — Tera tag", () => {
  it("renders Tera tag when format supports Tera and attacker has tera_type", () => {
    jest
      .requireMock("../format-gating")
      .formatSupportsTera.mockReturnValue(true);
    renderCard({
      attacker: makePokemon({ tera_type: "Fairy" }),
      format: VGC_FORMAT,
    });
    expect(screen.getByText("◇ Tera")).toBeInTheDocument();
  });

  it("does NOT render Tera tag when attacker has no tera_type", () => {
    jest
      .requireMock("../format-gating")
      .formatSupportsTera.mockReturnValue(true);
    renderCard({
      attacker: makePokemon({ tera_type: null }),
      format: VGC_FORMAT,
    });
    expect(screen.queryByText("◇ Tera")).not.toBeInTheDocument();
  });

  it("does NOT render Tera tag in Gen 8 format", () => {
    jest
      .requireMock("../format-gating")
      .formatSupportsTera.mockReturnValue(false);
    renderCard({
      attacker: makePokemon({ tera_type: "Fire" }),
      format: GEN8_FORMAT,
    });
    expect(screen.queryByText("◇ Tera")).not.toBeInTheDocument();
  });
});

// =============================================================================
// Tests — target classification row
// =============================================================================

describe("CalcDetailCard — target classification", () => {
  it("renders the target label from getMoveTargetLabel", () => {
    renderCard();
    expect(screen.getByText("SINGLE-FOE")).toBeInTheDocument();
  });

  it("renders the target description from getMoveTargetDesc", () => {
    renderCard();
    expect(
      screen.getByText("Single target — never spreads.")
    ).toBeInTheDocument();
  });

  it.each([
    [
      "ALL-FOES",
      "Spread move — hits both opposing slots. −25% damage when 2 foes alive.",
    ],
    ["ALL-OTHERS", "Hits everyone but you. −25% damage when 2+ targets alive."],
    ["SELF", "Self / status move."],
  ])("renders '%s' label and its description", (label, desc) => {
    mockGetMoveTargetLabel.mockReturnValue(label);
    mockGetMoveTargetDesc.mockReturnValue(desc);
    renderCard();
    expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.getByText(desc)).toBeInTheDocument();
  });
});

// =============================================================================
// Tests — no removed interactive elements
// =============================================================================

describe("CalcDetailCard — removed interactive elements are absent", () => {
  it("does not render a Crit checkbox", () => {
    renderCard();
    expect(
      screen.queryByRole("checkbox", { name: /Crit/i })
    ).not.toBeInTheDocument();
  });

  it("does not render a Screen up checkbox", () => {
    renderCard();
    expect(
      screen.queryByRole("checkbox", { name: /Screen/i })
    ).not.toBeInTheDocument();
  });

  it("does not render a close button", () => {
    renderCard();
    expect(
      screen.queryByRole("button", { name: /close/i })
    ).not.toBeInTheDocument();
  });

  it("does not render a Change move button", () => {
    renderCard();
    expect(
      screen.queryByRole("button", { name: /change move/i })
    ).not.toBeInTheDocument();
  });

  it("does not render footer hint text", () => {
    renderCard();
    expect(
      screen.queryByText(/Click outside to close/i)
    ).not.toBeInTheDocument();
  });

  it("does not render FIELD spread controls", () => {
    renderCard();
    expect(screen.queryByText("FIELD")).not.toBeInTheDocument();
  });
});
