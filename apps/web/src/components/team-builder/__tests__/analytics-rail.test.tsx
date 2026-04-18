import { describe, it, expect, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// =============================================================================
// Module-level mocks — stub TypeChartPanel, SpeedPanel, and CalcPanel so we
// test rail behavior in isolation, without dragging in their pokemon-data
// machinery. Each stub exposes the props it received via data-* attributes
// so we can assert on what the rail actually passed through.
// =============================================================================

jest.mock("../type-chart-panel", () => ({
  TypeChartPanel: jest.fn(
    ({ team, className }: { team: { id: number }[]; className?: string }) => (
      <div
        data-testid="mock-type-chart-panel"
        data-team-size={team.length}
        data-classname={className ?? ""}
      >
        type-chart-panel
      </div>
    )
  ),
}));

jest.mock("../speed-panel", () => ({
  SpeedPanel: jest.fn(
    ({
      selectedPokemon,
      team,
      format,
      className,
    }: {
      selectedPokemon: { id: number; species: string };
      team: { id: number }[];
      format: { id: string };
      className?: string;
    }) => (
      <div
        data-testid="mock-speed-panel"
        data-selected-id={selectedPokemon.id}
        data-team-size={team.length}
        data-format-id={format.id}
        data-classname={className ?? ""}
      >
        speed-panel
      </div>
    )
  ),
}));

jest.mock("../calc-panel", () => ({
  CalcPanel: jest.fn(
    ({
      team,
      selectedPokemon,
      format,
      className,
    }: {
      team: { id: number };
      selectedPokemon: { id: number; species: string } | null;
      format: { id: string } | undefined;
      className?: string;
    }) => (
      <div
        data-testid="mock-calc-panel"
        data-team-id={team.id}
        data-selected-id={selectedPokemon ? selectedPokemon.id : "none"}
        data-format-id={format ? format.id : "none"}
        data-classname={className ?? ""}
      >
        calc-panel
      </div>
    )
  ),
}));

import { AnalyticsRail } from "../analytics-rail";
import { type TeamWithPokemon, type Tables } from "@trainers/supabase";

// =============================================================================
// Factories
// =============================================================================

function makePokemon(
  overrides: Partial<Tables<"pokemon">> = {}
): Tables<"pokemon"> {
  return {
    id: 1,
    species: "Charizard",
    is_shiny: false,
    ability: "Blaze",
    nature: "Timid",
    held_item: null,
    nickname: null,
    gender: null,
    level: 50,
    move1: "Flamethrower",
    move2: "Air Slash",
    move3: null,
    move4: null,
    tera_type: "Fire",
    ev_hp: 4,
    ev_attack: 0,
    ev_defense: 0,
    ev_special_attack: 252,
    ev_special_defense: 0,
    ev_speed: 252,
    iv_hp: 31,
    iv_attack: 31,
    iv_defense: 31,
    iv_special_attack: 31,
    iv_special_defense: 31,
    iv_speed: 31,
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeTeam(pokemon: Tables<"pokemon">[] = []): TeamWithPokemon {
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
    team_pokemon: pokemon.map((p, i) => ({
      id: i + 1,
      pokemon_id: p.id,
      team_position: i,
      pokemon: p,
    })),
  } as TeamWithPokemon;
}

const defaultFormat = {
  id: "gen9vgc2026regi",
  game: "Scarlet & Violet",
  gameShort: "SV",
  generation: 9,
  category: "VGC",
  year: 2026,
  regulation: "I",
  label: "SV: Reg I",
  showdownName: "[Gen 9] VGC 2026 Reg I",
  doubles: true,
  active: true,
};

// =============================================================================
// Tests
// =============================================================================

describe("AnalyticsRail", () => {
  it("renders all three tab labels (Types | Speed | Calc)", () => {
    const charizard = makePokemon();
    render(
      <AnalyticsRail
        team={makeTeam([charizard])}
        selectedPokemon={charizard}
        format={defaultFormat}
      />
    );

    expect(screen.getByRole("tab", { name: "Types" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Speed" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Calc" })).toBeInTheDocument();
  });

  it("defaults to the Types tab — TypeChartPanel mounts, others do not", () => {
    const charizard = makePokemon();
    render(
      <AnalyticsRail
        team={makeTeam([charizard])}
        selectedPokemon={charizard}
        format={defaultFormat}
      />
    );

    expect(screen.getByTestId("mock-type-chart-panel")).toBeInTheDocument();
    expect(screen.queryByTestId("mock-speed-panel")).not.toBeInTheDocument();
    expect(screen.queryByTestId("mock-calc-panel")).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Types" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
  });

  it("TypeChartPanel receives the team's filled pokemon list", () => {
    const charizard = makePokemon({ id: 1, species: "Charizard" });
    const blastoise = makePokemon({ id: 2, species: "Blastoise" });
    render(
      <AnalyticsRail
        team={makeTeam([charizard, blastoise])}
        selectedPokemon={charizard}
        format={defaultFormat}
      />
    );

    const typePanel = screen.getByTestId("mock-type-chart-panel");
    expect(typePanel.getAttribute("data-team-size")).toBe("2");
  });

  it("clicking Speed unmounts TypeChartPanel and mounts SpeedPanel", async () => {
    const user = userEvent.setup();
    const charizard = makePokemon();
    render(
      <AnalyticsRail
        team={makeTeam([charizard])}
        selectedPokemon={charizard}
        format={defaultFormat}
      />
    );

    await user.click(screen.getByRole("tab", { name: "Speed" }));

    expect(
      screen.queryByTestId("mock-type-chart-panel")
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("mock-speed-panel")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Speed" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
  });

  it("clicking Calc mounts CalcPanel, unmounts the rest", async () => {
    const user = userEvent.setup();
    const charizard = makePokemon();
    render(
      <AnalyticsRail
        team={makeTeam([charizard])}
        selectedPokemon={charizard}
        format={defaultFormat}
      />
    );

    await user.click(screen.getByRole("tab", { name: "Calc" }));

    expect(
      screen.queryByTestId("mock-type-chart-panel")
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId("mock-speed-panel")).not.toBeInTheDocument();
    expect(screen.getByTestId("mock-calc-panel")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Calc" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
  });

  it("clicking Types after Speed remounts TypeChartPanel and unmounts SpeedPanel", async () => {
    const user = userEvent.setup();
    const charizard = makePokemon();
    render(
      <AnalyticsRail
        team={makeTeam([charizard])}
        selectedPokemon={charizard}
        format={defaultFormat}
      />
    );

    await user.click(screen.getByRole("tab", { name: "Speed" }));
    await user.click(screen.getByRole("tab", { name: "Types" }));

    expect(screen.getByTestId("mock-type-chart-panel")).toBeInTheDocument();
    expect(screen.queryByTestId("mock-speed-panel")).not.toBeInTheDocument();
  });

  it("tab state persists across selectedPokemon changes", async () => {
    const user = userEvent.setup();
    const monA = makePokemon({ id: 1, species: "Charizard" });
    const monB = makePokemon({ id: 2, species: "Blastoise" });

    const { rerender } = render(
      <AnalyticsRail
        team={makeTeam([monA, monB])}
        selectedPokemon={monA}
        format={defaultFormat}
      />
    );

    await user.click(screen.getByRole("tab", { name: "Calc" }));
    expect(screen.getByTestId("mock-calc-panel")).toBeInTheDocument();

    // Swap the selected Pokemon — Calc tab should remain active
    rerender(
      <AnalyticsRail
        team={makeTeam([monA, monB])}
        selectedPokemon={monB}
        format={defaultFormat}
      />
    );

    expect(screen.getByRole("tab", { name: "Calc" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(screen.getByTestId("mock-calc-panel")).toBeInTheDocument();
    expect(screen.queryByTestId("mock-speed-panel")).not.toBeInTheDocument();

    // Calc panel received the new selected pokemon's id
    expect(screen.getByTestId("mock-calc-panel")).toHaveAttribute(
      "data-selected-id",
      "2"
    );
  });

  it("container uses the fixed 460px width class", () => {
    const charizard = makePokemon();
    render(
      <AnalyticsRail
        team={makeTeam([charizard])}
        selectedPokemon={charizard}
        format={defaultFormat}
      />
    );

    const rail = screen.getByTestId("analytics-rail");
    expect(rail.className).toContain("w-rail");
    expect(rail.className).toContain("flex-shrink-0");
  });

  it("passes neutralizing chrome class to TypeChartPanel, SpeedPanel, and CalcPanel", async () => {
    const user = userEvent.setup();
    const charizard = makePokemon();
    render(
      <AnalyticsRail
        team={makeTeam([charizard])}
        selectedPokemon={charizard}
        format={defaultFormat}
      />
    );

    // Types tab is active by default
    const types = screen.getByTestId("mock-type-chart-panel");
    expect(types.getAttribute("data-classname")).toContain("bg-transparent");
    expect(types.getAttribute("data-classname")).toContain("shadow-none");
    expect(types.getAttribute("data-classname")).toContain("rounded-none");

    await user.click(screen.getByRole("tab", { name: "Speed" }));

    const speed = screen.getByTestId("mock-speed-panel");
    expect(speed.getAttribute("data-classname")).toContain("bg-transparent");
    expect(speed.getAttribute("data-classname")).toContain("shadow-none");
    expect(speed.getAttribute("data-classname")).toContain("rounded-none");

    await user.click(screen.getByRole("tab", { name: "Calc" }));

    const calc = screen.getByTestId("mock-calc-panel");
    expect(calc.getAttribute("data-classname")).toContain("bg-transparent");
    expect(calc.getAttribute("data-classname")).toContain("shadow-none");
    expect(calc.getAttribute("data-classname")).toContain("rounded-none");
  });

  it("renders empty speed state when no Pokemon is selected (on Speed tab)", async () => {
    const user = userEvent.setup();
    render(
      <AnalyticsRail
        team={makeTeam()}
        selectedPokemon={null}
        format={defaultFormat}
      />
    );

    await user.click(screen.getByRole("tab", { name: "Speed" }));

    expect(screen.queryByTestId("mock-speed-panel")).not.toBeInTheDocument();
    expect(
      screen.getByTestId("analytics-rail-speed-empty")
    ).toBeInTheDocument();
  });

  it("renders empty speed state when format is undefined (on Speed tab)", async () => {
    const user = userEvent.setup();
    const charizard = makePokemon();
    render(
      <AnalyticsRail
        team={makeTeam([charizard])}
        selectedPokemon={charizard}
        format={undefined}
      />
    );

    await user.click(screen.getByRole("tab", { name: "Speed" }));

    expect(screen.queryByTestId("mock-speed-panel")).not.toBeInTheDocument();
    expect(
      screen.getByTestId("analytics-rail-speed-empty")
    ).toBeInTheDocument();
  });

  it("CalcPanel always mounts on Calc tab even with no selected Pokemon (it has its own empty state)", async () => {
    const user = userEvent.setup();
    render(
      <AnalyticsRail
        team={makeTeam()}
        selectedPokemon={null}
        format={defaultFormat}
      />
    );

    await user.click(screen.getByRole("tab", { name: "Calc" }));

    const calc = screen.getByTestId("mock-calc-panel");
    expect(calc).toBeInTheDocument();
    expect(calc).toHaveAttribute("data-selected-id", "none");
  });
});
