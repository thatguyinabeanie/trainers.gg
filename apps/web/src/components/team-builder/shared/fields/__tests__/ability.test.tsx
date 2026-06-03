/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";

import { AbilityCell } from "../ability";

// Mock dependencies
jest.mock("@trainers/pokemon", () => ({
  getAbilityShortDesc: (ability: string) => `${ability} description`,
  getCanonicalBaseSpecies: (species: string) => species.replace("-Mega", ""),
  getMegaAbilityForSpecies: () => null,
}));

jest.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: any) => <div>{children}</div>,
  PopoverContent: ({ children }: any) => (
    <div data-testid="popover-content">{children}</div>
  ),
  PopoverTrigger: ({ children }: any) => <button>{children}</button>,
}));

jest.mock("@/components/ui/tooltip", () => ({
  TooltipTrigger: ({ children }: any) => <span>{children}</span>,
}));

jest.mock("../../../validation-hooks", () => ({}));
jest.mock("../../../pickers/ability-picker", () => ({
  AbilityPicker: () => <div data-testid="ability-picker" />,
}));
jest.mock("../../../validation/field-error", () => ({
  FieldErrors: ({ errors }: any) =>
    errors.length > 0 ? (
      <span data-testid="field-errors">{errors[0].message}</span>
    ) : null,
}));
jest.mock("../../../lanes/description-tooltip", () => ({
  DescriptionTooltip: ({ children }: any) => <div>{children}</div>,
}));

const basePokemon = {
  id: "1",
  species: "Charizard",
  ability: "Blaze",
  held_item: null,
  nature: null,
  tera_type: null,
} as any;

describe("AbilityCell", () => {
  const defaultProps = {
    pokemon: basePokemon,
    format: "gen9vgc2024" as any,
    errors: [] as any[],
    onUpdate: jest.fn(),
    variant: "row" as const,
  };

  it("renders the ability name in row variant", () => {
    render(<AbilityCell {...defaultProps} />);
    expect(screen.getByText("Blaze")).toBeInTheDocument();
    expect(screen.getByText("Abil")).toBeInTheDocument();
  });

  it("renders placeholder when ability is null", () => {
    render(
      <AbilityCell
        {...defaultProps}
        pokemon={{ ...basePokemon, ability: null }}
      />
    );
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("renders grid variant with ABIL label", () => {
    render(<AbilityCell {...defaultProps} variant="grid" />);
    expect(screen.getByText("ABIL")).toBeInTheDocument();
    expect(screen.getByText("Blaze")).toBeInTheDocument();
  });

  it("shows field errors when present", () => {
    render(
      <AbilityCell
        {...defaultProps}
        errors={[{ field: "ability", message: "Required" }]}
      />
    );
    expect(screen.getByTestId("field-errors")).toBeInTheDocument();
  });
});
