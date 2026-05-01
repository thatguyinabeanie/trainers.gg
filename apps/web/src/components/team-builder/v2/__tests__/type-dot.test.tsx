import { render, screen } from "@testing-library/react";
import React from "react";

import { TypeDot } from "../type-dot";

// =============================================================================
// TypeDot
// =============================================================================

describe("TypeDot", () => {
  it("renders a span with role=img for a known type", () => {
    render(<TypeDot t="Fire" />);
    const dot = screen.getByRole("img");
    expect(dot).toBeInTheDocument();
  });

  it("has an aria-label matching the type name", () => {
    render(<TypeDot t="Water" />);
    expect(screen.getByRole("img", { name: "Water" })).toBeInTheDocument();
  });

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
  ])("renders without crashing for type %s", (type) => {
    const { container } = render(<TypeDot t={type} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it("uses default size of 10 when size is not provided", () => {
    render(<TypeDot t="Fire" />);
    const dot = screen.getByRole("img");
    expect(dot).toHaveStyle({ width: "10px", height: "10px" });
  });

  it("applies the provided size as inline style", () => {
    render(<TypeDot t="Fire" size={24} />);
    const dot = screen.getByRole("img");
    expect(dot).toHaveStyle({ width: "24px", height: "24px" });
  });

  it("falls back to bg-stone-400 class for an unknown type", () => {
    render(<TypeDot t="Unknown" />);
    const dot = screen.getByRole("img", { name: "Unknown" });
    // Fallback returns the first token of "bg-stone-400", which is "bg-stone-400"
    expect(dot.className).toContain("bg-stone-");
  });

  it("dot is a span element (inline element)", () => {
    render(<TypeDot t="Grass" />);
    const dot = screen.getByRole("img");
    expect(dot.tagName.toLowerCase()).toBe("span");
  });
});
