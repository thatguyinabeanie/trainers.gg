import { render, screen } from "@testing-library/react";
import React from "react";

import { TypePill } from "../type-pill";

// =============================================================================
// TypePill
// =============================================================================

describe("TypePill", () => {
  it.each([
    "Normal",
    "Bug",
    "Dark",
    "Dragon",
    "Electric",
    "Fairy",
    "Fighting",
    "Fire",
    "Flying",
    "Ghost",
    "Grass",
    "Ground",
    "Ice",
    "Poison",
    "Psychic",
    "Rock",
    "Steel",
    "Water",
  ])("renders the type name text for %s", (type) => {
    render(<TypePill t={type} />);
    expect(screen.getByText(type)).toBeInTheDocument();
  });

  it("renders as a span element", () => {
    render(<TypePill t="Fire" />);
    const pill = screen.getByText("Fire");
    expect(pill.tagName.toLowerCase()).toBe("span");
  });

  it("applies a type-specific color class for Fire", () => {
    render(<TypePill t="Fire" />);
    const pill = screen.getByText("Fire");
    // Fire → bg-orange-500 text-white
    expect(pill.className).toContain("bg-orange-500");
  });

  it("applies a type-specific color class for Water", () => {
    render(<TypePill t="Water" />);
    const pill = screen.getByText("Water");
    expect(pill.className).toContain("bg-blue-500");
  });

  it("applies a type-specific color class for Grass", () => {
    render(<TypePill t="Grass" />);
    const pill = screen.getByText("Grass");
    expect(pill.className).toContain("bg-green-500");
  });

  it("falls back to bg-stone-400 for an unknown type", () => {
    render(<TypePill t="Unknown" />);
    const pill = screen.getByText("Unknown");
    expect(pill.className).toContain("bg-stone-400");
  });
});
