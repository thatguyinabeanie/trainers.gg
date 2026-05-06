import React from "react";
import { render, screen } from "@testing-library/react";
import { TeraTypeIcon } from "../tera-type-icon";

// Mock lucide-react — return simple SVG stubs
jest.mock("lucide-react", () => {
  const mock = (name: string) => {
    const Icon = (props: Record<string, unknown>) => (
      <svg data-testid={`icon-${name}`} {...props} />
    );
    Icon.displayName = name;
    return Icon;
  };
  return new Proxy(
    {},
    { get: (_target, prop: string) => mock(prop) }
  );
});

jest.mock("@trainers/pokemon", () => ({}));

jest.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children, render }: { children?: React.ReactNode; render?: React.ReactElement }) => (
    <span data-testid="tooltip-trigger">{render ?? children}</span>
  ),
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <span data-testid="tooltip-content">{children}</span>
  ),
}));

describe("TeraTypeIcon", () => {
  it("renders for a valid type (Fire)", () => {
    const { container } = render(<TeraTypeIcon type="Fire" />);

    const icon = container.querySelector('[data-type="Fire"]');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveAttribute("aria-label", "Tera Fire");
  });

  it("renders for Stellar type", () => {
    const { container } = render(<TeraTypeIcon type="Stellar" />);

    const icon = container.querySelector('[data-type="Stellar"]');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveAttribute("aria-label", "Tera Stellar");
  });

  it("applies correct size via style", () => {
    const { container } = render(<TeraTypeIcon type="Water" size={24} />);

    const icon = container.querySelector('[data-type="Water"]');
    expect(icon).toHaveStyle({ width: "24px", height: "24px" });
  });

  it("uses default size of 18", () => {
    const { container } = render(<TeraTypeIcon type="Grass" />);

    const icon = container.querySelector('[data-type="Grass"]');
    expect(icon).toHaveStyle({ width: "18px", height: "18px" });
  });

  it("shows tooltip with type name", () => {
    render(<TeraTypeIcon type="Electric" />);

    expect(screen.getByTestId("tooltip-content")).toHaveTextContent("Tera Electric");
  });

  it("applies custom className", () => {
    const { container } = render(<TeraTypeIcon type="Ice" className="my-class" />);

    const icon = container.querySelector('[data-type="Ice"]');
    expect(icon).toHaveClass("my-class");
  });
});
