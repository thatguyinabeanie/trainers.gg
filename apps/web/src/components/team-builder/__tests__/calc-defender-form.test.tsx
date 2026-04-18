import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// =============================================================================
// Module-level mocks
// =============================================================================

const mockGetLegalAbilities = jest.fn(
  () => undefined as Set<string> | undefined
);
const mockGetLegalItems = jest.fn(() => undefined as Set<string> | undefined);
const mockGetLegalTeraTypes = jest.fn(
  () => undefined as Set<string> | undefined
);
const mockGetMetaSpeedTiers = jest.fn(
  () => [] as Array<{ species: string; displayName: string; speed: number }>
);
const mockFormatHasTera = jest.fn(
  (format: { generation?: number } | null | undefined) => {
    if (!format) return false;
    return format.generation === 9;
  }
);

jest.mock("@trainers/pokemon", () => ({
  ALL_TYPES: ["Normal", "Fire", "Water", "Electric", "Grass", "Psychic"],
  formatHasTera: mockFormatHasTera,
  getAllItems: jest.fn(() => ["Leftovers", "Life Orb"]),
  getLegalAbilities: mockGetLegalAbilities,
  getLegalItems: mockGetLegalItems,
  getLegalTeraTypes: mockGetLegalTeraTypes,
  getMetaSpeedTiers: mockGetMetaSpeedTiers,
  getValidAbilities: jest.fn(() => ["Intimidate", "Blaze"]),
  getValidNatures: jest.fn(() => ["Hardy", "Timid", "Adamant"]),
}));

import { CalcDefenderForm } from "../calc-defender-form";
import { type GameFormat } from "@trainers/pokemon";

// =============================================================================
// Fixture formats
// =============================================================================

const championsFormat: GameFormat = {
  id: "championsvgc2026regma",
  game: "Pokemon Champions",
  gameShort: "Champions",
  generation: 10,
  category: "VGC",
  year: 2026,
  regulation: "M-A",
  label: "Champions: Reg M-A",
  showdownName: "[Champions] VGC 2026 Reg M-A",
  doubles: true,
  active: true,
};

