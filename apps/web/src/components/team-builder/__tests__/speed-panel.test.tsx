import { describe, it, expect, jest } from "@jest/globals";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// =============================================================================
// Module-level mocks — must precede the component import.
//
// Strategy: use the REAL applySpeedModifiers / groupBySpeed / getSpeedTierLabel
// implementations (they're pure and well-tested in the package). We stub
// getBaseStats / nature / meta entries so we can assert on concrete numbers.
// =============================================================================

import type * as PokemonModule from "@trainers/pokemon";

const realPokemon = jest.requireActual(
  "@trainers/pokemon"
) as typeof PokemonModule;

jest.mock("@trainers/pokemon", () => {
  const actual = jest.requireActual(
    "@trainers/pokemon"
  ) as typeof PokemonModule;

  return {
    ...actual,
    // Selected mon: base 100. With 0 EVs, neutral nature, IV 31, L50 →
    // calculateStat = floor(((2*100 + 31 + 0)*50/100) + 5) = 120 → 120
    getBaseStats: jest.fn((species: string) => {
      const map: Record<
        string,
        {
          hp: number;
          attack: number;
          defense: number;
          specialAttack: number;
          specialDefense: number;
          speed: number;
        }
      > = {
        Floette: {
          hp: 80,
          attack: 80,
          defense: 80,
          specialAttack: 80,
          specialDefense: 80,
          speed: 100,
        },
        Pikachu: {
          hp: 35,
          attack: 55,
          defense: 40,
          specialAttack: 50,
          specialDefense: 50,
          speed: 90,
        },
        Incineroar: {
          hp: 95,
          attack: 115,
          defense: 90,
          specialAttack: 80,
          specialDefense: 90,
          speed: 60,
        },
      };
      return map[species] ?? null;
    }),
    getNatureMultiplier: jest.fn(() => 1.0),
    // Return undefined so SpeedPanel falls back to the mocked getMetaSpeedTiers
    // list rather than building entries from the real Champions legal species set.
    getLegalSpecies: jest.fn(() => undefined),
    getValidAbilities: jest.fn(() => []),
    // Curated meta entries used by tests:
    //  - Iron Bundle: very fast, no ability impact
    //  - Volcarona: shares the selected mon's tier (tie risk)
    //  - Venusaur: Chlorophyll → ×2 in sun
    getMetaSpeedTiers: jest.fn(() => [
      {
        species: "ironbundle",
        displayName: "Iron Bundle",
        base: 136,
        fastSpread: 200,
        slowSpread: 156,
      },
      {
        species: "volcarona",
        displayName: "Volcarona",
        // fastSpread = 120 → ties Floette (base 100 at max-investment neutral = 120)
        base: 100,
        fastSpread: 120,
        slowSpread: 121,
      },
      {
        species: "venusaur",
        displayName: "Venusaur",
        base: 80,
        fastSpread: 90,
        slowSpread: 80,
        speedAbility: "chlorophyll",
      },
    ]),
  };
});

jest.mock("@trainers/pokemon/sprites", () => ({
  getPokemonSprite: jest.fn((species: string) => ({
    url: `https://sprites.example/${species}.png`,
    w: 96,
    h: 96,
    pixelated: true,
  })),
}));

// Now safe to import.
import { type GameFormat } from "@trainers/pokemon";
import { type Tables } from "@trainers/supabase";

import { SpeedPanel } from "../speed-panel";

// =============================================================================
// Fixtures
// =============================================================================

const FORMAT: GameFormat = {
  id: "championsvgc2026regma",
  game: "Pokemon Champions",
  gameShort: "Champions",
  generation: 9, // use 9 so the classic stat formula runs (not Champions SP)
  category: "VGC",
  year: 2026,
  regulation: "M-A",
  label: "Champions: Reg M-A",
  showdownName: "[Gen 10] Champions VGC 2026 Reg M-A",
  doubles: true,
  active: true,
};

