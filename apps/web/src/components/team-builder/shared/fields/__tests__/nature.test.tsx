/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";

import { NatureCell } from "../nature";

jest.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: any) => <div>{children}</div>,
  PopoverContent: ({ children }: any) => <div>{children}</div>,
  PopoverTrigger: ({ children }: any) => <button>{children}</button>,
}));

jest.mock("../../../validation-hooks", () => ({}));
jest.mock("../../../nature-chevrons", () => ({
  NatureChevrons: ({ boost, reduce }: any) => (
    <span data-testid="nature-chevrons">
      {boost}/{reduce}
    </span>
  ),
}));
jest.mock("../../../pickers/nature-picker", () => ({
  NaturePicker: () => <div data-testid="nature-picker" />,
}));
jest.mock("../../../validation/field-error", () => ({
  FieldErrors: ({ errors }: any) =>
    errors.length > 0 ? (
      <span data-testid="field-errors">{errors[0].message}</span>
    ) : null,
}));
jest.mock("../../../lanes/form-chip", () => ({
  FormChip: ({ label, value, trailing, children }: any) => (
    <div data-testid="form-chip">
      <span>{label}</span>
      <span>{value || "—"}</span>
      {trailing}
      {children}
    </div>
  ),
}));

const basePokemon = {
  id: "1",
  species: "Charizard",
  ability: "Blaze",
  held_item: null,
  nature: "Adamant",
  tera_type: null,
} as any;

describe("NatureCell", () => {
  const defaultProps = {
    pokemon: basePokemon,
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
    render(
      <NatureCell
        {...defaultProps}
        pokemon={{ ...basePokemon, nature: null }}
      />
    );
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("renders grid variant with NAT label and chevrons", () => {
    render(<NatureCell {...defaultProps} variant="grid" />);
    expect(screen.getByText("NAT")).toBeInTheDocument();
    expect(screen.getByText("Adamant")).toBeInTheDocument();
    expect(screen.getByTestId("nature-chevrons")).toBeInTheDocument();
  });

  it("does not render chevrons in grid when nature is null", () => {
    render(
      <NatureCell
        {...defaultProps}
        variant="grid"
        pokemon={{ ...basePokemon, nature: null }}
      />
    );
    expect(screen.queryByTestId("nature-chevrons")).not.toBeInTheDocument();
  });
});
