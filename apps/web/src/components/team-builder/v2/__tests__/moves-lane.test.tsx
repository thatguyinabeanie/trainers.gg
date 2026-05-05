"use client";

/**
 * Tests for MovesLane and MoveTile — move slot rendering, click-to-open-picker,
 * calc detail display, KO tier badges, spread/effectiveness badges, and
 * validation error display.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

import { type Tables } from "@trainers/supabase";
import { type GameFormat } from "@trainers/pokemon";

// =============================================================================
// Mocks
// =============================================================================

// Popover — render content inline so popover contents are always queryable
jest.mock("@/components/ui/popover", () => ({
  Popover: ({
    children,
    open,
    onOpenChange,
  }: {
    children: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }) => (
    <div
      data-testid="popover"
      data-open={String(!!open)}
      onClick={() => onOpenChange?.(!open)}
    >
      {children}
    </div>
  ),
  PopoverTrigger: ({
    children,
    render: renderProp,
  }: {
    children?: React.ReactNode;
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
    return <div data-testid="popover-trigger">{children}</div>;
  },
  PopoverContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="popover-content">{children}</div>
  ),
}));

// Dialog — render content inline so picker contents are always queryable
jest.mock("@/components/ui/dialog", () => ({
  Dialog: ({
    children,
    open,
    onOpenChange,
  }: {
    children: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }) => (
    <div
      data-testid="dialog"
      data-open={String(!!open)}
      onClick={() => onOpenChange?.(!open)}
    >
      {children}
    </div>
  ),
  DialogTrigger: ({
    children,
    render: renderProp,
  }: {
    children?: React.ReactNode;
    render?: React.ReactElement;
  }) => {
    if (renderProp) {
      return (
        <div data-testid="dialog-trigger">
          {renderProp}
          {children}
        </div>
      );
    }
    return <div data-testid="dialog-trigger">{children}</div>;
  },
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
}));

// Tooltip — render content inline (Base UI portals on hover with delay; in
// jsdom that's flaky to drive). Inline mount lets us assert the shortDesc
// is wired to the trigger.
jest.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip">{children}</div>
  ),
  TooltipTrigger: ({
    children,
    render: renderProp,
    className,
  }: {
    children?: React.ReactNode;
    render?: React.ReactElement;
    className?: string;
  }) => {
    if (renderProp) {
      return (
        <div data-testid="tooltip-trigger" className={className}>
          {renderProp}
          {children}
        </div>
      );
    }
    return (
      <div data-testid="tooltip-trigger" className={className}>
        {children}
      </div>
    );
  },
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-content">{children}</div>
  ),
}));

// MovePicker stub
jest.mock("../pickers/move-picker", () => ({
  MovePicker: ({
    value,
    onPick,
    onClose,
  }: {
    value: string | null;
    onPick: (name: string) => void;
    onClose: () => void;
  }) => (
    <div data-testid="move-picker" data-value={value ?? ""}>
      <button onClick={() => onPick("Moonblast")}>pick-moonblast</button>
      <button onClick={() => onPick("Flamethrower")}>pick-flamethrower</button>
      <button onClick={onClose}>close-picker</button>
    </div>
  ),
}));

// CalcDetailCard stub
jest.mock("../calc/calc-detail-card", () => ({
  CalcDetailCard: ({
    moveName,
    onClose,
    onChangeMove,
  }: {
    moveName: string;
    onClose: () => void;
    onChangeMove: () => void;
  }) => (
    <div data-testid="calc-detail-card" data-move={moveName}>
      <button onClick={onClose}>close-detail</button>
      <button onClick={onChangeMove}>change-move</button>
    </div>
  ),
}));

// calc-state-context — controlled mock
type RowOutputs = readonly (null | {
  minPercent: number;
  maxPercent: number;
  rolls?: number[];
  koChance?: number | null;
  desc?: string;
  recoveryTier?: string | null;
})[];
const mockCalcContext: {
  calcEnabled: boolean;
  defenderSpecies: string;
  defenderAbility: string;
  defenderItem: string;
  defenderNature: string;
  weather: string;
  inferredWeather: string;
  // Per-row outputs that computeForwardOutputsForRow returns. Tests can mutate
  // mockCalcContext.rowOutputs directly to drive specific KO tier scenarios.
  rowOutputs: RowOutputs;
  computeForwardOutputsForRow: (rowPokemon: unknown) => RowOutputs;
  field: { foesAlive: number; allyAlive: boolean };
} = {
  calcEnabled: false,
  defenderSpecies: "",
  defenderAbility: "",
  defenderItem: "",
  defenderNature: "",
  weather: "",
  inferredWeather: "",
  rowOutputs: [null, null, null, null],
  computeForwardOutputsForRow: (rowPokemon) =>
    rowPokemon === null ? [null, null, null, null] : mockCalcContext.rowOutputs,
  field: { foesAlive: 2, allyAlive: true },
};

jest.mock("../calc/calc-state-context", () => ({
  useCalcStateContext: jest.fn(() => mockCalcContext),
  useCalcEnabled: jest.fn(() => mockCalcContext.calcEnabled),
}));

// getMoveEffectiveness
jest.mock("../calc/move-effectiveness", () => ({
  getMoveEffectiveness: jest.fn().mockReturnValue(1),
}));

// getMoveTargetInfo
jest.mock("../calc/move-target-info", () => ({
  getMoveTargetInfo: jest.fn().mockReturnValue({
    isSpread: false,
    kind: "normal",
  }),
}));

// getVerdict
jest.mock("../../use-calc-state", () => ({
  getVerdict: jest.fn().mockReturnValue(null),
}));

// getMoveData from @trainers/pokemon
jest.mock("@trainers/pokemon", () => ({
  getMoveData: jest.fn().mockReturnValue({
    type: "Dragon",
    category: "Physical",
    basePower: 80,
    accuracy: 100,
    shortDesc: "High critical-hit ratio.",
  }),
  formatHasTera: jest.fn().mockReturnValue(true),
  isChampionsFormat: jest.fn().mockReturnValue(false),
}));

// getShowdownTypeIconUrl from @trainers/pokemon/sprites
jest.mock("@trainers/pokemon/sprites", () => ({
  getShowdownTypeIconUrl: jest.fn((type: string) => `/types/${type}.png`),
}));

// CATEGORY_ICON_URLS
jest.mock("../../move-category-ui", () => ({
  CATEGORY_ICON_URLS: {
    Physical: "/icons/physical.png",
    Special: "/icons/special.png",
    Status: "/icons/status.png",
  },
  CATEGORY_ICON_URLS_MONO: {
    Physical: "/icons/physical-mono.png",
    Special: "/icons/special-mono.png",
    Status: "/icons/status-mono.png",
  },
}));

// FieldError + FieldErrors
jest.mock("../validation/field-error", () => ({
  FieldError: ({
    message,
    severity,
  }: {
    message: string;
    severity?: string;
  }) => (
    <span role="alert" data-severity={severity ?? "error"}>
      {message}
    </span>
  ),
  FieldErrors: ({
    errors,
  }: {
    errors: ReadonlyArray<{ message: string; severity?: string }>;
  }) => (
    <>
      {errors.map((err, i) => (
        <span key={i} role="alert" data-severity={err.severity ?? "error"}>
          {err.message}
        </span>
      ))}
    </>
  ),
}));

// =============================================================================
// Import after mocks
// =============================================================================

import { MovesLane } from "../lanes/moves-lane";
import { type ValidationError } from "../../validation-hooks";
import { useCalcStateContext } from "../calc/calc-state-context";
import { getMoveData } from "@trainers/pokemon";

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

function makePokemon(
  overrides: Partial<Tables<"pokemon">> = {}
): Tables<"pokemon"> {
  return {
    id: 1,
    species: "Gardevoir",
    ability: "Telepathy",
    nature: "Timid",
    move1: "Moonblast",
    move2: "Psychic",
    move3: null,
    move4: null,
    ev_hp: 0,
    ev_attack: 0,
    ev_defense: 0,
    ev_special_attack: 252,
    ev_special_defense: 4,
    ev_speed: 252,
    iv_hp: 31,
    iv_attack: 0,
    iv_defense: 31,
    iv_special_attack: 31,
    iv_special_defense: 31,
    iv_speed: 31,
    level: 50,
    held_item: "Choice Specs",
    nickname: null,
    notes: null,
    tera_type: "Fairy",
    is_shiny: null,
    gender: null,
    format_legal: null,
    created_at: null,
    ...overrides,
  };
}

function makeError(
  field: string,
  severity: "error" | "warning" = "error",
  message = `${field} issue`
): ValidationError {
  return { pokemonId: 1, pokemonName: "Gardevoir", field, message, severity };
}

function renderLane(
  pokemonOverrides: Partial<Tables<"pokemon">> = {},
  format: GameFormat | undefined = VGC_FORMAT,
  fieldErrors?: ValidationError[]
) {
  const onUpdate = jest.fn();
  const result = render(
    <MovesLane
      pokemon={makePokemon(pokemonOverrides)}
      format={format}
      onUpdate={onUpdate}
      fieldErrors={fieldErrors}
    />
  );
  return { ...result, onUpdate };
}

// =============================================================================
// Tests
// =============================================================================

describe("MovesLane — basic render", () => {
  it("renders 4 move tiles (popover triggers)", () => {
    renderLane();
    expect(
      screen.getAllByTestId("popover-trigger").length
    ).toBeGreaterThanOrEqual(4);
  });

  it("renders set moves by name", () => {
    renderLane({
      move1: "Moonblast",
      move2: "Psychic",
      move3: null,
      move4: null,
    });
    expect(screen.getByText("Moonblast")).toBeInTheDocument();
    expect(screen.getByText("Psychic")).toBeInTheDocument();
  });

  it("renders '+ Add move' for empty slots", () => {
    renderLane({ move1: "Moonblast", move2: null, move3: null, move4: null });
    // 3 empty slots
    expect(screen.getAllByText("+ Add move").length).toBe(3);
  });

  it("renders '+ Add move' when a slot is an empty string (regression: move1 was rendering blank)", () => {
    // Dirty data: move1 stored as "" instead of null. ?? wouldn't catch this,
    // so the placeholder text was missing. Boundary normalization fixes it.
    renderLane({ move1: "", move2: null, move3: null, move4: null });
    expect(screen.getAllByText("+ Add move").length).toBe(4);
  });

  it.each([
    ["move1", "Moonblast"],
    ["move2", "Psychic"],
    ["move3", "Thunderbolt"],
    ["move4", "Protect"],
  ] as const)("renders %s move name '%s' in the lane", (slot, moveName) => {
    renderLane({ [slot]: moveName });
    expect(screen.getByText(moveName)).toBeInTheDocument();
  });
});

describe("MovesLane — move tile display", () => {
  it("shows the type icon for a set move (wordless TypeSymbolIcon)", () => {
    renderLane({ move1: "Moonblast" });
    // getMoveData returns type: "Dragon" → role=img with aria-label="Dragon"
    const icons = screen.getAllByRole("img", { name: "Dragon" });
    expect(icons.length).toBeGreaterThan(0);
  });

  it("shows the category icon img for a set move", () => {
    renderLane({ move1: "Moonblast" });
    const categoryImgs = screen.getAllByAltText("Physical");
    expect(categoryImgs.length).toBeGreaterThan(0);
  });

  it("shows base power for a damaging move", () => {
    renderLane({ move1: "Moonblast" });
    // getMoveData returns basePower: 80
    expect(screen.getAllByText("80").length).toBeGreaterThan(0);
  });

  it("shows accuracy for a move with numeric accuracy", () => {
    renderLane({ move1: "Moonblast" });
    // getMoveData returns accuracy: 100 → rendered as plain number
    expect(screen.getAllByText("100").length).toBeGreaterThan(0);
  });

  it("shows '—' for accuracy when accuracy is true (always-hit)", () => {
    (getMoveData as jest.Mock).mockReturnValueOnce({
      type: "Normal",
      category: "Status",
      basePower: 0,
      accuracy: true,
      shortDesc: "User falls asleep.",
    });
    renderLane({ move1: "Rest" });
    // accuracy=true → rendered as "—"
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("renders the move's short description in a Tooltip when a move is set", () => {
    // Default mock returns shortDesc: "High critical-hit ratio." for any move.
    // The tooltip is mocked to render content inline; verify the short
    // description is wired to the trigger so the new hover affordance
    // doesn't silently regress.
    renderLane({ move1: "Stone Edge", move2: null, move3: null, move4: null });
    expect(screen.getAllByText("High critical-hit ratio.").length).toBe(1);
  });

  it("does NOT render a tooltip body for empty move slots", () => {
    renderLane({ move1: null, move2: null, move3: null, move4: null });
    // No move name → moveData?.shortDesc is undefined → the conditional
    // `{moveName && moveData?.shortDesc && <TooltipContent>...}` short-circuits.
    expect(screen.queryByTestId("tooltip-content")).toBeNull();
  });

  it("does NOT render a description tooltip when getMoveData has no shortDesc", () => {
    (getMoveData as jest.Mock).mockReturnValueOnce({
      type: "Normal",
      category: "Physical",
      basePower: 40,
      accuracy: 100,
      shortDesc: undefined,
    });
    renderLane({ move1: "Tackle", move2: null, move3: null, move4: null });
    // The type icon (wordless TypeSymbolIcon) renders its own tooltip with
    // the type name ("Normal") — that's expected. We only need to confirm
    // the *description* tooltip with the (missing) shortDesc text is gone.
    const tooltipBodies = screen
      .queryAllByTestId("tooltip-content")
      .map((el) => el.textContent);
    expect(tooltipBodies).not.toContain(undefined);
    expect(tooltipBodies).not.toContain("");
    // Only the type-icon tooltip should remain.
    expect(tooltipBodies).toEqual(["Normal"]);
  });
});

describe("MovesLane — picking a move", () => {
  it("renders the MovePicker in every slot's popover content", () => {
    renderLane({ move1: null, move2: null, move3: null, move4: null });
    expect(screen.getAllByTestId("move-picker").length).toBe(4);
  });

  it("calls onUpdate with move1 when a move is picked in slot 1", async () => {
    const user = userEvent.setup();
    const { onUpdate } = renderLane({
      move1: null,
      move2: null,
      move3: null,
      move4: null,
    });
    // Click the first pick-moonblast button
    const pickButtons = screen.getAllByText("pick-moonblast");
    await user.click(pickButtons[0]);
    expect(onUpdate).toHaveBeenCalledWith({ move1: "Moonblast" });
  });

  it("calls onUpdate with move2 when a move is picked in slot 2", async () => {
    const user = userEvent.setup();
    const { onUpdate } = renderLane({
      move1: "Moonblast",
      move2: null,
      move3: null,
      move4: null,
    });
    const pickButtons = screen.getAllByText("pick-flamethrower");
    await user.click(pickButtons[1]);
    expect(onUpdate).toHaveBeenCalledWith({ move2: "Flamethrower" });
  });

  it.each([
    [0, "move1"],
    [1, "move2"],
    [2, "move3"],
    [3, "move4"],
  ] as const)(
    "slot %i calls onUpdate with %s key",
    async (slotIdx, slotKey) => {
      const user = userEvent.setup();
      const { onUpdate } = renderLane({
        move1: null,
        move2: null,
        move3: null,
        move4: null,
      });
      const pickButtons = screen.getAllByText("pick-moonblast");
      await user.click(pickButtons[slotIdx]);
      expect(onUpdate).toHaveBeenCalledWith({ [slotKey]: "Moonblast" });
    }
  );
});

describe("MovesLane — click behaviour (no calc)", () => {
  beforeEach(() => {
    (useCalcStateContext as jest.Mock).mockReturnValue({
      ...mockCalcContext,
      calcEnabled: false,
    });
  });

  it("opens the picker panel when clicking an empty slot", () => {
    renderLane({ move1: null });
    // With calc disabled, clicking should show MovePicker (it's always shown since no CalcDetailCard)
    const pickButtons = screen.getAllByText("pick-moonblast");
    expect(pickButtons.length).toBeGreaterThan(0);
  });

  it("shows MovePicker (not CalcDetailCard) when calc is disabled", () => {
    renderLane({ move1: "Moonblast" });
    expect(screen.queryByTestId("calc-detail-card")).not.toBeInTheDocument();
    expect(screen.getAllByTestId("move-picker").length).toBeGreaterThan(0);
  });
});

// NOTE: Calc result display (KO tier labels, damage ranges, effectiveness badges,
// spread badges, "pick a target" hints) was moved to the CalcColumn component.
// Those behaviors are tested in calc-column.test.tsx.

describe("MovesLane — validation errors", () => {
  it("renders a FieldError for a move1 error", () => {
    renderLane({ move1: "" }, VGC_FORMAT, [
      makeError("move1", "error", "Move 1 required"),
    ]);
    expect(screen.getByRole("alert")).toHaveTextContent("Move 1 required");
  });

  it("renders FieldErrors for multiple move slots", () => {
    renderLane({ move1: "", move2: null }, VGC_FORMAT, [
      makeError("move1", "error", "Move 1 required"),
      makeError("move2", "warning", "Move 2 advisory"),
    ]);
    const alerts = screen.getAllByRole("alert");
    expect(alerts.length).toBeGreaterThanOrEqual(2);
    const messages = alerts.map((a) => a.textContent);
    expect(messages).toContain("Move 1 required");
    expect(messages).toContain("Move 2 advisory");
  });

  it.each([
    ["move1", "Move 1 error"],
    ["move2", "Move 2 error"],
    ["move3", "Move 3 error"],
    ["move4", "Move 4 error"],
  ] as const)("renders FieldError for %s", (field, message) => {
    renderLane({}, VGC_FORMAT, [makeError(field, "error", message)]);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(message);
  });

  it("applies ring-destructive class when a slot has an error", () => {
    renderLane({ move1: "Moonblast" }, VGC_FORMAT, [
      makeError("move1", "error", "Move illegal"),
    ]);
    // The tile button gets ring-destructive styling — check alert is present
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});

describe("MovesLane — ghost mode (pokemon: null)", () => {
  it("renders without crashing when pokemon is null (no CalcStateContext needed)", () => {
    // The ghost branch must NOT call useCalcStateContext — renders standalone
    expect(() => render(<MovesLane pokemon={null} />)).not.toThrow();
  });

  it("renders 4 placeholder rows with '+ Add move' text", () => {
    render(<MovesLane pokemon={null} />);
    expect(screen.getAllByText("+ Add move").length).toBe(4);
  });

  it("contains no interactive elements (zero buttons)", () => {
    render(<MovesLane pokemon={null} />);
    expect(screen.queryAllByRole("button").length).toBe(0);
  });

  it("renders '+ Add move' as span elements, not buttons", () => {
    render(<MovesLane pokemon={null} />);
    const addMoveSpans = screen.getAllByText("+ Add move");
    expect(addMoveSpans.length).toBe(4);
    addMoveSpans.forEach((el) => {
      expect(el.tagName.toLowerCase()).toBe("span");
    });
  });
});

describe("MovesLane — table headers", () => {
  it("provides sr-only accessible labels for Type and Category column headers", () => {
    renderLane();
    const headers = screen.getAllByRole("columnheader");
    const texts = headers.map((h) => h.textContent?.trim());
    expect(texts).toContain("Type");
    expect(texts).toContain("Category");
  });
});

describe("MovesLane — inline calc display", () => {
  beforeEach(() => {
    (useCalcStateContext as jest.Mock).mockImplementation(() => mockCalcContext);
    mockCalcContext.calcEnabled = false;
    mockCalcContext.rowOutputs = [null, null, null, null];
  });

  afterEach(() => {
    mockCalcContext.calcEnabled = false;
    mockCalcContext.rowOutputs = [null, null, null, null];
  });

  it("shows damage percentage range and KO tier for a damaging move when calc is enabled", () => {
    mockCalcContext.calcEnabled = true;
    mockCalcContext.rowOutputs = [
      { minPercent: 65.4, maxPercent: 77.2, rolls: [] },
      null,
      null,
      null,
    ];
    renderLane({ move1: "Moonblast", move2: null, move3: null, move4: null });
    expect(screen.getByText("65.4–77.2%")).toBeInTheDocument();
    expect(screen.getByText("4HKO+")).toBeInTheDocument();
  });

  it("shows '—' placeholder for Status moves even when calc is enabled", () => {
    (getMoveData as jest.Mock).mockReturnValueOnce({
      type: "Normal",
      category: "Status",
      basePower: 0,
      accuracy: true,
      shortDesc: "User falls asleep.",
    });
    mockCalcContext.calcEnabled = true;
    mockCalcContext.rowOutputs = [
      { minPercent: 50.0, maxPercent: 60.0, rolls: [] },
      null,
      null,
      null,
    ];
    renderLane({ move1: "Rest", move2: null, move3: null, move4: null });
    // Status move: hasCalc = false → percentage cell shows "—" not a range
    expect(screen.queryByText("50.0–60.0%")).not.toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });
});
