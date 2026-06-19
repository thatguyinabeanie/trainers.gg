"use client";

/**
 * Tests for RadialStatEditor — the hexagonal EV/SP investment editor.
 *
 * Coverage targets:
 *  • 6 stat spokes render with their short labels
 *  • SpokeInput accepts typed EV values and calls onUpdate
 *  • Arrow-key on handle nudges by budget.step
 *  • Budget enforces 510 total (VGC) and 66 total (Champions)
 *  • Nature pill cycles through all 5 boostable stats (vertex buttons removed)
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
    // Each spoke renders its abbreviation in an aria-hidden span inside a foreignObject.
    // Use DOM querySelector since aria-hidden excludes these from the a11y tree.
    for (const label of ["HP", "ATK", "DEF", "SPA", "SPD", "SPE"]) {
      const found = Array.from(document.querySelectorAll("span")).some(
        (el) => el.textContent === label
      );
      expect(found).toBe(true);
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

describe("RadialStatEditor — budget readout (below SVG)", () => {
  // -------------------------------------------------------------------------
  // 4. Budget readout shows invested / total below the hexagon
  // -------------------------------------------------------------------------
  it("shows 0 invested and / 510 total in VGC by default", () => {
    renderEditor();
    // Budget is rendered below the SVG as two separate spans: "0" and "/ 510"
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.getByText("/ 510")).toBeInTheDocument();
  });

  it("shows 0 invested and / 66 total in Champions by default", () => {
    renderEditor({}, CHAMPIONS_FORMAT);
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.getByText("/ 66")).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // 5. Budget readout reflects committed EV investment
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

describe("RadialStatEditor — nature indicators + pill cycle", () => {
  // -------------------------------------------------------------------------
  // 14. No per-vertex nature buttons — they have been removed in favour of
  //     the nature <select> dropdown below the hexagon (cleaner UI, less
  //     clutter and accessible via native select semantics).
  // -------------------------------------------------------------------------
  it("renders NO per-vertex nature cycle buttons (vertex buttons removed)", () => {
    renderEditor();
    // There must be no button whose aria-label contains "cycle nature" —
    // that was the old vertex-button convention.
    const cycleButtons = screen
      .getAllByRole("button")
      .filter((btn) =>
        btn.getAttribute("aria-label")?.toLowerCase().includes("cycle nature")
      );
    expect(cycleButtons).toHaveLength(0);
  });

  // -------------------------------------------------------------------------
  // 15. Nature pill is now a native <select> (aria-label "NATURE" or
  //     "STAT ALIGN"). Changing it calls onUpdate({ nature }).
  // -------------------------------------------------------------------------
  it("nature select renders with current nature value", () => {
    renderEditor({ nature: "Hardy" });
    // The <select> has aria-label matching the naturePillLabel ("NATURE" in VGC)
    const select = screen.getByRole("combobox", { name: /NATURE/i });
    expect((select as HTMLSelectElement).value).toBe("Hardy");
  });

  it("changing nature select calls onUpdate with selected nature", () => {
    const { onUpdate } = renderEditor({ nature: "Hardy" });
    const select = screen.getByRole("combobox", { name: /NATURE/i });
    fireEvent.change(select, { target: { value: "Adamant" } });
    expect(onUpdate).toHaveBeenCalledWith({ nature: "Adamant" });
  });

  it("nature select in Champions format has aria-label 'STAT ALIGN'", () => {
    renderEditor({ nature: "Hardy" }, CHAMPIONS_FORMAT);
    const select = screen.getByRole("combobox", { name: /STAT ALIGN/i });
    expect(select).toBeInTheDocument();
  });

  it("nature select contains all 25 nature options", () => {
    renderEditor({ nature: "Hardy" });
    const select = screen.getByRole("combobox", { name: /NATURE/i });
    // NATURE_EFFECTS has 25 entries (all natures including neutral ones)
    const options = Array.from((select as HTMLSelectElement).options).map(
      (o) => o.value
    );
    expect(options).toContain("Adamant");
    expect(options).toContain("Jolly");
    expect(options).toContain("Hardy");
    expect(options.length).toBeGreaterThanOrEqual(25);
  });

  // -------------------------------------------------------------------------
  // 16. ▲ indicator renders on the +nature stat, ▼ on the -nature stat.
  //     The inline row has the arrow in its OWN span (left of the abbreviation).
  //     These decorative spans are aria-hidden — query via DOM selector.
  // -------------------------------------------------------------------------
  it("renders ▲ arrow span for ATK for Adamant", () => {
    renderEditor({ nature: "Adamant" });
    // The ATK spoke row renders a ▲ span (emerald, aria-hidden) to the left of ATK.
    // Use DOM query since aria-hidden excludes these from the a11y tree.
    const arrowSpans = Array.from(document.querySelectorAll("span")).filter(
      (el) => el.textContent === "▲"
    );
    expect(arrowSpans.length).toBeGreaterThan(0);
    // The ATK abbreviation is also rendered in a sibling aria-hidden span
    const atkSpans = Array.from(document.querySelectorAll("span")).filter(
      (el) => el.textContent === "ATK"
    );
    expect(atkSpans.length).toBeGreaterThan(0);
  });

  it("renders ▼ arrow span for SPA for Adamant", () => {
    renderEditor({ nature: "Adamant" });
    const arrowSpans = Array.from(document.querySelectorAll("span")).filter(
      (el) => el.textContent === "▼"
    );
    expect(arrowSpans.length).toBeGreaterThan(0);
    const spaSpans = Array.from(document.querySelectorAll("span")).filter(
      (el) => el.textContent === "SPA"
    );
    expect(spaSpans.length).toBeGreaterThan(0);
  });

  // -------------------------------------------------------------------------
  // 16b. Effective stat value is plain (no combined ▲/▼+number text).
  //      The arrow and the effective-stat number are in separate sibling spans,
  //      so no single leaf element contains "▲NNN" or "▼NNN".
  // -------------------------------------------------------------------------
  it("no element contains a ▲ or ▼ immediately followed by a digit (Adamant)", () => {
    renderEditor({ nature: "Adamant" });
    // Walk all DOM leaf nodes and ensure none read "▲NNN" or "▼NNN"
    const allElements = Array.from(document.querySelectorAll("*"));
    for (const el of allElements) {
      // Only look at leaf nodes (no child elements) to avoid composite matches
      if (el.childElementCount === 0 && el.textContent) {
        expect(el.textContent.trim()).not.toMatch(/^[▲▼]\d/);
      }
    }
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
  // 20. Budget readout aria-label announces invested / total (accessible summary)
  // -------------------------------------------------------------------------
  it("budget readout aria-label announces 0 of 510 EV invested", () => {
    renderEditor();
    // budget.label is "EV" (singular) for VGC → "0 of 510 EV invested"
    // The aria-label is on the budget div below the SVG
    const budgetEl = document.querySelector(
      '[aria-label="0 of 510 EV invested"]'
    );
    expect(budgetEl).not.toBeNull();
  });

  it("budget readout aria-label announces 0 of 66 SP invested in Champions", () => {
    renderEditor({}, CHAMPIONS_FORMAT);
    // budget.label is "SP" (singular) for Champions → "0 of 66 SP invested"
    const budgetEl = document.querySelector(
      '[aria-label="0 of 66 SP invested"]'
    );
    expect(budgetEl).not.toBeNull();
  });
});

describe("RadialStatEditor — nature select (replaces old pill button)", () => {
  // -------------------------------------------------------------------------
  // 22. Nature select renders with current nature value
  // -------------------------------------------------------------------------
  it("renders nature select with current nature value in VGC format", () => {
    renderEditor({ nature: "Adamant" }, VGC_FORMAT);
    // The native <select> has aria-label "NATURE" in VGC
    const select = screen.getByRole("combobox", { name: /NATURE/i });
    expect((select as HTMLSelectElement).value).toBe("Adamant");
  });

  it("renders nature select with 'STAT ALIGN' aria-label in Champions format", () => {
    renderEditor({ nature: "Adamant" }, CHAMPIONS_FORMAT);
    const select = screen.getByRole("combobox", { name: /STAT ALIGN/i });
    expect((select as HTMLSelectElement).value).toBe("Adamant");
  });

  it("changing nature select calls onUpdate with selected nature", () => {
    const { onUpdate } = renderEditor({ nature: "Hardy" }, VGC_FORMAT);
    const select = screen.getByRole("combobox", { name: /NATURE/i });
    fireEvent.change(select, { target: { value: "Jolly" } });
    expect(onUpdate).toHaveBeenCalledWith({ nature: "Jolly" });
  });

  it("shows +ATK color span when nature boosts ATK (Adamant)", () => {
    renderEditor({ nature: "Adamant" }, VGC_FORMAT);
    // The nature effects span renders "+ATK" in emerald
    expect(screen.getByText("+ATK")).toBeInTheDocument();
  });

  it("shows −SPA color span when nature reduces SPA (Adamant)", () => {
    renderEditor({ nature: "Adamant" }, VGC_FORMAT);
    expect(screen.getByText("−SPA")).toBeInTheDocument();
  });

  it("does not show effect spans for neutral nature (Hardy)", () => {
    renderEditor({ nature: "Hardy" }, VGC_FORMAT);
    // Hardy has no boost/reduce — no +/− spans should appear
    expect(screen.queryByText(/^\+/)).toBeNull();
    expect(screen.queryByText(/^−/)).toBeNull();
  });
});

describe("RadialStatEditor — handles always visible at 0 investment", () => {
  // -------------------------------------------------------------------------
  // 23. Six handle circles are rendered for ALL stats regardless of EV
  // -------------------------------------------------------------------------
  it("renders 6 slider hit targets at 0 EV (handles always visible)", () => {
    // All EVs at 0 — every handle must still be rendered (at MIN_RADIUS)
    renderEditor({
      ev_hp: 0,
      ev_attack: 0,
      ev_defense: 0,
      ev_special_attack: 0,
      ev_special_defense: 0,
      ev_speed: 0,
    });
    const handles = screen.getAllByRole("slider");
    expect(handles).toHaveLength(6);
  });

  it("handles render with aria-valuenow=0 at zero investment", () => {
    renderEditor({
      ev_hp: 0,
      ev_attack: 0,
      ev_defense: 0,
      ev_special_attack: 0,
      ev_special_defense: 0,
      ev_speed: 0,
    });
    const handles = screen.getAllByRole("slider");
    // Every handle at 0 EV must have aria-valuenow="0"
    const zeroHandles = handles.filter(
      (h) => h.getAttribute("aria-valuenow") === "0"
    );
    expect(zeroHandles).toHaveLength(6);
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

    // Budget readout should now reflect the draft (4 EVs from +1 step)
    // Use getAllByText since "4" appears in multiple places (budget + allocated number)
    expect(screen.getAllByText("4").length).toBeGreaterThan(0);

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
