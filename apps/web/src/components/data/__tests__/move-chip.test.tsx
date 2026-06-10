import React from "react";
import { render, screen } from "@testing-library/react";

import { MoveChip } from "../move-chip";

// =============================================================================
// @trainers/pokemon — stub getMoveType
// =============================================================================

jest.mock("@trainers/pokemon", () => ({
  getMoveType: (moveName: string) => {
    const types: Record<string, string> = {
      Protect: "Normal",
      "Glacial Lance": "Ice",
      "Fake Out": "Normal",
      Flamethrower: "Fire",
    };
    return types[moveName] ?? null;
  },
}));

// =============================================================================
// Tests
// =============================================================================

describe("MoveChip — display name", () => {
  it("title-cases a lowercased slug with hyphens", () => {
    render(<MoveChip move="glacial-lance" />);
    expect(screen.getByText("Glacial Lance")).toBeInTheDocument();
  });

  it("title-cases a single-word slug", () => {
    render(<MoveChip move="protect" />);
    expect(screen.getByText("Protect")).toBeInTheDocument();
  });

  it("title-cases a multi-word slug with spaces", () => {
    render(<MoveChip move="fake out" />);
    expect(screen.getByText("Fake Out")).toBeInTheDocument();
  });

  it("renders a move that is already title-cased", () => {
    render(<MoveChip move="Flamethrower" />);
    expect(screen.getByText("Flamethrower")).toBeInTheDocument();
  });
});

describe("MoveChip — type tinting", () => {
  it("applies Ice type classes for glacial-lance", () => {
    const { container } = render(<MoveChip move="glacial-lance" />);
    const chip = container.querySelector("span");
    // Ice type → bg-cyan-300 text-black
    expect(chip?.className).toContain("bg-cyan-300");
  });

  it("applies Fire type classes for flamethrower", () => {
    const { container } = render(<MoveChip move="flamethrower" />);
    const chip = container.querySelector("span");
    // Fire type → bg-orange-500 text-white
    expect(chip?.className).toContain("bg-orange-500");
  });

  it("applies neutral classes when move type is not found", () => {
    const { container } = render(<MoveChip move="unknown-move-xyz" />);
    const chip = container.querySelector("span");
    // Neutral → bg-muted text-muted-foreground
    expect(chip?.className).toContain("bg-muted");
  });
});

describe("MoveChip — no forbidden text", () => {
  it("never renders the phrase 'top cut'", () => {
    const { container } = render(<MoveChip move="protect" />);
    expect(container.textContent).not.toMatch(/top cut/i);
  });
});