const svFormat: GameFormat = {
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
// renderForm helper
// =============================================================================

type RenderFormOverrides = {
  format?: GameFormat | undefined;
  species?: string;
  boosts?: { def: number; spd: number; atk: number; spa: number; spe: number };
  hpPercent?: number;
  status?: string;
  evs?: {
    hp: number;
    atk: number;
    def: number;
    spa: number;
    spd: number;
    spe: number;
  };
  teammates?: Parameters<typeof CalcDefenderForm>[0]["teammates"];
  onPresetMeta?: () => void;
  onPresetCustom?: () => void;
};

function renderForm(overrides: RenderFormOverrides = {}) {
  const {
    format = undefined,
    species = "Incineroar",
    boosts = { def: 0, spd: 0, atk: 0, spa: 0, spe: 0 },
    hpPercent = 100,
    status = "Healthy",
    evs = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    teammates = [],
    onPresetMeta,
    onPresetCustom,
  } = overrides;

  const handlers = {
    onSpeciesChange: jest.fn(),
    onAbilityChange: jest.fn(),
    onItemChange: jest.fn(),
    onNatureChange: jest.fn(),
    onTeraChange: jest.fn(),
    onEvChange: jest.fn(),
    onBoostChange: jest.fn(),
    onStatusChange: jest.fn(),
    onHpPercentChange: jest.fn(),
    onPresetMeta,
    onPresetCustom,
  };

  render(
    <CalcDefenderForm
      species={species}
      ability="Intimidate"
      item=""
      nature="Hardy"
      teraType=""
      evs={evs}
      boosts={boosts}
      status={status}
      hpPercent={hpPercent}
      format={format}
      teammates={teammates}
      {...handlers}
    />
  );

  return handlers;
}

// =============================================================================
// Reset mocks between tests
// =============================================================================

beforeEach(() => {
  mockGetLegalAbilities.mockReturnValue(undefined);
  mockGetLegalItems.mockReturnValue(undefined);
  mockGetLegalTeraTypes.mockReturnValue(undefined);
  mockGetMetaSpeedTiers.mockReturnValue([]);
  mockFormatHasTera.mockImplementation(
    (format: { generation?: number } | null | undefined) => {
      if (!format) return false;
      return format.generation === 9;
    }
  );
});

// =============================================================================
// Tests
// =============================================================================

describe("CalcDefenderForm — Tera field gating", () => {
  it("hides the Tera select for a Champions format (no Terastal)", () => {
    renderForm({ format: championsFormat });
    expect(screen.queryByTestId("calc-defender-tera")).not.toBeInTheDocument();
    // The 'Tera' label heading should also be absent
    expect(
      screen.queryByText(/^TERA$/i, { selector: "span" })
    ).not.toBeInTheDocument();
  });

  it("renders the Tera select for a Gen 9 VGC format (has Terastal)", () => {
    renderForm({ format: svFormat });
    expect(screen.getByTestId("calc-defender-tera")).toBeInTheDocument();
  });

  it("hides the Tera select when format is undefined (safe default → no tera)", () => {
    renderForm();
    expect(screen.queryByTestId("calc-defender-tera")).not.toBeInTheDocument();
  });

  it("still renders Nature select when Tera is hidden (no layout break)", () => {
    renderForm({ format: championsFormat });
    // Nature select must be present even without Tera
    const natureSel = screen.getByDisplayValue("Hardy");
    expect(natureSel).toBeInTheDocument();
  });

  it("does not collapse the Ability or Item fields for Champions format", () => {
    renderForm({ format: championsFormat });
    // Ability and Item selects must still render
    expect(screen.getByDisplayValue("Intimidate")).toBeInTheDocument();
  });
});

// =============================================================================
// Status pills
// =============================================================================

describe("CalcDefenderForm — status pills", () => {
  it("renders all status options using STATUS_LABELS (Badly Poisoned → Toxic)", () => {
    renderForm();
    // "Badly Poisoned" must not appear in the UI — it should be mapped to "Toxic"
    expect(screen.queryByText("Badly Poisoned")).not.toBeInTheDocument();
    expect(screen.getByText("Toxic")).toBeInTheDocument();
    // Other labels should appear as-is
    expect(screen.getByText("Healthy")).toBeInTheDocument();
    expect(screen.getByText("Burned")).toBeInTheDocument();
    expect(screen.getByText("Poisoned")).toBeInTheDocument();
    expect(screen.getByText("Paralyzed")).toBeInTheDocument();
    expect(screen.getByText("Asleep")).toBeInTheDocument();
    expect(screen.getByText("Frozen")).toBeInTheDocument();
  });

  it("active status pill has aria-pressed true", () => {
    renderForm();
    // "Healthy" is the default status
    const healthyBtn = screen.getByText("Healthy").closest("button")!;
    expect(healthyBtn).toHaveAttribute("aria-pressed", "true");
  });

  it("inactive status pills have aria-pressed false", () => {
    renderForm();
    const burnedBtn = screen.getByText("Burned").closest("button")!;
    expect(burnedBtn).toHaveAttribute("aria-pressed", "false");
  });

  it("clicking a status pill fires onStatusChange with the raw status key", async () => {
    const user = userEvent.setup();
    const handlers = renderForm();

    await user.click(screen.getByText("Toxic").closest("button")!);
    // onStatusChange must be called with the raw key "Badly Poisoned"
    expect(handlers.onStatusChange).toHaveBeenCalledWith("Badly Poisoned");
  });

  it.each([
    ["Burned", "Burned"],
    ["Poisoned", "Poisoned"],
    ["Paralyzed", "Paralyzed"],
    ["Asleep", "Asleep"],
    ["Frozen", "Frozen"],
    ["Healthy", "Healthy"],
  ])(
    "clicking %s pill calls onStatusChange with raw key %s",
    async (label, rawKey) => {
      const user = userEvent.setup();
      const handlers = renderForm();
      await user.click(screen.getByText(label).closest("button")!);
      expect(handlers.onStatusChange).toHaveBeenCalledWith(rawKey);
    }
  );

  it("non-Healthy status is marked as active when status prop matches", () => {
    renderForm({ status: "Burned" });
    const burnedBtn = screen.getByText("Burned").closest("button")!;
    expect(burnedBtn).toHaveAttribute("aria-pressed", "true");
    const healthyBtn = screen.getByText("Healthy").closest("button")!;
    expect(healthyBtn).toHaveAttribute("aria-pressed", "false");
  });

  it("Badly Poisoned status marks Toxic pill as active", () => {
    renderForm({ status: "Badly Poisoned" });
    const toxicBtn = screen.getByText("Toxic").closest("button")!;
    expect(toxicBtn).toHaveAttribute("aria-pressed", "true");
  });
});

// =============================================================================
// Target select — duplicate option deduplication
// =============================================================================

describe("CalcDefenderForm — Target select", () => {
  it("always renders a stable 'Custom' option with value ''", () => {
    renderForm();
    const targetSelect = screen.getByTestId(
      "calc-defender-target"
    ) as HTMLSelectElement;
    const options = Array.from(targetSelect.options).map((o) => ({
      value: o.value,
      text: o.text,
    }));
    expect(options).toContainEqual({ value: "", text: "Custom" });
  });

  it("does not render a duplicate option when species is in teammates", () => {
    renderForm({
      species: "Rillaboom",
      teammates: [
        {
          id: 1,
          species: "Rillaboom",
        } as Parameters<typeof CalcDefenderForm>[0]["teammates"][0],
      ],
    });

    const targetSelect = screen.getByTestId(
      "calc-defender-target"
    ) as HTMLSelectElement;
    const rillaboomOptions = Array.from(targetSelect.options).filter(
      (o) => o.value === "Rillaboom"
    );
    // Should appear exactly once — kept in its meta/teammates group so the
    // controlled <select value={species}> can match. We don't add a separate
    // "current" option when the species is already in a group.
    expect(rillaboomOptions.length).toBe(1);
  });

  it("renders selects with aria-label for screen readers", () => {
    renderForm();
    expect(
      screen.getByRole("combobox", { name: "Target" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "Ability" })
    ).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Item" })).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "Nature" })
    ).toBeInTheDocument();
  });

  it("renders a Meta optgroup with meta entries when format has speed tiers", () => {
    mockGetMetaSpeedTiers.mockReturnValue([
      { species: "Garchomp", displayName: "Garchomp", speed: 102 },
      { species: "Dragapult", displayName: "Dragapult", speed: 142 },
    ]);
    renderForm({ format: championsFormat });
    const targetSelect = screen.getByTestId(
      "calc-defender-target"
    ) as HTMLSelectElement;
    const optgroups = targetSelect.querySelectorAll("optgroup[label='Meta']");
    expect(optgroups.length).toBe(1);
    const metaGroup = optgroups[0]!;
    const optionTexts = Array.from(metaGroup.querySelectorAll("option")).map(
      (o) => o.textContent
    );
    expect(optionTexts).toContain("Garchomp");
    expect(optionTexts).toContain("Dragapult");
  });

  it("keeps current species in meta optgroup so the controlled select matches", () => {
    mockGetMetaSpeedTiers.mockReturnValue([
      { species: "Incineroar", displayName: "Incineroar", speed: 60 },
      { species: "Rillaboom", displayName: "Rillaboom", speed: 85 },
    ]);
    renderForm({ format: championsFormat });
    const targetSelect = screen.getByTestId(
      "calc-defender-target"
    ) as HTMLSelectElement;
    const metaGroup = targetSelect.querySelector("optgroup[label='Meta']")!;
    const optionValues = Array.from(metaGroup.querySelectorAll("option")).map(
      (o) => o.value
    );
    // The current species (Incineroar) IS rendered so the controlled
    // <select value={species}> can match — preserving select state.
    expect(optionValues).toContain("Incineroar");
    expect(optionValues).toContain("Rillaboom");
  });

  it("renders a custom species option when species is non-empty and not in any group", () => {
    renderForm({ species: "CustomMon" });
    const targetSelect = screen.getByTestId(
      "calc-defender-target"
    ) as HTMLSelectElement;
    const options = Array.from(targetSelect.options).map((o) => o.value);
    expect(options).toContain("CustomMon");
  });

  it("renders teammates optgroup with teammates not matching current species", () => {
    renderForm({
      species: "Incineroar",
      teammates: [
        { id: 1, species: "Rillaboom" } as Parameters<
          typeof CalcDefenderForm
        >[0]["teammates"][0],
        { id: 2, species: "Incineroar" } as Parameters<
          typeof CalcDefenderForm
        >[0]["teammates"][0],
      ],
    });
    const targetSelect = screen.getByTestId(
      "calc-defender-target"
    ) as HTMLSelectElement;
    const teamGroup = targetSelect.querySelector(
      "optgroup[label='Your team']"
    )!;
    const optionValues = Array.from(teamGroup.querySelectorAll("option")).map(
      (o) => o.value
    );
    expect(optionValues).toContain("Rillaboom");
    // Current species kept in the group so the controlled select matches.
    expect(optionValues).toContain("Incineroar");
  });

  it("calls onSpeciesChange when a new target is selected", async () => {
    const user = userEvent.setup();
    mockGetMetaSpeedTiers.mockReturnValue([
      { species: "Rillaboom", displayName: "Rillaboom", speed: 85 },
    ]);
    const handlers = renderForm({ format: championsFormat, species: "" });
    const targetSelect = screen.getByTestId("calc-defender-target");
    await user.selectOptions(targetSelect, "Rillaboom");
    expect(handlers.onSpeciesChange).toHaveBeenCalledWith("Rillaboom");
  });
});

