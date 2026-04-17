import { describe, it, expect, jest } from "@jest/globals";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

import { type GameFormat } from "@trainers/pokemon";

import { type SpeedToggleState, SpeedToggleRail } from "../speed-toggle-rail";

// =============================================================================
// Fixtures
// =============================================================================

const CHAMPIONS_FORMAT: GameFormat = {
  id: "championsvgc2026regma",
  game: "Pokemon Champions",
  gameShort: "Champions",
  generation: 10,
  category: "VGC",
  year: 2026,
  regulation: "M-A",
  label: "Champions: Reg M-A",
  showdownName: "[Gen 10] Champions VGC 2026 Reg M-A",
  doubles: true,
  active: true,
};

const CLASSIC_FORMAT: GameFormat = {
  id: "gen8vgc2022",
  game: "Sword & Shield",
  gameShort: "SwSh",
  generation: 8,
  category: "VGC",
  year: 2022,
  regulation: null,
  label: "SwSh: VGC 2022",
  showdownName: "[Gen 8] VGC 2022",
  doubles: true,
  active: false,
};

function makeState(
  overrides: Partial<SpeedToggleState> = {}
): SpeedToggleState {
  return {
    field: { tailwind: false, weather: "none" },
    stage: 0,
    item: "",
    status: "healthy",
    ...overrides,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("SpeedToggleRail — item dropdown", () => {
  it("only shows speed-affecting items legal for the format (Champions Reg M-A → just None + Choice Scarf)", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(
      <SpeedToggleRail
        state={makeState()}
        onChange={onChange}
        format={CHAMPIONS_FORMAT}
      />
    );

    await user.click(screen.getByLabelText("Held item"));
    await waitFor(() =>
      expect(screen.getAllByRole("option").length).toBeGreaterThan(0)
    );
    const options = screen.getAllByRole("option");
    const labels = options.map((o) => o.textContent?.trim());

    expect(labels).toEqual(["None", "Choice Scarf"]);
  });

  it("shows the full classic item set for older formats", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(
      <SpeedToggleRail
        state={makeState()}
        onChange={onChange}
        format={CLASSIC_FORMAT}
      />
    );

    await user.click(screen.getByLabelText("Held item"));
    await waitFor(() =>
      expect(screen.getAllByRole("option").length).toBeGreaterThan(0)
    );
    const options = screen.getAllByRole("option");
    const labels = options.map((o) => o.textContent?.trim());

    expect(labels).toContain("Choice Scarf");
    expect(labels).toContain("Iron Ball");
  });
});

describe("SpeedToggleRail — stage stepper", () => {
  it("clamps the stage value at +6 by disabling the increment button", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(
      <SpeedToggleRail
        state={makeState({ stage: 6 })}
        onChange={onChange}
        format={CHAMPIONS_FORMAT}
      />
    );

    const inc = screen.getByLabelText("Increment speed stage");
    expect(inc).toBeDisabled();
    await user.click(inc);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("clamps the stage value at -6 by disabling the decrement button", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(
      <SpeedToggleRail
        state={makeState({ stage: -6 })}
        onChange={onChange}
        format={CHAMPIONS_FORMAT}
      />
    );

    const dec = screen.getByLabelText("Decrement speed stage");
    expect(dec).toBeDisabled();
    await user.click(dec);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("decrement after a +2 starting state emits +1 via onChange", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(
      <SpeedToggleRail
        state={makeState({ stage: 2 })}
        onChange={onChange}
        format={CHAMPIONS_FORMAT}
      />
    );

    await user.click(screen.getByLabelText("Decrement speed stage"));

    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0]![0] as SpeedToggleState;
    expect(next.stage).toBe(1);
  });

  it("renders the stage value with a + prefix when positive", () => {
    const onChange = jest.fn();
    render(
      <SpeedToggleRail
        state={makeState({ stage: 3 })}
        onChange={onChange}
        format={CHAMPIONS_FORMAT}
      />
    );

    expect(screen.getByTestId("speed-stage-value")).toHaveTextContent("+3");
  });
});

describe("SpeedToggleRail — weather toggles", () => {
  it("only one weather can be active at a time", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();

    // Start with Sun active, then click Rain.
    render(
      <SpeedToggleRail
        state={makeState({
          field: { tailwind: false, weather: "sun" },
        })}
        onChange={onChange}
        format={CHAMPIONS_FORMAT}
      />
    );

    await user.click(screen.getByLabelText("Weather Rain"));

    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0]![0] as SpeedToggleState;
    // Activating rain replaces the previously-active sun.
    expect(next.field.weather).toBe("rain");
  });

  it("clicking the active weather clears it back to none", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(
      <SpeedToggleRail
        state={makeState({
          field: { tailwind: false, weather: "sun" },
        })}
        onChange={onChange}
        format={CHAMPIONS_FORMAT}
      />
    );

    await user.click(screen.getByLabelText("Weather Sun"));

    const next = onChange.mock.calls[0]![0] as SpeedToggleState;
    expect(next.field.weather).toBe("none");
  });
});

describe("SpeedToggleRail — layout", () => {
  it("renders as a horizontal flex row (flex-row class)", () => {
    const onChange = jest.fn();
    render(
      <SpeedToggleRail
        state={makeState()}
        onChange={onChange}
        format={CHAMPIONS_FORMAT}
      />
    );

    const rail = screen.getByTestId("speed-toggle-rail");
    expect(rail.className).toMatch(/flex-row/);
  });

  it("renders all four groups: Field, Stage, Item, Status", () => {
    const onChange = jest.fn();
    render(
      <SpeedToggleRail
        state={makeState()}
        onChange={onChange}
        format={CHAMPIONS_FORMAT}
      />
    );

    expect(screen.getByText("Field")).toBeInTheDocument();
    expect(screen.getByText("Stage")).toBeInTheDocument();
    expect(screen.getByText("Item")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
  });
});

describe("SpeedToggleRail — no Opp EVs toggle", () => {
  it("does not render an Opp EVs toggle (min/max are always shown as columns)", () => {
    const onChange = jest.fn();
    render(
      <SpeedToggleRail
        state={makeState()}
        onChange={onChange}
        format={CHAMPIONS_FORMAT}
      />
    );

    // Neither "Min" nor "Max" buttons should exist for Opp EVs.
    expect(
      screen.queryByLabelText("Opponent EVs minimum")
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText("Opponent EVs maximum")
    ).not.toBeInTheDocument();
  });
});

describe("SpeedToggleRail — status", () => {
  it("emits the chosen status when the dropdown changes", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(
      <SpeedToggleRail
        state={makeState()}
        onChange={onChange}
        format={CHAMPIONS_FORMAT}
      />
    );

    await user.click(screen.getByLabelText("Status condition"));
    await waitFor(() =>
      expect(
        screen.getByRole("option", { name: "Paralyzed" })
      ).toBeInTheDocument()
    );
    await user.click(screen.getByRole("option", { name: "Paralyzed" }));

    const next = onChange.mock.calls.at(-1)![0] as SpeedToggleState;
    expect(next.status).toBe("paralyzed");
  });
});
