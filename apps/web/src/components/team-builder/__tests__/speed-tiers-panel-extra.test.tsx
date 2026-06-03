"use client";

/**
 * Extra coverage for SpeedTiersPanel:
 *
 * - Yours/Theirs switch interactions (Tailwind, Scarf, Paralyzed, stage)
 * - stageLabel formatting (+N, -N, 0)
 * - getTeamFastestSpeed exported helper
 * - Tier table row rendering
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

import type * as TrainersPokemon from "@trainers/pokemon";
import { type GameFormat, type MetaSpeedEntry } from "@trainers/pokemon";

import { type Tables, type TeamWithPokemon } from "@trainers/supabase";

// =============================================================================
// Mock heavy pokemon package — same pattern as speed-tiers-panel.test.tsx
// =============================================================================

jest.mock("@trainers/pokemon", () => {
  const actual =
    jest.requireActual<typeof TrainersPokemon>("@trainers/pokemon");
  return {
    ...actual,
    getLegalSpecies: jest.fn().mockReturnValue(null),
    getMetaSpeedTiers: jest.fn().mockReturnValue([]),
    getSpeedTierLabel: jest.fn().mockReturnValue("mid"),
    getBaseStats: jest
      .fn()
      .mockImplementation((_species: string) => ({ speed: 100 })),
    calculateStat: jest.fn().mockReturnValue(150),
    calculateChampionsStat: jest.fn().mockReturnValue(110),
    getNatureMultiplier: jest.fn().mockReturnValue(1.0),
    applySpeedModifiers: jest.fn().mockImplementation((base: number) => base),
    groupBySpeed: actual.groupBySpeed,
    isChampionsFormat: actual.isChampionsFormat,
  };
});

jest.mock("@trainers/pokemon/sprites", () => ({
  getPokemonSprite: jest.fn().mockReturnValue({ url: undefined }),
}));

jest.mock("next/image", () => ({
  __esModule: true,
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
    <img {...props} alt={props.alt ?? ""} />
  ),
}));

// =============================================================================
// Access mocks
// =============================================================================

const { getMetaSpeedTiers, applySpeedModifiers } =
  jest.requireMock<typeof TrainersPokemon>("@trainers/pokemon");

// =============================================================================
// Imports AFTER mocks
// =============================================================================

import {
  SpeedTiersPanel,
  getTeamFastestSpeed,
} from "../dock/speed-tiers-panel";
import { useSpeedTiersToggle } from "../dock/speed-tiers-state";

/**
 * Stateful harness — SpeedTiersPanel is now a controlled component that
 * requires `toggle`/`setToggle`. The harness supplies real state via the
 * shared hook so interaction tests (stage steppers, etc.) work.
 */
function SpeedTiersPanelHarness(
  props: Omit<
    React.ComponentProps<typeof SpeedTiersPanel>,
    "toggle" | "setToggle"
  >
) {
  const { toggle, setToggle } = useSpeedTiersToggle();
  return <SpeedTiersPanel {...props} toggle={toggle} setToggle={setToggle} />;
}

// =============================================================================
// Fixtures
// =============================================================================

