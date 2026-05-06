"use client";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

import type * as TrainersPokemon from "@trainers/pokemon";
import { type GameFormat, type MetaSpeedEntry } from "@trainers/pokemon";

import { SpeedTiersPanel } from "../dock/speed-tiers-panel";

// base-ui Switch uses PointerEvent which jsdom doesn't have
if (typeof globalThis.PointerEvent === "undefined") {
  // @ts-expect-error — minimal polyfill for jsdom
  globalThis.PointerEvent = class PointerEvent extends MouseEvent {
    readonly pointerId: number;
    constructor(type: string, params: PointerEventInit = {}) {
      super(type, params);
      this.pointerId = params.pointerId ?? 0;
    }
  };
}

// =============================================================================
// Mock heavy pokemon package functions so tests stay fast and deterministic.
// We want to test the panel's SORT LOGIC, not the pokemon stat calculations.
// =============================================================================

jest.mock("@trainers/pokemon", () => {
  const actual =
    jest.requireActual<typeof TrainersPokemon>("@trainers/pokemon");
  return {
    ...actual,
    // Return null so the panel falls through to getMetaSpeedTiers
    getLegalSpecies: jest.fn().mockReturnValue(null),
    // Controlled meta entries — three mons at distinct speeds
    getMetaSpeedTiers: jest.fn(),
    // Return a fixed speed tier label
    getSpeedTierLabel: jest.fn().mockReturnValue("mid"),
    // No speed-affecting items so the Select has no options to worry about
    getSpeedAffectingItems: jest.fn().mockReturnValue([]),
    // Minimal stat calc — return base speed so sort order is deterministic
    getBaseStats: jest
      .fn()
      .mockImplementation((_species: string) => ({ speed: 0 })),
    calculateStat: jest.fn().mockImplementation((base: number) => base),
    calculateChampionsStat: jest
      .fn()
      .mockImplementation((base: number) => base),
    getNatureMultiplier: jest.fn().mockReturnValue(1.0),
    // Speed modifiers passthrough — return the base unchanged
    applySpeedModifiers: jest.fn().mockImplementation((base: number) => base),
    // groupBySpeed: use the real implementation — it's pure and tiny
    groupBySpeed: actual.groupBySpeed,
  };
});

jest.mock("@trainers/pokemon/sprites", () => ({
  getPokemonSprite: jest.fn().mockReturnValue({ url: undefined }),
}));

// Next Image is not needed in jsdom
jest.mock("next/image", () => ({
  __esModule: true,
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
    <img {...props} alt={props.alt ?? ""} />
  ),
}));

// =============================================================================
// Helpers
// =============================================================================

const { getMetaSpeedTiers } =
  jest.requireMock<typeof TrainersPokemon>("@trainers/pokemon");

const { applySpeedModifiers } =
  jest.requireMock<typeof TrainersPokemon>("@trainers/pokemon");

/** Minimal gen 9 format for the panel */
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

/** Build MetaSpeedEntry stubs at specific base speeds */
function makeEntry(species: string, base: number): MetaSpeedEntry {
  return {
    species,
    displayName: species,
    base,
    fastSpread: base,
    slowSpread: base,
    speedAbility: undefined,
  };
}

/** Render the panel with an empty team, mocked meta entries, and return utils */
function renderPanel(
  entries: MetaSpeedEntry[],
  format: GameFormat = TEST_FORMAT
) {
  // Configure the mock meta source
  (getMetaSpeedTiers as jest.Mock).mockReturnValue(entries);

  // applySpeedModifiers returns the entry's fastSpread unchanged
  (applySpeedModifiers as jest.Mock).mockImplementation((base: number) => base);

  return render(<SpeedTiersPanel team={[]} format={format} />);
}

// =============================================================================
// "Select a format" empty state
// =============================================================================

describe("SpeedTiersPanel — no format", () => {
  it("shows a prompt when no format is provided", () => {
    render(<SpeedTiersPanel team={[]} format={undefined} />);
    expect(
      screen.getByText(/select a format to see speed tiers/i)
    ).toBeInTheDocument();
  });
});

// =============================================================================
// Trick Room sort order
// =============================================================================

