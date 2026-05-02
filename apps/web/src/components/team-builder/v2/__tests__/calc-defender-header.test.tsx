"use client";

/**
 * Behavioural tests for DefenderMonHeader.
 *
 * DefenderMonHeader is the identity section of the damage-calc defender panel.
 * It renders:
 *   - A species picker trigger (pill)
 *   - A sprite + type pills (when species is set)
 *   - Item / Ability / Nature / Tera form rows (using DefenderFormChip with popovers)
 *   - A "No abilities found for format" warning when legalAbilities is empty
 *     and defenderSpecies is set
 *
 * Picker mocking strategy: we replace each picker with a minimal stub that
 * exposes an onPick button so we can drive the callback directly, without
 * having to open real Base-UI popovers.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

import { type GameFormat } from "@trainers/pokemon";

// =============================================================================
// Module mocks — must be declared before any imports of the module under test
// =============================================================================

// CSS module
jest.mock("../builder.module.css", () =>
  new Proxy({}, { get: (_t, k) => String(k) })
);

// Popover — render children directly so we don't need a real DOM-portal.
// Used by Item / Ability / Nature / Tera FormChips below.
jest.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PopoverTrigger: ({
    children,
    className,
    render: renderProp,
  }: {
    children: React.ReactNode;
    className?: string;
    render?: React.ReactElement;
  }) => {
    if (renderProp) {
      return (
        <div data-testid="popover-trigger">
          {renderProp}
          {children}
        </div>
      );
    }
    return <div data-testid="popover-trigger" className={className}>{children}</div>;
  },
  PopoverContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="popover-content">{children}</div>
  ),
}));

// Dialog — render content inline so the species picker is always queryable.
// In production the picker now mounts inside a DialogContent portal.
jest.mock("@/components/ui/dialog", () => ({
  Dialog: ({
    children,
    open,
  }: {
    children: React.ReactNode;
    open?: boolean;
  }) => (
    <div data-testid="dialog" data-open={String(!!open)}>
      {children}
    </div>
  ),
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
}));

// Sprite stub
jest.mock("../sprite", () => ({
  Sprite: ({ species }: { species: string }) => (
    <img data-testid="sprite" alt={species} />
  ),
}));

// TypePill stub
jest.mock("../type-pill", () => ({
  TypePill: ({ t }: { t: string }) => <span data-testid="type-pill">{t}</span>,
}));

// SpeciesPicker stub — exposes "pick species" button that calls onPick
jest.mock("../pickers/species-picker", () => ({
  SpeciesPicker: ({
    onPick,
  }: {
    onPick: (species: string) => void;
    value?: string;
    format?: GameFormat;
    onClose?: () => void;
  }) => (
    <button
      data-testid="species-picker"
      onClick={() => onPick("Garchomp")}
    >
      pick species
    </button>
  ),
}));

// ItemPicker stub
jest.mock("../pickers/item-picker", () => ({
  ItemPicker: ({
    onPick,
  }: {
    onPick: (item: string) => void;
    value?: string;
    format?: GameFormat;
    teamItems?: string[];
    onClose?: () => void;
  }) => (
    <button
      data-testid="item-picker"
      onClick={() => onPick("Sitrus Berry")}
    >
      pick item
    </button>
  ),
}));

// AbilityPicker stub
jest.mock("../pickers/ability-picker", () => ({
  AbilityPicker: ({
    onPick,
  }: {
    onPick: (ability: string) => void;
    value?: string;
    species?: string;
    format?: GameFormat;
    onClose?: () => void;
  }) => (
    <button
      data-testid="ability-picker"
      onClick={() => onPick("Intimidate")}
    >
      pick ability
    </button>
  ),
}));

// NaturePicker stub
jest.mock("../pickers/nature-picker", () => ({
  NaturePicker: ({
    onPick,
  }: {
    onPick: (nat: string) => void;
    value?: string;
    onClose?: () => void;
  }) => (
    <button
      data-testid="nature-picker"
      onClick={() => onPick("Adamant")}
    >
      pick nature
    </button>
  ),
}));

// TypePicker stub
jest.mock("../pickers/type-picker", () => ({
  TypePicker: ({
    onPick,
  }: {
    onPick: (type: string) => void;
    value?: string;
    onClose?: () => void;
  }) => (
    <button
      data-testid="type-picker"
      onClick={() => onPick("Fire")}
    >
      pick type
    </button>
  ),
}));

// @trainers/pokemon — mocks for type lookup, abilities, nature effects, formatHasTera
const mockGetSpeciesTypes = jest.fn();
const mockGetLegalAbilities = jest.fn();
const mockFormatHasTera = jest.fn();

// NATURE_EFFECTS is used directly as NATURE_EFFECTS[nature] so provide a realistic value
const NATURE_EFFECTS_FIXTURE: Record<
  string,
  { boost: string; reduce: string } | undefined
> = {
  Adamant: { boost: "attack", reduce: "specialAttack" },
  Modest: { boost: "specialAttack", reduce: "attack" },
  Timid: { boost: "speed", reduce: "attack" },
  Hardy: undefined,
  Docile: undefined,
};

// Re-create the LEGALITY_UNAVAILABLE sentinel inside the mock so production
// code's `result === LEGALITY_UNAVAILABLE` checks work consistently.
const MOCK_LEGALITY_UNAVAILABLE: unique symbol = Symbol("legality-unavailable");
jest.mock("@trainers/pokemon", () => ({
  getSpeciesTypes: (...args: unknown[]) => mockGetSpeciesTypes(...args),
  getLegalAbilities: (...args: unknown[]) => mockGetLegalAbilities(...args),
  NATURE_EFFECTS: NATURE_EFFECTS_FIXTURE,
  formatHasTera: (...args: unknown[]) => mockFormatHasTera(...args),
  // Mega-aware helpers — defaults assume non-mega species (no override).
  getMegaAbilityForSpecies: jest.fn().mockReturnValue(null),
  getCanonicalBaseSpecies: jest.fn((s: string) => s),
  // Used by NatureChevrons, which calc-defender-header renders for the Nat chip.
  STAT_LABELS: {
    hp: "HP",
    attack: "Atk",
    defense: "Def",
    specialAttack: "SpA",
    specialDefense: "SpD",
    speed: "Spe",
  },
  // Legality sentinel + helper added by the LEGALITY_UNAVAILABLE refactor.
  // calc-defender-header is a read-path consumer, so it routes through
  // legalSetOrPermissive — the test mock collapses both undefined and the
  // sentinel into undefined.
  LEGALITY_UNAVAILABLE: MOCK_LEGALITY_UNAVAILABLE,
  legalSetOrPermissive: (result: unknown) =>
    result === undefined || result === MOCK_LEGALITY_UNAVAILABLE
      ? undefined
      : result,
}));

// =============================================================================
// Import after mocks
// =============================================================================

import {
  DefenderMonHeader,
  type DefenderMonHeaderProps,
} from "../calc/calc-defender-header";

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

/** A format that does NOT support Tera (mocked via formatHasTera returning false). */
const CHAMPIONS_FORMAT: GameFormat = {
  id: "championsvgc2026regma",
  game: "Pokemon Champions",
  gameShort: "CH",
  generation: 10,
  category: "Champions",
  year: 2026,
  regulation: "A",
  label: "CH: Reg A",
  showdownName: "[Champions] VGC 2026 Reg M-A",
  doubles: true,
  active: true,
};