// =============================================================================
// HP slider
// =============================================================================

describe("CalcDefenderForm — HP slider", () => {
  it("renders the HP range slider with the current hpPercent value", () => {
    renderForm({ hpPercent: 75 });
    const slider = screen.getByRole("slider", { name: "Defender HP percent" });
    expect(slider).toBeInTheDocument();
    expect((slider as HTMLInputElement).value).toBe("75");
  });

  it("displays hpPercent as a percentage label", () => {
    renderForm({ hpPercent: 42 });
    expect(screen.getByText("42%")).toBeInTheDocument();
  });

  it("calls onHpPercentChange when the slider is moved", async () => {
    const { fireEvent } = await import("@testing-library/react");
    const handlers = renderForm({ hpPercent: 100 });
    const slider = screen.getByRole("slider", { name: "Defender HP percent" });
    fireEvent.change(slider, { target: { value: "50" } });
    expect(handlers.onHpPercentChange).toHaveBeenCalledWith(50);
  });

  it("slider has min=1 max=100 step=1 attributes", () => {
    renderForm({ hpPercent: 100 });
    const slider = screen.getByRole("slider", { name: "Defender HP percent" });
    expect(slider).toHaveAttribute("min", "1");
    expect(slider).toHaveAttribute("max", "100");
    expect(slider).toHaveAttribute("step", "1");
  });
});

