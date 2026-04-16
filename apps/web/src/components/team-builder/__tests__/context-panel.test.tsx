import { describe, it, expect } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// Mock the tab components to isolate context-panel tests
jest.mock("../type-coverage-tab", () => ({
  TypeCoverageTab: () => (
    <div data-testid="type-coverage-tab">Type coverage content</div>
  ),
}));
jest.mock("../speed-tier-tab", () => ({
  SpeedTierTab: () => (
    <div data-testid="speed-tier-tab">Speed tier content</div>
  ),
}));
jest.mock("../damage-calc-tab", () => ({
  DamageCalcTab: () => (
    <div data-testid="damage-calc-tab">Damage calc content</div>
  ),
}));

import { ContextPanel } from "../context-panel";
import { type TeamWithPokemon } from "@trainers/supabase";

// =============================================================================
// Test helpers
// =============================================================================

function makeTeam(): TeamWithPokemon {
  return {
    id: 1,
    alt_id: 10,
    name: "Test Team",
    format: "gen9vgc2026regi",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-02T00:00:00Z",
    is_public: false,
    description: null,
    fork_source_id: null,
    team_pokemon: [],
  } as TeamWithPokemon;
}

function renderContextPanel(
  activeTab: "types" | "speed" | "calc" = "types",
  onTabChange = jest.fn(),
  onClose = jest.fn()
) {
  render(
    <ContextPanel
      team={makeTeam()}
      selectedPokemon={null}
      activeTab={activeTab}
      onTabChange={onTabChange}
      onClose={onClose}
    />
  );
  return { onTabChange, onClose };
}

// =============================================================================
// Tests
// =============================================================================

describe("ContextPanel", () => {
  describe("tab headers", () => {
    it("renders all three tab triggers", () => {
      renderContextPanel();
      expect(screen.getByRole("tab", { name: "Types" })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: "Speed" })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: "Calc" })).toBeInTheDocument();
    });
  });

  describe("active tab", () => {
    it("marks the Types tab as active when activeTab=types", () => {
      renderContextPanel("types");
      const typesTab = screen.getByRole("tab", { name: "Types" });
      expect(typesTab).toHaveAttribute("aria-selected", "true");
    });

    it("marks the Speed tab as active when activeTab=speed", () => {
      renderContextPanel("speed");
      const speedTab = screen.getByRole("tab", { name: "Speed" });
      expect(speedTab).toHaveAttribute("aria-selected", "true");
    });

    it("marks the Calc tab as active when activeTab=calc", () => {
      renderContextPanel("calc");
      const calcTab = screen.getByRole("tab", { name: "Calc" });
      expect(calcTab).toHaveAttribute("aria-selected", "true");
    });
  });

  describe("tab content", () => {
    it("renders TypeCoverageTab when activeTab=types", () => {
      renderContextPanel("types");
      expect(screen.getByTestId("type-coverage-tab")).toBeInTheDocument();
    });

    it("renders SpeedTierTab when activeTab=speed", () => {
      renderContextPanel("speed");
      expect(screen.getByTestId("speed-tier-tab")).toBeInTheDocument();
    });

    it("renders DamageCalcTab when activeTab=calc", () => {
      renderContextPanel("calc");
      expect(screen.getByTestId("damage-calc-tab")).toBeInTheDocument();
    });
  });

  describe("tab click", () => {
    it("calls onTabChange with 'speed' when Speed tab is clicked", async () => {
      const user = userEvent.setup();
      const onTabChange = jest.fn();
      renderContextPanel("types", onTabChange);
      await user.click(screen.getByRole("tab", { name: "Speed" }));
      expect(onTabChange).toHaveBeenCalledWith("speed");
    });

    it("calls onTabChange with 'calc' when Calc tab is clicked", async () => {
      const user = userEvent.setup();
      const onTabChange = jest.fn();
      renderContextPanel("types", onTabChange);
      await user.click(screen.getByRole("tab", { name: "Calc" }));
      expect(onTabChange).toHaveBeenCalledWith("calc");
    });
  });
});
