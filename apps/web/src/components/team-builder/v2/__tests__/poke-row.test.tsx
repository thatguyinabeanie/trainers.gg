"use client";

/**
 * Tests for the PokeRow component.
 * Covers: empty slot render, filled+collapsed render, filled+expanded render,
 * slot rib number, onActivate, onRemove, error/warning dots.
 */

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

import { type Tables } from "@trainers/supabase";

// =============================================================================
// Mocks
// =============================================================================


jest.mock("@trainers/pokemon", () => ({
  getSpeciesTypes: jest.fn((species: string) => {
    if (species === "Garchomp") return ["Dragon", "Ground"];
    return ["Normal"];
  }),
  getTypeColor: jest.fn(() => "#A8A878"),
}));

jest.mock("../sprite", () => ({
  Sprite: ({ species }: { species: string }) => (
    <img data-testid="sprite" alt={species} />
  ),
}));

jest.mock("../type-pill", () => ({
  TypePill: ({ t }: { t: string }) => <span data-testid={`type-pill-${t}`} />,
}));

jest.mock("../lanes/active-row", () => ({
  ActiveRow: ({
    idx,
    pokemon,
    onRemove,
  }: {
    idx: number;
    pokemon: Tables<"pokemon">;
    onRemove: () => void;
  }) => (
    <div data-testid="active-row" data-idx={idx}>
      <span>{pokemon.species}</span>
      <button type="button" onClick={onRemove} data-testid="active-row-remove">
        Remove (active)
      </button>
    </div>
  ),
}));

// Lane component ghost mocks — return static content matching the real ghost output
jest.mock("../lanes/identity", () => ({
  IdentityLane: ({ pokemon }: { pokemon: null | { species?: string } }) => {
    if (!pokemon) {
      return (
        <div data-testid="identity-lane-ghost">
          <span>+ Add Pokémon</span>
        </div>
      );
    }
    return <div data-testid="identity-lane-real" />;
  },
}));

jest.mock("../lanes/stats-lane", () => ({
  StatsLane: ({ pokemon }: { pokemon: null | object }) => {
    if (!pokemon) {
      return (
        <div data-testid="stats-lane-ghost">
          <span>HP</span>
        </div>
      );
    }
    return <div data-testid="stats-lane-real" />;
  },
  // Keep the GHOST_STATS export in case any other import still references it
  GHOST_STATS: [],
}));

jest.mock("../lanes/moves-lane", () => ({
  MovesLane: ({ pokemon }: { pokemon: null | object }) => {
    if (!pokemon) {
      return (
        <div data-testid="moves-lane-ghost">
          <span>+ Add move</span>
          <span>+ Add move</span>
          <span>+ Add move</span>
          <span>+ Add move</span>
        </div>
      );
    }
    return <div data-testid="moves-lane-real" />;
  },
}));

jest.mock("../lanes/calc-column", () => ({
  CalcColumn: ({ pokemon, isActive }: { pokemon: null | object; isActive: boolean }) => (
    <div
      data-testid="calc-column"
      data-ghost={pokemon === null ? "true" : "false"}
      data-is-active={isActive ? "true" : "false"}
    >
      CALC
    </div>
  ),
}));

const mockUseCalcStateContext = jest.fn(() => ({ calcEnabled: false }));
jest.mock("../calc/calc-state-context", () => ({
  useCalcStateContext: () => mockUseCalcStateContext(),
  // Derives from the same mock so existing tests that toggle calcEnabled
  // via mockUseCalcStateContext.mockReturnValue still drive both consumers.
  useCalcEnabled: () => mockUseCalcStateContext().calcEnabled,
}));

jest.mock("../pickers/species-picker", () => ({
  SpeciesPicker: ({
    onPick,
    onClose,
  }: {
    onPick: (s: string) => void;
    onClose: () => void;
  }) => (
    <div data-testid="species-picker">
      <button
        type="button"
        onClick={() => onPick("Togekiss")}
        data-testid="pick-species-btn"
      >
        Pick Togekiss
      </button>
      <button type="button" onClick={onClose} data-testid="close-picker-btn">
        Close
      </button>
    </div>
  ),
}));

// dnd-kit sortable — return stable no-op values so the component renders
jest.mock("@dnd-kit/sortable", () => ({
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: jest.fn(),
    transform: null,
    transition: undefined,
    isDragging: false,
  }),
}));

jest.mock("@dnd-kit/utilities", () => ({
  CSS: { Transform: { toString: () => "" } },
}));

// =============================================================================
// Import after mocks
// =============================================================================

import { PokeRow } from "../poke-row";
import { type ValidationError } from "../../validation-hooks";

// =============================================================================
// Fixtures
// =============================================================================

function makePokemon(
  overrides: Partial<Tables<"pokemon">> = {}
): Tables<"pokemon"> {
  return {
    id: 10,
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
    tera_type: null,
    is_shiny: null,
    gender: null,
    format_legal: null,
    created_at: null,
    ...overrides,
  };
}

