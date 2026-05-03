"use client";

import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

import type * as TrainersPokemon from "@trainers/pokemon";
import { type GameFormat } from "@trainers/pokemon";
import { type Tables } from "@trainers/supabase";

import { StatsLane } from "../lanes/stats-lane";

// CSS modules aren't processed by ts-jest — mock them as identity proxies so
// every className lookup returns the property key (e.g. s.spreadRow → "spreadRow").
jest.mock("../builder.module.css", () => new Proxy({}, { get: (_t, k) => k }));

// =============================================================================
// Mock the pokemon package for deterministic, fast tests.
// We test the lane's rendering/interaction logic, not stat math.
// =============================================================================

jest.mock("@trainers/pokemon", () => {
  const actual =
    jest.requireActual<typeof TrainersPokemon>("@trainers/pokemon");
  return {
    ...actual,
    // Return Garchomp's base stats
    getBaseStats: jest.fn().mockReturnValue({
      hp: 108,
      attack: 130,
      defense: 95,
      specialAttack: 80,
      specialDefense: 85,
      speed: 102,
    }),
    // Simple pass-through so finalStat == base + ev (good enough for rendering)
    calculateHP: jest
      .fn()
      .mockImplementation((base: number, _iv: number, ev: number) => base + ev),
    calculateStat: jest
      .fn()
      .mockImplementation(
        (base: number, _iv: number, ev: number, _level: number, mult: number) =>
          Math.floor((base + ev) * mult)
      ),
    calculateChampionsHP: jest
      .fn()
      .mockImplementation((base: number, ev: number) => base + ev),
    calculateChampionsStat: jest
      .fn()
      .mockImplementation((base: number, ev: number, mult: number) =>
        Math.floor((base + ev) * mult)
      ),
    getNatureMultiplier: jest
      .fn()
      .mockImplementation((_nature: string, _stat: string) => 1.0),
    getStatTier: jest.fn().mockReturnValue("good"),
    // Return empty breakpoints by default; individual tests can override
    findStatBreakpoints: jest.fn().mockReturnValue([]),
    // Use real NATURE_EFFECTS and isChampionsFormat from actual package
    NATURE_EFFECTS: actual.NATURE_EFFECTS,
    NATURE_NAMES: actual.NATURE_NAMES,
    isChampionsFormat: actual.isChampionsFormat,
    STAT_KEYS: actual.STAT_KEYS,
    STAT_LABELS: actual.STAT_LABELS,
  };
});

// =============================================================================
// Helpers / fixtures
// =============================================================================

const {
  findStatBreakpoints: mockFindStatBreakpoints,
  getNatureMultiplier: mockGetNatureMultiplier,
} = jest.requireMock<typeof TrainersPokemon>("@trainers/pokemon");

