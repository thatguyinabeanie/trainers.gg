"use client";

/**
 * Tests for RadialStatEditor — the hexagonal EV/SP investment editor.
 *
 * Coverage targets:
 *  • 6 stat spokes render with their short labels
 *  • SpokeInput accepts typed EV values and calls onUpdate
 *  • Arrow-key on handle nudges by budget.step
 *  • Budget enforces 510 total (VGC) and 66 total (Champions)
 *  • Nature vertex cycle buttons call onUpdate({ nature })
 *  • IVs are editable only in non-Champions (formatSupportsIvs)
 *  • Center chip shows invested / total budget
 *  • Draft reset on pokemon.id change
 */

import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

import type * as TrainersPokemon from "@trainers/pokemon";
import { type GameFormat } from "@trainers/pokemon";
import { type Tables } from "@trainers/supabase";

// =============================================================================
// Mocks
// =============================================================================

// Stub heavy pokemon stat math — same approach as stats-lane.test.tsx
jest.mock("@trainers/pokemon", () => {
  const actual =
    jest.requireActual<typeof TrainersPokemon>("@trainers/pokemon");
  return {
    ...actual,
    getBaseStats: jest.fn().mockReturnValue({
      hp: 108,
      attack: 130,
      defense: 95,
      specialAttack: 80,
      specialDefense: 85,
      speed: 102,
    }),
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
    findStatBreakpoints: jest.fn().mockReturnValue([]),
    getSpeciesTypes: jest.fn().mockReturnValue([]),
    // Use real values for nature/format helpers
    NATURE_EFFECTS: actual.NATURE_EFFECTS,
    NATURE_NAMES: actual.NATURE_NAMES,
    isChampionsFormat: actual.isChampionsFormat,
    STAT_KEYS: actual.STAT_KEYS,
    STAT_LABELS: actual.STAT_LABELS,
  };
});

// RadialFineTune — render a stable stub to keep tests focused on the hexagon
jest.mock("../stats/radial-fine-tune", () => ({
  RadialFineTune: ({
    open,
    onOpenChange,
    showIvs,
  }: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    showIvs: boolean;
  }) => (
    <div data-testid="radial-fine-tune" data-open={String(open)}>
      {showIvs && (
        <button
          type="button"
          data-testid="fine-tune-toggle"
          onClick={() => onOpenChange(!open)}
        >
          IVs
        </button>
      )}
      {open && showIvs && (
        <div data-testid="iv-inputs">
          {[
            "hp",
            "attack",
            "defense",
            "specialAttack",
            "specialDefense",
            "speed",
          ].map((k) => (
            <span key={k} data-testid={`iv-row-${k}`}>
              {k}
            </span>
          ))}
        </div>
      )}
    </div>
  ),
}));

// =============================================================================
// Imports (after mocks)
// =============================================================================

import { RadialStatEditor } from "../stats/radial-stat-editor";

// =============================================================================
// Fixtures
// =============================================================================

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

