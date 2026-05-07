"use client";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("@trainers/pokemon", () => ({
  ALL_TYPES: ["Fire", "Water", "Grass", "Electric"],
}));

import { MoveSidebar } from "../pickers/move-sidebar";
import { DEFAULT_MOVE_FILTERS } from "../pickers/move-filter-state";

function renderSidebar(
  overrides: Partial<React.ComponentProps<typeof MoveSidebar>> = {}
) {
  return render(
    <MoveSidebar
      filters={DEFAULT_MOVE_FILTERS}
      onFiltersChange={() => {}}
      {...overrides}
    />
  );
}

describe("MoveSidebar", () => {
  it("renders type chips for every ALL_TYPES entry (TypeSymbolIcon buttons)", () => {
    renderSidebar();
    expect(screen.getByRole("button", { name: "Fire" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Water" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Grass" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Electric" })
    ).toBeInTheDocument();
  });

  it("renders Physical / Special / Status category chips", () => {
    renderSidebar();
    expect(screen.getByText("Physical")).toBeInTheDocument();
    expect(screen.getByText("Special")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
  });

  it("clicking a type adds it to filters.types", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    renderSidebar({ onFiltersChange: onChange });
    await user.click(screen.getByRole("button", { name: "Fire" }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ types: ["Fire"] })
    );
  });

  it("clicking an active type toggles it off", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    renderSidebar({
      filters: { ...DEFAULT_MOVE_FILTERS, types: ["Fire"] },
      onFiltersChange: onChange,
    });
    await user.click(screen.getByRole("button", { name: "Fire" }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ types: [] })
    );
  });

  it("clicking a second type appends (multi-select OR)", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    renderSidebar({
      filters: { ...DEFAULT_MOVE_FILTERS, types: ["Fire"] },
      onFiltersChange: onChange,
    });
    await user.click(screen.getByRole("button", { name: "Water" }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ types: ["Fire", "Water"] })
    );
  });

  it("clicking a category adds it to filters.categories", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    renderSidebar({ onFiltersChange: onChange });
    await user.click(screen.getByText("Special"));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ categories: ["Special"] })
    );
  });

  it("clicking an active category toggles it off", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    renderSidebar({
      filters: { ...DEFAULT_MOVE_FILTERS, categories: ["Special"] },
      onFiltersChange: onChange,
    });
    await user.click(screen.getByText("Special"));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ categories: [] })
    );
  });

});
