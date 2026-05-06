"use client";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

import { ValidationPopover } from "../validation/validation-popover";
import { type ValidationError } from "../validation-hooks";

// =============================================================================
// Helpers
// =============================================================================

function makeError(
  overrides: Partial<ValidationError> = {}
): ValidationError {
  return {
    pokemonId: 1,
    pokemonName: "Garchomp",
    field: "ability",
    message: "Must select an ability",
    severity: "error",
    ...overrides,
  };
}

function makeWarning(
  overrides: Partial<ValidationError> = {}
): ValidationError {
  return {
    pokemonId: 2,
    pokemonName: "Incineroar",
    field: "item",
    message: "Duplicate item held",
    severity: "warning",
    ...overrides,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("ValidationPopover", () => {
  // ---------------------------------------------------------------------------
  // 1. Empty errors → "no issues" UI
  // ---------------------------------------------------------------------------

  it("renders 'No issues found' checkmark when errors array is empty", () => {
    render(
      <ValidationPopover errors={[]} onJumpToPokemon={jest.fn()} />
    );

    expect(screen.getByText("No issues found")).toBeInTheDocument();
  });

  it("does not render any error rows when errors is empty", () => {
    render(
      <ValidationPopover errors={[]} onJumpToPokemon={jest.fn()} />
    );

    // No buttons that would be individual error rows
    expect(screen.queryByRole("log")).not.toBeInTheDocument();
  });

  it("does not render the jump hint when errors is empty", () => {
    render(
      <ValidationPopover errors={[]} onJumpToPokemon={jest.fn()} />
    );

    expect(
      screen.queryByText(/click a row/i)
    ).not.toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // 2. One error → row renders, clicking calls onJumpToPokemon with correct ID
  // ---------------------------------------------------------------------------

  it("renders one row for a single error", () => {
    const error = makeError({ pokemonId: 42, pokemonName: "Garchomp" });

    render(
      <ValidationPopover errors={[error]} onJumpToPokemon={jest.fn()} />
    );

    expect(screen.getByText("Garchomp")).toBeInTheDocument();
  });

  it("clicking the error row calls onJumpToPokemon with the pokemon's ID", async () => {
    const user = userEvent.setup();
    const onJump = jest.fn();
    const error = makeError({ pokemonId: 99 });

    render(
      <ValidationPopover errors={[error]} onJumpToPokemon={onJump} />
    );

    const row = screen.getByRole("button", { name: /garchomp/i });
    await user.click(row);

    expect(onJump).toHaveBeenCalledTimes(1);
    expect(onJump).toHaveBeenCalledWith(99);
  });

  // ---------------------------------------------------------------------------
  // 3. Two errors with different pokemonIds → each row calls with the correct ID
  // ---------------------------------------------------------------------------

  it("two errors: clicking first row calls onJumpToPokemon with first pokemonId", async () => {
    const user = userEvent.setup();
    const onJump = jest.fn();

    const errors = [
      makeError({ pokemonId: 10, pokemonName: "Garchomp" }),
      makeError({ pokemonId: 20, pokemonName: "Flutter Mane", field: "species" }),
    ];

    render(
      <ValidationPopover errors={errors} onJumpToPokemon={onJump} />
    );

    const rows = screen.getAllByRole("button");
    await user.click(rows[0]!);

    expect(onJump).toHaveBeenCalledTimes(1);
    expect(onJump).toHaveBeenCalledWith(10);
  });

  it("two errors: clicking second row calls onJumpToPokemon with second pokemonId, not first", async () => {
    const user = userEvent.setup();
    const onJump = jest.fn();

    const errors = [
      makeError({ pokemonId: 10, pokemonName: "Garchomp" }),
      makeError({ pokemonId: 20, pokemonName: "Flutter Mane", field: "species" }),
    ];

    render(
      <ValidationPopover errors={errors} onJumpToPokemon={onJump} />
    );

    const rows = screen.getAllByRole("button");
    await user.click(rows[1]!);

    expect(onJump).toHaveBeenCalledTimes(1);
    expect(onJump).toHaveBeenCalledWith(20);
    expect(onJump).not.toHaveBeenCalledWith(10);
  });

  // ---------------------------------------------------------------------------
  // 4. Mixed severity — both error + warning render with correct counts
  // ---------------------------------------------------------------------------

  it("renders error count and warning count for mixed severity list", () => {
    const errors = [
      makeError({ severity: "error" }),
      makeError({ severity: "error", pokemonId: 2, pokemonName: "Urshifu", field: "move1" }),
      makeWarning({ severity: "warning", pokemonId: 3, pokemonName: "Calyrex" }),
    ];

    render(
      <ValidationPopover errors={errors} onJumpToPokemon={jest.fn()} />
    );

    expect(screen.getByText(/2 errors/i)).toBeInTheDocument();
    expect(screen.getByText(/1 warning/i)).toBeInTheDocument();
  });

  it("renders all 3 rows (2 errors + 1 warning)", () => {
    const errors = [
      makeError({ severity: "error", pokemonId: 1, pokemonName: "Garchomp" }),
      makeError({ severity: "error", pokemonId: 2, pokemonName: "Urshifu", field: "move1" }),
      makeWarning({ severity: "warning", pokemonId: 3, pokemonName: "Calyrex", field: "item" }),
    ];

    render(
      <ValidationPopover errors={errors} onJumpToPokemon={jest.fn()} />
    );

    const rows = screen.getAllByRole("button");
    expect(rows).toHaveLength(3);
  });

  it("clicking a warning row calls onJumpToPokemon with the warning's pokemonId", async () => {
    const user = userEvent.setup();
    const onJump = jest.fn();

    const errors = [
      makeError({ pokemonId: 1, pokemonName: "Garchomp" }),
      makeWarning({ pokemonId: 77, pokemonName: "Calyrex" }),
    ];

    render(
      <ValidationPopover errors={errors} onJumpToPokemon={onJump} />
    );

    const rows = screen.getAllByRole("button");
    // Second row is the warning
    await user.click(rows[1]!);

    expect(onJump).toHaveBeenCalledWith(77);
  });

  // ---------------------------------------------------------------------------
  // 5. Singular / plural labels
  // ---------------------------------------------------------------------------

  it("uses singular 'error' label for a single error", () => {
    render(
      <ValidationPopover
        errors={[makeError({ severity: "error" })]}
        onJumpToPokemon={jest.fn()}
      />
    );

    // Should NOT include "errors" (plural)
    expect(screen.getByText(/1 error/)).toBeInTheDocument();
    expect(screen.queryByText(/1 errors/)).not.toBeInTheDocument();
  });

  it("uses singular 'warning' label for a single warning", () => {
    render(
      <ValidationPopover
        errors={[makeWarning({ severity: "warning" })]}
        onJumpToPokemon={jest.fn()}
      />
    );

    expect(screen.getByText(/1 warning/)).toBeInTheDocument();
    expect(screen.queryByText(/1 warnings/)).not.toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // 6. Jump hint renders when errors are present
  // ---------------------------------------------------------------------------

  it("renders the jump hint paragraph when errors are present", () => {
    render(
      <ValidationPopover
        errors={[makeError()]}
        onJumpToPokemon={jest.fn()}
      />
    );

    expect(screen.getByText(/click a row to jump/i)).toBeInTheDocument();
  });
});