function makeError(): ValidationError {
  return {
    pokemonId: 10,
    pokemonName: "Garchomp",
    field: "ability",
    message: "Must select an ability",
    severity: "error",
  };
}

function makeWarning(): ValidationError {
  return {
    pokemonId: 10,
    pokemonName: "Garchomp",
    field: "item",
    message: "Duplicate item",
    severity: "warning",
  };
}

// =============================================================================
// Tests — empty slot
// =============================================================================

describe("PokeRow — empty slot", () => {
  it("renders '+ Add Pokémon' when pokemon is null", () => {
    render(
      <PokeRow
        idx={0}
        sortableId="__empty__0"
        pokemon={null}
        isActive={false}
        density="comfy"
        expandMode="active"
        onActivate={jest.fn()}
      />
    );
    expect(screen.getByText(/\+ Add Pokémon/i)).toBeInTheDocument();
  });

  it("renders the slot number (01) in the rib", () => {
    render(
      <PokeRow
        idx={0}
        sortableId="__empty__0"
        pokemon={null}
        isActive={false}
        density="comfy"
        expandMode="active"
        onActivate={jest.fn()}
      />
    );
    expect(screen.getByText("01")).toBeInTheDocument();
  });

  it("slot 6 renders '06'", () => {
    render(
      <PokeRow
        idx={5}
        sortableId="__empty__5"
        pokemon={null}
        isActive={false}
        density="comfy"
        expandMode="active"
        onActivate={jest.fn()}
      />
    );
    expect(screen.getByText("06")).toBeInTheDocument();
  });

  it("opens SpeciesPicker when add button is clicked", async () => {
    const user = userEvent.setup();
    render(
      <PokeRow
        idx={0}
        sortableId="__empty__0"
        pokemon={null}
        isActive={false}
        density="comfy"
        expandMode="active"
        onActivate={jest.fn()}
      />
    );
    // Click the trigger button
    const addBtn = screen.getByText(/\+ Add Pokémon/i).closest("button");
    await user.click(addBtn!);
    expect(screen.getByTestId("species-picker")).toBeInTheDocument();
  });

  it("calls onAdd with the slot index and species when a species is picked", async () => {
    const user = userEvent.setup();
    const onAdd = jest.fn();
    render(
      <PokeRow
        idx={2}
        sortableId="__empty__2"
        pokemon={null}
        isActive={false}
        density="comfy"
        expandMode="active"
        onActivate={jest.fn()}
        onAdd={onAdd}
      />
    );
    const addBtn = screen.getByText(/\+ Add Pokémon/i).closest("button");
    await user.click(addBtn!);
    await user.click(screen.getByTestId("pick-species-btn"));
    expect(onAdd).toHaveBeenCalledWith(2, "Togekiss");
  });

  it("composes identity, stats, and moves ghost lanes", () => {
    render(
      <PokeRow
        idx={0}
        sortableId="__empty__0"
        pokemon={null}
        isActive={false}
        density="comfy"
        expandMode="active"
        onActivate={jest.fn()}
      />
    );
    // Identity ghost: '+ Add Pokémon' text
    expect(screen.getByTestId("identity-lane-ghost")).toBeInTheDocument();
    // Stats ghost: 'HP' label
    expect(screen.getByTestId("stats-lane-ghost")).toBeInTheDocument();
    expect(screen.getByText("HP")).toBeInTheDocument();
    // Moves ghost: '+ Add move' appears 4 times
    expect(screen.getAllByText(/\+ Add move/i)).toHaveLength(4);
  });

  it("outer button has w-full to fill its grid cell", () => {
    render(
      <PokeRow
        idx={0}
        sortableId="__empty__0"
        pokemon={null}
        isActive={false}
        density="comfy"
        expandMode="active"
        onActivate={jest.fn()}
      />
    );
    const button = screen.getByText(/\+ Add Pokémon/i).closest("button")!;
    expect(button.className).toContain("w-full");
  });

  it("ghost lane components do not introduce nested buttons inside the wrapper", () => {
    render(
      <PokeRow
        idx={0}
        sortableId="__empty__0"
        pokemon={null}
        isActive={false}
        density="comfy"
        expandMode="active"
        onActivate={jest.fn()}
      />
    );
    const button = screen.getByText(/\+ Add Pokémon/i).closest("button")!;
    // within(button) scopes to inside the button element; queryAllByRole("button")
    // should return nothing because there are no nested buttons in ghost mode.
    expect(within(button).queryAllByRole("button")).toHaveLength(0);
  });

  describe("calc width parity", () => {
    afterEach(() => {
      mockUseCalcStateContext.mockReturnValue({ calcEnabled: false });
    });

    it("does not render the calc column when calc is disabled", () => {
      mockUseCalcStateContext.mockReturnValue({ calcEnabled: false });
      render(
        <PokeRow
          idx={0}
          sortableId="__empty__0"
          pokemon={null}
          isActive={false}
          density="comfy"
          expandMode="active"
          onActivate={jest.fn()}
        />
      );
      expect(screen.queryByTestId("calc-column")).not.toBeInTheDocument();
    });

    it("does not render the calc column for empty slots regardless of calc state", () => {
      mockUseCalcStateContext.mockReturnValue({ calcEnabled: true });
      render(
        <PokeRow
          idx={0}
          sortableId="__empty__0"
          pokemon={null}
          isActive={false}
          density="comfy"
          expandMode="active"
          onActivate={jest.fn()}
        />
      );
      expect(screen.queryByTestId("calc-column")).not.toBeInTheDocument();
    });
  });
});

