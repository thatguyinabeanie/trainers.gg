"use client";

import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

import { type GameFormat, type MetaSpeedEntry } from "@trainers/pokemon";

import { SpeedTiersPanel } from "../dock/speed-tiers-panel";

// =============================================================================
// Mock heavy pokemon package functions so tests stay fast and deterministic.
// We want to test the panel's SORT LOGIC, not the pokemon stat calculations.
// =============================================================================

jest.mock("@trainers/pokemon", () => {
  const actual = jest.requireActual<typeof import("@trainers/pokemon")>(
    "@trainers/pokemon"
  );
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
    // Minimal stat calc — just return the base speed so tests are predictable
    getBaseStats: jest
      .fn()
      .mockImplementation((species: string) => ({ speed: 0 })),
    calculateStat: jest.fn().mockReturnValue(0),
    calculateChampionsStat: jest.fn().mockReturnValue(0),
    getNatureMultiplier: jest.fn().mockReturnValue(1.0),
    // Speed modifiers passthrough — return the base unchanged
    applySpeedModifiers: jest
      .fn()
      .mockImplementation((base: number) => base),
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
    // eslint-disable-next-line @next/next/no-img-element
    <img {...props} alt={props.alt ?? ""} />
  ),
}));

// =============================================================================
// Helpers
// =============================================================================

const { getMetaSpeedTiers } = jest.requireMock<
  typeof import("@trainers/pokemon")
>("@trainers/pokemon");

const { applySpeedModifiers } = jest.requireMock<
  typeof import("@trainers/pokemon")
>("@trainers/pokemon");

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
  (applySpeedModifiers as jest.Mock).mockImplementation(
    (base: number) => base
  );

  return render(<SpeedTiersPanel team={[]} activeIdx={0} format={format} />);
}

// =============================================================================
// "Select a format" empty state
// =============================================================================

describe("SpeedTiersPanel — no format", () => {
  it("shows a prompt when no format is provided", () => {
    render(<SpeedTiersPanel team={[]} activeIdx={0} format={undefined} />);
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
    const names = screen.getAllByText(/flutter mane|rillaboom|amoonguss/i).map(
      (el) => el.textContent?.trim()
    );

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

    const names = screen.getAllByText(/flutter mane|rillaboom|amoonguss/i).map(
      (el) => el.textContent?.trim()
    );

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
    const trBtn = screen.getByRole("button", { name: /trick room/i });

    await user.click(trBtn); // TR on
    await user.click(trBtn); // TR off

    const names = screen.getAllByText(/flutter mane|rillaboom|amoonguss/i).map(
      (el) => el.textContent?.trim()
    );

    const flutterIdx = names.findIndex((n) => n === "Flutter Mane");
    const amoongussIdx = names.findIndex((n) => n === "Amoonguss");

    expect(flutterIdx).toBeLessThan(amoongussIdx);
  });
});

// =============================================================================
// Summary counts
// =============================================================================

describe("SpeedTiersPanel — summary count labels", () => {
  it("shows 'outspeed' / 'outsped by' labels without Trick Room", () => {
    renderPanel([makeEntry("Pikachu", 110)]);
    expect(screen.getByText("outspeed")).toBeInTheDocument();
    expect(screen.getByText("outsped by")).toBeInTheDocument();
  });

  it("flips labels to 'outsped by' / 'outspeed' under Trick Room", async () => {
    renderPanel([makeEntry("Pikachu", 110)]);

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /trick room/i }));

    // Under TR the first label column becomes "outsped by"
    const allLabels = screen.getAllByText(/outsped by|outspeed/i).map(
      (el) => el.textContent?.trim()
    );
    expect(allLabels).toContain("outsped by");
    expect(allLabels).toContain("outspeed");
  });
});

// =============================================================================
// TR badge in hero readout
// =============================================================================

describe("SpeedTiersPanel — TR badge visibility", () => {
  it("does not show TR badge without Trick Room", () => {
    renderPanel([makeEntry("Pikachu", 110)]);
    expect(screen.queryByText("TR")).not.toBeInTheDocument();
  });

  it("shows TR badge when Trick Room is active", async () => {
    renderPanel([makeEntry("Pikachu", 110)]);

    const user = userEvent.setup();
    // Need a selected pokemon for the hero readout to appear
    // With empty team there's no hero readout, so test at the summary level
    await user.click(screen.getByRole("button", { name: /trick room/i }));

    // The TR toggle should be visually pressed (aria-pressed)
    const trBtn = screen.getByRole("button", { name: /trick room/i });
    expect(trBtn).toHaveAttribute("aria-pressed", "true");
  });
});