function makeProps(overrides: Partial<DefenderMonHeaderProps> = {}): DefenderMonHeaderProps {
  return {
    defenderSpecies: "",
    defenderAbility: "",
    defenderItem: "",
    defenderNature: "",
    defenderTera: "",
    format: VGC_FORMAT,
    setDefenderSpecies: jest.fn(),
    setDefenderAbility: jest.fn(),
    setDefenderItem: jest.fn(),
    setDefenderNature: jest.fn(),
    setDefenderTera: jest.fn(),
    defenderMegaActive: true,
    setDefenderMegaActive: jest.fn(),
    ...overrides,
  };
}

// =============================================================================
// Setup
// =============================================================================

beforeEach(() => {
  jest.clearAllMocks();
  mockGetSpeciesTypes.mockReturnValue([]);
  mockGetLegalAbilities.mockReturnValue(new Set(["Intimidate", "Moxie"]));
  mockFormatHasTera.mockReturnValue(true);
});

// =============================================================================
// Tests — species pill
// =============================================================================

describe("DefenderMonHeader — species pill", () => {
  it("shows 'Choose species…' placeholder when no species is set", () => {
    render(<DefenderMonHeader {...makeProps()} />);
    expect(screen.getByText("Choose species…")).toBeInTheDocument();
  });

  it("shows the species name when defenderSpecies is set", () => {
    mockGetSpeciesTypes.mockReturnValue(["Fire", "Ghost"]);
    render(<DefenderMonHeader {...makeProps({ defenderSpecies: "Incineroar" })} />);
    expect(screen.getByText("Incineroar")).toBeInTheDocument();
  });

  it("calls setDefenderSpecies when SpeciesPicker onPick fires", async () => {
    const user = userEvent.setup();
    const setDefenderSpecies = jest.fn();
    render(<DefenderMonHeader {...makeProps({ setDefenderSpecies })} />);
    await user.click(screen.getByTestId("species-picker"));
    expect(setDefenderSpecies).toHaveBeenCalledWith("Garchomp");
  });
});

