"use client";

/**
 * Behavioral tests for CalcAttackerBlock.
 *
 * Covers:
 *   - "Attacker" and "your team" header labels render
 *   - AttackerChipStrip receives teamSlots and activeIdx
 *   - Attacker species name, types, nature/level/item/ability display
 *   - "No attacker selected." fallback when attacker slot is null
 *   - Inherits-from-row note shows correct 1-based slot number
 *   - onPickAttacker is called through the chip strip
 */

import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

import type * as TrainersPokemon from "@trainers/pokemon";
import { type Tables } from "@trainers/supabase";

// =============================================================================
// Mocks
// =============================================================================

// AttackerChipStrip — render a simple test stub
jest.mock("../calc/attacker-chip-strip", () => ({
  AttackerChipStrip: ({
    pokemon,
    activeIdx,
    onPick,
  }: {
    pokemon: (Tables<"pokemon"> | null)[];
    activeIdx: number;
    onPick: (idx: number) => void;
  }) => (
    <div data-testid="chip-strip" data-active={activeIdx}>
      {pokemon.map((p, i) => (
        <button
          key={i}
          data-testid={`chip-${i}`}
          onClick={() => onPick(i)}
          disabled={p === null}
        >
          {p?.species ?? "empty"}
        </button>
      ))}
    </div>
  ),
}));

// Sprite — lightweight stub
jest.mock("../sprite", () => ({
  Sprite: ({ species }: { species: string }) => (
    <img data-testid="attacker-sprite" alt={species} />
  ),
}));

// TypePill — stub
jest.mock("../type-pill", () => ({
  TypePill: ({ t }: { t: string }) => (
    <span data-testid={`type-pill-${t}`}>{t}</span>
  ),
}));

// MegaToggle — stub
jest.mock("../calc/mega-toggle", () => ({
  MegaToggle: ({ active, onToggle }: { active: boolean; onToggle: () => void }) => (
    <button data-testid="mega-toggle" aria-pressed={active} onClick={onToggle}>
      Mega
    </button>
  ),
}));

// @trainers/pokemon
const mockGetSpeciesTypes = jest.fn();

jest.mock("@trainers/pokemon", () => {
  const actual = jest.requireActual<typeof TrainersPokemon>("@trainers/pokemon");
  return {
    ...actual,
    getSpeciesTypes: (...args: unknown[]) => mockGetSpeciesTypes(...args),
    getMegaAbilityForSpecies: jest.fn().mockReturnValue(null),
  };
});

// =============================================================================
// Import after mocks
// =============================================================================

import { CalcAttackerBlock } from "../calc/calc-attacker-block";

// =============================================================================
// Fixtures
// =============================================================================

function makePokemon(
  overrides: Partial<Tables<"pokemon">> = {}
): Tables<"pokemon"> {
  return {
    id: 1,
    species: "Garchomp",
    ability: "Rough Skin",
    nature: "Jolly",
    move1: "Earthquake",
    move2: "Dragon Claw",
    move3: null,
    move4: null,
    ev_hp: 0,
    ev_attack: 252,
    ev_defense: 4,
    ev_special_attack: 0,
    ev_special_defense: 0,
    ev_speed: 252,
    iv_hp: 31,
    iv_attack: 31,
    iv_defense: 31,
    iv_special_attack: 31,
    iv_special_defense: 31,
    iv_speed: 31,
    level: 50,
    held_item: "Choice Scarf",
    nickname: null,
    notes: null,
    tera_type: "Dragon",
    is_shiny: null,
    gender: null,
    format_legal: null,
    created_at: null,
    ...overrides,
  };
}

interface RenderProps {
  teamSlots?: (Tables<"pokemon"> | null)[];
  attackerIdx?: number;
  onPickAttacker?: jest.Mock;
  attackerMegaActive?: boolean;
  setAttackerMegaActive?: jest.Mock;
}

function renderAttacker(props: RenderProps = {}) {
  const teamSlots = props.teamSlots ?? [makePokemon(), null, null, null, null, null];
  const onPickAttacker = props.onPickAttacker ?? jest.fn();
  const setAttackerMegaActive = props.setAttackerMegaActive ?? jest.fn();

  const result = render(
    <CalcAttackerBlock
      teamSlots={teamSlots}
      attackerIdx={props.attackerIdx ?? 0}
      onPickAttacker={onPickAttacker}
      attackerMegaActive={props.attackerMegaActive ?? false}
      setAttackerMegaActive={setAttackerMegaActive}
    />
  );

  return { ...result, onPickAttacker, setAttackerMegaActive };
}

// =============================================================================
// Setup
// =============================================================================

beforeEach(() => {
  jest.clearAllMocks();
  mockGetSpeciesTypes.mockReturnValue(["Dragon", "Ground"]);
});

// =============================================================================
// Tests
// =============================================================================

describe("CalcAttackerBlock — header labels", () => {
  it("renders the 'Attacker' column eyebrow label", () => {
    renderAttacker();
    expect(screen.getByText("Attacker")).toBeInTheDocument();
  });

  it("renders the 'your team' sub-label", () => {
    renderAttacker();
    expect(screen.getByText("your team")).toBeInTheDocument();
  });
});

