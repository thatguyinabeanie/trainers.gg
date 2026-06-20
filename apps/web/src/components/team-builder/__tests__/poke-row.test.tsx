"use client";

/**
 * Tests for the PokeRow component.
 *
 * PokeRow always renders GridRow for filled slots and GridRowGhost for empty
 * slots. The legacy CompactRow/1×6 layout has been retired; single-focus mode
 * renders via the workspace branch, not through PokeRow.
 */

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

import { type Tables } from "@trainers/supabase";

// =============================================================================
// Mocks
// =============================================================================

// Layout variant components — captured props per render so we can assert
// forwarding behaviour without exercising their internal logic.
const gridRowProps = jest.fn();

jest.mock("../layouts/grid-row", () => ({
  GridRow: (props: Record<string, unknown>) => {
    gridRowProps(props);
    return (
      <div data-testid="grid-row" data-idx={String(props.idx)}>
        grid:{(props.pokemon as { species?: string } | null)?.species ?? ""}
        <button
          type="button"
          data-testid="grid-row-remove"
          onClick={() => (props.onRemove as () => void)()}
        >
          remove
        </button>
        <button
          type="button"
          data-testid="grid-row-update"
          onClick={() =>
            (props.onUpdate as (f: Record<string, unknown>) => void)({
              nickname: "Chompy",
            })
          }
        >
          update
        </button>
      </div>
    );
  },
}));

jest.mock("../layouts/grid-row-ghost", () => ({
  GridRowGhost: ({ idx }: { idx: number }) => (
    <div data-testid="grid-row-ghost" data-idx={String(idx)}>
      <span>{String(idx + 1).padStart(2, "0")}</span>
      <span>+ Add Pokémon</span>
    </div>
  ),
}));

jest.mock("../pickers/species-picker-dialog", () => ({
  SpeciesPickerDialog: ({
    open,
    onPick,
    onOpenChange,
  }: {
    open: boolean;
    onPick: (s: string) => void;
    onOpenChange: (o: boolean) => void;
  }) =>
    open ? (
      <div data-testid="species-picker">
        <button
          type="button"
          onClick={() => onPick("Togekiss")}
          data-testid="pick-species-btn"
        >
          Pick Togekiss
        </button>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          data-testid="close-picker-btn"
        >
          Close
        </button>
      </div>
    ) : null,
}));

