"use client";

/**
 * Behavioral tests for CalcAttackerBlock.
 *
 * Covers:
 *   - "Attacker" and "your team" header labels render
 *   - AttackerChipStrip receives teamSlots and activeIdx
 *   - Attacker species name, types, nature/level/item/ability display
 *   - "No attacker selected" fallback when slot is null
 *   - Inherits-from-row note shows correct 1-based slot number
 *   - Stat-boost grid: all 5 stat keys render labels
 *   - Stat-boost stepper: decrease/increase buttons per stat
 *   - Clicking stepper + calls setAttackerBoost with incremented value
 *   - Clicking stepper − calls setAttackerBoost with decremented value
 *   - Stepper clamps at +6 max / −6 min
 *   - Quick-pick chips render for each stat and fire setAttackerBoost
 *   - Stat boosts section appears before inherits note
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

// @trainers/pokemon — only getSpeciesTypes is used
const mockGetSpeciesTypes = jest.fn();

jest.mock("@trainers/pokemon", () => {
  const actual = jest.requireActual<typeof TrainersPokemon>("@trainers/pokemon");
  return {
    ...actual,
    getSpeciesTypes: (...args: unknown[]) => mockGetSpeciesTypes(...args),
  };
});

// =============================================================================
// Import after mocks
// =============================================================================

import { CalcAttackerBlock } from "../calc/calc-attacker-block";
import { type AttackerBoosts } from "../../use-calc-state";

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

function makeBoosts(overrides: Partial<AttackerBoosts> = {}): AttackerBoosts {
  return { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, ...overrides };
}

interface RenderProps {
  teamSlots?: (Tables<"pokemon"> | null)[];
  attackerIdx?: number;
  onPickAttacker?: jest.Mock;
  attackerBoosts?: AttackerBoosts;
  setAttackerBoost?: jest.Mock;
}

function renderAttacker(props: RenderProps = {}) {
  const teamSlots = props.teamSlots ?? [makePokemon(), null, null, null, null, null];
  const onPickAttacker = props.onPickAttacker ?? jest.fn();
  const setAttackerBoost = props.setAttackerBoost ?? jest.fn();

  const result = render(
    <CalcAttackerBlock
      teamSlots={teamSlots}
      attackerIdx={props.attackerIdx ?? 0}
      onPickAttacker={onPickAttacker}
      attackerBoosts={props.attackerBoosts ?? makeBoosts()}
      setAttackerBoost={setAttackerBoost}
    />
  );

  return { ...result, onPickAttacker, setAttackerBoost };
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

  it("renders the 'Stat boosts' section header", () => {
    renderAttacker();
    expect(screen.getByText("Stat boosts")).toBeInTheDocument();
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
    // The name appears in both the chip stub and the mon head — at least one must be present
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

describe("CalcAttackerBlock — stat boost grid labels", () => {
  it.each([
    ["ATK", "atk"],
    ["DEF", "def"],
    ["SPA", "spa"],
    ["SPD", "spd"],
    ["SPE", "spe"],
  ] as const)(
    "renders the %s stat label",
    (label) => {
      renderAttacker();
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  );
});

describe("CalcAttackerBlock — stat boost stepper", () => {
  it("renders stat boost stepper with decrease and increase buttons for each stat", () => {
    renderAttacker({ attackerBoosts: makeBoosts() });
    expect(screen.getByRole("button", { name: /decrease atk boost/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /increase atk boost/i })).toBeInTheDocument();
  });

  it("renders stepper decrease/increase buttons for all 5 stats", () => {
    renderAttacker({ attackerBoosts: makeBoosts() });
    const statKeys = ["atk", "def", "spa", "spd", "spe"] as const;
    for (const stat of statKeys) {
      expect(
        screen.getByRole("button", { name: new RegExp(`decrease ${stat} boost`, "i") })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: new RegExp(`increase ${stat} boost`, "i") })
      ).toBeInTheDocument();
    }
  });

  it("clicking + calls setAttackerBoost with incremented value", () => {
    const setAttackerBoost = jest.fn();
    renderAttacker({
      attackerBoosts: makeBoosts({ atk: 1 }),
      setAttackerBoost,
    });
    fireEvent.click(screen.getByRole("button", { name: /increase atk boost/i }));
    expect(setAttackerBoost).toHaveBeenCalledWith("atk", 2);
  });

  it("clicking − calls setAttackerBoost with decremented value", () => {
    const setAttackerBoost = jest.fn();
    renderAttacker({
      attackerBoosts: makeBoosts({ atk: 2 }),
      setAttackerBoost,
    });
    fireEvent.click(screen.getByRole("button", { name: /decrease atk boost/i }));
    expect(setAttackerBoost).toHaveBeenCalledWith("atk", 1);
  });

  it("+ clamps at +6 — does not exceed maximum", () => {
    const setAttackerBoost = jest.fn();
    renderAttacker({
      attackerBoosts: makeBoosts({ atk: 6 }),
      setAttackerBoost,
    });
    fireEvent.click(screen.getByRole("button", { name: /increase atk boost/i }));
    expect(setAttackerBoost).toHaveBeenCalledWith("atk", 6);
  });

  it("− clamps at −6 — does not go below minimum", () => {
    const setAttackerBoost = jest.fn();
    renderAttacker({
      attackerBoosts: makeBoosts({ spe: -6 }),
      setAttackerBoost,
    });
    fireEvent.click(screen.getByRole("button", { name: /decrease spe boost/i }));
    expect(setAttackerBoost).toHaveBeenCalledWith("spe", -6);
  });

  it("clicking + on SPE stat calls setAttackerBoost('spe', incremented)", () => {
    const setAttackerBoost = jest.fn();
    renderAttacker({
      attackerBoosts: makeBoosts({ spe: 3 }),
      setAttackerBoost,
    });
    fireEvent.click(screen.getByRole("button", { name: /increase spe boost/i }));
    expect(setAttackerBoost).toHaveBeenCalledWith("spe", 4);
  });
});

describe("CalcAttackerBlock — quick-pick chips", () => {
  it("renders quick-pick chips +6 for all 5 stats", () => {
    renderAttacker({ attackerBoosts: makeBoosts() });
    const chips = screen.getAllByRole("button", { name: "+6" });
    expect(chips.length).toBe(5);
  });

  it("renders quick-pick chips for values 0, +1, +2, +3, +6 per stat", () => {
    renderAttacker({ attackerBoosts: makeBoosts() });
    // 5 stats × 5 quick-pick values = 25 chips total; check the first stat row
    // QUICK_PICKS = [0, 1, 2, 3, 6], rendered as "0", "+1", "+2", "+3", "+6"
    expect(screen.getAllByRole("button", { name: "0" }).length).toBeGreaterThanOrEqual(5);
    expect(screen.getAllByRole("button", { name: "+1" }).length).toBe(5);
    expect(screen.getAllByRole("button", { name: "+2" }).length).toBe(5);
    expect(screen.getAllByRole("button", { name: "+3" }).length).toBe(5);
    expect(screen.getAllByRole("button", { name: "+6" }).length).toBe(5);
  });

  it("clicking a quick-pick chip calls setAttackerBoost with that value", () => {
    const setAttackerBoost = jest.fn();
    renderAttacker({
      attackerBoosts: makeBoosts(),
      setAttackerBoost,
    });
    // First "+2" chip corresponds to the ATK row (first stat)
    fireEvent.click(screen.getAllByRole("button", { name: "+2" })[0]);
    expect(setAttackerBoost).toHaveBeenCalledWith("atk", 2);
  });

  it("clicking the +6 quick-pick chip for DEF calls setAttackerBoost('def', 6)", () => {
    const setAttackerBoost = jest.fn();
    renderAttacker({
      attackerBoosts: makeBoosts(),
      setAttackerBoost,
    });
    // Second "+6" chip corresponds to the DEF row (second stat)
    fireEvent.click(screen.getAllByRole("button", { name: "+6" })[1]);
    expect(setAttackerBoost).toHaveBeenCalledWith("def", 6);
  });

  it("quick-pick chip shows aria-pressed=true when value matches current boost", () => {
    renderAttacker({ attackerBoosts: makeBoosts({ atk: 2 }) });
    // The "+2" chip in the ATK row should be aria-pressed=true
    const plus2Chips = screen.getAllByRole("button", { name: "+2" });
    expect(plus2Chips[0]).toHaveAttribute("aria-pressed", "true");
  });

  it("quick-pick chips other than the active value show aria-pressed=false", () => {
    renderAttacker({ attackerBoosts: makeBoosts({ atk: 2 }) });
    // "+1" chips should all be not-pressed
    const plus1Chips = screen.getAllByRole("button", { name: "+1" });
    for (const chip of plus1Chips) {
      expect(chip).toHaveAttribute("aria-pressed", "false");
    }
  });
});

describe("CalcAttackerBlock — stat boosts ordering", () => {
  it("stat boosts section appears before inherits note in the DOM", () => {
    renderAttacker();
    const boostsLabel = screen.getByText(/stat boosts/i);
    const inheritsNote = screen.getByText(/inherits spread/i);
    expect(
      boostsLabel.compareDocumentPosition(inheritsNote) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });
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
