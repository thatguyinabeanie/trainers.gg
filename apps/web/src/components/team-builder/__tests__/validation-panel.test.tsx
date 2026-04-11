import { describe, expect, it, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// =============================================================================
// Module-level mocks
// =============================================================================

jest.mock("lucide-react", () => {
  const mock = (name: string) => {
    const Icon = (props: Record<string, unknown>) => (
      <svg data-testid={`icon-${name}`} {...props} />
    );
    Icon.displayName = name;
    return Icon;
  };
  return new Proxy({}, { get: (_target, prop: string) => mock(prop) });
});

import { ValidationPanel } from "../validation-panel";
import { type ValidationError } from "../validation-hooks";

// =============================================================================
// Test data helpers
// =============================================================================

function makeError(overrides: Partial<ValidationError> = {}): ValidationError {
  return {
    pokemonId: 1,
    pokemonName: "Incineroar",
    field: "ability",
    message: "Invalid ability for this species",
    severity: "error",
    ...overrides,
  };
}

function makeWarning(
  overrides: Partial<ValidationError> = {}
): ValidationError {
  return makeError({ severity: "warning", ...overrides });
}

// =============================================================================
// Tests
// =============================================================================

describe("ValidationPanel", () => {
  describe("empty state (no errors)", () => {
    it("shows 'No issues found' when errors array is empty", () => {
      render(
        <ValidationPanel
          errors={[]}
          onSelectPokemon={jest.fn()}
          onClose={jest.fn()}
        />
      );
      expect(screen.getByText("No issues found")).toBeInTheDocument();
    });

    it("renders the CheckCircle2 icon alongside the success message", () => {
      render(
        <ValidationPanel
          errors={[]}
          onSelectPokemon={jest.fn()}
          onClose={jest.fn()}
        />
      );
      expect(screen.getByTestId("icon-CheckCircle2")).toBeInTheDocument();
    });

    it("applies emerald text color class to the success message container", () => {
      render(
        <ValidationPanel
          errors={[]}
          onSelectPokemon={jest.fn()}
          onClose={jest.fn()}
        />
      );
      // The span wrapping 'No issues found' should have the emerald class
      const successSpan = screen.getByText("No issues found").closest("span");
      expect(successSpan).toHaveClass("text-emerald-600");
    });

    it("does not render any issue rows when errors is empty", () => {
      render(
        <ValidationPanel
          errors={[]}
          onSelectPokemon={jest.fn()}
          onClose={jest.fn()}
        />
      );
      // No issue list container should be present
      expect(screen.queryByRole("button", { name: /invalid/i })).toBeNull();
    });
  });

  describe("issue count header", () => {
    it("shows singular 'issue' for exactly 1 error", () => {
      render(
        <ValidationPanel
          errors={[makeError()]}
          onSelectPokemon={jest.fn()}
          onClose={jest.fn()}
        />
      );
      expect(
        screen.getByText("Validation Results — 1 issue")
      ).toBeInTheDocument();
    });

    it("shows plural 'issues' for 2 errors", () => {
      render(
        <ValidationPanel
          errors={[makeError({ pokemonId: 1 }), makeError({ pokemonId: 2 })]}
          onSelectPokemon={jest.fn()}
          onClose={jest.fn()}
        />
      );
      expect(
        screen.getByText("Validation Results — 2 issues")
      ).toBeInTheDocument();
    });

    it("shows plural 'issues' for 3 errors", () => {
      const errors = [
        makeError({ pokemonId: 1, field: "ability" }),
        makeError({ pokemonId: 2, field: "moves" }),
        makeError({ pokemonId: 3, field: "evTotal" }),
      ];
      render(
        <ValidationPanel
          errors={errors}
          onSelectPokemon={jest.fn()}
          onClose={jest.fn()}
        />
      );
      expect(
        screen.getByText("Validation Results — 3 issues")
      ).toBeInTheDocument();
    });

    it("does not show the success message when errors exist", () => {
      render(
        <ValidationPanel
          errors={[makeError()]}
          onSelectPokemon={jest.fn()}
          onClose={jest.fn()}
        />
      );
      expect(screen.queryByText("No issues found")).toBeNull();
    });
  });

  describe("error rows — content", () => {
    it("renders the pokemon name for each error", () => {
      render(
        <ValidationPanel
          errors={[makeError({ pokemonName: "Garganacl" })]}
          onSelectPokemon={jest.fn()}
          onClose={jest.fn()}
        />
      );
      expect(screen.getByText("Garganacl")).toBeInTheDocument();
    });

    it("renders the error message for each error", () => {
      render(
        <ValidationPanel
          errors={[makeError({ message: "EV total exceeds 510" })]}
          onSelectPokemon={jest.fn()}
          onClose={jest.fn()}
        />
      );
      expect(screen.getByText("EV total exceeds 510")).toBeInTheDocument();
    });

    it("renders multiple rows for multiple errors", () => {
      const errors = [
        makeError({
          pokemonId: 1,
          pokemonName: "Incineroar",
          field: "ability",
          message: "Bad ability",
        }),
        makeError({
          pokemonId: 2,
          pokemonName: "Rillaboom",
          field: "moves",
          message: "Illegal move",
        }),
      ];
      render(
        <ValidationPanel
          errors={errors}
          onSelectPokemon={jest.fn()}
          onClose={jest.fn()}
        />
      );
      expect(screen.getByText("Incineroar")).toBeInTheDocument();
      expect(screen.getByText("Rillaboom")).toBeInTheDocument();
      expect(screen.getByText("Bad ability")).toBeInTheDocument();
      expect(screen.getByText("Illegal move")).toBeInTheDocument();
    });
  });

  describe("field label mapping", () => {
    it.each([
      ["teamSize", "Team Size"],
      ["heldItem", "Item"],
      ["species", "Species"],
      ["ability", "Ability"],
      ["nature", "Nature"],
      ["item", "Item"],
      ["nickname", "Nickname"],
      ["gender", "Gender"],
      ["move1", "Move 1"],
      ["move2", "Move 2"],
      ["move3", "Move 3"],
      ["move4", "Move 4"],
      ["moves", "Moves"],
      ["evs", "EVs"],
      ["evTotal", "EV Total"],
    ])("maps field '%s' to label '%s'", (field, expectedLabel) => {
      render(
        <ValidationPanel
          errors={[makeError({ field })]}
          onSelectPokemon={jest.fn()}
          onClose={jest.fn()}
        />
      );
      expect(screen.getByText(expectedLabel)).toBeInTheDocument();
    });

    it("falls back to humanized camelCase for unknown fields", () => {
      // 'someUnknownField' should render as 'some Unknown Field' via replace
      render(
        <ValidationPanel
          errors={[makeError({ field: "someUnknownField" })]}
          onSelectPokemon={jest.fn()}
          onClose={jest.fn()}
        />
      );
      // The regex replaces each capital letter with ' X', then trims
      expect(screen.getByText("some Unknown Field")).toBeInTheDocument();
    });
  });

  describe("severity styling", () => {
    it("error rows have destructive hover class", () => {
      render(
        <ValidationPanel
          errors={[makeError({ severity: "error" })]}
          onSelectPokemon={jest.fn()}
          onClose={jest.fn()}
        />
      );
      // The button row should include the destructive hover class
      const buttons = screen.getAllByRole("button");
      // Last button is close; issue row buttons come before it
      const issueButton = buttons.find((btn) =>
        btn.classList.contains("hover:bg-destructive/10")
      );
      expect(issueButton).toBeDefined();
    });

    it("warning rows have amber hover class", () => {
      render(
        <ValidationPanel
          errors={[makeWarning({ severity: "warning" })]}
          onSelectPokemon={jest.fn()}
          onClose={jest.fn()}
        />
      );
      const buttons = screen.getAllByRole("button");
      const warningButton = buttons.find((btn) =>
        btn.classList.contains("hover:bg-amber-500/10")
      );
      expect(warningButton).toBeDefined();
    });

    it("error species name has destructive text color", () => {
      render(
        <ValidationPanel
          errors={[makeError({ severity: "error", pokemonName: "Tornadus" })]}
          onSelectPokemon={jest.fn()}
          onClose={jest.fn()}
        />
      );
      const nameEl = screen.getByText("Tornadus");
      expect(nameEl).toHaveClass("text-destructive");
    });

    it("warning species name has amber text color", () => {
      render(
        <ValidationPanel
          errors={[
            makeWarning({ severity: "warning", pokemonName: "Landorus" }),
          ]}
          onSelectPokemon={jest.fn()}
          onClose={jest.fn()}
        />
      );
      const nameEl = screen.getByText("Landorus");
      expect(nameEl).toHaveClass("text-amber-600");
    });

    it("error severity indicator has destructive background", () => {
      const { container } = render(
        <ValidationPanel
          errors={[makeError({ severity: "error" })]}
          onSelectPokemon={jest.fn()}
          onClose={jest.fn()}
        />
      );
      const indicator = container.querySelector(".bg-destructive");
      expect(indicator).toBeInTheDocument();
    });

    it("warning severity indicator has amber background", () => {
      const { container } = render(
        <ValidationPanel
          errors={[makeWarning({ severity: "warning" })]}
          onSelectPokemon={jest.fn()}
          onClose={jest.fn()}
        />
      );
      const indicator = container.querySelector(".bg-amber-500");
      expect(indicator).toBeInTheDocument();
    });
  });

  describe("interaction — clicking error rows", () => {
    it("calls onSelectPokemon with the pokemonId when an error row is clicked", async () => {
      const user = userEvent.setup();
      const onSelectPokemon = jest.fn();
      render(
        <ValidationPanel
          errors={[makeError({ pokemonId: 42 })]}
          onSelectPokemon={onSelectPokemon}
          onClose={jest.fn()}
        />
      );
      // Click the species name which is inside the row button
      await user.click(screen.getByText("Incineroar"));
      expect(onSelectPokemon).toHaveBeenCalledWith(42);
    });

    it("calls onSelectPokemon with correct id for each of multiple rows", async () => {
      const user = userEvent.setup();
      const onSelectPokemon = jest.fn();
      const errors = [
        makeError({
          pokemonId: 10,
          pokemonName: "Incineroar",
          field: "ability",
        }),
        makeError({ pokemonId: 20, pokemonName: "Rillaboom", field: "moves" }),
      ];
      render(
        <ValidationPanel
          errors={errors}
          onSelectPokemon={onSelectPokemon}
          onClose={jest.fn()}
        />
      );
      await user.click(screen.getByText("Rillaboom"));
      expect(onSelectPokemon).toHaveBeenCalledWith(20);
      expect(onSelectPokemon).toHaveBeenCalledTimes(1);
    });

    it("calls onSelectPokemon once per click", async () => {
      const user = userEvent.setup();
      const onSelectPokemon = jest.fn();
      render(
        <ValidationPanel
          errors={[makeError({ pokemonId: 7 })]}
          onSelectPokemon={onSelectPokemon}
          onClose={jest.fn()}
        />
      );
      await user.click(screen.getByText("Incineroar"));
      await user.click(screen.getByText("Incineroar"));
      expect(onSelectPokemon).toHaveBeenCalledTimes(2);
      expect(onSelectPokemon).toHaveBeenNthCalledWith(1, 7);
      expect(onSelectPokemon).toHaveBeenNthCalledWith(2, 7);
    });
  });

  describe("interaction — close button", () => {
    it("renders the close button with accessible label", () => {
      render(
        <ValidationPanel
          errors={[]}
          onSelectPokemon={jest.fn()}
          onClose={jest.fn()}
        />
      );
      expect(
        screen.getByRole("button", { name: "Close validation panel" })
      ).toBeInTheDocument();
    });

    it("calls onClose when the close button is clicked", async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      render(
        <ValidationPanel
          errors={[]}
          onSelectPokemon={jest.fn()}
          onClose={onClose}
        />
      );
      await user.click(
        screen.getByRole("button", { name: "Close validation panel" })
      );
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("calls onClose when close button clicked even when errors exist", async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      render(
        <ValidationPanel
          errors={[makeError()]}
          onSelectPokemon={jest.fn()}
          onClose={onClose}
        />
      );
      await user.click(
        screen.getByRole("button", { name: "Close validation panel" })
      );
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("renders the X icon inside the close button", () => {
      render(
        <ValidationPanel
          errors={[]}
          onSelectPokemon={jest.fn()}
          onClose={jest.fn()}
        />
      );
      expect(screen.getByTestId("icon-X")).toBeInTheDocument();
    });
  });
});
