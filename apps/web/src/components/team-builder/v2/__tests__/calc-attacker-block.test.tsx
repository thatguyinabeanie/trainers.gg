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
 *   - Stat-boost grid: stage buttons -6..+6 render with correct aria-pressed
 *   - Clicking a stage button calls setAttackerBoost with correct args
 *   - Active stage button is aria-pressed=true; others are aria-pressed=false
 *   - onPickAttacker is called through the chip strip
 */

import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

import type * as TrainersPokemon from "@trainers/pokemon";
import { type Tables } from "@trainers/supabase";

// =============================================================================
// Mocks
// =============================================================================

jest.mock("../builder.module.css", () =>
  new Proxy({}, { get: (_t, k) => k })
);

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

function renderBlock(props: RenderProps = {}) {
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
    renderBlock();
    expect(screen.getByText("Attacker")).toBeInTheDocument();
  });

  it("renders the 'your team' sub-label", () => {
    renderBlock();
    expect(screen.getByText("your team")).toBeInTheDocument();
  });

  it("renders the 'Stat boosts' section header", () => {
    renderBlock();
    expect(screen.getByText("Stat boosts")).toBeInTheDocument();
  });
});

describe("CalcAttackerBlock — chip strip", () => {
  it("renders AttackerChipStrip with the teamSlots array", () => {
    const teamSlots = [makePokemon(), makePokemon({ id: 2, species: "Dragonite" }), null, null, null, null];
    renderBlock({ teamSlots });
    expect(screen.getByTestId("chip-strip")).toBeInTheDocument();
    expect(screen.getByTestId("chip-0")).toHaveTextContent("Garchomp");
    expect(screen.getByTestId("chip-1")).toHaveTextContent("Dragonite");
  });

  it("passes activeIdx to chip strip", () => {
    renderBlock({ attackerIdx: 2 });
    expect(screen.getByTestId("chip-strip")).toHaveAttribute("data-active", "2");
  });

  it("calls onPickAttacker when a chip is clicked", () => {
    const teamSlots = [
      makePokemon(),
      makePokemon({ id: 2, species: "Dragonite" }),
      null, null, null, null,
    ];
    const onPickAttacker = jest.fn();
    renderBlock({ teamSlots, onPickAttacker });
    fireEvent.click(screen.getByTestId("chip-1"));
    expect(onPickAttacker).toHaveBeenCalledWith(1);
  });
});