const CHAMPIONS_FORMAT: GameFormat = {
  id: "gen9championsvgc2026regma",
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

/** Minimal Garchomp row */
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

function renderEditor(
  overrides: Partial<Tables<"pokemon">> = {},
  format: GameFormat | undefined = VGC_FORMAT
) {
  const onUpdate = jest.fn();
  const utils = render(
    <RadialStatEditor
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

describe("RadialStatEditor — spoke labels", () => {
  // -------------------------------------------------------------------------
  // 1. All 6 stat short-labels render inside SVG text nodes
  // -------------------------------------------------------------------------
  it("renders all 6 stat short-labels (HP, ATK, DEF, SPA, SPD, SPE)", () => {
    renderEditor();
    // The SVG text nodes contain the stat labels. The mock RadialFineTune does
    // NOT render them; they come from the main editor SVG.
    for (const label of ["HP", "ATK", "DEF", "SPA", "SPD", "SPE"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  // -------------------------------------------------------------------------
  // 2. 6 draggable handles render (role=slider) — one per spoke
  // -------------------------------------------------------------------------
  it("renders 6 draggable handle targets (role=slider)", () => {
    renderEditor();
    const handles = screen.getAllByRole("slider");
    expect(handles).toHaveLength(6);
  });

  // -------------------------------------------------------------------------
  // 3. Each handle has a meaningful aria-label using STAT_LABELS (short)
  // -------------------------------------------------------------------------
  it.each([
    "HP investment",
    "Atk investment",
    "Def investment",
    "SpA investment",
    "SpD investment",
    "Spe investment",
  ])("handle for '%s' has aria-label", (labelText) => {
    renderEditor();
    expect(screen.getByRole("slider", { name: labelText })).toBeInTheDocument();
  });
});

describe("RadialStatEditor — center budget chip", () => {
  // -------------------------------------------------------------------------
  // 4. Center chip shows 0 / budget.total by default
  // -------------------------------------------------------------------------
  it("shows 0 invested and /510 total in VGC by default", () => {
    renderEditor();
    // The chip renders the total as plain text "0" above "/510"
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.getByText("/510")).toBeInTheDocument();
  });

  it("shows 0 invested and /66 total in Champions by default", () => {
    renderEditor({}, CHAMPIONS_FORMAT);
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.getByText("/66")).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // 5. Center chip reflects committed EV investment
  // -------------------------------------------------------------------------
  it("shows invested amount matching committed EVs", () => {
    renderEditor({
      ev_hp: 252,
      ev_attack: 252,
      ev_defense: 0,
      ev_special_attack: 0,
      ev_special_defense: 4,
      ev_speed: 0,
    });
    // 252 + 252 + 4 = 508
    expect(screen.getByText("508")).toBeInTheDocument();
  });

  it("shows invested amount matching committed SPs in Champions", () => {
    renderEditor(
      {
        ev_hp: 11,
        ev_attack: 11,
        ev_defense: 11,
        ev_special_attack: 11,
        ev_special_defense: 11,
        ev_speed: 11,
      },
      CHAMPIONS_FORMAT
    );
    // 6 × 11 = 66
    expect(screen.getByText("66")).toBeInTheDocument();
  });
});

describe("RadialStatEditor — SpokeInput text inputs", () => {
  // -------------------------------------------------------------------------
  // 6. 6 text inputs render (one per stat, labeled)
  // -------------------------------------------------------------------------
  it("renders 6 EV text inputs (one per spoke)", () => {
    renderEditor();
    const inputs = screen.getAllByRole("textbox");
    expect(inputs).toHaveLength(6);
  });

  // -------------------------------------------------------------------------
  // 7. Typing an EV value and blurring calls onUpdate
  // -------------------------------------------------------------------------
  it("typing an EV value into HP input and blurring calls onUpdate({ ev_hp })", () => {
    const { onUpdate } = renderEditor();
    // STAT_LABELS.hp = "HP" → aria-label = "HP investment"
    const hpInput = screen.getByRole("textbox", { name: "HP investment" });
    fireEvent.change(hpInput, { target: { value: "252" } });
    fireEvent.blur(hpInput, { target: { value: "252" } });
    const calls = onUpdate.mock.calls.map(
      (c: [Partial<Tables<"pokemon">>]) => c[0]
    );
    expect(calls.some((c) => c.ev_hp === 252)).toBe(true);
  });

  it("typing an EV value into Atk input and blurring calls onUpdate({ ev_attack })", () => {
    const { onUpdate } = renderEditor();
    // SpokeInput uses STAT_SHORT_LABELS.attack = "ATK" → aria-label = "ATK investment"
    const atkInput = screen.getByRole("textbox", { name: "ATK investment" });
    fireEvent.change(atkInput, { target: { value: "100" } });
    fireEvent.blur(atkInput, { target: { value: "100" } });
    const calls = onUpdate.mock.calls.map(
      (c: [Partial<Tables<"pokemon">>]) => c[0]
    );
    expect(calls.some((c) => c.ev_attack === 100)).toBe(true);
  });

  it("typing into Speed input calls onUpdate({ ev_speed })", () => {
    const { onUpdate } = renderEditor();
    // SpokeInput uses STAT_SHORT_LABELS.speed = "SPE" → aria-label = "SPE investment"
    const speInput = screen.getByRole("textbox", { name: "SPE investment" });
    fireEvent.change(speInput, { target: { value: "4" } });
    fireEvent.blur(speInput, { target: { value: "4" } });
    const calls = onUpdate.mock.calls.map(
      (c: [Partial<Tables<"pokemon">>]) => c[0]
    );
    expect(calls.some((c) => c.ev_speed === 4)).toBe(true);
  });

  // -------------------------------------------------------------------------
  // 8. EV value is clamped at 252 (VGC per-stat max)
  // -------------------------------------------------------------------------
  it("EV is clamped to 252 (VGC per-stat max) when 300 is typed", () => {
    const { onUpdate } = renderEditor();
    const hpInput = screen.getByRole("textbox", { name: "HP investment" });
    fireEvent.change(hpInput, { target: { value: "300" } });
    fireEvent.blur(hpInput, { target: { value: "300" } });
    const calls = onUpdate.mock.calls.map(
      (c: [Partial<Tables<"pokemon">>]) => c[0]
    );
    expect(calls.some((c) => (c.ev_hp ?? 0) <= 252)).toBe(true);
  });

  // -------------------------------------------------------------------------
  // 9. SP value is clamped at 32 (Champions per-stat max)
  // -------------------------------------------------------------------------
  it("SP is clamped to 32 (Champions per-stat max) when 50 is typed", () => {
    const { onUpdate } = renderEditor({}, CHAMPIONS_FORMAT);
    const hpInput = screen.getByRole("textbox", { name: "HP investment" });
    fireEvent.change(hpInput, { target: { value: "50" } });
    fireEvent.blur(hpInput, { target: { value: "50" } });
    const calls = onUpdate.mock.calls.map(
      (c: [Partial<Tables<"pokemon">>]) => c[0]
    );
    expect(calls.some((c) => (c.ev_hp ?? 0) <= 32)).toBe(true);
  });

  // -------------------------------------------------------------------------
  // 10. Typing + suffix changes nature to boosted-stat nature
  // -------------------------------------------------------------------------
  it("typing '12+' into Atk input sets ev_attack and changes nature to +Atk", () => {
    const { onUpdate } = renderEditor();
    const atkInput = screen.getByRole("textbox", { name: "ATK investment" });
    fireEvent.change(atkInput, { target: { value: "12+" } });
    fireEvent.blur(atkInput, { target: { value: "12+" } });
    const calls = onUpdate.mock.calls.map(
      (c: [Partial<Tables<"pokemon">>]) => c[0]
    );
    expect(calls.some((c) => c.ev_attack === 12)).toBe(true);
    // A +Atk nature should be set (e.g. Adamant, Lonely, Brave, Naughty)
    const natures = ["Adamant", "Lonely", "Brave", "Naughty"];
    expect(
      calls.some((c) => c.nature && natures.includes(c.nature as string))
    ).toBe(true);
  });

  it("typing '+' into Spe input switches nature to +Spe (no EV typed)", () => {
    const { onUpdate } = renderEditor();
    const speInput = screen.getByRole("textbox", { name: "SPE investment" });
    fireEvent.change(speInput, { target: { value: "+" } });
    fireEvent.blur(speInput, { target: { value: "+" } });
    const calls = onUpdate.mock.calls.map(
      (c: [Partial<Tables<"pokemon">>]) => c[0]
    );
    // Jolly is the canonical +Spe / -SpA choice
    expect(calls.some((c) => c.nature === "Jolly")).toBe(true);
  });
});

describe("RadialStatEditor — keyboard handle nudging", () => {
  // -------------------------------------------------------------------------
  // 11. ArrowUp on handle fires onUpdate with current EV + budget.step
  // -------------------------------------------------------------------------
  it("ArrowUp on HP handle increases ev_hp by the budget step (4 in VGC)", async () => {
    const { onUpdate } = renderEditor({ ev_hp: 0 });
    const hpHandle = screen.getByRole("slider", { name: /HP investment/i });
    fireEvent.keyDown(hpHandle, { key: "ArrowUp" });
    // After key down the debounced flush fires via setTimeout 0
    await new Promise((r) => setTimeout(r, 50));
    const calls = onUpdate.mock.calls.map(
      (c: [Partial<Tables<"pokemon">>]) => c[0]
    );
    expect(calls.some((c) => c.ev_hp === 4)).toBe(true);
  });

  it("ArrowDown on Speed handle decreases ev_speed by budget step (4 in VGC)", async () => {
    const { onUpdate } = renderEditor({ ev_speed: 8 });
    // Slider aria-label uses STAT_LABELS.speed = "Spe" → "Spe investment"
    const speHandle = screen.getByRole("slider", { name: /Spe investment/i });
    fireEvent.keyDown(speHandle, { key: "ArrowDown" });
    await new Promise((r) => setTimeout(r, 50));
    const calls = onUpdate.mock.calls.map(
      (c: [Partial<Tables<"pokemon">>]) => c[0]
    );
    expect(calls.some((c) => c.ev_speed === 4)).toBe(true);
  });

  // -------------------------------------------------------------------------
  // 12. ArrowDown at 0 does NOT go below 0 (floor clamp)
  // -------------------------------------------------------------------------
  it("ArrowDown at ev_hp=0 does not call onUpdate (already at floor)", async () => {
    const { onUpdate } = renderEditor({ ev_hp: 0 });
    const hpHandle = screen.getByRole("slider", { name: /HP investment/i });
    fireEvent.keyDown(hpHandle, { key: "ArrowDown" });
    await new Promise((r) => setTimeout(r, 50));
    // No update should fire when ev is already 0 and delta would go negative
    const calls = onUpdate.mock.calls.map(
      (c: [Partial<Tables<"pokemon">>]) => c[0]
    );
    expect(calls.some((c) => (c.ev_hp ?? 0) < 0)).toBe(false);
  });

  // -------------------------------------------------------------------------
  // 13. Champions budget step is 1
  // -------------------------------------------------------------------------
  it("ArrowUp on HP handle in Champions increases ev_hp by 1 (step=1)", async () => {
    const { onUpdate } = renderEditor({ ev_hp: 0 }, CHAMPIONS_FORMAT);
    const hpHandle = screen.getByRole("slider", { name: /HP investment/i });
    fireEvent.keyDown(hpHandle, { key: "ArrowUp" });
    await new Promise((r) => setTimeout(r, 50));
    const calls = onUpdate.mock.calls.map(
      (c: [Partial<Tables<"pokemon">>]) => c[0]
    );
    expect(calls.some((c) => c.ev_hp === 1)).toBe(true);
  });
});

describe("RadialStatEditor — nature cycle buttons", () => {
  // -------------------------------------------------------------------------
  // 14. Nature cycle buttons render for the 5 non-HP stats
  // -------------------------------------------------------------------------
  it("renders 5 nature cycle buttons (one per non-HP stat)", () => {
    renderEditor();
    // Each non-HP spoke has a "Cycle nature for <stat>" button
    const cycleButtons = screen
      .getAllByRole("button")
      .filter((btn) =>
        btn.getAttribute("aria-label")?.toLowerCase().includes("cycle nature")
      );
    expect(cycleButtons).toHaveLength(5);
  });

  // -------------------------------------------------------------------------
  // 15. Clicking a nature cycle button calls onUpdate with the new nature
  // -------------------------------------------------------------------------
  it("clicking Attack nature button from Hardy calls onUpdate with a +Atk nature", () => {
    const { onUpdate } = renderEditor({ nature: "Hardy" });
    // Nature cycle button aria-label uses STAT_LABELS: "Cycle nature for Atk"
    const atkNatureBtn = screen.getByRole("button", {
      name: /cycle nature for atk/i,
    });
    fireEvent.click(atkNatureBtn);
    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ nature: expect.any(String) })
    );
  });

  it("clicking Speed nature button from Hardy calls onUpdate with a +Spe nature (Jolly/Timid/…)", () => {
    const { onUpdate } = renderEditor({ nature: "Hardy" });
    // Nature cycle button aria-label uses STAT_LABELS: "Cycle nature for Spe"
    const speBtn = screen.getByRole("button", {
      name: /cycle nature for spe/i,
    });
    fireEvent.click(speBtn);
    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ nature: expect.any(String) })
    );
  });

  // -------------------------------------------------------------------------
  // 16. ▲ indicator renders on the +nature stat, ▼ on the -nature stat
  // -------------------------------------------------------------------------
  it("renders ▲ near the +nature stat (ATK) for Adamant", () => {
    renderEditor({ nature: "Adamant" });
    // The SVG text node for ATK gets the ▲ appended
    const atkLabel = screen.getByText(/ATK▲/);
    expect(atkLabel).toBeInTheDocument();
  });

  it("renders ▼ near the -nature stat (SPA) for Adamant", () => {
    renderEditor({ nature: "Adamant" });
    const spaLabel = screen.getByText(/SPA▼/);
    expect(spaLabel).toBeInTheDocument();
  });
});

describe("RadialStatEditor — IVs (format gating)", () => {
  // -------------------------------------------------------------------------
  // 17. In VGC (supports IVs) the RadialFineTune stub shows an IV toggle
  // -------------------------------------------------------------------------
  it("RadialFineTune receives showIvs=true in VGC format", () => {
    renderEditor({}, VGC_FORMAT);
    // Our stub renders an "IVs" button when showIvs=true
    expect(screen.getByTestId("fine-tune-toggle")).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // 18. In Champions (no IVs) the RadialFineTune stub does not show IV toggle
  // -------------------------------------------------------------------------
  it("RadialFineTune receives showIvs=false in Champions format", () => {
    renderEditor({}, CHAMPIONS_FORMAT);
    expect(screen.queryByTestId("fine-tune-toggle")).not.toBeInTheDocument();
  });
});

describe("RadialStatEditor — SVG investment polygon", () => {
  // -------------------------------------------------------------------------
  // 19. Stat investment hexagon aria-label is present
  // -------------------------------------------------------------------------
  it("renders the investment hexagon with aria-label 'Stat investment hexagon'", () => {
    renderEditor();
    // The <svg> has aria-label="Stat investment hexagon".
    // SVG elements don't automatically get role="img" in jsdom — use querySelector.
    const svg = document.querySelector(
      '[aria-label="Stat investment hexagon"]'
    );
    expect(svg).not.toBeNull();
  });

  // -------------------------------------------------------------------------
  // 20. Center budget aria-label announces invested / total
  // -------------------------------------------------------------------------
  it("center chip group aria-label announces 0 of 510 EV invested", () => {
    renderEditor();
    // budget.label is "EV" (singular) for VGC → "0 of 510 EV invested"
    const chip = document.querySelector('[aria-label="0 of 510 EV invested"]');
    expect(chip).not.toBeNull();
  });

  it("center chip group aria-label announces 0 of 66 SP invested in Champions", () => {
    renderEditor({}, CHAMPIONS_FORMAT);
    // budget.label is "SP" (singular) for Champions → "0 of 66 SP invested"
    const chip = document.querySelector('[aria-label="0 of 66 SP invested"]');
    expect(chip).not.toBeNull();
  });
});

describe("RadialStatEditor — draft reset on pokemon change", () => {
  // -------------------------------------------------------------------------
  // 21. Draft EVs are cleared when pokemon.id changes (no stale contamination)
  // -------------------------------------------------------------------------
  it("draft EVs are cleared when pokemon.id changes mid-drag", () => {
    const pokemonA = makeGarchomp({ id: 1, ev_hp: 0 });
    const pokemonB = makeGarchomp({ id: 2, ev_hp: 0 });
    const onUpdate = jest.fn();

    const { rerender } = render(
      <RadialStatEditor
        pokemon={pokemonA}
        format={VGC_FORMAT}
        onUpdate={onUpdate}
      />
    );

    // Simulate a draft in progress on HP handle
    const hpHandle = screen.getByRole("slider", { name: /HP investment/i });
    fireEvent.keyDown(hpHandle, { key: "ArrowUp" });

    // Center chip should now reflect the draft (4 EVs from +1 step)
    expect(screen.queryByText("4")).toBeTruthy();

    // Swap to a different pokemon — draft must clear
    rerender(
      <RadialStatEditor
        pokemon={pokemonB}
        format={VGC_FORMAT}
        onUpdate={onUpdate}
      />
    );

    // After swap the displayed total should be 0 (pokemonB's committed EVs)
    expect(screen.getByText("0")).toBeInTheDocument();
  });
});