const TEST_FORMAT: GameFormat = {
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
  id: number,
  species: string,
  overrides: Partial<Tables<"pokemon">> = {}
): Tables<"pokemon"> {
  return {
    id,
    species,
    ability: "Intimidate",
    nature: "Hardy",
    move1: "Fake Out",
    move2: null,
    move3: null,
    move4: null,
    ev_hp: 0,
    ev_attack: 0,
    ev_defense: 0,
    ev_special_attack: 0,
    ev_special_defense: 0,
    ev_speed: 0,
    iv_hp: 31,
    iv_attack: 31,
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

function makeTeamEntry(
  id: number,
  pokemonId: number,
  position: number,
  pokemon: Tables<"pokemon"> | null
): TeamWithPokemon["team_pokemon"][number] {
  return { id, pokemon_id: pokemonId, team_position: position, pokemon };
}

function makeEntry(species: string, speed: number): MetaSpeedEntry {
  return {
    species,
    displayName: species,
    base: speed,
    fastSpread: speed,
    slowSpread: speed,
    speedAbility: undefined,
  };
}

// =============================================================================
// Setup
// =============================================================================

beforeEach(() => {
  jest.clearAllMocks();
  (getMetaSpeedTiers as jest.Mock).mockReturnValue([]);
  (applySpeedModifiers as jest.Mock).mockImplementation((base: number) => base);
});

// =============================================================================
// Switch interactions — yours/theirs tailwind, scarf, paralyzed, stages
// =============================================================================

describe("SpeedTiersPanel — switch interactions", () => {
  function renderEmpty() {
    return render(<SpeedTiersPanelHarness team={[]} format={TEST_FORMAT} />);
  }

  it("renders section labels and headers", () => {
    renderEmpty();
    expect(screen.getByText("Field")).toBeInTheDocument();
    expect(screen.getByText("Modifiers")).toBeInTheDocument();
    expect(screen.getByText("Ours")).toBeInTheDocument();
    expect(screen.getByText("Theirs")).toBeInTheDocument();
  });

  it("renders Tailwind label with toggle switches for both sides", () => {
    renderEmpty();
    // In 3-column layout, label appears once in the center
    expect(screen.getByText("Tailwind")).toBeInTheDocument();
    // Two switch toggles for tailwind (ours + theirs)
    expect(
      screen.getByRole("switch", { name: /our tailwind/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("switch", { name: /their tailwind/i })
    ).toBeInTheDocument();
  });

  it("renders weather switches", () => {
    renderEmpty();
    expect(screen.getByText("Sun")).toBeInTheDocument();
    expect(screen.getByText("Rain")).toBeInTheDocument();
    expect(screen.getByText("Sand")).toBeInTheDocument();
    expect(screen.getByText("Snow")).toBeInTheDocument();
  });

  it("renders Trick Room toggle button", () => {
    renderEmpty();
    expect(
      screen.getByRole("button", { name: /trick room/i })
    ).toBeInTheDocument();
  });

  it("renders stage steppers for both sides", () => {
    renderEmpty();
    // Single "Stages" label in the center column
    expect(screen.getByText("Stages")).toBeInTheDocument();
    // Two stage displays (one per side) showing "0"
    const zeroEls = screen.getAllByText("0");
    expect(zeroEls.length).toBeGreaterThanOrEqual(2);
  });

  it("stage stepper shows '0' at default", () => {
    renderEmpty();
    const zeroEls = screen.getAllByText("0");
    expect(zeroEls.length).toBeGreaterThanOrEqual(2);
  });

  it("clicking stage + on ours side increases stage", async () => {
    renderEmpty();
    const user = userEvent.setup();
    const plusButton = screen.getByRole("button", {
      name: /our stage increase/i,
    });
    await user.click(plusButton);
    expect(screen.getByText("+1")).toBeInTheDocument();
  });

  it("clicking stage − on ours side decreases stage", async () => {
    renderEmpty();
    const user = userEvent.setup();
    const minusButton = screen.getByRole("button", {
      name: /our stage decrease/i,
    });
    await user.click(minusButton);
    expect(screen.getByText("-1")).toBeInTheDocument();
  });
});

// =============================================================================
// getTeamFastestSpeed — exported helper
// =============================================================================

describe("getTeamFastestSpeed", () => {
  it("returns 0 for an empty team", () => {
    expect(getTeamFastestSpeed([], TEST_FORMAT)).toBe(0);
  });

  it("returns 0 when all team_pokemon have null pokemon entries", () => {
    const team = [
      makeTeamEntry(100, 10, 1, null),
      makeTeamEntry(101, 20, 2, null),
    ];
    expect(getTeamFastestSpeed(team, TEST_FORMAT)).toBe(0);
  });

  it("returns the fastest speed across all team pokemon", () => {
    const pikachu = makePokemon(1, "Pikachu");
    const raichu = makePokemon(2, "Raichu");
    const team = [
      makeTeamEntry(100, 1, 1, pikachu),
      makeTeamEntry(101, 2, 2, raichu),
    ];

    const result = getTeamFastestSpeed(team, TEST_FORMAT);
    expect(result).toBe(150);
  });

  it("skips mons with no base stats (getBaseStats returns null)", () => {
    const { getBaseStats } =
      jest.requireMock<typeof TrainersPokemon>("@trainers/pokemon");
    (getBaseStats as jest.Mock).mockReturnValueOnce(null);

    const pikachu = makePokemon(1, "Pikachu");
    const raichu = makePokemon(2, "Raichu");
    const team = [
      makeTeamEntry(100, 1, 1, pikachu),
      makeTeamEntry(101, 2, 2, raichu),
    ];

    const result = getTeamFastestSpeed(team, TEST_FORMAT);
    expect(result).toBe(150);
  });

  it("returns 0 for a single-mon team when getBaseStats returns null", () => {
    const { getBaseStats } =
      jest.requireMock<typeof TrainersPokemon>("@trainers/pokemon");
    (getBaseStats as jest.Mock).mockReturnValueOnce(null);

    const pikachu = makePokemon(1, "Pikachu");
    const team = [makeTeamEntry(100, 1, 1, pikachu)];

    expect(getTeamFastestSpeed(team, TEST_FORMAT)).toBe(0);
  });
});

// =============================================================================
// Tier table — row rendering
// =============================================================================

describe("SpeedTiersPanel — tier table row rendering", () => {
  it("renders meta pokemon names in the tier table", () => {
    (getMetaSpeedTiers as jest.Mock).mockReturnValue([
      makeEntry("Amoonguss", 30),
      makeEntry("Rillaboom", 60),
    ]);

    render(<SpeedTiersPanelHarness team={[]} format={TEST_FORMAT} />);

    expect(screen.getByText("Amoonguss")).toBeInTheDocument();
    expect(screen.getByText("Rillaboom")).toBeInTheDocument();
  });

  it("shows team pokemon alongside the same species in the meta list (no deduplication)", () => {
    (getMetaSpeedTiers as jest.Mock).mockReturnValue([
      makeEntry("Rillaboom", 60),
      makeEntry("Amoonguss", 30),
    ]);

    const rillaboom = makePokemon(10, "Rillaboom");
    const team = [makeTeamEntry(100, 10, 1, rillaboom)];

    render(<SpeedTiersPanelHarness team={team} format={TEST_FORMAT} />);

    const instances = screen.getAllByText("Rillaboom");
    expect(instances).toHaveLength(2);
  });
});