// =============================================================================
// Tests — sprite and type pills
// =============================================================================

describe("DefenderMonHeader — sprite", () => {
  it("renders the sprite element", () => {
    render(<DefenderMonHeader {...makeProps()} />);
    expect(screen.getByTestId("sprite")).toBeInTheDocument();
  });

  it("renders type pills when species has types", () => {
    mockGetSpeciesTypes.mockReturnValue(["Fire", "Ghost"]);
    render(<DefenderMonHeader {...makeProps({ defenderSpecies: "Incineroar" })} />);
    const pills = screen.getAllByTestId("type-pill");
    expect(pills).toHaveLength(2);
    expect(pills[0]).toHaveTextContent("Fire");
    expect(pills[1]).toHaveTextContent("Ghost");
  });

  it("renders no type pills when species is empty", () => {
    mockGetSpeciesTypes.mockReturnValue([]);
    render(<DefenderMonHeader {...makeProps({ defenderSpecies: "" })} />);
    expect(screen.queryAllByTestId("type-pill")).toHaveLength(0);
  });
});

// =============================================================================
// Tests — Item row
// =============================================================================

describe("DefenderMonHeader — Item row", () => {
  it("renders the Item label", () => {
    render(<DefenderMonHeader {...makeProps()} />);
    expect(screen.getByText("Item")).toBeInTheDocument();
  });

  it("shows the em-dash placeholder when defenderItem is empty", () => {
    render(<DefenderMonHeader {...makeProps({ defenderItem: "" })} />);
    // The placeholder "—" appears in the Item chip
    const trigger = screen.getAllByTestId("popover-trigger")[0]; // Item is 1st popover (species uses Dialog)
    expect(trigger.textContent).toContain("—");
  });

  it("shows the item name when defenderItem is set", () => {
    render(<DefenderMonHeader {...makeProps({ defenderItem: "Sitrus Berry" })} />);
    expect(screen.getByText("Sitrus Berry")).toBeInTheDocument();
  });

  it("calls setDefenderItem when ItemPicker onPick fires", async () => {
    const user = userEvent.setup();
    const setDefenderItem = jest.fn();
    render(<DefenderMonHeader {...makeProps({ setDefenderItem })} />);
    await user.click(screen.getByTestId("item-picker"));
    expect(setDefenderItem).toHaveBeenCalledWith("Sitrus Berry");
  });
});

// =============================================================================
// Tests — Ability row
// =============================================================================

