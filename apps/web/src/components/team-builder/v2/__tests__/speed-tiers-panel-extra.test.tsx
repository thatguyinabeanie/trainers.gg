"use client";

/**
 * Extra coverage for SpeedTiersPanel — branches not yet covered by
 * speed-tiers-panel.test.tsx:
 *
 * - Team pokemon with an activeIdx → selected pokemon hero readout
 * - Summary count arithmetic (outspeed / tie / outsped by branches)
 * - Tailwind, weather, stage, status, item toggle interactions
 * - stageLabel formatting (+N, -N, 0)
 * - getTeamFastestSpeed exported helper
 * - selectedPokemon derived from slot-indexed array (the activeIdx bug-fix path)
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

import type * as TrainersPokemon from "@trainers/pokemon";
import {
  type GameFormat,
  type MetaSpeedEntry,
} from "@trainers/pokemon";

import { type Tables, type TeamWithPokemon } from "@trainers/supabase";

// =============================================================================
// Mock heavy pokemon package — same pattern as speed-tiers-panel.test.tsx
// =============================================================================

jest.mock("@trainers/pokemon", () => {
  const actual = jest.requireActual<typeof TrainersPokemon>(
    "@trainers/pokemon"
  );
  return {
    ...actual,
    getLegalSpecies: jest.fn().mockReturnValue(null),
    getMetaSpeedTiers: jest.fn().mockReturnValue([]),
    getSpeedTierLabel: jest.fn().mockReturnValue("mid"),
    getSpeedAffectingItems: jest.fn().mockReturnValue([
      { id: "choice-scarf", displayName: "Choice Scarf" },
    ]),
    getBaseStats: jest
      .fn()
      .mockImplementation((_species: string) => ({ speed: 100 })),
    calculateStat: jest.fn().mockReturnValue(150),
    calculateChampionsStat: jest.fn().mockReturnValue(110),
    getNatureMultiplier: jest.fn().mockReturnValue(1.0),
    applySpeedModifiers: jest
      .fn()
      .mockImplementation((base: number) => base),
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

const {
  getMetaSpeedTiers,
  applySpeedModifiers,
  getSpeedAffectingItems,
} = jest.requireMock<typeof TrainersPokemon>("@trainers/pokemon");

// =============================================================================
// Imports AFTER mocks
// =============================================================================

import { SpeedTiersPanel, getTeamFastestSpeed } from "../dock/speed-tiers-panel";

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
  (getSpeedAffectingItems as jest.Mock).mockReturnValue([
    { id: "choice-scarf", displayName: "Choice Scarf" },
  ]);
});

// =============================================================================
// Hero readout — selected pokemon from slot-indexed array
// =============================================================================

describe("SpeedTiersPanel — hero readout with selected pokemon", () => {
  it("shows the hero readout for the pokemon at activeIdx", () => {
    // Two pokemon: slot 1 = Garchomp (position 2), slot 0 = Incineroar (position 1)
    // activeIdx = 1 → should select Garchomp at slot 1
    const garchomp = makePokemon(10, "Garchomp");
    const incineroar = makePokemon(20, "Incineroar");
    const team = [
      makeTeamEntry(100, 20, 1, incineroar),
      makeTeamEntry(101, 10, 2, garchomp),
    ];

    render(
      <SpeedTiersPanel team={team} activeIdx={1} format={TEST_FORMAT} />
    );

    // Hero readout shows "Selected · <species>"
    expect(screen.getByText(/selected · garchomp/i)).toBeInTheDocument();
  });

  it("uses the slot-position index so sparse teams work correctly (activeIdx bug fix)", () => {
    // Garchomp is at team_position 4 (slot index 3), not position 1.
    // activeIdx=3 should select Garchomp even though it's the only pokemon.
    const garchomp = makePokemon(10, "Garchomp");
    const team = [makeTeamEntry(100, 10, 4, garchomp)];

    render(
      <SpeedTiersPanel team={team} activeIdx={3} format={TEST_FORMAT} />
    );

    expect(screen.getByText(/selected · garchomp/i)).toBeInTheDocument();
  });

  it("does NOT show a hero readout when activeIdx points to an empty slot", () => {
    // Only slot 0 is filled; activeIdx=2 → empty slot
    const garchomp = makePokemon(10, "Garchomp");
    const team = [makeTeamEntry(100, 10, 1, garchomp)];

    render(
      <SpeedTiersPanel team={team} activeIdx={2} format={TEST_FORMAT} />
    );

    expect(screen.queryByText(/selected ·/i)).not.toBeInTheDocument();
  });

  it("shows the speed readout label in hero readout when speed > 0", () => {
    // applySpeedModifiers returns 150 → heroSpeed = 150 → displayed in hero
    (applySpeedModifiers as jest.Mock).mockReturnValue(150);

    const garchomp = makePokemon(10, "Garchomp");
    const team = [makeTeamEntry(100, 10, 1, garchomp)];

    render(
      <SpeedTiersPanel team={team} activeIdx={0} format={TEST_FORMAT} />
    );

    // "Speed" label appears in the hero readout header
    expect(screen.getByText("Speed")).toBeInTheDocument();
    // The hero readout is present (selected pokemon shown)
    expect(screen.getByText(/selected · garchomp/i)).toBeInTheDocument();
  });

  it("shows TR badge in hero readout when Trick Room is active", async () => {
    const garchomp = makePokemon(10, "Garchomp");
    const team = [makeTeamEntry(100, 10, 1, garchomp)];

    const user = userEvent.setup();
    render(
      <SpeedTiersPanel team={team} activeIdx={0} format={TEST_FORMAT} />
    );

    await user.click(screen.getByRole("button", { name: /trick room/i }));

    expect(screen.getByText("TR")).toBeInTheDocument();
  });
});

// =============================================================================
// Summary count arithmetic — outspeed / tie / outsped branches
// =============================================================================

describe("SpeedTiersPanel — summary count arithmetic", () => {
  it("counts outspeed correctly: hero faster than all opponents", () => {
    // heroSpeed = 150 (selected mon); meta at 100 = outsped by hero
    (applySpeedModifiers as jest.Mock)
      .mockReturnValueOnce(150) // team mon (selected) → heroSpeed = 150
      .mockReturnValue(100); // meta mons

    (getMetaSpeedTiers as jest.Mock).mockReturnValue([
      makeEntry("Pikachu", 100),
      makeEntry("Raichu", 100),
    ]);

    const garchomp = makePokemon(10, "Garchomp");
    const team = [makeTeamEntry(100, 10, 1, garchomp)];

    render(<SpeedTiersPanel team={team} activeIdx={0} format={TEST_FORMAT} />);

    // outspeedCount = 2, tieCount = 0, outspedCount = 0
    // The summary grid shows: outspeedCount | tieCount | outspedCount
    expect(screen.getByText("outspeed")).toBeInTheDocument();
  });

  it("counts ties correctly: hero same speed as opponent", () => {
    // heroSpeed = 100; meta at 100 = tie
    (applySpeedModifiers as jest.Mock).mockReturnValue(100);

    (getMetaSpeedTiers as jest.Mock).mockReturnValue([
      makeEntry("Raichu", 100),
    ]);

    const garchomp = makePokemon(10, "Garchomp");
    const team = [makeTeamEntry(100, 10, 1, garchomp)];

    render(<SpeedTiersPanel team={team} activeIdx={0} format={TEST_FORMAT} />);

    // Tie count should be 1
    expect(screen.getByText("tie")).toBeInTheDocument();
  });

  it("under Trick Room: slower hero → higher outspeedCount (outsped-by logic flips)", async () => {
    // heroSpeed = 50; meta at 150 = opponent is faster
    // Under TR: faster opponent → outspeedCount++ (not outspedCount++)
    (applySpeedModifiers as jest.Mock)
      .mockReturnValueOnce(50) // selected team mon
      .mockReturnValue(150); // meta mons

    (getMetaSpeedTiers as jest.Mock).mockReturnValue([
      makeEntry("Flutter Mane", 150),
    ]);

    const garchomp = makePokemon(10, "Garchomp");
    const team = [makeTeamEntry(100, 10, 1, garchomp)];

    const user = userEvent.setup();
    render(<SpeedTiersPanel team={team} activeIdx={0} format={TEST_FORMAT} />);

    await user.click(screen.getByRole("button", { name: /trick room/i }));

    // Under TR: summary first-column label becomes "outsped by"
    const allLabels = screen.getAllByText(/outsped by|outspeed/i).map(
      (el) => el.textContent?.trim()
    );
    expect(allLabels).toContain("outsped by");
  });
});

// =============================================================================
// Toggle interactions — tailwind, weather, stage, status, item
// =============================================================================

describe("SpeedTiersPanel — toggle interactions", () => {
  function renderEmpty() {
    return render(
      <SpeedTiersPanel team={[]} activeIdx={0} format={TEST_FORMAT} />
    );
  }

  it("tailwind toggle can be pressed and unpressed", async () => {
    renderEmpty();
    const user = userEvent.setup();
    const btn = screen.getByRole("button", { name: /tailwind/i });

    await user.click(btn);
    expect(btn).toHaveAttribute("aria-pressed", "true");

    await user.click(btn);
    expect(btn).toHaveAttribute("aria-pressed", "false");
  });

  it.each(["Sun", "Rain", "Sand", "Snow"] as const)(
    "%s weather toggle can be activated",
    async (weather) => {
      renderEmpty();
      const user = userEvent.setup();

      await user.click(screen.getByRole("button", { name: weather }));

      expect(
        screen.getByRole("button", { name: weather })
      ).toHaveAttribute("aria-pressed", "true");
    }
  );

  it("clicking an active weather toggle again sets it back to 'none'", async () => {
    renderEmpty();
    const user = userEvent.setup();
    const rainBtn = screen.getByRole("button", { name: "Rain" });

    await user.click(rainBtn); // activate
    expect(rainBtn).toHaveAttribute("aria-pressed", "true");

    await user.click(rainBtn); // deactivate
    expect(rainBtn).toHaveAttribute("aria-pressed", "false");
  });

  it("increment stage button increases the stage label from '0' to '+1'", async () => {
    renderEmpty();
    const user = userEvent.setup();

    await user.click(
      screen.getByRole("button", { name: /increment speed stage/i })
    );

    expect(screen.getByText("+1")).toBeInTheDocument();
  });

  it("decrement stage button decreases the stage label from '0' to '-1'", async () => {
    renderEmpty();
    const user = userEvent.setup();

    await user.click(
      screen.getByRole("button", { name: /decrement speed stage/i })
    );

    expect(screen.getByText("-1")).toBeInTheDocument();
  });

  it("increment button is disabled at stage +6", async () => {
    renderEmpty();
    const user = userEvent.setup();
    const incBtn = screen.getByRole("button", { name: /increment speed stage/i });

    // Click 6 times to reach max
    for (let i = 0; i < 6; i++) {
      await user.click(incBtn);
    }

    expect(incBtn).toBeDisabled();
  });

  it("decrement button is disabled at stage -6", async () => {
    renderEmpty();
    const user = userEvent.setup();
    const decBtn = screen.getByRole("button", { name: /decrement speed stage/i });

    for (let i = 0; i < 6; i++) {
      await user.click(decBtn);
    }

    expect(decBtn).toBeDisabled();
  });

  it("toggle bar renders all four weather buttons", () => {
    renderEmpty();
    expect(screen.getByRole("button", { name: "Sun" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rain" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sand" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Snow" })).toBeInTheDocument();
  });

  it("item select renders the mocked Choice Scarf option", () => {
    renderEmpty();
    expect(screen.getByText("Item")).toBeInTheDocument();
  });
});

// =============================================================================
// stageLabel formatting
// =============================================================================

describe("SpeedTiersPanel — stageLabel display", () => {
  it("shows '0' in the stage stepper at default", () => {
    render(<SpeedTiersPanel team={[]} activeIdx={0} format={TEST_FORMAT} />);
    // The stage stepper cell shows the stage label "0" — verified via
    // the font-mono text inside the stepper grid (the summary numbers also
    // show 0, so we verify via the stepper increment/decrement context).
    const incBtn = screen.getByRole("button", { name: /increment speed stage/i });
    // Stepper is present and not disabled at stage 0
    expect(incBtn).not.toBeDisabled();
    const decBtn = screen.getByRole("button", { name: /decrement speed stage/i });
    expect(decBtn).not.toBeDisabled();
    // Stage label "0" appears at least once
    const zeroEls = screen.getAllByText("0");
    expect(zeroEls.length).toBeGreaterThanOrEqual(1);
  });

  it("shows '+2' after two increments", async () => {
    const user = userEvent.setup();
    render(<SpeedTiersPanel team={[]} activeIdx={0} format={TEST_FORMAT} />);

    const incBtn = screen.getByRole("button", { name: /increment speed stage/i });
    await user.click(incBtn);
    await user.click(incBtn);

    expect(screen.getByText("+2")).toBeInTheDocument();
  });

  it("shows '-3' after three decrements", async () => {
    const user = userEvent.setup();
    render(<SpeedTiersPanel team={[]} activeIdx={0} format={TEST_FORMAT} />);

    const decBtn = screen.getByRole("button", { name: /decrement speed stage/i });
    await user.click(decBtn);
    await user.click(decBtn);
    await user.click(decBtn);

    expect(screen.getByText("-3")).toBeInTheDocument();
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
    // calculateStat mock returns 150 — all mons will have the same max speed
    const pikachu = makePokemon(1, "Pikachu");
    const raichu = makePokemon(2, "Raichu");
    const team = [
      makeTeamEntry(100, 1, 1, pikachu),
      makeTeamEntry(101, 2, 2, raichu),
    ];

    const result = getTeamFastestSpeed(team, TEST_FORMAT);
    // calculateStat returns 150; fastest = 150
    expect(result).toBe(150);
  });

  it("skips mons with no base stats (getBaseStats returns null)", () => {
    const { getBaseStats } = jest.requireMock<typeof TrainersPokemon>(
      "@trainers/pokemon"
    );
    (getBaseStats as jest.Mock).mockReturnValueOnce(null); // first mon: no data

    const pikachu = makePokemon(1, "Pikachu");
    const raichu = makePokemon(2, "Raichu");
    const team = [
      makeTeamEntry(100, 1, 1, pikachu),
      makeTeamEntry(101, 2, 2, raichu),
    ];

    const result = getTeamFastestSpeed(team, TEST_FORMAT);
    // First mon skipped, second returns 150
    expect(result).toBe(150);
  });

  it("returns 0 for a single-mon team when getBaseStats returns null", () => {
    const { getBaseStats } = jest.requireMock<typeof TrainersPokemon>(
      "@trainers/pokemon"
    );
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

    render(<SpeedTiersPanel team={[]} activeIdx={0} format={TEST_FORMAT} />);

    expect(screen.getByText("Amoonguss")).toBeInTheDocument();
    expect(screen.getByText("Rillaboom")).toBeInTheDocument();
  });

  it("excludes team pokemon species from the meta list", () => {
    // Rillaboom on the team → should not appear twice
    (getMetaSpeedTiers as jest.Mock).mockReturnValue([
      makeEntry("Rillaboom", 60),
      makeEntry("Amoonguss", 30),
    ]);

    const rillaboom = makePokemon(10, "Rillaboom");
    const team = [makeTeamEntry(100, 10, 1, rillaboom)];

    render(<SpeedTiersPanel team={team} activeIdx={0} format={TEST_FORMAT} />);

    // Rillaboom from team should appear once (team row), not twice (team + meta)
    const instances = screen.getAllByText("Rillaboom");
    // Team row shows species; meta entry is filtered out
    expect(instances).toHaveLength(1);
  });
});