describe("SpeedTiersPanel — Trick Room sort order", () => {
  const ENTRIES = [
    makeEntry("Amoonguss", 30), // slow
    makeEntry("Rillaboom", 60), // mid
    makeEntry("Flutter Mane", 100), // fast
  ];

  it("without Trick Room: faster mons appear first (descending speed)", () => {
    renderPanel(ENTRIES);

    // groupBySpeed returns descending by default; sortedGroups keeps that order
    const names = screen
      .getAllByText(/flutter mane|rillaboom|amoonguss/i)
      .map((el) => el.textContent?.trim());

    const flutterIdx = names.findIndex((n) => n === "Flutter Mane");
    const rillaboomIdx = names.findIndex((n) => n === "Rillaboom");
    const amoongussIdx = names.findIndex((n) => n === "Amoonguss");

    expect(flutterIdx).toBeLessThan(rillaboomIdx);
    expect(rillaboomIdx).toBeLessThan(amoongussIdx);
  });

  it("with Trick Room: slower mons appear first (ascending speed)", async () => {
    renderPanel(ENTRIES);

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /trick room/i }));

    const names = screen
      .getAllByText(/flutter mane|rillaboom|amoonguss/i)
      .map((el) => el.textContent?.trim());

    const flutterIdx = names.findIndex((n) => n === "Flutter Mane");
    const rillaboomIdx = names.findIndex((n) => n === "Rillaboom");
    const amoongussIdx = names.findIndex((n) => n === "Amoonguss");

    // Under TR: ascending → Amoonguss(30) first, Flutter Mane(100) last
    expect(amoongussIdx).toBeLessThan(rillaboomIdx);
    expect(rillaboomIdx).toBeLessThan(flutterIdx);
  });

  it("toggling Trick Room twice restores descending order", async () => {
    renderPanel(ENTRIES);

    const user = userEvent.setup();
    const trButton = screen.getByRole("button", { name: /trick room/i });

    await user.click(trButton); // TR on
    await user.click(trButton); // TR off

    const names = screen
      .getAllByText(/flutter mane|rillaboom|amoonguss/i)
      .map((el) => el.textContent?.trim());

    const flutterIdx = names.findIndex((n) => n === "Flutter Mane");
    const amoongussIdx = names.findIndex((n) => n === "Amoonguss");

    expect(flutterIdx).toBeLessThan(amoongussIdx);
  });
});

// =============================================================================
// Summary counts
// =============================================================================

describe("SpeedTiersPanel — summary removed", () => {
  it("does not show outspeed/outsped summary labels (feature removed)", () => {
    renderPanel([makeEntry("Pikachu", 110)]);
    expect(screen.queryByText("outspeed")).not.toBeInTheDocument();
    expect(screen.queryByText("outsped by")).not.toBeInTheDocument();
  });
});

// =============================================================================
// TR badge in hero readout
// =============================================================================

describe("SpeedTiersPanel — TR switch state", () => {
  it("TR button is not active by default", () => {
    renderPanel([makeEntry("Pikachu", 110)]);
    const trButton = screen.getByRole("button", { name: /trick room/i });
    expect(trButton.className).not.toMatch(/bg-primary/);
  });

  it("TR button is active when Trick Room is toggled", async () => {
    renderPanel([makeEntry("Pikachu", 110)]);

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /trick room/i }));

    const trButton = screen.getByRole("button", { name: /trick room/i });
    expect(trButton.className).toMatch(/bg-primary/);
  });
});

// =============================================================================
// External weather prop (synced from calc)
// =============================================================================

describe("SpeedTiersPanel — external weather prop", () => {
  const ENTRIES = [makeEntry("Pikachu", 110)];

  function renderWithWeather(
    weather?: string,
    setWeather?: (v: string) => void
  ) {
    (getMetaSpeedTiers as jest.Mock).mockReturnValue(ENTRIES);
    (applySpeedModifiers as jest.Mock).mockImplementation(
      (base: number) => base
    );

    return render(
      <SpeedTiersPanel
        team={[]}
        format={TEST_FORMAT}
        weather={weather}
        setWeather={setWeather}
      />
    );
  }

  it("highlights the Sun button when weather='Sun' is passed", () => {
    renderWithWeather("Sun");

    const sunButton = screen.getByRole("button", { name: /sun/i });
    expect(sunButton.className).toMatch(/bg-primary|ring/);
  });

  it("treats unknown weather values as 'none' (no button highlighted)", () => {
    renderWithWeather("Hail");

    // No weather button should be active — all should lack the active class
    const weatherButtons = ["Sun", "Rain", "Sand", "Snow"].map((w) =>
      screen.getByRole("button", { name: new RegExp(`^${w}$`, "i") })
    );
    for (const btn of weatherButtons) {
      expect(btn.className).not.toMatch(/bg-primary/);
    }
  });

  it("calls setWeather with capitalized value when a weather button is clicked", async () => {
    const mockSetWeather = jest.fn();
    renderWithWeather("", mockSetWeather);

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /rain/i }));

    expect(mockSetWeather).toHaveBeenCalledWith("Rain");
  });

  it("calls setWeather with empty string to toggle off active weather", async () => {
    const mockSetWeather = jest.fn();
    renderWithWeather("Rain", mockSetWeather);

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /rain/i }));

    // Clicking the already-active weather should toggle it off
    expect(mockSetWeather).toHaveBeenCalledWith("");
  });
});