function makePokemon(
  overrides: Partial<Tables<"pokemon">> = {}
): Tables<"pokemon"> {
  return {
    id: 1,
    species: "Floette",
    is_shiny: false,
    ability: null,
    nature: "Hardy",
    held_item: null,
    nickname: null,
    gender: null,
    level: 50,
    move1: null,
    move2: null,
    move3: null,
    move4: null,
    tera_type: null,
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
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Compute the deterministic base speed our mocked species produce, mirroring
 * calculateStat with neutral nature, IV 31, EV 0, L50.
 */
function expectedBaseSpeed(speciesBaseSpeed: number): number {
  return realPokemon.calculateStat(speciesBaseSpeed, 31, 0, 50, 1.0);
}

// Sanity: selected Floette base 100 should give 120.
const FLOETTE_SPEED = expectedBaseSpeed(100); // 120
const PIKACHU_SPEED = expectedBaseSpeed(90); // 110
const INCINEROAR_SPEED = expectedBaseSpeed(60); // 80

// =============================================================================
// Tests
// =============================================================================

describe("SpeedPanel — hero", () => {
  it("renders the selected mon's effective speed and tier label", () => {
    const selected = makePokemon({ id: 1, species: "Floette" });
    render(
      <SpeedPanel
        selectedPokemon={selected}
        team={[selected]}
        format={FORMAT}
      />
    );

    expect(screen.getByTestId("hero-speed")).toHaveTextContent(
      String(FLOETTE_SPEED)
    );
    // Floette = 120 → tier "mid" per getSpeedTierLabel boundaries.
    expect(screen.getByTestId("hero-tier-label")).toHaveTextContent(/mid/i);
  });
});

describe("SpeedPanel — summary counts", () => {
  it("outspeed + tie + outsped counts every opponent (team mates + meta)", () => {
    const selected = makePokemon({ id: 1, species: "Floette" });
    const teammate = makePokemon({ id: 2, species: "Pikachu" });
    const team = [selected, teammate];

    render(
      <SpeedPanel selectedPokemon={selected} team={team} format={FORMAT} />
    );

    const outspeed = Number(screen.getByTestId("summary-outspeed").textContent);
    const tie = Number(screen.getByTestId("summary-tie").textContent);
    const outsped = Number(screen.getByTestId("summary-outsped").textContent);

    // Opponents = teammate (Pikachu) + 3 meta entries = 4 total.
    expect(outspeed + tie + outsped).toBe(4);
  });
});

describe("SpeedPanel — toggles affect numbers", () => {
  it("Tailwind doubles the selected mon's hero speed", async () => {
    const user = userEvent.setup();
    const selected = makePokemon({ id: 1, species: "Floette" });
    render(
      <SpeedPanel
        selectedPokemon={selected}
        team={[selected]}
        format={FORMAT}
      />
    );

    expect(screen.getByTestId("hero-speed")).toHaveTextContent(
      String(FLOETTE_SPEED)
    );

    await user.click(screen.getByLabelText("Tailwind"));

    expect(screen.getByTestId("hero-speed")).toHaveTextContent(
      String(FLOETTE_SPEED * 2)
    );
  });

  it("Sun applies ×2 to a Chlorophyll opponent (Venusaur tier appears doubled)", async () => {
    const user = userEvent.setup();
    const selected = makePokemon({ id: 1, species: "Floette" });
    render(
      <SpeedPanel
        selectedPokemon={selected}
        team={[selected]}
        format={FORMAT}
      />
    );

    // Without sun, Venusaur shows up at its fastSpread (90).
    expect(screen.getByTestId("tier-90")).toBeInTheDocument();

    // Activate sun.
    await user.click(screen.getByLabelText("Weather Sun"));

    // Venusaur (Chlorophyll) doubles to 180.
    expect(screen.getByTestId("tier-180")).toBeInTheDocument();
    // The original 90 tier disappears (no other mon at 90).
    expect(screen.queryByTestId("tier-90")).not.toBeInTheDocument();
  });

  it("Speed stage stepper updates the hero value live", async () => {
    const user = userEvent.setup();
    const selected = makePokemon({ id: 1, species: "Floette" });
    render(
      <SpeedPanel
        selectedPokemon={selected}
        team={[selected]}
        format={FORMAT}
      />
    );

    await user.click(screen.getByLabelText("Increment speed stage"));
    // +1 stage → ×1.5: floor(120 * 1.5) = 180.
    expect(screen.getByTestId("hero-speed")).toHaveTextContent("180");
  });

  it("Choice Scarf multiplies the selected mon's hero speed by 1.5", async () => {
    const user = userEvent.setup();
    const selected = makePokemon({ id: 1, species: "Floette" });
    render(
      <SpeedPanel
        selectedPokemon={selected}
        team={[selected]}
        format={FORMAT}
      />
    );

    await user.click(screen.getByLabelText("Held item"));
    await waitFor(() =>
      expect(
        screen.getByRole("option", { name: /choice scarf/i })
      ).toBeInTheDocument()
    );
    await user.click(screen.getByRole("option", { name: /choice scarf/i }));
    // 120 × 1.5 = 180.
    expect(screen.getByTestId("hero-speed")).toHaveTextContent("180");
  });

  it("does NOT render a Trick Room toggle (TR removed from toggles)", () => {
    const selected = makePokemon({ id: 1, species: "Floette" });
    render(
      <SpeedPanel
        selectedPokemon={selected}
        team={[selected]}
        format={FORMAT}
      />
    );

    expect(screen.queryByLabelText("Trick Room")).not.toBeInTheDocument();
  });
});

describe("SpeedPanel — tie badge", () => {
  it("renders a tie badge on opponents in the selected mon's tier", () => {
    const selected = makePokemon({ id: 1, species: "Floette" });
    // Floette = 120. Volcarona fastSpread=120 (always used for ranking) → tie.
    render(
      <SpeedPanel
        selectedPokemon={selected}
        team={[selected]}
        format={FORMAT}
      />
    );

    const yourTier = screen.getByTestId(`tier-${FLOETTE_SPEED}`);
    expect(within(yourTier).getByText("Volcarona")).toBeInTheDocument();
    expect(within(yourTier).getByText("tie")).toBeInTheDocument();
  });
});

describe("SpeedPanel — team partitions", () => {
  it("places team Pokémon at their effective speeds in the tier list", () => {
    const selected = makePokemon({ id: 1, species: "Floette" });
    const slowTeammate = makePokemon({ id: 2, species: "Incineroar" });
    const team = [selected, slowTeammate];

    render(
      <SpeedPanel selectedPokemon={selected} team={team} format={FORMAT} />
    );

    expect(screen.getByTestId(`tier-${INCINEROAR_SPEED}`)).toBeInTheDocument();
    expect(screen.getByTestId(`tier-${FLOETTE_SPEED}`)).toBeInTheDocument();
  });

  it("uses sprite URLs from getPokemonSprite when available", () => {
    const selected = makePokemon({ id: 1, species: "Floette" });
    const teammate = makePokemon({ id: 2, species: "Pikachu" });
    render(
      <SpeedPanel
        selectedPokemon={selected}
        team={[selected, teammate]}
        format={FORMAT}
      />
    );

    // Pikachu sprite should be in the Pikachu tier row.
    const pikachuTier = screen.getByTestId(`tier-${PIKACHU_SPEED}`);
    const pikachuMon = within(pikachuTier).getByTestId("mon-team-2");
    const sprite = pikachuMon.querySelector("img");
    expect(sprite).not.toBeNull();
    expect(sprite).toHaveAttribute(
      "src",
      "https://sprites.example/Pikachu.png"
    );
  });
});

describe("SpeedPanel — layout", () => {
  it("renders the toggle rail above the tier list (both present, no side-by-side grid)", () => {
    const selected = makePokemon({ id: 1, species: "Floette" });
    render(
      <SpeedPanel
        selectedPokemon={selected}
        team={[selected]}
        format={FORMAT}
      />
    );

    const rail = screen.getByTestId("speed-toggle-rail");
    const tierList = screen.getByTestId("speed-tier-list");

    // Both must be in the document.
    expect(rail).toBeInTheDocument();
    expect(tierList).toBeInTheDocument();

    // Toggle rail must be a horizontal flex row.
    expect(rail.className).toMatch(/flex-row/);

    // They must NOT share the same parent — the old 2-col layout put them as
    // siblings inside a single flex div. In the new layout the tier list is
    // inside a scroll wrapper that is a sibling of the rail, so the rail and
    // tier list should NOT be direct siblings of each other.
    expect(rail.parentElement).not.toBe(tierList.parentElement);
  });

  it("header row and body rows share the same TIER_GRID column class", () => {
    const selected = makePokemon({ id: 1, species: "Floette" });
    render(
      <SpeedPanel
        selectedPokemon={selected}
        team={[selected]}
        format={FORMAT}
      />
    );

    // Both the header and body rows carry data-tier-grid so we can assert
    // that they use an identical grid-cols-* class.
    const tieredRows = document.querySelectorAll("[data-tier-grid]");
    expect(tieredRows.length).toBeGreaterThanOrEqual(2);

    // Extract the grid-cols class from each; they must all be identical.
    const gridClasses = Array.from(tieredRows).map((el) => {
      const match = el.className.match(/grid-cols-\S+/);
      return match ? match[0] : null;
    });

    const unique = new Set(gridClasses.filter(Boolean));
    expect(unique.size).toBe(1);
  });

  it("does NOT render hint labels (↑ Faster / ↓ Slower row removed)", () => {
    const selected = makePokemon({ id: 1, species: "Floette" });
    render(
      <SpeedPanel
        selectedPokemon={selected}
        team={[selected]}
        format={FORMAT}
      />
    );

    expect(screen.queryByText("↑ Faster")).not.toBeInTheDocument();
    expect(screen.queryByText("↓ Slower")).not.toBeInTheDocument();
  });
});

describe("SpeedPanel — state reset on selectedPokemon change", () => {
  it("resets toggle state when selectedPokemon switches", async () => {
    const user = userEvent.setup();
    const floette = makePokemon({ id: 1, species: "Floette" });
    const pikachu = makePokemon({ id: 2, species: "Pikachu" });

    const { rerender } = render(
      <SpeedPanel
        selectedPokemon={floette}
        team={[floette, pikachu]}
        format={FORMAT}
      />
    );

    // Bump stage on Floette → +1 stage hero speed = 180.
    await user.click(screen.getByLabelText("Increment speed stage"));
    expect(screen.getByTestId("hero-speed")).toHaveTextContent("180");

    // Switch to Pikachu — toggles must reset.
    rerender(
      <SpeedPanel
        selectedPokemon={pikachu}
        team={[floette, pikachu]}
        format={FORMAT}
      />
    );

    expect(screen.getByTestId("hero-speed")).toHaveTextContent(
      String(PIKACHU_SPEED)
    );
    expect(screen.getByTestId("speed-stage-value")).toHaveTextContent("0");
  });
});