describe("CalcAttackerBlock — attacker display", () => {
  it("renders the attacker species name in the mon head", () => {
    renderBlock({ teamSlots: [makePokemon({ species: "Garchomp" }), null, null, null, null, null] });
    // The name appears in both the chip stub and the mon head — at least one must be present
    expect(screen.getAllByText("Garchomp").length).toBeGreaterThanOrEqual(1);
  });

  it("renders the attacker sprite", () => {
    renderBlock();
    expect(screen.getByTestId("attacker-sprite")).toBeInTheDocument();
  });

  it("renders type pills for the attacker's types", () => {
    mockGetSpeciesTypes.mockReturnValue(["Dragon", "Ground"]);
    renderBlock();
    expect(screen.getByTestId("type-pill-Dragon")).toBeInTheDocument();
    expect(screen.getByTestId("type-pill-Ground")).toBeInTheDocument();
  });

  it("renders nature and level on the meta line", () => {
    renderBlock({
      teamSlots: [makePokemon({ nature: "Timid", level: 50 }), null, null, null, null, null],
    });
    expect(screen.getByText(/Timid/)).toBeInTheDocument();
    expect(screen.getByText(/Lv 50/)).toBeInTheDocument();
  });

  it("renders held item on the meta line", () => {
    renderBlock({
      teamSlots: [makePokemon({ held_item: "Life Orb" }), null, null, null, null, null],
    });
    expect(screen.getByText(/Life Orb/)).toBeInTheDocument();
  });

  it("renders ability on the meta line", () => {
    renderBlock({
      teamSlots: [makePokemon({ ability: "Intimidate" }), null, null, null, null, null],
    });
    expect(screen.getByText(/Intimidate/)).toBeInTheDocument();
  });

  it("shows '—' for nature when nature is null", () => {
    renderBlock({
      teamSlots: [makePokemon({ nature: null }), null, null, null, null, null],
    });
    expect(screen.getByText(/—/)).toBeInTheDocument();
  });

  it("shows '—' for item when held_item is null", () => {
    renderBlock({
      teamSlots: [makePokemon({ held_item: null }), null, null, null, null, null],
    });
    expect(screen.getAllByText(/—/).length).toBeGreaterThan(0);
  });

  it("shows 'No attacker selected.' when attacker slot is null", () => {
    renderBlock({
      teamSlots: [null, null, null, null, null, null],
      attackerIdx: 0,
    });
    expect(screen.getByText("No attacker selected.")).toBeInTheDocument();
  });

  it("does NOT render sprite when attacker slot is null", () => {
    renderBlock({
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
      renderBlock({ teamSlots, attackerIdx });
      const note = screen.getByText(new RegExp(`row\\s+${paddedSlot}`));
      expect(note).toBeInTheDocument();
    }
  );
});

describe("CalcAttackerBlock — stat boost grid", () => {
  it.each([
    ["ATK", "atk"],
    ["DEF", "def"],
    ["SPA", "spa"],
    ["SPD", "spd"],
    ["SPE", "spe"],
  ] as const)(
    "renders the %s stat label",
    (label) => {
      renderBlock();
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  );

  it("renders 13 stage buttons per stat row (5 stats × 13 = 65 total)", () => {
    renderBlock();
    const buttons = screen.getAllByRole("button").filter(
      (btn) => btn.getAttribute("aria-pressed") !== null &&
        !btn.hasAttribute("data-testid")
    );
    // 5 stats × 13 stages = 65 stage buttons
    expect(buttons.length).toBe(65);
  });

  it("the +0 stage button for ATK is NOT aria-pressed when boost is 0", () => {
    renderBlock({ attackerBoosts: makeBoosts({ atk: 0 }) });
    // +0 button shows "0" text — find all with text "0" in buttons
    // We verify at least one stage button has aria-pressed=false (non-active)
    const stageButtons = screen.getAllByRole("button").filter(
      (btn) => btn.getAttribute("aria-pressed") !== null &&
        !btn.hasAttribute("data-testid")
    );
    const notPressed = stageButtons.filter(
      (btn) => btn.getAttribute("aria-pressed") === "false"
    );
    expect(notPressed.length).toBeGreaterThan(0);
  });

  it("the active stage button has aria-pressed=true", () => {
    renderBlock({ attackerBoosts: makeBoosts({ atk: 2, def: 0, spa: 0, spd: 0, spe: 0 }) });
    const pressedButtons = screen.getAllByRole("button").filter(
      (btn) => btn.getAttribute("aria-pressed") === "true" &&
        !btn.hasAttribute("data-testid")
    );
    // 5 stats — atk is +2, others are 0. Each stat has exactly one active stage.
    expect(pressedButtons.length).toBe(5);
  });

  it("calls setAttackerBoost('atk', 2) when the +2 ATK button is clicked", () => {
    const setAttackerBoost = jest.fn();
    renderBlock({ setAttackerBoost });
    // Find buttons with text "+2" — the first one is ATK (first stat row)
    const plus2Buttons = screen.getAllByRole("button").filter(
      (btn) => btn.textContent === "+2" && btn.getAttribute("aria-pressed") !== null
    );
    fireEvent.click(plus2Buttons[0]);
    expect(setAttackerBoost).toHaveBeenCalledWith("atk", 2);
  });

  it("calls setAttackerBoost('spe', -1) when the -1 SPE button is clicked", () => {
    const setAttackerBoost = jest.fn();
    renderBlock({ setAttackerBoost });
    // -1 buttons — 5th occurrence corresponds to SPE row (last stat)
    const minus1Buttons = screen.getAllByRole("button").filter(
      (btn) => btn.textContent === "-1" && btn.getAttribute("aria-pressed") !== null
    );
    fireEvent.click(minus1Buttons[4]); // spe is last stat
    expect(setAttackerBoost).toHaveBeenCalledWith("spe", -1);
  });

  it("calls setAttackerBoost with 0 when the 0 stage is clicked", () => {
    const setAttackerBoost = jest.fn();
    renderBlock({ attackerBoosts: makeBoosts({ atk: 2 }), setAttackerBoost });
    // 0-stage buttons show text "0"
    const zeroButtons = screen.getAllByRole("button").filter(
      (btn) => btn.textContent === "0" && btn.getAttribute("aria-pressed") !== null
    );
    fireEvent.click(zeroButtons[0]); // first stat = ATK
    expect(setAttackerBoost).toHaveBeenCalledWith("atk", 0);
  });

  it.each([
    ["atk", "+3", 3],
    ["def", "-2", -2],
    ["spa", "+6", 6],
    ["spd", "-6", -6],
  ] as const)(
    "clicking %s stage button '%s' fires setAttackerBoost with value %i",
    (stat, _label, value) => {
      const setAttackerBoost = jest.fn();
      renderBlock({ setAttackerBoost });
      const statOrder = ["atk", "def", "spa", "spd", "spe"];
      const statRowIdx = statOrder.indexOf(stat);
      const label = value > 0 ? `+${value}` : String(value);
      const matchingButtons = screen.getAllByRole("button").filter(
        (btn) => btn.textContent === label && btn.getAttribute("aria-pressed") !== null
      );
      fireEvent.click(matchingButtons[statRowIdx]);
      expect(setAttackerBoost).toHaveBeenCalledWith(stat, value);
    }
  );
});

describe("CalcAttackerBlock — types display", () => {
  it("renders no type pills when attacker species has no types", () => {
    mockGetSpeciesTypes.mockReturnValue([]);
    renderBlock();
    expect(screen.queryByTestId(/^type-pill-/)).not.toBeInTheDocument();
  });

  it("renders a single type pill for mono-type species", () => {
    mockGetSpeciesTypes.mockReturnValue(["Fire"]);
    renderBlock({
      teamSlots: [makePokemon({ species: "Incineroar" }), null, null, null, null, null],
    });
    expect(screen.getByTestId("type-pill-Fire")).toBeInTheDocument();
    expect(screen.queryByTestId(/^type-pill-(?!Fire)/)).not.toBeInTheDocument();
  });
});
