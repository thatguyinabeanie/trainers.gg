"use client";

/**
 * Tests for ActiveRow and its errorsForFields helper.
 * Covers: lane composition (Identity, Stats, Moves), RIB slot number,
 * remove button, drag handle, field error routing.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

import { type DraggableAttributes, type DraggableSyntheticListeners } from "@dnd-kit/core";

import { type Tables } from "@trainers/supabase";

// =============================================================================
// Mocks
// =============================================================================

jest.mock("../builder.module.css", () =>
  new Proxy({}, { get: (_t, k) => k })
);

jest.mock("../calc/calc-state-context", () => ({
  useCalcStateContext: () => ({ calcEnabled: false }),
  useCalcEnabled: () => false,
}));

jest.mock("../lanes/calc-column", () => ({
  CalcColumn: () => <div data-testid="calc-column" />,
}));

jest.mock("../lanes/identity", () => ({
  IdentityLane: ({
    pokemon,
    fieldErrors,
  }: {
    pokemon: Tables<"pokemon">;
    fieldErrors: unknown[];
  }) => (
    <div
      data-testid="identity-lane"
      data-field-error-count={fieldErrors.length}
    >
      {pokemon.species}
    </div>
  ),
}));

jest.mock("../lanes/moves-lane", () => ({
  MovesLane: ({
    pokemon,
    fieldErrors,
  }: {
    pokemon: Tables<"pokemon">;
    fieldErrors: unknown[];
  }) => (
    <div
      data-testid="moves-lane"
      data-field-error-count={fieldErrors.length}
    >
      moves-{pokemon.species}
    </div>
  ),
}));

jest.mock("../lanes/stats-lane", () => ({
  StatsLane: ({
    pokemon,
    fieldErrors,
  }: {
    pokemon: Tables<"pokemon">;
    fieldErrors: unknown[];
  }) => (
    <div
      data-testid="stats-lane"
      data-field-error-count={fieldErrors.length}
    >
      stats-{pokemon.species}
    </div>
  ),
}));

// =============================================================================
// Import after mocks
// =============================================================================

import { ActiveRow } from "../lanes/active-row";
import { type ValidationError } from "../../validation-hooks";

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

function makeValidationError(
  field: string,
  severity: "error" | "warning" = "error"
): ValidationError {
  return {
    pokemonId: 1,
    pokemonName: "Garchomp",
    field,
    message: `${field} issue`,
    severity,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("ActiveRow — basic render", () => {
  it("renders the slot number (01) in the rib", () => {
    render(
      <ActiveRow
        idx={0}
        pokemon={makePokemon()}
        teamPokemon={[]}
        format={undefined}
        onUpdate={jest.fn()}
        onRemove={jest.fn()}
      />
    );
    expect(screen.getByText("01")).toBeInTheDocument();
  });

  it("renders slot 3 as '03'", () => {
    render(
      <ActiveRow
        idx={2}
        pokemon={makePokemon()}
        teamPokemon={[]}
        format={undefined}
        onUpdate={jest.fn()}
        onRemove={jest.fn()}
      />
    );
    expect(screen.getByText("03")).toBeInTheDocument();
  });

  it("renders the identity lane", () => {
    render(
      <ActiveRow
        idx={0}
        pokemon={makePokemon()}
        teamPokemon={[]}
        format={undefined}
        onUpdate={jest.fn()}
        onRemove={jest.fn()}
      />
    );
    expect(screen.getByTestId("identity-lane")).toBeInTheDocument();
  });

  it("renders the stats lane", () => {
    render(
      <ActiveRow
        idx={0}
        pokemon={makePokemon()}
        teamPokemon={[]}
        format={undefined}
        onUpdate={jest.fn()}
        onRemove={jest.fn()}
      />
    );
    expect(screen.getByTestId("stats-lane")).toBeInTheDocument();
  });

  it("renders the moves lane", () => {
    render(
      <ActiveRow
        idx={0}
        pokemon={makePokemon()}
        teamPokemon={[]}
        format={undefined}
        onUpdate={jest.fn()}
        onRemove={jest.fn()}
      />
    );
    expect(screen.getByTestId("moves-lane")).toBeInTheDocument();
  });
});

describe("ActiveRow — remove button", () => {
  it("renders a remove button", () => {
    render(
      <ActiveRow
        idx={0}
        pokemon={makePokemon()}
        teamPokemon={[]}
        format={undefined}
        onUpdate={jest.fn()}
        onRemove={jest.fn()}
      />
    );
    expect(
      screen.getByRole("button", { name: /Remove Garchomp from slot 1/i })
    ).toBeInTheDocument();
  });

  it("calls onRemove when the remove button is clicked", async () => {
    const user = userEvent.setup();
    const onRemove = jest.fn();
    render(
      <ActiveRow
        idx={0}
        pokemon={makePokemon()}
        teamPokemon={[]}
        format={undefined}
        onUpdate={jest.fn()}
        onRemove={onRemove}
      />
    );
    await user.click(
      screen.getByRole("button", { name: /Remove Garchomp from slot 1/i })
    );
    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});

describe("ActiveRow — error routing to lanes", () => {
  it("routes species/ability/nature errors to identity lane", () => {
    const errors: ValidationError[] = [
      makeValidationError("species"),
      makeValidationError("ability"),
      makeValidationError("nature"),
    ];
    render(
      <ActiveRow
        idx={0}
        pokemon={makePokemon()}
        teamPokemon={[]}
        format={undefined}
        onUpdate={jest.fn()}
        onRemove={jest.fn()}
        fieldErrors={errors}
      />
    );
    const identityLane = screen.getByTestId("identity-lane");
    expect(identityLane.getAttribute("data-field-error-count")).toBe("3");
  });

  it("routes move1-4 errors to moves lane only", () => {
    const errors: ValidationError[] = [
      makeValidationError("move1"),
      makeValidationError("move2"),
    ];
    render(
      <ActiveRow
        idx={0}
        pokemon={makePokemon()}
        teamPokemon={[]}
        format={undefined}
        onUpdate={jest.fn()}
        onRemove={jest.fn()}
        fieldErrors={errors}
      />
    );
    const movesLane = screen.getByTestId("moves-lane");
    expect(movesLane.getAttribute("data-field-error-count")).toBe("2");
    // Identity lane should NOT get moves errors
    const identityLane = screen.getByTestId("identity-lane");
    expect(identityLane.getAttribute("data-field-error-count")).toBe("0");
  });

  it("routes ev_hp/evTotal errors to stats lane only", () => {
    const errors: ValidationError[] = [
      makeValidationError("ev_hp"),
      makeValidationError("evTotal"),
    ];
    render(
      <ActiveRow
        idx={0}
        pokemon={makePokemon()}
        teamPokemon={[]}
        format={undefined}
        onUpdate={jest.fn()}
        onRemove={jest.fn()}
        fieldErrors={errors}
      />
    );
    const statsLane = screen.getByTestId("stats-lane");
    expect(statsLane.getAttribute("data-field-error-count")).toBe("2");
    const movesLane = screen.getByTestId("moves-lane");
    expect(movesLane.getAttribute("data-field-error-count")).toBe("0");
  });

  it("passes empty errors to all lanes when fieldErrors is undefined", () => {
    render(
      <ActiveRow
        idx={0}
        pokemon={makePokemon()}
        teamPokemon={[]}
        format={undefined}
        onUpdate={jest.fn()}
        onRemove={jest.fn()}
      />
    );
    expect(screen.getByTestId("identity-lane").getAttribute("data-field-error-count")).toBe("0");
    expect(screen.getByTestId("moves-lane").getAttribute("data-field-error-count")).toBe("0");
    expect(screen.getByTestId("stats-lane").getAttribute("data-field-error-count")).toBe("0");
  });
});

describe("ActiveRow — drag attributes forwarded", () => {
  it("renders the drag handle span with dragListeners present", () => {
    const mockListeners = { onPointerDown: jest.fn() };
    render(
      <ActiveRow
        idx={0}
        pokemon={makePokemon()}
        teamPokemon={[]}
        format={undefined}
        onUpdate={jest.fn()}
        onRemove={jest.fn()}
        dragAttributes={{ role: "button" } as unknown as DraggableAttributes}
        dragListeners={mockListeners as unknown as DraggableSyntheticListeners}
      />
    );
    // The drag handle renders the slot number AND has the listeners forwarded
    expect(screen.getByLabelText("Drag to reorder slot 1")).toBeInTheDocument();
  });
});