// dnd-kit sortable — return stable no-op values so the component renders
jest.mock("@dnd-kit/sortable", () => ({
  useSortable: () => ({
    attributes: { role: "button" },
    listeners: { onPointerDown: jest.fn() },
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

// =============================================================================
// Tests — empty slot
// =============================================================================

describe("PokeRow — empty slot", () => {
  beforeEach(() => {
    gridRowProps.mockClear();
  });

  it("renders '+ Add Pokémon' when pokemon is null", () => {
    render(
      <PokeRow
        idx={0}
        sortableId="__empty__0"
        pokemon={null}
        isActive={false}
        onActivate={jest.fn()}
      />
    );
    expect(screen.getByText(/\+ Add Pokémon/i)).toBeInTheDocument();
  });

  it("renders the slot number (01) in the ghost", () => {
    render(
      <PokeRow
        idx={0}
        sortableId="__empty__0"
        pokemon={null}
        isActive={false}
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
        onActivate={jest.fn()}
      />
    );
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
        onActivate={jest.fn()}
        onAdd={onAdd}
      />
    );
    const addBtn = screen.getByText(/\+ Add Pokémon/i).closest("button");
    await user.click(addBtn!);
    await user.click(screen.getByTestId("pick-species-btn"));
    expect(onAdd).toHaveBeenCalledWith(2, "Togekiss");
  });

  it("renders GridRowGhost for empty slots", () => {
    render(
      <PokeRow
        idx={0}
        sortableId="__empty__0"
        pokemon={null}
        isActive={false}
        onActivate={jest.fn()}
      />
    );
    expect(screen.getByTestId("grid-row-ghost")).toBeInTheDocument();
  });

  it("outer button has w-full to fill its grid cell", () => {
    render(
      <PokeRow
        idx={0}
        sortableId="__empty__0"
        pokemon={null}
        isActive={false}
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
        onActivate={jest.fn()}
      />
    );
    const button = screen.getByText(/\+ Add Pokémon/i).closest("button")!;
    expect(within(button).queryAllByRole("button")).toHaveLength(0);
  });

  it("does NOT render a GridRow for empty slots", () => {
    render(
      <PokeRow
        idx={0}
        sortableId="__empty__0"
        pokemon={null}
        isActive={false}
        onActivate={jest.fn()}
      />
    );
    expect(screen.queryByTestId("grid-row")).not.toBeInTheDocument();
  });
});

// =============================================================================
// Tests — filled slot
// =============================================================================

describe("PokeRow — filled slot always renders GridRow", () => {
  beforeEach(() => {
    gridRowProps.mockClear();
  });

  it("renders GridRow for a filled slot", () => {
    render(
      <PokeRow
        idx={0}
        sortableId="10"
        pokemon={makePokemon()}
        isActive={false}
        onActivate={jest.fn()}
        teamPokemon={[]}
      />
    );
    expect(screen.getByTestId("grid-row")).toBeInTheDocument();
  });

  it("does NOT render GridRowGhost for a filled slot", () => {
    render(
      <PokeRow
        idx={0}
        sortableId="10"
        pokemon={makePokemon()}
        isActive={false}
        onActivate={jest.fn()}
        teamPokemon={[]}
      />
    );
    expect(screen.queryByTestId("grid-row-ghost")).not.toBeInTheDocument();
  });
});

// =============================================================================
// Tests — filled slot, prop forwarding
// =============================================================================

describe("PokeRow — filled slot forwards props to GridRow", () => {
  beforeEach(() => {
    gridRowProps.mockClear();
  });

  it("forwards idx, pokemon, teamPokemon, format, fieldErrors", () => {
    const teamPokemon = [{ position: 0, pokemon: makePokemon() }];
    const errors = [
      {
        pokemonId: 10,
        pokemonName: "Garchomp",
        field: "ability",
        message: "x",
        severity: "error" as const,
      },
    ];
    render(
      <PokeRow
        idx={3}
        sortableId="10"
        pokemon={makePokemon()}
        isActive={true}
        onActivate={jest.fn()}
        teamPokemon={teamPokemon as never}
        format={undefined}
        slotErrors={errors}
      />
    );
    expect(gridRowProps).toHaveBeenCalledTimes(1);
    const props = gridRowProps.mock.calls[0]![0] as Record<string, unknown>;
    expect(props.idx).toBe(3);
    expect((props.pokemon as Tables<"pokemon">).species).toBe("Garchomp");
    expect(props.teamPokemon).toBe(teamPokemon);
    expect(props.fieldErrors).toBe(errors);
  });

  it("forwards an empty teamPokemon array when none is provided", () => {
    render(
      <PokeRow
        idx={0}
        sortableId="10"
        pokemon={makePokemon()}
        isActive={false}
        onActivate={jest.fn()}
      />
    );
    const props = gridRowProps.mock.calls[0]![0] as Record<string, unknown>;
    expect(Array.isArray(props.teamPokemon)).toBe(true);
    expect((props.teamPokemon as unknown[]).length).toBe(0);
  });

  it("forwards drag attributes/listeners and isDragging from useSortable", () => {
    render(
      <PokeRow
        idx={0}
        sortableId="10"
        pokemon={makePokemon()}
        isActive={false}
        onActivate={jest.fn()}
      />
    );
    const props = gridRowProps.mock.calls[0]![0] as Record<string, unknown>;
    expect(props.dragAttributes).toBeDefined();
    expect(props.dragListeners).toBeDefined();
    expect(props.isDragging).toBe(false);
  });

  it("adapts onUpdate(fields) to onPokemonUpdate(pokemonId, fields)", async () => {
    const user = userEvent.setup();
    const onPokemonUpdate = jest.fn();
    render(
      <PokeRow
        idx={0}
        sortableId="10"
        pokemon={makePokemon()}
        isActive={false}
        onActivate={jest.fn()}
        onPokemonUpdate={onPokemonUpdate}
      />
    );
    await user.click(screen.getByTestId("grid-row-update"));
    expect(onPokemonUpdate).toHaveBeenCalledWith(10, { nickname: "Chompy" });
  });

  it("adapts onRemove() to onRemove(idx)", async () => {
    const user = userEvent.setup();
    const onRemove = jest.fn();
    render(
      <PokeRow
        idx={4}
        sortableId="10"
        pokemon={makePokemon()}
        isActive={false}
        onActivate={jest.fn()}
        onRemove={onRemove}
      />
    );
    await user.click(screen.getByTestId("grid-row-remove"));
    expect(onRemove).toHaveBeenCalledWith(4);
  });
});