describe("DefenderMonHeader — Ability row", () => {
  it("renders the Abil label", () => {
    render(<DefenderMonHeader {...makeProps()} />);
    expect(screen.getByText("Abil")).toBeInTheDocument();
  });

  it("shows the em-dash placeholder when defenderAbility is empty", () => {
    render(<DefenderMonHeader {...makeProps({ defenderAbility: "" })} />);
    const trigger = screen.getAllByTestId("popover-trigger")[1]; // Abil is 2nd popover
    expect(trigger.textContent).toContain("—");
  });

  it("shows the ability name when defenderAbility is set", () => {
    render(<DefenderMonHeader {...makeProps({ defenderAbility: "Intimidate" })} />);
    expect(screen.getByText("Intimidate")).toBeInTheDocument();
  });

  it("calls setDefenderAbility when AbilityPicker onPick fires", async () => {
    const user = userEvent.setup();
    const setDefenderAbility = jest.fn();
    render(<DefenderMonHeader {...makeProps({ setDefenderAbility })} />);
    await user.click(screen.getByTestId("ability-picker"));
    expect(setDefenderAbility).toHaveBeenCalledWith("Intimidate");
  });

  it("uses getLegalAbilities when format is set and returns abilities", () => {
    mockGetLegalAbilities.mockReturnValue(new Set(["Intimidate"]));
    render(<DefenderMonHeader {...makeProps({
      defenderSpecies: "Incineroar",
      format: VGC_FORMAT,
    })} />);
    expect(mockGetLegalAbilities).toHaveBeenCalledWith("Incineroar", VGC_FORMAT.id);
  });

  it("treats getLegalAbilities returning undefined as permissive (no warning)", () => {
    // When getLegalAbilities returns undefined (unknown format), we default
    // hasLegalAbility to true — no "No abilities found" warning should appear.
    mockGetLegalAbilities.mockReturnValue(undefined);
    render(<DefenderMonHeader {...makeProps({
      defenderSpecies: "Incineroar",
      format: VGC_FORMAT,
    })} />);
    expect(screen.queryByText(/No abilities found for format/)).not.toBeInTheDocument();
  });

  it("does not call getLegalAbilities when format is undefined", () => {
    render(<DefenderMonHeader {...makeProps({
      defenderSpecies: "Incineroar",
      format: undefined,
    })} />);
    expect(mockGetLegalAbilities).not.toHaveBeenCalled();
  });

  it("does not show warning when format is undefined (no format restriction)", () => {
    render(<DefenderMonHeader {...makeProps({
      defenderSpecies: "Incineroar",
      format: undefined,
    })} />);
    expect(screen.queryByText(/No abilities found for format/)).not.toBeInTheDocument();
  });
});

// =============================================================================
// Tests — "No abilities found" warning
// =============================================================================

describe("DefenderMonHeader — no-abilities warning", () => {
  it("shows warning when species is set and legalAbilities is empty", () => {
    // getLegalAbilities returns empty Set → legalAbilities.length === 0
    mockGetLegalAbilities.mockReturnValue(new Set());
    render(<DefenderMonHeader {...makeProps({
      defenderSpecies: "Incineroar",
      format: VGC_FORMAT,
    })} />);
    expect(screen.getByText(/No abilities found for format/)).toBeInTheDocument();
  });

  it("does NOT show warning when legalAbilities is non-empty", () => {
    mockGetLegalAbilities.mockReturnValue(new Set(["Intimidate"]));
    render(<DefenderMonHeader {...makeProps({
      defenderSpecies: "Incineroar",
      format: VGC_FORMAT,
    })} />);
    expect(screen.queryByText(/No abilities found for format/)).not.toBeInTheDocument();
  });

  it("does NOT show warning when defenderSpecies is empty even if abilities list is empty", () => {
    mockGetLegalAbilities.mockReturnValue(new Set());
    render(<DefenderMonHeader {...makeProps({
      defenderSpecies: "",
      format: VGC_FORMAT,
    })} />);
    expect(screen.queryByText(/No abilities found for format/)).not.toBeInTheDocument();
  });
});

// =============================================================================
// Tests — Nature row
// =============================================================================

