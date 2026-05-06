"use client";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

jest.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({
    children,
    render: r,
  }: {
    children: React.ReactNode;
    render?: React.ReactElement;
  }) => (r ? React.cloneElement(r, {}, children) : <span>{children}</span>),
  TooltipContent: () => null,
}));

jest.mock("@trainers/pokemon", () => ({
  getAbilityShortDesc: jest.fn((n: string) =>
    n === "Drought" ? "Sets sun on entry." : null
  ),
}));

import { AbilityCell } from "../pickers/ability-cell";

describe("AbilityCell", () => {
  it("renders ability name", () => {
    render(<AbilityCell name="Drought" slot="slot1" />);
    expect(screen.getByText("Drought")).toBeInTheDocument();
  });

  it("renders em-dash for null", () => {
    render(<AbilityCell name={null} slot="slot2" />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("calls onFilter on click", async () => {
    const user = userEvent.setup();
    const onFilter = jest.fn();
    render(<AbilityCell name="Drought" slot="slot1" onFilter={onFilter} />);
    await user.click(screen.getByText("Drought"));
    expect(onFilter).toHaveBeenCalledWith("Drought");
  });

  it("hidden slot renders italic", () => {
    render(<AbilityCell name="Intimidate" slot="hidden" />);
    expect(screen.getByText("Intimidate").className).toMatch(/italic/);
  });

  it("does not call onFilter when em-dash clicked", async () => {
    const user = userEvent.setup();
    const onFilter = jest.fn();
    render(<AbilityCell name={null} slot="slot2" onFilter={onFilter} />);
    await user.click(screen.getByText("—"));
    expect(onFilter).not.toHaveBeenCalled();
  });
});