describe("CalcAttackerBlock — chip strip", () => {
  it("renders AttackerChipStrip with the teamSlots array", () => {
    const teamSlots = [makePokemon(), makePokemon({ id: 2, species: "Dragonite" }), null, null, null, null];
    renderAttacker({ teamSlots });
    expect(screen.getByTestId("chip-strip")).toBeInTheDocument();
    expect(screen.getByTestId("chip-0")).toHaveTextContent("Garchomp");
    expect(screen.getByTestId("chip-1")).toHaveTextContent("Dragonite");
  });

  it("passes activeIdx to chip strip", () => {
    renderAttacker({ attackerIdx: 2 });
    expect(screen.getByTestId("chip-strip")).toHaveAttribute("data-active", "2");
  });

  it("calls onPickAttacker when a chip is clicked", () => {
    const teamSlots = [
      makePokemon(),
      makePokemon({ id: 2, species: "Dragonite" }),
      null, null, null, null,
    ];
    const onPickAttacker = jest.fn();
    renderAttacker({ teamSlots, onPickAttacker });
    fireEvent.click(screen.getByTestId("chip-1"));
    expect(onPickAttacker).toHaveBeenCalledWith(1);
  });
});

describe("CalcAttackerBlock — attacker display", () => {
  it("renders the attacker species name in the mon head", () => {
    renderAttacker({ teamSlots: [makePokemon({ species: "Garchomp" }), null, null, null, null, null] });
    expect(screen.getAllByText("Garchomp").length).toBeGreaterThanOrEqual(1);
  });

  it("renders the attacker sprite", () => {
    renderAttacker();
    expect(screen.getByTestId("attacker-sprite")).toBeInTheDocument();
  });

  it("renders type pills for the attacker's types", () => {
    mockGetSpeciesTypes.mockReturnValue(["Dragon", "Ground"]);
    renderAttacker();
    expect(screen.getByTestId("type-pill-Dragon")).toBeInTheDocument();
    expect(screen.getByTestId("type-pill-Ground")).toBeInTheDocument();
  });

  it("renders nature and level on the meta line", () => {
    renderAttacker({
      teamSlots: [makePokemon({ nature: "Timid", level: 50 }), null, null, null, null, null],
    });
    expect(screen.getByText(/Timid/)).toBeInTheDocument();
    expect(screen.getByText(/Lv 50/)).toBeInTheDocument();
  });

  it("renders held item on the meta line", () => {
    renderAttacker({
      teamSlots: [makePokemon({ held_item: "Life Orb" }), null, null, null, null, null],
    });
    expect(screen.getByText(/Life Orb/)).toBeInTheDocument();
  });

  it("renders ability on the meta line", () => {
    renderAttacker({
      teamSlots: [makePokemon({ ability: "Intimidate" }), null, null, null, null, null],
    });
    expect(screen.getByText(/Intimidate/)).toBeInTheDocument();
  });

  it("shows '—' for nature when nature is null", () => {
    renderAttacker({
      teamSlots: [makePokemon({ nature: null }), null, null, null, null, null],
    });
    expect(screen.getByText(/—/)).toBeInTheDocument();
  });

  it("shows '—' for item when held_item is null", () => {
    renderAttacker({
      teamSlots: [makePokemon({ held_item: null }), null, null, null, null, null],
    });
    expect(screen.getAllByText(/—/).length).toBeGreaterThan(0);
  });

  it("shows 'No attacker selected.' when attacker slot is null", () => {
    renderAttacker({
      teamSlots: [null, null, null, null, null, null],
      attackerIdx: 0,
    });
    expect(screen.getByText("No attacker selected.")).toBeInTheDocument();
  });

  it("does NOT render sprite when attacker slot is null", () => {
    renderAttacker({
      teamSlots: [null, null, null, null, null, null],
      attackerIdx: 0,
    });
    expect(screen.queryByTestId("attacker-sprite")).not.toBeInTheDocument();
  });
});

describe("CalcAttackerBlock — inherits-from note", () => {
  it.each([
    [0, "01"],
    [1, "02"],
    [5, "06"],
  ] as const)(
    "shows row %i as '%s' in the inherits-from note",
    (attackerIdx, paddedSlot) => {
      const teamSlots = Array(6).fill(null).map((_, i) =>
        i === attackerIdx ? makePokemon() : null
      ) as (Tables<"pokemon"> | null)[];
      renderAttacker({ teamSlots, attackerIdx });
      const note = screen.getByText(new RegExp(`row\\s+${paddedSlot}`));
      expect(note).toBeInTheDocument();
    }
  );
});

describe("CalcAttackerBlock — types display", () => {
  it("renders no type pills when attacker species has no types", () => {
    mockGetSpeciesTypes.mockReturnValue([]);
    renderAttacker();
    expect(screen.queryByTestId(/^type-pill-/)).not.toBeInTheDocument();
  });

  it("renders a single type pill for mono-type species", () => {
    mockGetSpeciesTypes.mockReturnValue(["Fire"]);
    renderAttacker({
      teamSlots: [makePokemon({ species: "Incineroar" }), null, null, null, null, null],
    });
    expect(screen.getByTestId("type-pill-Fire")).toBeInTheDocument();
    expect(screen.queryByTestId(/^type-pill-(?!Fire)/)).not.toBeInTheDocument();
  });
});
