import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ── next/image mock ────────────────────────────────────────────────────────
jest.mock("next/image", () => ({
  __esModule: true,
  default: function MockImage({
    src,
    alt,
    width,
    height,
    ...rest
  }: {
    src: string;
    alt: string;
    width: number;
    height: number;
    [key: string]: unknown;
  }) {
    return <img src={src} alt={alt} width={width} height={height} {...rest} />;
  },
}));

// ── Vaul Drawer mock — JSDOM lacks setPointerCapture used by Vaul ──────────
jest.mock("@/components/ui/drawer", () => ({
  Drawer: ({
    children,
    open,
  }: {
    children: React.ReactNode;
    open: boolean;
    onOpenChange?: (open: boolean) => void;
  }) => (open ? <>{children}</> : null),
  DrawerContent: ({
    children,
  }: {
    children: React.ReactNode;
    showHandle?: boolean;
    className?: string;
  }) => <div>{children}</div>,
  DrawerTitle: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <h2 className={className}>{children}</h2>,
}));

// ── @trainers/pokemon mock ─────────────────────────────────────────────────
const mockGetLegalMoves = jest.fn();
const mockGetLearnableMoves = jest.fn();
const mockGetMoveData = jest.fn();
const mockLegalSetOrPermissive = jest.fn();

jest.mock("@trainers/pokemon", () => ({
  getLegalMoves: (...args: unknown[]) => mockGetLegalMoves(...args),
  getLearnableMoves: (...args: unknown[]) => mockGetLearnableMoves(...args),
  getMoveData: (name: string) => mockGetMoveData(name),
  legalSetOrPermissive: (...args: unknown[]) => mockLegalSetOrPermissive(...args),
}));

// ── Mock useUsageData — isolate from TanStack Query / server action ────────
const mockUseUsageData = jest.fn();
jest.mock("../../use-usage-data", () => ({
  useUsageData: (...args: unknown[]) => mockUseUsageData(...args),
}));

import { MovePickerMobile } from "../move-picker-mobile";

// ---------------------------------------------------------------------------
// Test setup helpers
// ---------------------------------------------------------------------------

const DRAGON_CLAW = {
  name: "Dragon Claw",
  type: "Dragon",
  category: "Physical" as const,
  basePower: 80,
  accuracy: 100,
  shortDesc: "No additional effect.",
};

const EARTHQUAKE = {
  name: "Earthquake",
  type: "Ground",
  category: "Physical" as const,
  basePower: 100,
  accuracy: 100,
  shortDesc: "No additional effect.",
};

const FLAMETHROWER = {
  name: "Flamethrower",
  type: "Fire",
  category: "Special" as const,
  basePower: 90,
  accuracy: 100,
  shortDesc: "10% chance to burn the target.",
};

const ALL_MOVES = [DRAGON_CLAW, EARTHQUAKE, FLAMETHROWER];
const MOVE_NAMES = ALL_MOVES.map((m) => m.name).sort();

const defaultProps = {
  open: true,
  onOpenChange: jest.fn(),
  value: null,
  species: "Garchomp",
  format: { id: "gen9vgc2025regg", name: "VGC 2025 Reg G" } as {
    id: string;
    name: string;
  },
  onPick: jest.fn(),
};