describe("DefenderMonHeader — Nature row", () => {
  it("renders the Nat label", () => {
    render(<DefenderMonHeader {...makeProps()} />);
    expect(screen.getByText("Nat")).toBeInTheDocument();
  });

  it("shows the em-dash placeholder when defenderNature is empty", () => {
    render(<DefenderMonHeader {...makeProps({ defenderNature: "" })} />);
    const trigger = screen.getAllByTestId("popover-trigger")[2]; // Nat is 3rd popover
    expect(trigger.textContent).toContain("—");
  });

  it("calls setDefenderNature when NaturePicker onPick fires", async () => {
    const user = userEvent.setup();
    const setDefenderNature = jest.fn();
    render(<DefenderMonHeader {...makeProps({ setDefenderNature })} />);
    await user.click(screen.getByTestId("nature-picker"));
    expect(setDefenderNature).toHaveBeenCalledWith("Adamant");
  });

  it("shows +Atk/-SpA chevrons for Adamant nature", () => {
    render(<DefenderMonHeader {...makeProps({ defenderNature: "Adamant" })} />);
    expect(screen.getByText("+Atk")).toBeInTheDocument();
    expect(screen.getByText("−SpA")).toBeInTheDocument();
  });

  it("shows +SpA/-Atk chevrons for Modest nature", () => {
    render(<DefenderMonHeader {...makeProps({ defenderNature: "Modest" })} />);
    expect(screen.getByText("+SpA")).toBeInTheDocument();
    expect(screen.getByText("−Atk")).toBeInTheDocument();
  });

  it("shows +Spe/-Atk chevrons for Timid nature", () => {
    render(<DefenderMonHeader {...makeProps({ defenderNature: "Timid" })} />);
    expect(screen.getByText("+Spe")).toBeInTheDocument();
    expect(screen.getByText("−Atk")).toBeInTheDocument();
  });

  it("renders no +/- chevrons for Hardy (neutral) nature", () => {
    render(<DefenderMonHeader {...makeProps({ defenderNature: "Hardy" })} />);
    // No boost/reduce means no +Atk, −SpA etc.
    expect(screen.queryByText(/^\+/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^−/)).not.toBeInTheDocument();
  });

  it("renders no +/- chevrons for Docile (neutral) nature", () => {
    render(<DefenderMonHeader {...makeProps({ defenderNature: "Docile" })} />);
    expect(screen.queryByText(/^\+/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^−/)).not.toBeInTheDocument();
  });
});

// =============================================================================
// Tests — Tera row (format gating)
// =============================================================================

describe("DefenderMonHeader — Tera row format gating", () => {
  it("renders the Tera row when formatSupportsTera returns true (VGC)", () => {
    mockFormatHasTera.mockReturnValue(true);
    render(<DefenderMonHeader {...makeProps({ format: VGC_FORMAT })} />);
    expect(screen.getByText("Tera")).toBeInTheDocument();
  });

  it("does NOT render the Tera row when formatSupportsTera returns false (Champions)", () => {
    mockFormatHasTera.mockReturnValue(false);
    render(<DefenderMonHeader {...makeProps({ format: CHAMPIONS_FORMAT })} />);
    expect(screen.queryByText("Tera")).not.toBeInTheDocument();
  });

  it("does NOT render the Tera row when format is undefined", () => {
    render(<DefenderMonHeader {...makeProps({ format: undefined })} />);
    expect(screen.queryByText("Tera")).not.toBeInTheDocument();
  });

  it("shows the em-dash placeholder when defenderTera is empty and Tera row is shown", () => {
    mockFormatHasTera.mockReturnValue(true);
    render(<DefenderMonHeader {...makeProps({ format: VGC_FORMAT, defenderTera: "" })} />);
    const teraLabel = screen.getByText("Tera");
    const teraChip = teraLabel.closest("[data-testid='popover-trigger']");
    expect(teraChip?.textContent).toContain("—");
  });

  it("shows the tera type when defenderTera is set", () => {
    mockFormatHasTera.mockReturnValue(true);
    render(<DefenderMonHeader {...makeProps({ format: VGC_FORMAT, defenderTera: "Fire" })} />);
    expect(screen.getByText("Fire")).toBeInTheDocument();
  });

  it("calls setDefenderTera when TypePicker onPick fires", async () => {
    const user = userEvent.setup();
    const setDefenderTera = jest.fn();
    mockFormatHasTera.mockReturnValue(true);
    render(<DefenderMonHeader {...makeProps({ format: VGC_FORMAT, setDefenderTera })} />);
    await user.click(screen.getByTestId("type-picker"));
    expect(setDefenderTera).toHaveBeenCalledWith("Fire");
  });
});