/** Minimal VGC format (Gen 9) */
const VGC_FORMAT: GameFormat = {
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

/** Champions format */
const CHAMPIONS_FORMAT: GameFormat = {
  id: "championsvgc2026regma",
  game: "Pokemon Champions",
  gameShort: "Champions",
  generation: 9,
  category: "VGC",
  year: 2026,
  regulation: "M-A",
  label: "Champions: Reg M-A",
  showdownName: "[Champions] VGC 2026 Reg M-A",
  doubles: true,
  active: true,
};

/** Minimal Garchomp row (only NOT-NULL fields required by Tables<"pokemon">) */
function makeGarchomp(
  overrides: Partial<Tables<"pokemon">> = {}
): Tables<"pokemon"> {
  return {
    id: 1,
    species: "Garchomp",
    ability: "Rough Skin",
    nature: "Hardy",
    move1: "Dragon Claw",
    move2: null,
    move3: null,
    move4: null,
    ev_hp: 0,
    ev_attack: 0,
    ev_defense: 0,
    ev_special_attack: 0,
    ev_special_defense: 0,
    ev_speed: 0,
    iv_hp: 31,
    iv_attack: 31,
    iv_defense: 31,
    iv_special_attack: 31,
    iv_special_defense: 31,
    iv_speed: 31,
    level: 50,
    held_item: null,
    nickname: null,
    notes: null,
    tera_type: null,
    is_shiny: null,
    gender: null,
    format_legal: null,
    created_at: null,
    ...overrides,
  };
}

/** Render the lane with sensible defaults */
function renderLane(
  overrides: Partial<Tables<"pokemon">> = {},
  format: GameFormat | undefined = VGC_FORMAT
) {
  const onUpdate = jest.fn();
  const utils = render(
    <StatsLane
      pokemon={makeGarchomp(overrides)}
      format={format}
      onUpdate={onUpdate}
    />
  );
  return { ...utils, onUpdate };
}

// =============================================================================
// Tests
// =============================================================================

describe("StatsLane", () => {
  beforeEach(() => {
    (mockFindStatBreakpoints as jest.Mock).mockReturnValue([]);
    (mockGetNatureMultiplier as jest.Mock).mockReturnValue(1.0);
  });

  // ---------------------------------------------------------------------------
  // 1. All 6 stat labels render
  // ---------------------------------------------------------------------------
  it("renders all 6 stat labels for Garchomp", () => {
    renderLane();
    expect(screen.getByText("HP")).toBeInTheDocument();
    expect(screen.getByText("Atk")).toBeInTheDocument();
    expect(screen.getByText("Def")).toBeInTheDocument();
    expect(screen.getByText("SpA")).toBeInTheDocument();
    expect(screen.getByText("SpD")).toBeInTheDocument();
    expect(screen.getByText("Spe")).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // 2. Base stat number renders next to label
  // ---------------------------------------------------------------------------
  it("renders Garchomp HP base stat (108) in the row", () => {
    renderLane();
    // 108 is Garchomp's HP base — rendered as a plain number next to the label.
    // getAllByText because the mock also produces 108 as the final stat (base+0=108).
    expect(screen.getAllByText("108").length).toBeGreaterThanOrEqual(1);
  });

  // ---------------------------------------------------------------------------
  // 3. Slider value reflects pokemon EV
  // ---------------------------------------------------------------------------
  it("Atk slider value reflects ev_attack=100", () => {
    renderLane({ ev_attack: 100 });
    const sliders = screen.getAllByRole("slider");
    // Second slider = Atk (index 1 in STAT_KEYS order: hp, attack, ...)
    const atkSlider = sliders[1];
    expect(atkSlider).toHaveValue("100");
  });

  // ---------------------------------------------------------------------------
  // 4. Number input shows correct nature suffix combinations
  // ---------------------------------------------------------------------------
  describe("number input nature suffix display", () => {
    it.each([
      [0, false, false, ""],
      [0, true, false, "+"],
      [0, false, true, "−"],
      [100, false, false, "100"],
      [100, true, false, "100+"],
      [100, false, true, "100−"],
    ] as const)(
      "ev=%i boosted=%s reduced=%s → input value=%s",
      (ev, boosted, reduced, expected) => {
        // Use Adamant (boosts Atk, reduces SpA) so we can set nature per case
        // We override with a custom nature that the mock NATURE_EFFECTS will resolve.
        // For these cases we set ev_attack and use "Adamant" for boosted-attack,
        // "Modest" for reduced-attack cases, "Hardy" for neutral.
        let nature = "Hardy";
        if (boosted) nature = "Adamant"; // +Atk
        if (reduced) nature = "Lonely"; // −Def, but we'll check Atk neutral; use Modest for SpA, but we test Atk here
        // Simplest: use Adamant (+Atk / −SpA) and check Attack input for boosted,
        // SpA input for reduced, HP input for neutral.

        // Rebuild: pick the stat that corresponds to the nature case
        let atkEv = 0;
        let targetInputIndex = 0; // hp index

        if (boosted) {
          nature = "Adamant"; // boosts attack
          atkEv = ev;
          targetInputIndex = 1; // Atk is index 1
        } else if (reduced) {
          nature = "Modest"; // reduces attack, boosts SpA
          atkEv = ev;
          targetInputIndex = 1; // Atk is index 1 (reduced under Modest)
        } else {
          // neutral — use HP (index 0)
          targetInputIndex = 0;
        }

        render(
          <StatsLane
            pokemon={makeGarchomp({
              nature,
              ev_hp: targetInputIndex === 0 ? ev : 0,
              ev_attack: targetInputIndex === 1 ? atkEv : 0,
            })}
            format={VGC_FORMAT}
            onUpdate={jest.fn()}
          />
        );

        const inputs = screen.getAllByRole("textbox").filter((el) =>
          el
            .getAttribute("aria-label")
            ?.toLowerCase()
            .includes(targetInputIndex === 0 ? "hp" : "atk")
        );

        expect(inputs[0]).toHaveValue(expected);
      }
    );
  });

  // ---------------------------------------------------------------------------
  // 5. Red ▲ chevron on +nature stat label
  // ---------------------------------------------------------------------------
  it("renders ▲ on Atk row for Adamant nature", () => {
    renderLane({ nature: "Adamant" });
    // ▲ should appear exactly once — on the Atk label
    const upChevrons = screen.getAllByText("▲");
    expect(upChevrons).toHaveLength(1);
    // HP, Def, SpA, SpD, Spe rows should NOT have ▲
    expect(screen.queryAllByText("▽")).toHaveLength(1); // SpA gets ▽ under Adamant
  });

  // ---------------------------------------------------------------------------
  // 6. Blue ▽ chevron on −nature stat label
  // ---------------------------------------------------------------------------
  it("renders ▽ on SpA row for Adamant nature, not on other rows", () => {
    renderLane({ nature: "Adamant" }); // Adamant: +Atk / −SpA
    const downChevrons = screen.getAllByText("▽");
    expect(downChevrons).toHaveLength(1);
    // The ▽ should be near the SpA label — confirm SpA text is adjacent in DOM
    const spaLabel = screen.getByText("SpA");
    expect(spaLabel.closest("span")?.textContent).toContain("▽");
  });

  // ---------------------------------------------------------------------------
  // 7. Slider step is 1 in Champions
  // ---------------------------------------------------------------------------
  it("slider step is 1 in Champions format", () => {
    renderLane({}, CHAMPIONS_FORMAT);
    const sliders = screen.getAllByRole("slider");
    for (const slider of sliders) {
      expect(slider).toHaveAttribute("step", "1");
    }
  });

  // ---------------------------------------------------------------------------
  // 8. Slider step is 4 in VGC
  // ---------------------------------------------------------------------------
  it("slider step is 4 in VGC format", () => {
    renderLane({}, VGC_FORMAT);
    const sliders = screen.getAllByRole("slider");
    for (const slider of sliders) {
      expect(slider).toHaveAttribute("step", "4");
    }
  });

  // ---------------------------------------------------------------------------
  // 9. Slider max equals perStatMax
  // ---------------------------------------------------------------------------
  it("slider max is 32 in Champions", () => {
    renderLane({}, CHAMPIONS_FORMAT);
    const sliders = screen.getAllByRole("slider");
    for (const slider of sliders) {
      expect(slider).toHaveAttribute("max", "32");
    }
  });

  it("slider max is 252 in VGC", () => {
    renderLane({}, VGC_FORMAT);
    const sliders = screen.getAllByRole("slider");
    for (const slider of sliders) {
      expect(slider).toHaveAttribute("max", "252");
    }
  });

  // ---------------------------------------------------------------------------
  // 10. Total chip display
  // ---------------------------------------------------------------------------
  it("shows 25/66 total chip in Champions with 25 SP invested", () => {
    renderLane(
      {
        ev_hp: 5,
        ev_attack: 5,
        ev_defense: 5,
        ev_special_attack: 5,
        ev_special_defense: 5,
        ev_speed: 0,
      },
      CHAMPIONS_FORMAT
    );
    // Total chip renders as single "25/66" span
    expect(screen.getByText("25/66")).toBeInTheDocument();
  });

  it("shows 252/508 total chip in VGC with 252 EVs invested", () => {
    renderLane(
      {
        ev_hp: 252,
        ev_attack: 0,
        ev_defense: 0,
        ev_special_attack: 0,
        ev_special_defense: 0,
        ev_speed: 0,
      },
      VGC_FORMAT
    );
    // Total chip renders as single "252/508" span
    expect(screen.getByText("252/508")).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // 11. onUpdate fires when user types in input
  // ---------------------------------------------------------------------------
  it("onUpdate fires with ev_attack: 100 when typing 100 into Atk input and blurring", () => {
    const onUpdate = jest.fn();
    render(
      <StatsLane
        pokemon={makeGarchomp({ nature: "Hardy" })}
        format={VGC_FORMAT}
        onUpdate={onUpdate}
      />
    );

    const atkInput = screen.getByRole("textbox", { name: /atk investment/i });

    // Use fireEvent for controlled inputs — set value then fire blur which clamps+snaps
    fireEvent.change(atkInput, { target: { value: "100" } });
    fireEvent.blur(atkInput, { target: { value: "100" } });

    // onUpdate should have been called; find the call with ev_attack=100
    const calls = onUpdate.mock.calls.map((c) => c[0]);
    expect(calls.some((c) => c.ev_attack === 100)).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // 11b. Typing "12+" in a stat input swaps the nature to +stat
  // ---------------------------------------------------------------------------
  it("typing '12+' into SpA input sets ev_special_attack and switches nature to +SpA", () => {
    const onUpdate = jest.fn();
    render(
      <StatsLane
        pokemon={makeGarchomp({ nature: "Hardy" })}
        format={VGC_FORMAT}
        onUpdate={onUpdate}
      />
    );

    const spaInput = screen.getByRole("textbox", { name: /spa investment/i });
    fireEvent.focus(spaInput);
    fireEvent.change(spaInput, { target: { value: "12+" } });
    fireEvent.blur(spaInput, { target: { value: "12+" } });

    const calls = onUpdate.mock.calls.map((c) => c[0]);
    // EV is set (12 snaps to 12 since step=4? — 12 is already a multiple of 4)
    expect(calls.some((c) => c.ev_special_attack === 12)).toBe(true);
    // Nature changes to a +SpA nature (Modest is the default since it pairs with −Atk)
    expect(calls.some((c) => c.nature === "Modest")).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // 11c. Typing "12-" in a stat input swaps the nature to -stat
  // ---------------------------------------------------------------------------
  it("typing '12-' into Atk input sets ev_attack and switches nature to −Atk", () => {
    const onUpdate = jest.fn();
    render(
      <StatsLane
        pokemon={makeGarchomp({ nature: "Hardy" })}
        format={VGC_FORMAT}
        onUpdate={onUpdate}
      />
    );

    const atkInput = screen.getByRole("textbox", { name: /atk investment/i });
    fireEvent.focus(atkInput);
    fireEvent.change(atkInput, { target: { value: "12-" } });
    fireEvent.blur(atkInput, { target: { value: "12-" } });

    const calls = onUpdate.mock.calls.map((c) => c[0]);
    expect(calls.some((c) => c.ev_attack === 12)).toBe(true);
    // Nature changes to a −Atk nature (Modest is the default boost partner here too)
    expect(calls.some((c) => c.nature === "Modest")).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // 11d. Typing "+" alone (no number) into a stat input adds +nature with ev=0
  // ---------------------------------------------------------------------------
  it("typing '+' into Spe input switches nature to +Spe with ev=0", () => {
    const onUpdate = jest.fn();
    render(
      <StatsLane
        pokemon={makeGarchomp({ nature: "Hardy" })}
        format={VGC_FORMAT}
        onUpdate={onUpdate}
      />
    );

    const speInput = screen.getByRole("textbox", { name: /spe investment/i });
    fireEvent.focus(speInput);
    fireEvent.change(speInput, { target: { value: "+" } });
    fireEvent.blur(speInput, { target: { value: "+" } });

    const calls = onUpdate.mock.calls.map((c) => c[0]);
    expect(calls.some((c) => c.ev_speed === 0)).toBe(true);
    // Default −stat for +Spe is specialAttack → Jolly
    expect(calls.some((c) => c.nature === "Jolly")).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // 11d-no-flip. Adding "+" to the currently-reduced stat does NOT flip the
  //              previous boost stat to −; it picks a fresh − partner instead.
  // ---------------------------------------------------------------------------
  it("typing '+' on the currently-reduced stat doesn't flip the previous boost", () => {
    // Modest = +SpA / −Atk. User adds "+" to Atk (the currently-reduced stat).
    // Old buggy behavior: flipped to Adamant (+Atk / −SpA), turning SpA into −.
    // New correct behavior: SpA loses its +, Atk gains +, picks a fresh −
    // partner that isn't SpA. Default for +Atk is SpA but that's avoided →
    // falls back to defense → Lonely (+Atk / −Def).
    const onUpdate = jest.fn();
    render(
      <StatsLane
        pokemon={makeGarchomp({ nature: "Modest" })}
        format={VGC_FORMAT}
        onUpdate={onUpdate}
      />
    );

    const atkInput = screen.getByRole("textbox", { name: /atk investment/i });
    fireEvent.focus(atkInput);
    fireEvent.change(atkInput, { target: { value: "16+" } });
    fireEvent.blur(atkInput, { target: { value: "16+" } });

    const calls = onUpdate.mock.calls.map((c) => c[0]);
    // Nature is some +Atk nature whose −stat is NOT specialAttack
    const natureCall = calls.find(
      (c) => typeof c.nature === "string"
    ) as { nature?: string } | undefined;
    expect(natureCall?.nature).toBeDefined();
    expect(natureCall?.nature).not.toBe("Adamant"); // Adamant = +Atk / −SpA — would be a flip
  });

  // ---------------------------------------------------------------------------
  // 11e. Clearing the suffix on a +nature stat reverts to neutral
  // ---------------------------------------------------------------------------
  it("clearing the '+' on the +nature stat reverts the nature to Serious", () => {
    const onUpdate = jest.fn();
    render(
      <StatsLane
        pokemon={makeGarchomp({ nature: "Adamant", ev_attack: 252 })}
        format={VGC_FORMAT}
        onUpdate={onUpdate}
      />
    );

    const atkInput = screen.getByRole("textbox", { name: /atk investment/i });
    fireEvent.focus(atkInput);
    // User clears the "+" suffix, leaving just the number
    fireEvent.change(atkInput, { target: { value: "252" } });
    fireEvent.blur(atkInput, { target: { value: "252" } });

    const calls = onUpdate.mock.calls.map((c) => c[0]);
    expect(calls.some((c) => c.nature === "Serious")).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // 12. Breakpoint tick wrapper renders for +nature stat only
  // ---------------------------------------------------------------------------
  it("bump container renders for +nature (Atk) but not for other stats (Adamant)", () => {
    // Return some breakpoints for the +nature stat
    (mockFindStatBreakpoints as jest.Mock).mockReturnValue([4, 8, 12]);

    renderLane({ nature: "Adamant" }); // Adamant: +Atk / −SpA

    // Only the Atk bumps container should be present
    expect(screen.getByTestId("bumps-attack")).toBeInTheDocument();

    // Other stat bump containers must NOT exist
    for (const stat of [
      "hp",
      "defense",
      "specialAttack",
      "specialDefense",
      "speed",
    ]) {
      expect(screen.queryByTestId(`bumps-${stat}`)).not.toBeInTheDocument();
    }
  });

  // ---------------------------------------------------------------------------
  // 13. Bump tick is a button — clicking it sets the EV to that bump value
  // ---------------------------------------------------------------------------
  it("clicking a breakpoint tick commits the bump's EV value via onUpdate", () => {
    (mockFindStatBreakpoints as jest.Mock).mockReturnValue([4, 8, 12]);
    const { onUpdate } = renderLane({ nature: "Adamant", ev_attack: 0 });

    const bumps = screen.getByTestId("bumps-attack");
    const ticks = bumps.querySelectorAll("button");
    expect(ticks).toHaveLength(3);

    // Click the middle bump (8 EVs)
    fireEvent.click(ticks[1]!);

    // Click commits immediately (no debounce) since it's a discrete action
    expect(onUpdate).toHaveBeenCalledWith({ ev_attack: 8 });
  });

  // ---------------------------------------------------------------------------
  // 14. Slider thumb gets data-at-bump when displayEv lands on a breakpoint
  // ---------------------------------------------------------------------------
  it("slider has data-at-bump attribute when current EV equals a breakpoint", () => {
    (mockFindStatBreakpoints as jest.Mock).mockReturnValue([4, 8, 12]);
    renderLane({ nature: "Adamant", ev_attack: 8 });

    const slider = screen.getByLabelText("Atk slider");
    expect(slider).toHaveAttribute("data-at-bump");
  });

  it("slider does NOT have data-at-bump attribute when current EV is between breakpoints", () => {
    (mockFindStatBreakpoints as jest.Mock).mockReturnValue([4, 8, 12]);
    renderLane({ nature: "Adamant", ev_attack: 6 });

    const slider = screen.getByLabelText("Atk slider");
    expect(slider).not.toHaveAttribute("data-at-bump");
  });
});

// =============================================================================
// Ghost mode (pokemon: null)
// =============================================================================

describe("ghost mode (pokemon: null)", () => {
  // ---------------------------------------------------------------------------
  // 1. Renders without crashing
  // ---------------------------------------------------------------------------
  it("renders without crashing when pokemon={null}", () => {
    expect(() => {
      render(<StatsLane pokemon={null} />);
    }).not.toThrow();
  });

  // ---------------------------------------------------------------------------
  // 2. Root container has correct style and className
  // ---------------------------------------------------------------------------
  it("root container has the fluid + container-query width classes and expected className", () => {
    const { container } = render(<StatsLane pokemon={null} />);
    const root = container.firstElementChild as HTMLElement;
    expect(root).toBeTruthy();
    // Width is now driven by Tailwind: w-full at narrow widths,
    // @[1460px]:w-[400px] at compact widths via container queries.
    expect(root.className).toContain("@[1460px]:w-[400px]");
    expect(root.className).toContain("border-dashed");
    expect(root.className).toContain("flex-col");
  });

  // ---------------------------------------------------------------------------
  // 3. Renders 6 stat rows with stat labels
  // ---------------------------------------------------------------------------
  it("renders 6 stat rows, each with its label (HP, ATK, DEF, SPA, SPD, SPE)", () => {
    render(<StatsLane pokemon={null} />);
    for (const label of ["HP", "ATK", "DEF", "SPA", "SPD", "SPE"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  // ---------------------------------------------------------------------------
  // 4. Column headers render (Base, EVs)
  // ---------------------------------------------------------------------------
  it("renders column headers Base and EVs", () => {
    render(<StatsLane pokemon={null} />);
    expect(screen.getByText("Base")).toBeInTheDocument();
    expect(screen.getByText("EVs")).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // 5. No interactive elements (no spinbuttons, no sliders, no textboxes)
  // ---------------------------------------------------------------------------
  it("renders no interactive inputs or sliders in ghost mode", () => {
    render(<StatsLane pokemon={null} />);
    expect(screen.queryAllByRole("spinbutton")).toHaveLength(0);
    expect(screen.queryAllByRole("slider")).toHaveLength(0);
    expect(screen.queryAllByRole("textbox")).toHaveLength(0);
  });
});
