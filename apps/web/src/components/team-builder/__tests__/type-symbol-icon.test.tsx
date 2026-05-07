import { describe, it, expect } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import React from "react";

import { TypeSymbolIcon } from "../type-symbol-icon";

// =============================================================================
// Tests
// =============================================================================

describe("TypeSymbolIcon", () => {
  it("renders a span with role=img and aria-label matching the type", () => {
    render(<TypeSymbolIcon type="Fire" />);
    const icon = screen.getByRole("img", { name: "Fire" });
    expect(icon).toBeInTheDocument();
  });

  it("applies a size style matching the size prop", () => {
    render(<TypeSymbolIcon type="Grass" size={20} />);
    const icon = screen.getByRole("img", { name: "Grass" });
    expect(icon).toHaveStyle({ width: "20px", height: "20px" });
  });

  it("defaults to 18px when no size prop is provided", () => {
    render(<TypeSymbolIcon type="Electric" />);
    const icon = screen.getByRole("img", { name: "Electric" });
    expect(icon).toHaveStyle({ width: "18px", height: "18px" });
  });

  it("sets data-type attribute to the type name", () => {
    render(<TypeSymbolIcon type="Ghost" />);
    const icon = screen.getByRole("img", { name: "Ghost" });
    expect(icon).toHaveAttribute("data-type", "Ghost");
  });

  it("renders all 18 standard types without throwing", () => {
    const types = [
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
    ] as const;

    for (const type of types) {
      const { unmount } = render(<TypeSymbolIcon type={type} />);
      expect(screen.getByRole("img", { name: type })).toBeInTheDocument();
      unmount();
    }
  });

  it("renders the Stellar type without throwing", () => {
    render(<TypeSymbolIcon type="Stellar" />);
    expect(screen.getByRole("img", { name: "Stellar" })).toBeInTheDocument();
  });

  it("applies a custom className to the icon wrapper", () => {
    render(<TypeSymbolIcon type="Ice" className="test-class" />);
    const icon = screen.getByRole("img", { name: "Ice" });
    expect(icon.className).toContain("test-class");
  });
});
