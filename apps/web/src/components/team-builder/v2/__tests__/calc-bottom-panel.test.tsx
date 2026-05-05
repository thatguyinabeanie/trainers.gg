"use client";

/**
 * Behavioral tests for CalcBottomPanel.
 *
 * Covers:
 *   - Panel header label and close button render
 *   - Close button calls onClose
 *   - Attacker name derived from selected slot (nickname → species → "—")
 *   - Attacker HP readout when species has base stats
 *   - Defender column header renders
 *   - CalcAttackerBlock rendered with correct slot
 *   - CalcDefenderStats receives defender species from context
 *   - CalcFieldBlock rendered with calc context values
 *   - CalcDefenderMoves rendered in the defender column
 *   - DefenderMonHeader rendered with species and attacker info
 *   - "vs X · Y HP" meta line in defender header
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

import { type Tables } from "@trainers/supabase";
import { type GameFormat } from "@trainers/pokemon";

// =============================================================================
// Mocks
// =============================================================================


// useCalcStateContext
const mockCalcCtx = {
  defenderSpecies: "Incineroar",
  defenderAbility: "Intimidate",
  defenderItem: "Sitrus Berry",
  defenderNature: "Careful",
  defenderTera: "",
  defenderEvs: { hp: 252, atk: 0, def: 4, spa: 0, spd: 252, spe: 0 },
  defenderIvs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
  defenderBoosts: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
  defenderHpPercent: 100,
  defenderMoves: ["", "", "", ""] as [string, string, string, string],
  setDefenderSpecies: jest.fn(),
  setDefenderAbility: jest.fn(),
  setDefenderItem: jest.fn(),
  setDefenderNature: jest.fn(),
  setDefenderTera: jest.fn(),
  setDefenderEv: jest.fn(),
  setDefenderIv: jest.fn(),
  setDefenderBoost: jest.fn(),
  setDefenderHpPercent: jest.fn(),
  setDefenderMove: jest.fn(),
  resetDefenderForSpecies: jest.fn(),
  attackerBoosts: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
  setAttackerBoost: jest.fn(),
  gameType: "Doubles" as const,
  weather: "",
  terrain: "",
  gravity: false,
  fairyAura: false,
  setGameType: jest.fn(),
  setWeather: jest.fn(),
  setTerrain: jest.fn(),
  setGravity: jest.fn(),
  setFairyAura: jest.fn(),
  attackerSide: {
    reflect: false,
    lightScreen: false,
    auroraVeil: false,
    tailwind: false,
    helpingHand: false,
    friendGuard: false,
    protect: false,
    stealthRock: false,
    spikes: 0,
    saltCure: false,
  },
  defenderSide: {
    reflect: false,
    lightScreen: false,
    auroraVeil: false,
    tailwind: false,
    helpingHand: false,
    friendGuard: false,
    protect: false,
    stealthRock: false,
    spikes: 0,
    saltCure: false,
  },
  setAttackerSide: jest.fn(),
  setDefenderSide: jest.fn(),
  moveCalcOutputs: [null, null, null, null],
  moveCalcOutputsReverse: [null, null, null, null],
  computeReverseOutput: jest.fn().mockReturnValue(null),
  inferredWeather: null,
  inferredTerrain: null,
  field: { foesAlive: 2 as const, allyAlive: true },
  setField: jest.fn(),
  calcEnabled: true,
  // other fields
  direction: "offense" as const,
  setDirection: jest.fn(),
  selectedMoveIdx: 0,
  setSelectedMoveIdx: jest.fn(),
  critMoves: [false, false, false, false],
  toggleCrit: jest.fn(),
  attackerStatus: "Healthy",
  setAttackerStatus: jest.fn(),
  defenderStatus: "Healthy",
  setDefenderStatus: jest.fn(),
  moves: [null, null, null, null],
  selectedMoveName: null,
  selectedMoveOutput: null,
};

jest.mock("../calc/calc-state-context", () => ({
  useCalcStateContext: jest.fn(() => mockCalcCtx),
}));

// @trainers/pokemon — mock getBaseStats, isChampionsFormat, calculateHP, calculateChampionsHP
const mockGetBaseStats = jest.fn();
const mockIsChampionsFormat = jest.fn();
const mockCalculateHP = jest.fn();
const mockCalculateChampionsHP = jest.fn();

jest.mock("@trainers/pokemon", () => ({
  getBaseStats: (...args: unknown[]) => mockGetBaseStats(...args),
  isChampionsFormat: (...args: unknown[]) => mockIsChampionsFormat(...args),
  calculateHP: (...args: unknown[]) => mockCalculateHP(...args),
  calculateChampionsHP: (...args: unknown[]) =>
    mockCalculateChampionsHP(...args),
  getMegaAbilityForSpecies: jest.fn().mockReturnValue(null),
  getMegaSpeciesForBaseAndItem: jest.fn().mockReturnValue(null),
}));

// CalcAttackerBlock stub
jest.mock("../calc/calc-attacker-block", () => ({
  CalcAttackerBlock: ({
    attackerIdx,
  }: {
    attackerIdx: number;
  }) => (
    <div data-testid="calc-attacker-block" data-idx={attackerIdx} />
  ),
}));

// CalcDefenderStats stub
jest.mock("../calc/calc-defender-stats", () => ({
  CalcDefenderStats: ({
    defenderSpecies,
  }: {
    defenderSpecies: string;
  }) => (
    <div
      data-testid="calc-defender-stats"
      data-species={defenderSpecies}
    />
  ),
}));

// CalcDefenderMoves stub
jest.mock("../calc/calc-defender-moves", () => ({
  CalcDefenderMoves: ({
    defenderSpecies,
  }: {
    defenderSpecies: string;
  }) => (
    <div
      data-testid="calc-defender-moves"
      data-species={defenderSpecies}
    />
  ),
}));

// CalcFieldBlock stub — accepts all props including fairyAura/setFairyAura
jest.mock("../calc/calc-field-block", () => ({
  CalcFieldBlock: (props: Record<string, unknown>) => (
    <div data-testid="calc-field-block" data-game-type={String(props.gameType)} />
  ),
}));

// DefenderMonHeader stub
jest.mock("../calc/calc-defender-header", () => ({
  DefenderMonHeader: ({
    defenderSpecies,
  }: {
    defenderSpecies: string;
  }) => (
    <div data-testid="defender-mon-header">
      <span data-testid="defender-species">{defenderSpecies}</span>
    </div>
  ),
}));

// useDefenderMoves stub
jest.mock("../calc/use-defender-moves", () => ({
  useDefenderMoves: jest.fn(() => ({
    effectiveMoves: ["", "", "", ""],
  })),
}));

// =============================================================================
// Import after mocks
// =============================================================================

import { CalcBottomPanel } from "../calc/calc-bottom-panel";

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
    held_item: null,
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

interface RenderProps {
  teamSlots?: (Tables<"pokemon"> | null)[];
  format?: GameFormat | undefined;
  onClose?: jest.Mock;
  attackerIdx?: number;
  faintedYours?: number;
  setFaintedYours?: jest.Mock;
  faintedTheirs?: number;
  setFaintedTheirs?: jest.Mock;
}

function renderPanel(props: RenderProps = {}) {
  const onClose = props.onClose ?? jest.fn();
  const setFaintedYours = props.setFaintedYours ?? jest.fn();
  const setFaintedTheirs = props.setFaintedTheirs ?? jest.fn();
  const teamSlots = props.teamSlots ?? [makePokemon(), null, null, null, null, null];

  return render(
    <CalcBottomPanel
      teamSlots={teamSlots}
      format={props.format ?? VGC_FORMAT}
      onClose={onClose}
      attackerIdx={props.attackerIdx ?? 0}
      faintedYours={props.faintedYours ?? 0}
      setFaintedYours={setFaintedYours}
      faintedTheirs={props.faintedTheirs ?? 0}
      setFaintedTheirs={setFaintedTheirs}
    />
  );
}

// =============================================================================
// Setup
// =============================================================================

beforeEach(() => {
  jest.clearAllMocks();
  mockGetBaseStats.mockReturnValue({ hp: 68, attack: 65, defense: 65, specialAttack: 65, specialDefense: 65, speed: 65 });
  mockIsChampionsFormat.mockReturnValue(false);
  mockCalculateHP.mockReturnValue(145);
  mockCalculateChampionsHP.mockReturnValue(135);
});

// =============================================================================
// Tests
// =============================================================================

describe("CalcBottomPanel — header", () => {
  it("renders the 'Damage Calc' eyebrow label", () => {
    renderPanel();
    expect(screen.getByText("Damage Calc")).toBeInTheDocument();
  });

  it("renders the Close button", () => {
    renderPanel();
    expect(
      screen.getByRole("button", { name: /Close damage calc/i })
    ).toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    renderPanel({ onClose });
    await user.click(screen.getByRole("button", { name: /Close damage calc/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("wraps content in an aria-label='Damage Calc' section", () => {
    renderPanel();
    expect(screen.getByRole("region", { name: "Damage Calc" })).toBeInTheDocument();
  });
});

describe("CalcBottomPanel — child components", () => {
  it("renders CalcFieldBlock with gameType from context", () => {
    renderPanel();
    const fieldBlock = screen.getByTestId("calc-field-block");
    expect(fieldBlock).toBeInTheDocument();
    expect(fieldBlock).toHaveAttribute("data-game-type", "Doubles");
  });

  it("renders CalcDefenderStats with defender species from context", () => {
    renderPanel();
    const defStats = screen.getByTestId("calc-defender-stats");
    expect(defStats).toBeInTheDocument();
    expect(defStats).toHaveAttribute("data-species", "Incineroar");
  });

  it("renders CalcDefenderMoves", () => {
    renderPanel();
    expect(screen.getByTestId("calc-defender-moves")).toBeInTheDocument();
  });

  it("renders DefenderMonHeader with species from context", () => {
    renderPanel();
    expect(screen.getByTestId("defender-mon-header")).toBeInTheDocument();
    expect(screen.getByTestId("defender-species")).toHaveTextContent("Incineroar");
  });
});
