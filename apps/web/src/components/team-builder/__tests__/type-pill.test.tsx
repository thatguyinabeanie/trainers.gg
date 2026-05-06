import { render, screen } from "@testing-library/react";
import React from "react";

import { TypePill } from "../type-pill";

// =============================================================================
// TypePill — now renders a wordless TypeSymbolIcon (lucide glyph on a
// type-colored span). The accessible role is still `img` (via the inner
// <span role="img" aria-label={type}>) so existing role-based queries
// continue to work.
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
  ])("renders an accessible image labelled by type for %s", (type) => {
    render(<TypePill t={type} />);
    expect(screen.getByRole("img", { name: type })).toBeInTheDocument();
  });

  it("uses an aria-labelled span (not a translated <img> tag)", () => {
    // Wordless icons translate cleanly without needing localized assets.
    render(<TypePill t="Fire" />);
    const pill = screen.getByRole("img", { name: "Fire" });
    expect(pill.tagName.toLowerCase()).toBe("span");
    expect(pill).toHaveAttribute("aria-label", "Fire");
  });
});
