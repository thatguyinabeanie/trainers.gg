import { describe, it, expect, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";

import { TeraCell } from "../tera";

jest.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: any) => <div>{children}</div>,
  PopoverContent: ({ children }: any) => <div>{children}</div>,
  PopoverTrigger: ({ children }: any) => <button>{children}</button>,
}));

jest.mock("../../../type-dot", () => ({
  TypeDot: ({ t }: any) => <span data-testid="type-dot">{t}</span>,
}));
jest.mock("../../../pickers/type-picker", () => ({
  TypePicker: () => <div data-testid="type-picker" />,
}));
jest.mock("../../../format-gating", () => ({
  formatSupportsTera: (format: string | undefined) => format?.includes("gen9") ?? false,
}));

const basePokemon = {
  id: "1",
  species: "Charizard",
  ability: "Blaze",
  held_item: null,
  nature: null,
  tera_type: "fire",
} as any;

describe("TeraCell", () => {
  const defaultProps = {
    pokemon: basePokemon,
    format: "gen9vgc2024" as any,
    onUpdate: jest.fn(),
    variant: "row" as const,
  };

  it("renders tera type capitalized in row variant", () => {
    render(<TeraCell {...defaultProps} />);
    expect(screen.getByText("Fire")).toBeInTheDocument();
    expect(screen.getByText("Tera")).toBeInTheDocument();
  });

  it("renders placeholder when tera_type is null", () => {
    render(<TeraCell {...defaultProps} pokemon={{ ...basePokemon, tera_type: null }} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("returns null when format does not support tera", () => {
    const { container } = render(<TeraCell {...defaultProps} format={"gen7vgc2018" as any} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders grid variant with TERA label", () => {
    render(<TeraCell {...defaultProps} variant="grid" />);
    expect(screen.getByText("TERA")).toBeInTheDocument();
    expect(screen.getByText("Fire")).toBeInTheDocument();
  });
});