describe("MovePickerMobile", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default: three legal moves available
    mockLegalSetOrPermissive.mockReturnValue(new Set(MOVE_NAMES));
    mockGetLegalMoves.mockReturnValue(new Set(MOVE_NAMES));
    mockGetMoveData.mockImplementation((name: string) =>
      ALL_MOVES.find((m) => m.name === name) ?? null
    );

    // Default: no usage data
    mockUseUsageData.mockReturnValue({ data: undefined });
  });

  describe("drawer rendering", () => {
    it("renders the search input when open", () => {
      render(<MovePickerMobile {...defaultProps} />);
      expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
    });

    it("renders the move count when open", () => {
      render(<MovePickerMobile {...defaultProps} />);
      // 3 filtered / 3 total
      expect(screen.getByText(/3\/3/)).toBeInTheDocument();
    });

    it("renders all move rows", () => {
      render(<MovePickerMobile {...defaultProps} />);
      expect(screen.getByText("Dragon Claw")).toBeInTheDocument();
      expect(screen.getByText("Earthquake")).toBeInTheDocument();
      expect(screen.getByText("Flamethrower")).toBeInTheDocument();
    });

    it("does not render any content when closed", () => {
      render(<MovePickerMobile {...defaultProps} open={false} />);
      expect(screen.queryByPlaceholderText(/search/i)).not.toBeInTheDocument();
    });
  });

  describe("search", () => {
    it("filters rows to those matching the search query by name", async () => {
      const user = userEvent.setup();
      render(<MovePickerMobile {...defaultProps} />);
      await user.type(screen.getByPlaceholderText(/search/i), "earth");
      expect(screen.getByText("Earthquake")).toBeInTheDocument();
      expect(screen.queryByText("Dragon Claw")).not.toBeInTheDocument();
      expect(screen.queryByText("Flamethrower")).not.toBeInTheDocument();
    });

    it("filters rows by type (case-insensitive)", async () => {
      const user = userEvent.setup();
      render(<MovePickerMobile {...defaultProps} />);
      await user.type(screen.getByPlaceholderText(/search/i), "fire");
      expect(screen.getByText("Flamethrower")).toBeInTheDocument();
      expect(screen.queryByText("Dragon Claw")).not.toBeInTheDocument();
    });

    it("filters rows by shortDesc content", async () => {
      const user = userEvent.setup();
      render(<MovePickerMobile {...defaultProps} />);
      await user.type(screen.getByPlaceholderText(/search/i), "burn");
      expect(screen.getByText("Flamethrower")).toBeInTheDocument();
      expect(screen.queryByText("Dragon Claw")).not.toBeInTheDocument();
    });

    it("shows empty-state message when no moves match", async () => {
      const user = userEvent.setup();
      render(<MovePickerMobile {...defaultProps} />);
      await user.type(screen.getByPlaceholderText(/search/i), "zzzzz");
      expect(screen.getByText(/no moves match/i)).toBeInTheDocument();
    });

    it("updates the move count to reflect filtered results", async () => {
      const user = userEvent.setup();
      render(<MovePickerMobile {...defaultProps} />);
      await user.type(screen.getByPlaceholderText(/search/i), "dragon");
      expect(screen.getByText(/1\/3/)).toBeInTheDocument();
    });
  });

  describe("tap-to-select", () => {
    it("calls onPick with the move name when a row is tapped", async () => {
      const user = userEvent.setup();
      const onPick = jest.fn();
      render(<MovePickerMobile {...defaultProps} onPick={onPick} />);
      await user.click(screen.getByRole("button", { name: /earthquake/i }));
      expect(onPick).toHaveBeenCalledWith("Earthquake");
      expect(onPick).toHaveBeenCalledTimes(1);
    });

    it("calls onOpenChange(false) after picking a move", async () => {
      const user = userEvent.setup();
      const onOpenChange = jest.fn();
      render(
        <MovePickerMobile {...defaultProps} onOpenChange={onOpenChange} />
      );
      await user.click(screen.getByRole("button", { name: /dragon claw/i }));
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe("selection highlight", () => {
    it("highlights the currently selected move row", () => {
      render(
        <MovePickerMobile {...defaultProps} value="Earthquake" />
      );
      const rows = screen.getAllByTestId("move-mobile-row");
      const earthquakeRow = rows.find((r) =>
        r.textContent?.includes("Earthquake")
      );
      expect(earthquakeRow).toHaveClass("bg-primary/5");
    });

    it("does not highlight other rows when a value is set", () => {
      render(
        <MovePickerMobile {...defaultProps} value="Earthquake" />
      );
      const rows = screen.getAllByTestId("move-mobile-row");
      const dragonClawRow = rows.find((r) =>
        r.textContent?.includes("Dragon Claw")
      );
      expect(dragonClawRow).not.toHaveClass("bg-primary/5");
    });
  });

  describe("USG chip wiring", () => {
    it("does NOT render any USG chips when no usage data is available", () => {
      mockUseUsageData.mockReturnValue({ data: undefined });
      render(<MovePickerMobile {...defaultProps} />);
      expect(screen.queryByTestId(/^usg-move-/)).not.toBeInTheDocument();
    });

    it("renders a USG chip for a move with non-zero usage", () => {
      mockUseUsageData.mockReturnValue({
        data: [
          {
            moves: [
              { value: "Dragon Claw", pct: 55.5 },
              { value: "Earthquake", pct: 0 },
            ],
          },
        ],
      });
      render(<MovePickerMobile {...defaultProps} />);
      // Dragon Claw has non-zero usage — chip should appear
      expect(screen.getByTestId("usg-move-Dragon Claw")).toHaveTextContent(
        "55.5%"
      );
    });

    it("does NOT render a USG chip for a move with 0% usage", () => {
      mockUseUsageData.mockReturnValue({
        data: [
          {
            moves: [
              { value: "Dragon Claw", pct: 55.5 },
              { value: "Earthquake", pct: 0 },
            ],
          },
        ],
      });
      render(<MovePickerMobile {...defaultProps} />);
      expect(
        screen.queryByTestId("usg-move-Earthquake")
      ).not.toBeInTheDocument();
    });

    it("normalizes move keys for slug lookup (spaces/hyphens/apostrophes)", () => {
      // "Fake Out" in DB might be stored as "fakeout" or "fake-out"
      const fakeOut = {
        name: "Fake Out",
        type: "Normal",
        category: "Physical" as const,
        basePower: 40,
        accuracy: 100,
        shortDesc: "Priority +3. Flinches target. Fails if user already moved.",
      };
      mockGetLegalMoves.mockReturnValue(new Set(["Fake Out"]));
      mockLegalSetOrPermissive.mockReturnValue(new Set(["Fake Out"]));
      mockGetMoveData.mockReturnValue(fakeOut);

      mockUseUsageData.mockReturnValue({
        data: [
          {
            // DB stores without spaces (normalized)
            moves: [{ value: "fakeout", pct: 75.0 }],
          },
        ],
      });

      render(<MovePickerMobile {...defaultProps} />);
      expect(screen.getByTestId("usg-move-Fake Out")).toHaveTextContent(
        "75.0%"
      );
    });

    it("uses the latest period's pct when multiple periods are present", () => {
      mockUseUsageData.mockReturnValue({
        data: [
          { moves: [{ value: "Dragon Claw", pct: 30.0 }] },
          { moves: [{ value: "Dragon Claw", pct: 55.5 }] }, // latest
        ],
      });
      render(<MovePickerMobile {...defaultProps} />);
      expect(screen.getByTestId("usg-move-Dragon Claw")).toHaveTextContent(
        "55.5%"
      );
    });
  });

  describe("no format (learnset fallback)", () => {
    it("falls back to learnset moves when format is undefined", () => {
      mockGetLearnableMoves.mockReturnValue(["Tackle", "Growl"]);
      const tackle = {
        name: "Tackle",
        type: "Normal",
        category: "Physical" as const,
        basePower: 40,
        accuracy: 100,
        shortDesc: "No additional effect.",
      };
      const growl = {
        name: "Growl",
        type: "Normal",
        category: "Status" as const,
        basePower: 0,
        accuracy: true as const,
        shortDesc: "Lowers the foe's Attack by 1.",
      };
      mockGetMoveData.mockImplementation((name: string) =>
        name === "Tackle" ? tackle : growl
      );

      render(
        <MovePickerMobile {...defaultProps} format={undefined} />
      );
      expect(screen.getByText("Tackle")).toBeInTheDocument();
      expect(screen.getByText("Growl")).toBeInTheDocument();
    });
  });
});