// =============================================================================
// Tests — collapsed row (filled, not active, expandMode=active)
// =============================================================================

describe("PokeRow — collapsed row", () => {
  function renderCollapsed(slotErrors: ValidationError[] = []) {
    const onActivate = jest.fn();
    const onRemove = jest.fn();
    render(
      <PokeRow
        idx={0}
        sortableId="10"
        pokemon={makePokemon()}
        isActive={false}
        density="comfy"
        expandMode="active"
        onActivate={onActivate}
        onRemove={onRemove}
        slotErrors={slotErrors}
      />
    );
    return { onActivate, onRemove };
  }

  it("renders the pokemon species name", () => {
    renderCollapsed();
    expect(screen.getByText("Garchomp")).toBeInTheDocument();
  });

  it("renders the sprite", () => {
    renderCollapsed();
    expect(screen.getByTestId("sprite")).toBeInTheDocument();
  });

  it("calls onActivate when the expand row button is clicked", async () => {
    const user = userEvent.setup();
    const { onActivate } = renderCollapsed();
    // The expand button has aria-label "Expand slot 1: Garchomp"
    await user.click(screen.getByRole("button", { name: /Expand slot 1/i }));
    expect(onActivate).toHaveBeenCalledWith(0);
  });

  it("calls onRemove when the remove button is clicked", async () => {
    const user = userEvent.setup();
    const { onRemove } = renderCollapsed();
    await user.click(
      screen.getByRole("button", { name: /Remove Garchomp from slot 1/i })
    );
    expect(onRemove).toHaveBeenCalledWith(0);
  });

  it("renders error dot when slotErrors has an error", () => {
    renderCollapsed([makeError()]);
    expect(
      screen.getByLabelText("Has validation errors")
    ).toBeInTheDocument();
  });

  it("renders warning dot when slotErrors has only warnings", () => {
    renderCollapsed([makeWarning()]);
    expect(
      screen.getByLabelText("Has validation warnings")
    ).toBeInTheDocument();
  });

  it("renders no dot when slotErrors is empty", () => {
    renderCollapsed([]);
    expect(
      screen.queryByLabelText("Has validation errors")
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText("Has validation warnings")
    ).not.toBeInTheDocument();
  });

  it("renders nickname with species in parens when nickname is set", () => {
    render(
      <PokeRow
        idx={0}
        sortableId="10"
        pokemon={makePokemon({ nickname: "Chomp" })}
        isActive={false}
        density="comfy"
        expandMode="active"
        onActivate={jest.fn()}
      />
    );
    expect(screen.getByText("Chomp")).toBeInTheDocument();
    expect(screen.getByText("(Garchomp)")).toBeInTheDocument();
  });
});

// =============================================================================
// Tests — expanded (active or expandMode=all)
// =============================================================================

describe("PokeRow — expanded (active)", () => {
  it("renders ActiveRow when isActive is true", () => {
    render(
      <PokeRow
        idx={0}
        sortableId="10"
        pokemon={makePokemon()}
        isActive={true}
        density="comfy"
        expandMode="active"
        onActivate={jest.fn()}
        teamPokemon={[]}
      />
    );
    expect(screen.getByTestId("active-row")).toBeInTheDocument();
  });

  it("renders ActiveRow when expandMode is 'all' regardless of isActive", () => {
    render(
      <PokeRow
        idx={1}
        sortableId="10"
        pokemon={makePokemon()}
        isActive={false}
        density="comfy"
        expandMode="all"
        onActivate={jest.fn()}
        teamPokemon={[]}
      />
    );
    expect(screen.getByTestId("active-row")).toBeInTheDocument();
  });

  it("calls onRemove when the ActiveRow remove button is clicked", async () => {
    const user = userEvent.setup();
    const onRemove = jest.fn();
    render(
      <PokeRow
        idx={0}
        sortableId="10"
        pokemon={makePokemon()}
        isActive={true}
        density="comfy"
        expandMode="active"
        onActivate={jest.fn()}
        onRemove={onRemove}
        teamPokemon={[]}
      />
    );
    await user.click(screen.getByTestId("active-row-remove"));
    expect(onRemove).toHaveBeenCalledWith(0);
  });
});