// =============================================================================
// EV inputs
// =============================================================================

describe("CalcDefenderForm — EV inputs", () => {
  it("renders all 6 EV stat inputs with correct aria-labels", () => {
    renderForm();
    const statLabels = [
      "HP EV",
      "Atk EV",
      "Def EV",
      "SpA EV",
      "SpD EV",
      "Spe EV",
    ];
    for (const label of statLabels) {
      expect(
        screen.getByRole("spinbutton", { name: label })
      ).toBeInTheDocument();
    }
  });

  it("calls onEvChange with the typed numeric value", async () => {
    const { fireEvent } = await import("@testing-library/react");
    const handlers = renderForm({
      evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    });
    const hpInput = screen.getByRole("spinbutton", { name: "HP EV" });
    fireEvent.change(hpInput, { target: { value: "252" } });
    expect(handlers.onEvChange).toHaveBeenCalledWith("hp", 252);
  });

  it("calls onEvChange with 0 when input is cleared (empty string)", async () => {
    const { fireEvent } = await import("@testing-library/react");
    const handlers = renderForm({
      evs: { hp: 100, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    });
    const hpInput = screen.getByRole("spinbutton", { name: "HP EV" });
    fireEvent.change(hpInput, { target: { value: "" } });
    expect(handlers.onEvChange).toHaveBeenCalledWith("hp", 0);
  });

  it("clamps EV values above 252 to 252", async () => {
    const { fireEvent } = await import("@testing-library/react");
    const handlers = renderForm();
    const hpInput = screen.getByRole("spinbutton", { name: "HP EV" });
    fireEvent.change(hpInput, { target: { value: "300" } });
    expect(handlers.onEvChange).toHaveBeenCalledWith("hp", 252);
  });

  it("clamps EV values below 0 to 0", async () => {
    const { fireEvent } = await import("@testing-library/react");
    const handlers = renderForm();
    const defInput = screen.getByRole("spinbutton", { name: "Def EV" });
    fireEvent.change(defInput, { target: { value: "-10" } });
    expect(handlers.onEvChange).toHaveBeenCalledWith("def", 0);
  });

  it.each([
    ["atk", "Atk EV"],
    ["def", "Def EV"],
    ["spa", "SpA EV"],
    ["spd", "SpD EV"],
    ["spe", "Spe EV"],
  ] as const)(
    "calls onEvChange for %s stat when value changes",
    async (stat, label) => {
      const { fireEvent } = await import("@testing-library/react");
      const handlers = renderForm();
      const input = screen.getByRole("spinbutton", { name: label });
      fireEvent.change(input, { target: { value: "4" } });
      expect(handlers.onEvChange).toHaveBeenCalledWith(stat, 4);
    }
  );
});

// =============================================================================
// Boost steppers
// =============================================================================

describe("CalcDefenderForm — Boost steppers", () => {
  it("renders Def and SpD boost steppers", () => {
    renderForm();
    expect(
      screen.getByRole("button", { name: "Decrease Def boost" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Increase Def boost" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Decrease SpD boost" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Increase SpD boost" })
    ).toBeInTheDocument();
  });

  it("displays positive boost with a '+' prefix", () => {
    renderForm({ boosts: { def: 2, spd: 0, atk: 0, spa: 0, spe: 0 } });
    expect(screen.getByText("+2")).toBeInTheDocument();
  });

  it("displays negative boost without '+' prefix", () => {
    renderForm({ boosts: { def: -1, spd: 0, atk: 0, spa: 0, spe: 0 } });
    expect(screen.getByText("-1")).toBeInTheDocument();
  });

  it("displays zero boost as '0'", () => {
    renderForm({ boosts: { def: 0, spd: 0, atk: 0, spa: 0, spe: 0 } });
    // Two zeros — one for each stepper
    const zeros = screen.getAllByText("0");
    expect(zeros.length).toBeGreaterThanOrEqual(2);
  });

  it("calls onBoostChange with def incremented by 1 when increase button is clicked", async () => {
    const user = userEvent.setup();
    const handlers = renderForm({
      boosts: { def: 0, spd: 0, atk: 0, spa: 0, spe: 0 },
    });
    await user.click(
      screen.getByRole("button", { name: "Increase Def boost" })
    );
    expect(handlers.onBoostChange).toHaveBeenCalledWith("def", 1);
  });

  it("calls onBoostChange with def decremented by 1 when decrease button is clicked", async () => {
    const user = userEvent.setup();
    const handlers = renderForm({
      boosts: { def: 0, spd: 0, atk: 0, spa: 0, spe: 0 },
    });
    await user.click(
      screen.getByRole("button", { name: "Decrease Def boost" })
    );
    expect(handlers.onBoostChange).toHaveBeenCalledWith("def", -1);
  });

  it("clamps Def boost at maximum +6 — does not increment above 6", async () => {
    const user = userEvent.setup();
    const handlers = renderForm({
      boosts: { def: 6, spd: 0, atk: 0, spa: 0, spe: 0 },
    });
    await user.click(
      screen.getByRole("button", { name: "Increase Def boost" })
    );
    expect(handlers.onBoostChange).toHaveBeenCalledWith("def", 6);
  });

  it("clamps Def boost at minimum -6 — does not decrement below -6", async () => {
    const user = userEvent.setup();
    const handlers = renderForm({
      boosts: { def: -6, spd: 0, atk: 0, spa: 0, spe: 0 },
    });
    await user.click(
      screen.getByRole("button", { name: "Decrease Def boost" })
    );
    expect(handlers.onBoostChange).toHaveBeenCalledWith("def", -6);
  });

  it("calls onBoostChange with spd incremented when SpD increase is clicked", async () => {
    const user = userEvent.setup();
    const handlers = renderForm({
      boosts: { def: 0, spd: 3, atk: 0, spa: 0, spe: 0 },
    });
    await user.click(
      screen.getByRole("button", { name: "Increase SpD boost" })
    );
    expect(handlers.onBoostChange).toHaveBeenCalledWith("spd", 4);
  });

  it("calls onBoostChange with spd decremented when SpD decrease is clicked", async () => {
    const user = userEvent.setup();
    const handlers = renderForm({
      boosts: { def: 0, spd: 3, atk: 0, spa: 0, spe: 0 },
    });
    await user.click(
      screen.getByRole("button", { name: "Decrease SpD boost" })
    );
    expect(handlers.onBoostChange).toHaveBeenCalledWith("spd", 2);
  });

  it("clamps SpD at +6 ceiling", async () => {
    const user = userEvent.setup();
    const handlers = renderForm({
      boosts: { def: 0, spd: 6, atk: 0, spa: 0, spe: 0 },
    });
    await user.click(
      screen.getByRole("button", { name: "Increase SpD boost" })
    );
    expect(handlers.onBoostChange).toHaveBeenCalledWith("spd", 6);
  });

  it("clamps SpD at -6 floor", async () => {
    const user = userEvent.setup();
    const handlers = renderForm({
      boosts: { def: 0, spd: -6, atk: 0, spa: 0, spe: 0 },
    });
    await user.click(
      screen.getByRole("button", { name: "Decrease SpD boost" })
    );
    expect(handlers.onBoostChange).toHaveBeenCalledWith("spd", -6);
  });
});

// =============================================================================
// Preset buttons
// =============================================================================

describe("CalcDefenderForm — Preset buttons", () => {
  it("renders no preset buttons when neither onPresetMeta nor onPresetCustom is provided", () => {
    renderForm();
    expect(screen.queryByText("Meta default")).not.toBeInTheDocument();
    // Only the <option value="">Custom</option> exists — no preset <button>
    expect(
      screen.queryByRole("button", { name: "Custom" })
    ).not.toBeInTheDocument();
  });

  it("renders only Meta default button when only onPresetMeta is provided", () => {
    renderForm({ onPresetMeta: jest.fn() });
    expect(screen.getByText("Meta default")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Custom" })
    ).not.toBeInTheDocument();
  });

  it("renders only Custom button when only onPresetCustom is provided", () => {
    renderForm({ onPresetCustom: jest.fn() });
    // The preset <button> is queryable by role; the <option>Custom</option> is not a button
    const customBtn = screen.getByRole("button", { name: "Custom" });
    expect(customBtn).toBeInTheDocument();
    expect(screen.queryByText("Meta default")).not.toBeInTheDocument();
  });

  it("renders both preset buttons when both handlers are provided", () => {
    renderForm({ onPresetMeta: jest.fn(), onPresetCustom: jest.fn() });
    expect(screen.getByText("Meta default")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Custom" })).toBeInTheDocument();
  });

  it("calls onPresetMeta when Meta default button is clicked", async () => {
    const user = userEvent.setup();
    const onPresetMeta = jest.fn();
    renderForm({ onPresetMeta });
    await user.click(screen.getByText("Meta default"));
    expect(onPresetMeta).toHaveBeenCalledTimes(1);
  });

  it("calls onPresetCustom when Custom button is clicked", async () => {
    const user = userEvent.setup();
    const onPresetCustom = jest.fn();
    renderForm({ onPresetCustom });
    await user.click(screen.getByRole("button", { name: "Custom" }));
    expect(onPresetCustom).toHaveBeenCalledTimes(1);
  });
});

// =============================================================================
// Select change handlers
// =============================================================================

describe("CalcDefenderForm — select change handlers", () => {
  it("calls onAbilityChange when ability select changes", async () => {
    const user = userEvent.setup();
    const handlers = renderForm();
    const abilitySelect = screen.getByRole("combobox", { name: "Ability" });
    await user.selectOptions(abilitySelect, "Blaze");
    expect(handlers.onAbilityChange).toHaveBeenCalledWith("Blaze");
  });

  it("calls onItemChange when item select changes", async () => {
    const user = userEvent.setup();
    const handlers = renderForm();
    const itemSelect = screen.getByRole("combobox", { name: "Item" });
    await user.selectOptions(itemSelect, "Leftovers");
    expect(handlers.onItemChange).toHaveBeenCalledWith("Leftovers");
  });

  it("calls onNatureChange when nature select changes", async () => {
    const user = userEvent.setup();
    const handlers = renderForm();
    const natureSelect = screen.getByRole("combobox", { name: "Nature" });
    await user.selectOptions(natureSelect, "Timid");
    expect(handlers.onNatureChange).toHaveBeenCalledWith("Timid");
  });
});

// =============================================================================
// Item filtering by format
// =============================================================================

describe("CalcDefenderForm — Item filtering", () => {
  it("shows all items when format has no legal item set (undefined)", () => {
    mockGetLegalItems.mockReturnValue(undefined);
    renderForm({ format: championsFormat });
    const itemSelect = screen.getByRole("combobox", {
      name: "Item",
    }) as HTMLSelectElement;
    const optionTexts = Array.from(itemSelect.options).map((o) => o.text);
    expect(optionTexts).toContain("Leftovers");
    expect(optionTexts).toContain("Life Orb");
  });

  it("filters item options to the legal set when format provides one", () => {
    mockGetLegalItems.mockReturnValue(new Set(["Leftovers"]));
    renderForm({ format: championsFormat });
    const itemSelect = screen.getByRole("combobox", {
      name: "Item",
    }) as HTMLSelectElement;
    const optionTexts = Array.from(itemSelect.options).map((o) => o.text);
    expect(optionTexts).toContain("Leftovers");
    expect(optionTexts).not.toContain("Life Orb");
  });
});

// =============================================================================
// Tera type filtering by format
// =============================================================================

describe("CalcDefenderForm — Tera type filtering", () => {
  it("shows all types when getLegalTeraTypes returns undefined for Gen 9 format", () => {
    mockGetLegalTeraTypes.mockReturnValue(undefined);
    renderForm({ format: svFormat });
    const teraSelect = screen.getByTestId(
      "calc-defender-tera"
    ) as HTMLSelectElement;
    const optionValues = Array.from(teraSelect.options).map((o) => o.value);
    // ALL_TYPES mock has 6 types
    expect(optionValues.filter((v) => v !== "")).toHaveLength(6);
  });

  it("filters tera types to the legal set when format provides one", () => {
    mockGetLegalTeraTypes.mockReturnValue(new Set(["Fire", "Water"]));
    renderForm({ format: svFormat });
    const teraSelect = screen.getByTestId(
      "calc-defender-tera"
    ) as HTMLSelectElement;
    const optionValues = Array.from(teraSelect.options).map((o) => o.value);
    expect(optionValues).toContain("Fire");
    expect(optionValues).toContain("Water");
    expect(optionValues).not.toContain("Normal");
  });

  it("shows 'Not allowed' text when legal tera set is empty", () => {
    mockGetLegalTeraTypes.mockReturnValue(new Set<string>());
    renderForm({ format: svFormat });
    expect(screen.queryByTestId("calc-defender-tera")).not.toBeInTheDocument();
    expect(screen.getByText("Not allowed")).toBeInTheDocument();
  });

  it("calls onTeraChange when a tera type is selected", async () => {
    const user = userEvent.setup();
    mockGetLegalTeraTypes.mockReturnValue(undefined);
    const handlers = renderForm({ format: svFormat });
    const teraSelect = screen.getByTestId("calc-defender-tera");
    await user.selectOptions(teraSelect, "Fire");
    expect(handlers.onTeraChange).toHaveBeenCalledWith("Fire");
  });
});

// =============================================================================
// Ability filtering by format
// =============================================================================

describe("CalcDefenderForm — Ability filtering", () => {
  it("uses getLegalAbilities result when format provides a legal set", () => {
    mockGetLegalAbilities.mockReturnValue(new Set(["Intimidate"]));
    renderForm({ format: championsFormat });
    const abilitySelect = screen.getByRole("combobox", {
      name: "Ability",
    }) as HTMLSelectElement;
    const optionValues = Array.from(abilitySelect.options).map((o) => o.value);
    expect(optionValues).toContain("Intimidate");
    // "Blaze" is returned by getValidAbilities but not in the legal set
    expect(optionValues).not.toContain("Blaze");
  });

  it("falls back to getValidAbilities when getLegalAbilities returns undefined", () => {
    mockGetLegalAbilities.mockReturnValue(undefined);
    renderForm({ format: championsFormat });
    const abilitySelect = screen.getByRole("combobox", {
      name: "Ability",
    }) as HTMLSelectElement;
    const optionValues = Array.from(abilitySelect.options).map((o) => o.value);
    expect(optionValues).toContain("Intimidate");
    expect(optionValues).toContain("Blaze");
  });
});
