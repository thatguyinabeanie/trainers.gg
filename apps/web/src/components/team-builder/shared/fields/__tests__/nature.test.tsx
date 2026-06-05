/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";

import { NatureCell, natureLabel, natureLabelShort } from "../nature";

jest.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: any) => <div>{children}</div>,
  PopoverContent: ({ children }: any) => <div>{children}</div>,
  PopoverTrigger: ({ children, render: renderProp }: any) => (
    <button aria-label={renderProp?.props?.["aria-label"]}>{children}</button>
  ),
}));

jest.mock("../../../validation-hooks", () => ({}));
jest.mock("../../../nature-chevrons", () => ({
  NatureChevrons: ({ boost, reduce }: any) => (
    <span data-testid="nature-chevrons">{boost}/{reduce}</span>
  ),
}));
jest.mock("../../../pickers/nature-picker", () => ({
  NaturePicker: () => <div data-testid="nature-picker" />,
}));
jest.mock("../../../validation/field-error", () => ({
  FieldErrors: ({ errors }: any) =>
    errors.length > 0 ? <span data-testid="field-errors">{errors[0].message}</span> : null,
}));
jest.mock("../../../lanes/form-chip", () => ({
  FormChip: ({ label, value, trailing, children }: any) => (
    <div data-testid="form-chip">
      <span data-testid="form-chip-label">{label}</span>
      <span>{value || "—"}</span>
      {trailing}
      {children}
    </div>
  ),
}));

// A minimal Champions GameFormat object (gameShort discriminant only).
const championsFormat = {
  id: "gen9championsvgc2026regma",
  game: "Pokemon Champions",
  gameShort: "Champions",
  generation: 9,
  category: "VGC",
  year: 2026,
  regulation: "M-A",
  label: "Champions: Reg M-A",
  showdownName: "[Champions] VGC 2026 Reg M-A",
  doubles: true,
  active: true,
} as any;

// A non-Champions format (standard VGC).
const vgcFormat = {
  id: "gen9vgc2025regf",
  game: "Scarlet/Violet",
  gameShort: "SV",
  generation: 9,
  category: "VGC",
  year: 2025,
  regulation: "F",
  label: "VGC 2025 Reg F",
  showdownName: "VGC 2025 Reg F",
  doubles: true,
  active: true,
} as any;

const basePokemon = {
  id: "1",
  species: "Charizard",
  ability: "Blaze",
  held_item: null,
  nature: "Adamant",
  tera_type: null,
} as any;

// =============================================================================
// Label helper unit tests
// =============================================================================

describe("natureLabel", () => {
  it("returns 'Nature' when format is undefined", () => {
    expect(natureLabel(undefined)).toBe("Nature");
  });

  it("returns 'Nature' for a non-Champions (VGC) format", () => {
    expect(natureLabel(vgcFormat)).toBe("Nature");
  });

  it("returns 'Stat Alignment' for a Champions format", () => {
    expect(natureLabel(championsFormat)).toBe("Stat Alignment");
  });
});

describe("natureLabelShort", () => {
  it("returns 'Nat' when format is undefined", () => {
    expect(natureLabelShort(undefined)).toBe("Nat");
  });

  it("returns 'Nat' for a non-Champions (VGC) format", () => {
    expect(natureLabelShort(vgcFormat)).toBe("Nat");
  });

  it("returns 'Align' for a Champions format", () => {
    expect(natureLabelShort(championsFormat)).toBe("Align");
  });
});

// =============================================================================
// NatureCell component tests
// =============================================================================

describe("NatureCell", () => {
  const defaultProps = {
    pokemon: basePokemon,
    format: undefined,
    natUp: "atk" as const,
    natDown: "spa" as const,
    errors: [] as any[],
    onUpdate: jest.fn(),
    variant: "row" as const,
  };

  it("renders the nature name in row variant", () => {
    render(<NatureCell {...defaultProps} />);
    expect(screen.getByText("Adamant")).toBeInTheDocument();
  });

  it("renders placeholder when nature is null", () => {
    render(<NatureCell {...defaultProps} pokemon={{ ...basePokemon, nature: null }} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Row variant — label text
  // -------------------------------------------------------------------------

  it("row: uses 'Nat' label for non-Champions / undefined format", () => {
    render(<NatureCell {...defaultProps} />);
    expect(screen.getByTestId("form-chip-label")).toHaveTextContent("Nat");
  });

  it("row: uses 'Align' label for Champions format", () => {
    render(<NatureCell {...defaultProps} format={championsFormat} />);
    expect(screen.getByTestId("form-chip-label")).toHaveTextContent("Align");
  });

  it("row: uses 'Nat' label for a standard VGC format", () => {
    render(<NatureCell {...defaultProps} format={vgcFormat} />);
    expect(screen.getByTestId("form-chip-label")).toHaveTextContent("Nat");
  });

  // -------------------------------------------------------------------------
  // Grid variant — label text and aria-label
  // -------------------------------------------------------------------------

  it("renders grid variant with NAT label and chevrons (undefined format)", () => {
    render(<NatureCell {...defaultProps} variant="grid" />);
    expect(screen.getByText("NAT")).toBeInTheDocument();
    expect(screen.getByText("Adamant")).toBeInTheDocument();
    expect(screen.getByTestId("nature-chevrons")).toBeInTheDocument();
  });

  it("grid: uses 'ALIGN' label for Champions format", () => {
    render(<NatureCell {...defaultProps} variant="grid" format={championsFormat} />);
    expect(screen.getByText("ALIGN")).toBeInTheDocument();
  });

  it("grid: uses 'NAT' label for standard VGC format", () => {
    render(<NatureCell {...defaultProps} variant="grid" format={vgcFormat} />);
    expect(screen.getByText("NAT")).toBeInTheDocument();
  });

  it("grid: aria-label is 'Stat Alignment' for Champions format", () => {
    render(<NatureCell {...defaultProps} variant="grid" format={championsFormat} />);
    expect(screen.getByRole("button", { name: "Stat Alignment" })).toBeInTheDocument();
  });

  it("grid: aria-label is 'Nature' for non-Champions format", () => {
    render(<NatureCell {...defaultProps} variant="grid" format={vgcFormat} />);
    expect(screen.getByRole("button", { name: "Nature" })).toBeInTheDocument();
  });

  it("does not render chevrons in grid when nature is null", () => {
    render(
      <NatureCell {...defaultProps} variant="grid" pokemon={{ ...basePokemon, nature: null }} />
    );
    expect(screen.queryByTestId("nature-chevrons")).not.toBeInTheDocument();
  });
});
