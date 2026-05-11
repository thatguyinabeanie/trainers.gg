/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";

import { ItemCell } from "../item";

jest.mock("@trainers/pokemon", () => ({
  getCanonicalBaseSpecies: (species: string) => species.replace("-Mega", ""),
  getFormsForSpecies: () => [],
  getMegaStoneForSpecies: () => null,
}));

jest.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: any) => <div>{children}</div>,
  PopoverContent: ({ children }: any) => <div>{children}</div>,
  PopoverTrigger: ({ children }: any) => <button>{children}</button>,
}));

jest.mock("@/components/tournament/item-sprite", () => ({
  ItemSprite: ({ item }: any) => <span data-testid="item-sprite">{item}</span>,
}));

jest.mock("../../../validation-hooks", () => ({}));
jest.mock("../../../pickers/item-picker", () => ({
  ItemPicker: () => <div data-testid="item-picker" />,
}));
jest.mock("../../../validation/field-error", () => ({
  FieldErrors: ({ errors }: any) =>
    errors.length > 0 ? <span data-testid="field-errors">{errors[0].message}</span> : null,
}));
jest.mock("../../../lanes/form-chip", () => ({
  FormChip: ({ label, value, children }: any) => (
    <div data-testid="form-chip">
      <span>{label}</span>
      <span>{value || "—"}</span>
      {children}
    </div>
  ),
}));

const basePokemon = {
  id: "1",
  species: "Charizard",
  ability: "Blaze",
  held_item: "Choice Scarf",
  nature: null,
  tera_type: null,
} as any;

describe("ItemCell", () => {
  const defaultProps = {
    pokemon: basePokemon,
    format: "gen9vgc2024" as any,
    teamItems: [],
    errors: [] as any[],
    isMegaStone: false,
    onUpdate: jest.fn(),
    variant: "row" as const,
  };

  it("renders the item name in row variant", () => {
    render(<ItemCell {...defaultProps} />);
    expect(screen.getByText("Choice Scarf")).toBeInTheDocument();
  });

  it("renders placeholder when held_item is null", () => {
    render(<ItemCell {...defaultProps} pokemon={{ ...basePokemon, held_item: null }} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("renders grid variant with ITEM label", () => {
    render(<ItemCell {...defaultProps} variant="grid" />);
    expect(screen.getByText("ITEM")).toBeInTheDocument();
    expect(screen.getByText("Choice Scarf")).toBeInTheDocument();
  });

  it("renders MEGA chip when isMegaStone is true", () => {
    render(<ItemCell {...defaultProps} variant="grid" isMegaStone={true} />);
    expect(screen.getByText("MEGA")).toBeInTheDocument();
  });
});
