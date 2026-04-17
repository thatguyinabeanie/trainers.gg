import { describe, it, expect } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import React from "react";

// Tooltip uses Base UI — mock to a simple pass-through so the icon renders
// without needing a full JSDOM provider setup for portal positioning.
jest.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ render: renderProp }: { render: React.ReactNode }) => (
    <>{renderProp}</>
  ),
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-content">{children}</div>
  ),
}));

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

  it("renders the tooltip content with the full type name", () => {
    render(<TypeSymbolIcon type="Water" />);
    expect(screen.getByTestId("tooltip-content")).toHaveTextContent("Water");
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
