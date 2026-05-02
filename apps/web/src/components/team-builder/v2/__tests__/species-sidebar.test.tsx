"use client";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

jest.mock("@trainers/pokemon", () => ({
  ALL_TYPES: ["Fire", "Water", "Grass"],
  isChampionsFormat: jest.fn(
    (f: { id?: string } | undefined) => f?.id === "championsvgc2026regma"
  ),
  getAllLegalAbilities: jest.fn(() => ["Drought", "Drizzle", "Intimidate"]),
  calculateTeamSynergy: jest.fn(() => null),
}));

jest.mock("@trainers/pokemon/sprites", () => ({
  getShowdownTypeIconUrl: jest.fn(
    (type: string) => `https://example.com/sprites/${type}.png`
  ),
}));

import { SpeciesSidebar } from "../pickers/species-sidebar";
import { DEFAULT_SPECIES_FILTERS } from "../pickers/species-filter-state";

const championsFormat = { id: "championsvgc2026regma" } as never;

function renderSidebar(overrides = {}) {
  return render(
    <SpeciesSidebar
      filters={DEFAULT_SPECIES_FILTERS}
      onFiltersChange={() => {}}
      format={undefined}
      currentTeam={[]}
      {...overrides}
    />
  );
}

describe("SpeciesSidebar", () => {
  it("renders type chips (Showdown icon buttons labelled by type)", () => {
    renderSidebar();
    expect(screen.getByRole("button", { name: "Fire" })).toBeInTheDocument();
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

  it("Mega toggle hidden for non-Champions", () => {
    renderSidebar();
    expect(screen.queryByText("Mega only")).not.toBeInTheDocument();
  });

  it("Mega toggle visible for Champions", () => {
    renderSidebar({ format: championsFormat });
    expect(screen.getByText("Mega only")).toBeInTheDocument();
  });

  it("Clear all resets filters", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    renderSidebar({
      filters: {
        ...DEFAULT_SPECIES_FILTERS,
        types: ["Fire"],
        roles: ["spread"],
      },
      onFiltersChange: onChange,
    });
    await user.click(screen.getByRole("button", { name: /clear/i }));
    expect(onChange).toHaveBeenCalledWith(DEFAULT_SPECIES_FILTERS);
  });

  it("ability datalist lists abilities from getAllLegalAbilities", () => {
    renderSidebar({ format: { id: "gen9vgc2026regg" } as never });
    expect(
      screen.getByText("Intimidate", { selector: "option" })
    ).toBeInTheDocument();
  });
});
