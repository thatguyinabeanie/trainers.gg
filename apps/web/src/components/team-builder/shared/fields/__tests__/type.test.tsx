/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";

import { TypeCell } from "../type";

jest.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: any) => <div>{children}</div>,
  PopoverContent: ({ children }: any) => <div>{children}</div>,
  PopoverTrigger: ({ children }: any) => <button>{children}</button>,
}));

jest.mock("@/components/team-builder/tera-type-icon", () => ({
  HEXAGON_CLIP: "polygon(50% 0%)",
  TeraTypeIcon: ({ type }: any) => <span data-testid="tera-icon">{type}</span>,
}));
jest.mock("@/components/team-builder/type-pill", () => ({
  TypePill: ({ t }: any) => <span data-testid="type-pill">{t}</span>,
}));
jest.mock("@/components/team-builder/format-gating", () => ({
  formatSupportsTera: (format: string | undefined) =>
    format?.includes("gen9") ?? false,
}));
jest.mock("@/components/team-builder/pickers/type-picker", () => ({
  TypePicker: () => <div data-testid="type-picker" />,
}));

describe("TypeCell", () => {
  it("renders type pills for each type in row variant", () => {
    render(<TypeCell types={["Fire", "Flying"] as any} variant="row" />);
    const pills = screen.getAllByTestId("type-pill");
    expect(pills).toHaveLength(2);
    expect(pills[0]).toHaveTextContent("Fire");
    expect(pills[1]).toHaveTextContent("Flying");
  });

  it("renders placeholder when types array is empty", () => {
    render(<TypeCell types={[]} variant="row" />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("renders grid variant with TYPE label", () => {
    render(<TypeCell types={["Water"] as any} variant="grid" />);
    expect(screen.getByText("TYPE")).toBeInTheDocument();
    expect(screen.getByTestId("type-pill")).toHaveTextContent("Water");
  });

  it("does not render tera icon when format does not support tera", () => {
    const pokemon = { tera_type: "Grass" } as any;
    render(
      <TypeCell
        types={["Grass"] as any}
        variant="row"
        pokemon={pokemon}
        format={"gen7vgc2018" as any}
        onUpdate={jest.fn()}
      />
    );
    expect(screen.queryByTestId("tera-icon")).not.toBeInTheDocument();
  });
});
