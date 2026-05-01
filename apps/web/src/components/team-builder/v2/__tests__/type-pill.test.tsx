import { render, screen } from "@testing-library/react";
import React from "react";

import { TypePill } from "../type-pill";

// =============================================================================
// TypePill — now renders a Showdown retro sprite <img>
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
  ])("renders an img with alt text for %s", (type) => {
    render(<TypePill t={type} />);
    expect(screen.getByRole("img", { name: type })).toBeInTheDocument();
  });

  it("renders as an img element", () => {
    render(<TypePill t="Fire" />);
    const pill = screen.getByRole("img", { name: "Fire" });
    expect(pill.tagName.toLowerCase()).toBe("img");
  });

  it("sets title to the type name", () => {
    render(<TypePill t="Water" />);
    const pill = screen.getByRole("img", { name: "Water" });
    expect(pill).toHaveAttribute("title", "Water");
  });

  it("src points to the Showdown type sprite URL", () => {
    render(<TypePill t="Fire" />);
    const pill = screen.getByRole("img", { name: "Fire" });
    expect(pill).toHaveAttribute("src", expect.stringContaining("Fire"));
  });
});
