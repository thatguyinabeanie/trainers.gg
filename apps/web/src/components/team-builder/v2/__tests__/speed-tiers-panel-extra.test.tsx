"use client";

/**
 * Extra coverage for SpeedTiersPanel:
 *
 * - Yours/Theirs toggle interactions (Tailwind, Scarf, Iron Ball, stage, status)
 * - stageLabel formatting (+N, -N, 0)
 * - getTeamFastestSpeed exported helper
 * - Tier table row rendering
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
});

// =============================================================================
// Toggle interactions — yours/theirs tailwind, scarf, iron ball, stage, status
// =============================================================================

describe("SpeedTiersPanel — toggle interactions", () => {
  function renderEmpty() {
    return render(
      <SpeedTiersPanel team={[]} format={TEST_FORMAT} />
    );
  }

  it("Yours Tailwind toggle can be pressed and unpressed", async () => {
    renderEmpty();
    const user = userEvent.setup();
    const btn = screen.getByRole("button", { name: /yours tailwind/i });

    await user.click(btn);
    expect(btn).toHaveAttribute("aria-pressed", "true");

    await user.click(btn);
    expect(btn).toHaveAttribute("aria-pressed", "false");
  });

  it("Theirs Tailwind toggle can be pressed and unpressed", async () => {
    renderEmpty();
    const user = userEvent.setup();
    const btn = screen.getByRole("button", { name: /theirs tailwind/i });

    await user.click(btn);
    expect(btn).toHaveAttribute("aria-pressed", "true");

    await user.click(btn);
    expect(btn).toHaveAttribute("aria-pressed", "false");
  });

  it("Yours Scarf toggle can be pressed", async () => {
    renderEmpty();
    const user = userEvent.setup();
    const btn = screen.getByRole("button", { name: /yours choice scarf/i });

    await user.click(btn);
    expect(btn).toHaveAttribute("aria-pressed", "true");
  });

  it("Yours Iron Ball toggle can be pressed", async () => {
    renderEmpty();
    const user = userEvent.setup();
    const btn = screen.getByRole("button", { name: /yours iron ball/i });

    await user.click(btn);
    expect(btn).toHaveAttribute("aria-pressed", "true");
  });

  it("Scarf and Iron Ball are mutually exclusive (yours)", async () => {
    renderEmpty();
    const user = userEvent.setup();
    const scarfBtn = screen.getByRole("button", { name: /yours choice scarf/i });
    const ironBallBtn = screen.getByRole("button", { name: /yours iron ball/i });

    await user.click(scarfBtn);
    expect(scarfBtn).toHaveAttribute("aria-pressed", "true");

    await user.click(ironBallBtn);
    expect(ironBallBtn).toHaveAttribute("aria-pressed", "true");
    expect(scarfBtn).toHaveAttribute("aria-pressed", "false");
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

  it("increment Yours stage button increases the stage label from '0' to '+1'", async () => {
    renderEmpty();
    const user = userEvent.setup();

    await user.click(
      screen.getByRole("button", { name: /increment yours speed stage/i })
    );

    expect(screen.getByText("+1")).toBeInTheDocument();
  });

  it("decrement Yours stage button decreases the stage label from '0' to '-1'", async () => {
    renderEmpty();
    const user = userEvent.setup();

    await user.click(
      screen.getByRole("button", { name: /decrement yours speed stage/i })
    );

    expect(screen.getByText("-1")).toBeInTheDocument();
  });

  it("increment button is disabled at stage +6", async () => {
    renderEmpty();
    const user = userEvent.setup();
    const incBtn = screen.getByRole("button", { name: /increment yours speed stage/i });

    for (let i = 0; i < 6; i++) {
      await user.click(incBtn);
    }

    expect(incBtn).toBeDisabled();
  });

  it("decrement button is disabled at stage -6", async () => {
    renderEmpty();
    const user = userEvent.setup();
    const decBtn = screen.getByRole("button", { name: /decrement yours speed stage/i });

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
});

// =============================================================================
// stageLabel formatting
// =============================================================================

describe("SpeedTiersPanel — stageLabel display", () => {
  it("shows '0' in the stage stepper at default", () => {
    render(<SpeedTiersPanel team={[]} format={TEST_FORMAT} />);
    const incBtn = screen.getByRole("button", { name: /increment yours speed stage/i });
    expect(incBtn).not.toBeDisabled();
    const decBtn = screen.getByRole("button", { name: /decrement yours speed stage/i });
    expect(decBtn).not.toBeDisabled();
    const zeroEls = screen.getAllByText("0");
    expect(zeroEls.length).toBeGreaterThanOrEqual(1);
  });

  it("shows '+2' after two increments", async () => {
    const user = userEvent.setup();
    render(<SpeedTiersPanel team={[]} format={TEST_FORMAT} />);

    const incBtn = screen.getByRole("button", { name: /increment yours speed stage/i });
    await user.click(incBtn);
    await user.click(incBtn);

    expect(screen.getByText("+2")).toBeInTheDocument();
  });

  it("shows '-3' after three decrements", async () => {
    const user = userEvent.setup();
    render(<SpeedTiersPanel team={[]} format={TEST_FORMAT} />);

    const decBtn = screen.getByRole("button", { name: /decrement yours speed stage/i });
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
    const { getBaseStats } = jest.requireMock<typeof TrainersPokemon>(
      "@trainers/pokemon"
    );
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

    render(<SpeedTiersPanel team={[]} format={TEST_FORMAT} />);

    expect(screen.getByText("Amoonguss")).toBeInTheDocument();
    expect(screen.getByText("Rillaboom")).toBeInTheDocument();
  });

  it("excludes team pokemon species from the meta list", () => {
    (getMetaSpeedTiers as jest.Mock).mockReturnValue([
      makeEntry("Rillaboom", 60),
      makeEntry("Amoonguss", 30),
    ]);

    const rillaboom = makePokemon(10, "Rillaboom");
    const team = [makeTeamEntry(100, 10, 1, rillaboom)];

    render(<SpeedTiersPanel team={team} format={TEST_FORMAT} />);

    const instances = screen.getAllByText("Rillaboom");
    expect(instances).toHaveLength(1);
  });
});
