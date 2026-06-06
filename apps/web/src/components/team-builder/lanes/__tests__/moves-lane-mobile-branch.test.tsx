/**
 * Targeted tests for the MoveTile conditional-mount branch:
 *   - mobile  → MovePickerMobile (bottom-sheet Drawer)
 *   - desktop → MovePicker inside a Dialog
 *
 * MoveTile depends on CalcStateContext, Popover, Dialog, and many heavy
 * sub-components. This file mocks them all to keep tests fast and focused on
 * the single branching decision: which picker renders on which viewport.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ── useIsMobile ─────────────────────────────────────────────────────────────
const mockUseIsMobile = jest.fn<boolean, []>();
jest.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => mockUseIsMobile(),
}));

// ── @trainers/pokemon ────────────────────────────────────────────────────────
jest.mock("@trainers/pokemon", () => ({
  getMoveData: jest.fn().mockReturnValue(null),
}));

// ── sonner — toast is used in update handlers ────────────────────────────────
jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

// ── CalcStateContext — provide a minimal stub so MoveTile renders ─────────
jest.mock("../../calc/calc-state-context", () => ({
  useCalcStateContext: jest.fn().mockReturnValue({
    calcEnabled: false,
    computeForwardOutputsForRow: () => [],
    field: { foesAlive: 1, allyAlive: 1 },
  }),
  useCalcEnabled: jest.fn().mockReturnValue(false),
}));

// ── Heavy calc helpers ───────────────────────────────────────────────────────
jest.mock("../calc-display-helpers", () => ({
  getDisplayRangeAndKoTier: jest.fn().mockReturnValue({
    koTier: null,
    displayMin: 0,
    displayMax: 0,
  }),
}));

// ── UI primitives — keep them lightweight ────────────────────────────────────
jest.mock("@/components/ui/dialog", () => ({
  Dialog: ({
    children,
    open,
  }: {
    children: React.ReactNode;
    open: boolean;
  }) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
}));

jest.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PopoverContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

jest.mock("@/components/ui/table", () => ({
  Table: ({ children }: { children: React.ReactNode }) => (
    <table>{children}</table>
  ),
  TableBody: ({ children }: { children: React.ReactNode }) => (
    <tbody>{children}</tbody>
  ),
  TableCell: ({
    children,
    colSpan,
  }: {
    children?: React.ReactNode;
    colSpan?: number;
  }) => <td colSpan={colSpan}>{children}</td>,
  TableHead: ({ children }: { children: React.ReactNode }) => (
    <th>{children}</th>
  ),
  TableHeader: ({ children }: { children: React.ReactNode }) => (
    <thead>{children}</thead>
  ),
  TableRow: ({
    children,
    ...rest
  }: {
    children?: React.ReactNode;
    [key: string]: unknown;
  }) => <tr {...rest}>{children}</tr>,
}));

jest.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

// ── Picker stubs — the thing under test ──────────────────────────────────────
jest.mock("../../pickers/move-picker", () => ({
  MovePicker: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="desktop-move-picker">
      <button type="button" onClick={onClose}>
        close desktop picker
      </button>
    </div>
  ),
}));

jest.mock("../../pickers/move-picker-mobile", () => ({
  MovePickerMobile: ({
    open,
    onOpenChange,
    onPick,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onPick: (name: string) => void;
  }) =>
    open ? (
      <div data-testid="mobile-move-picker">
        <button type="button" onClick={() => onPick("Earthquake")}>
          pick earthquake
        </button>
        <button type="button" onClick={() => onOpenChange(false)}>
          close mobile picker
        </button>
      </div>
    ) : null,
}));

// ── Other team-builder components ─────────────────────────────────────────────
jest.mock("../../move-category-ui", () => ({
  CATEGORY_ICON_URLS_MONO: {},
}));

jest.mock("../../type-symbol-icon", () => ({
  TypeSymbolIcon: ({ type }: { type: string }) => <span>{type}</span>,
}));

jest.mock("../../calc/calc-detail-card", () => ({
  CalcDetailCard: () => <div data-testid="calc-detail-card" />,
}));

jest.mock("../../validation/field-error", () => ({
  FieldErrors: () => <div data-testid="field-errors" />,
}));

jest.mock("../description-tooltip", () => ({
  DescriptionTooltip: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

jest.mock("../../validation-hooks", () => ({}));

// ── Import subject under test ─────────────────────────────────────────────────
import { MovesLane } from "../moves-lane";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const MOCK_POKEMON = {
  id: 1,
  team_id: 1,
  species: "Garchomp",
  nickname: null,
  level: 50,
  item: null,
  ability: null,
  nature: null,
  move1: null,
  move2: null,
  move3: null,
  move4: null,
  hp_ev: 0,
  atk_ev: 0,
  def_ev: 0,
  spa_ev: 0,
  spd_ev: 0,
  spe_ev: 0,
  hp_iv: 31,
  atk_iv: 31,
  def_iv: 31,
  spa_iv: 31,
  spd_iv: 31,
  spe_iv: 31,
  tera_type: null,
  slot: 0,
  created_at: "2024-01-01",
  updated_at: "2024-01-01",
};

const FORMAT = { id: "gen9vgc2025regg", name: "VGC 2025 Reg G" };

// ---------------------------------------------------------------------------
// Supabase client mock — MovesLane accesses @trainers/supabase for type shape
// ---------------------------------------------------------------------------
jest.mock("@trainers/supabase", () => ({}));

describe("MoveTile — conditional picker mount", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("on mobile (useIsMobile() returns true)", () => {
    beforeEach(() => {
      mockUseIsMobile.mockReturnValue(true);
    });

    it("renders MovePickerMobile when the move tile is clicked and picker opens", async () => {
      const user = userEvent.setup();
      render(
        <MovesLane
          pokemon={MOCK_POKEMON}
          format={FORMAT}
          onUpdate={jest.fn()}
        />
      );

      // Click a move row to open the picker
      const moveRows = screen.getAllByRole("row");
      const clickableRow = moveRows.find(
        (r) => r.getAttribute("tabIndex") === "0"
      );
      if (clickableRow) {
        await user.click(clickableRow);
      }

      expect(screen.getByTestId("mobile-move-picker")).toBeInTheDocument();
      expect(screen.queryByTestId("desktop-move-picker")).not.toBeInTheDocument();
    });

    it("does NOT render the desktop Dialog when on mobile", async () => {
      const user = userEvent.setup();
      render(
        <MovesLane
          pokemon={MOCK_POKEMON}
          format={FORMAT}
          onUpdate={jest.fn()}
        />
      );

      const moveRows = screen.getAllByRole("row");
      const clickableRow = moveRows.find(
        (r) => r.getAttribute("tabIndex") === "0"
      );
      if (clickableRow) {
        await user.click(clickableRow);
      }

      expect(screen.queryByTestId("dialog")).not.toBeInTheDocument();
    });
  });

  describe("on desktop (useIsMobile() returns false)", () => {
    beforeEach(() => {
      mockUseIsMobile.mockReturnValue(false);
    });

    it("renders the desktop Dialog with MovePicker when clicked", async () => {
      const user = userEvent.setup();
      render(
        <MovesLane
          pokemon={MOCK_POKEMON}
          format={FORMAT}
          onUpdate={jest.fn()}
        />
      );

      const moveRows = screen.getAllByRole("row");
      const clickableRow = moveRows.find(
        (r) => r.getAttribute("tabIndex") === "0"
      );
      if (clickableRow) {
        await user.click(clickableRow);
      }

      expect(screen.getByTestId("desktop-move-picker")).toBeInTheDocument();
      expect(screen.queryByTestId("mobile-move-picker")).not.toBeInTheDocument();
    });
  });
});
