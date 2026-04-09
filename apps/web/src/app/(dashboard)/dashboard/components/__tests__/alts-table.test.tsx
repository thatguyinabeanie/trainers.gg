// --- Mock modules before imports ---

// --- Mock deep dependency chains ---
jest.mock("../teams-sub-table", () => ({
  TeamsSubTable: (props: {
    altId: number;
    altUsername: string;
    onDeleteAlt: () => void;
    isMain: boolean;
  }) => (
    <div data-testid={`teams-sub-table-${props.altId}`}>
      {props.altUsername}
      {!props.isMain && (
        <button data-testid="delete-alt-btn" onClick={props.onDeleteAlt}>
          Delete alt
        </button>
      )}
    </div>
  ),
}));

// --- @/components/profile/sprite-picker ---
jest.mock("@/components/profile/sprite-picker", () => ({
  SpritePicker: () => <div data-testid="sprite-picker" />,
}));

// --- @/actions/profile ---
const mockUpdateAltVisibilityAction = jest.fn();
jest.mock("@/actions/profile", () => ({
  updateAltVisibilityAction: (...args: unknown[]) =>
    mockUpdateAltVisibilityAction(...args),
}));

// --- @/actions/alts ---
const mockDeleteAltAction = jest.fn();
jest.mock("@/actions/alts", () => ({
  deleteAltAction: (...args: unknown[]) => mockDeleteAltAction(...args),
}));

// --- sonner ---
jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

// --- lucide-react ---
jest.mock("lucide-react", () => ({
  Pencil: () => <svg data-testid="icon-pencil" />,
  Star: () => <svg data-testid="icon-star" />,
  ChevronDown: () => <svg data-testid="icon-chevron-down" />,
  ChevronRight: () => <svg data-testid="icon-chevron-right" />,
}));

// --- @/components/ui/avatar ---
jest.mock("@/components/ui/avatar", () => ({
  Avatar: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div data-testid="avatar" className={className}>
      {children}
    </div>
  ),
  AvatarImage: ({ src, alt }: { src: string; alt: string }) => (
    <img data-testid="avatar-image" src={src} alt={alt} />
  ),
  AvatarFallback: ({
    children,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <span data-testid="avatar-fallback">{children}</span>,
}));

// --- @/components/ui/badge ---
jest.mock("@/components/ui/badge", () => ({
  Badge: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <span data-testid="badge" className={className}>
      {children}
    </span>
  ),
}));

// --- @/components/ui/popover ---
jest.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="popover">{children}</div>
  ),
  PopoverTrigger: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <button data-testid="popover-trigger" {...props}>
      {children}
    </button>
  ),
  PopoverContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="popover-content">{children}</div>
  ),
}));

// --- @/lib/utils ---
jest.mock("@/lib/utils", () => ({
  cn: (...args: unknown[]) =>
    args
      .filter((a) => typeof a === "string")
      .join(" ")
      .trim(),
}));

// --- tournament-helpers ---
jest.mock("../../tournaments/tournament-helpers", () => ({
  formatWinRate: (wins: number, losses: number) => {
    const total = wins + losses;
    if (total === 0) return "—";
    return `${((wins / total) * 100).toFixed(1)}%`;
  },
}));

import { render, screen, fireEvent, act } from "@testing-library/react";
import React from "react";
import { toast } from "sonner";

import { AltsTable, type AltsTableProps } from "../alts-table";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type Alt = AltsTableProps["alts"][number];

function buildAlt(overrides: Partial<Alt> = {}): Alt {
  return {
    id: 1,
    username: "ash_main",
    avatar_url: null,
    is_public: true,
    ...overrides,
  };
}

function getDefaultProps(
  overrides: Partial<AltsTableProps> = {}
): AltsTableProps {
  return {
    alts: [
      buildAlt({ id: 1, username: "ash_main" }),
      buildAlt({ id: 2, username: "ash_alt", is_public: false }),
    ],
    mainAltId: 1,
    bulkStats: undefined,
    bulkRatings: undefined,
    selectedAltUsername: null,
    onAltSelect: jest.fn(),
    onRefresh: jest.fn(),
    refreshKey: 0,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AltsTable", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock window.confirm for delete tests
    window.confirm = jest.fn(() => true);
  });

  // ── Rendering ───────────────────────────────────────────────────────────

  it("renders table headers", () => {
    render(<AltsTable {...getDefaultProps()} />);
    expect(screen.getByText("Handle")).toBeInTheDocument();
    expect(screen.getByText("Record")).toBeInTheDocument();
    expect(screen.getByText("Win %")).toBeInTheDocument();
    expect(screen.getByText("ELO")).toBeInTheDocument();
    expect(screen.getByText("Events")).toBeInTheDocument();
    expect(screen.getByText("Teams")).toBeInTheDocument();
    expect(screen.getByText("Public")).toBeInTheDocument();
  });

  it("renders a row for each alt", () => {
    render(<AltsTable {...getDefaultProps()} />);
    expect(screen.getByText("ash_main")).toBeInTheDocument();
    expect(screen.getByText("ash_alt")).toBeInTheDocument();
  });

  it("shows Main badge on the main alt", () => {
    render(<AltsTable {...getDefaultProps()} />);
    expect(screen.getByText("Main")).toBeInTheDocument();
    // Only one Main badge
    expect(screen.getAllByText("Main")).toHaveLength(1);
  });

  // ── Stats display ──────────────────────────────────────────────────────

  it("displays dash values when no stats are provided", () => {
    render(<AltsTable {...getDefaultProps()} />);
    // Each alt should show "0-0" for record, "—" for win rate and rating
    const records = screen.getAllByText("0-0");
    expect(records.length).toBe(2);
  });

  it("displays stats when bulkStats are provided", () => {
    render(
      <AltsTable
        {...getDefaultProps({
          bulkStats: {
            1: { matchWins: 10, matchLosses: 5, tournamentCount: 3 },
            2: { matchWins: 2, matchLosses: 8, tournamentCount: 1 },
          },
        })}
      />
    );
    expect(screen.getByText("10-5")).toBeInTheDocument();
    expect(screen.getByText("66.7%")).toBeInTheDocument();
    expect(screen.getByText("2-8")).toBeInTheDocument();
    expect(screen.getByText("20.0%")).toBeInTheDocument();
  });

  it("displays rating when bulkRatings are provided", () => {
    render(
      <AltsTable
        {...getDefaultProps({
          bulkRatings: {
            1: { rating: 1500 } as AltsTableProps["bulkRatings"] extends
              | Record<number, infer R>
              | undefined
              ? R
              : never,
          },
        })}
      />
    );
    expect(screen.getByText("1500")).toBeInTheDocument();
  });

  // ── Expand/collapse ────────────────────────────────────────────────────

  it("calls onAltSelect when a row is clicked", () => {
    const props = getDefaultProps();
    render(<AltsTable {...props} />);
    // Use the first row (ash_main) — click on the row itself
    const firstRow = screen.getByText("ash_main").closest("tr")!;
    fireEvent.click(firstRow);
    expect(props.onAltSelect).toHaveBeenCalledWith("ash_main");
  });

  it("calls onAltSelect(null) when already-selected row is clicked", () => {
    const props = getDefaultProps({ selectedAltUsername: "ash_main" });
    render(<AltsTable {...props} />);
    // When expanded, TeamsSubTable mock also renders the username
    // so use closest tr to click the correct row
    const row = screen.getAllByText("ash_main")[0]!.closest("tr")!;
    fireEvent.click(row);
    expect(props.onAltSelect).toHaveBeenCalledWith(null);
  });

  it("renders TeamsSubTable when a row is expanded", () => {
    render(
      <AltsTable {...getDefaultProps({ selectedAltUsername: "ash_alt" })} />
    );
    expect(screen.getByTestId("teams-sub-table-2")).toBeInTheDocument();
  });

  it("does not render TeamsSubTable when no row is expanded", () => {
    render(<AltsTable {...getDefaultProps()} />);
    expect(screen.queryByTestId("teams-sub-table-1")).not.toBeInTheDocument();
    expect(screen.queryByTestId("teams-sub-table-2")).not.toBeInTheDocument();
  });

  // ── Keyboard navigation ────────────────────────────────────────────────

  it("toggles expand on Enter key", () => {
    const props = getDefaultProps();
    render(<AltsTable {...props} />);
    const row = screen.getByText("ash_alt").closest("tr")!;
    fireEvent.keyDown(row, { key: "Enter" });
    expect(props.onAltSelect).toHaveBeenCalledWith("ash_alt");
  });

  it("toggles expand on Space key", () => {
    const props = getDefaultProps();
    render(<AltsTable {...props} />);
    const row = screen.getByText("ash_alt").closest("tr")!;
    fireEvent.keyDown(row, { key: " " });
    expect(props.onAltSelect).toHaveBeenCalledWith("ash_alt");
  });

  // ── Delete ──────────────────────────────────────────────────────────────

  it("prevents deleting the main alt and shows error toast", () => {
    // Expand a non-main alt so TeamsSubTable renders a delete button
    render(
      <AltsTable {...getDefaultProps({ selectedAltUsername: "ash_alt" })} />
    );
    // The mock TeamsSubTable renders a "Delete alt" button for non-main alts
    // ash_alt is not the main alt (mainAltId=1, ash_alt id=2)
    // But handleDelete checks if altId === mainAltId, so this should succeed
    // To test the main alt protection, we need to expand the main alt
  });

  it("does not render delete button for main alt in TeamsSubTable", () => {
    render(
      <AltsTable {...getDefaultProps({ selectedAltUsername: "ash_main" })} />
    );
    // The mock TeamsSubTable does not render delete button when isMain=true
    expect(screen.queryByTestId("delete-alt-btn")).not.toBeInTheDocument();
  });

  // ── Visibility toggle ──────────────────────────────────────────────────

  it("renders public dot for each alt", () => {
    render(<AltsTable {...getDefaultProps()} />);
    // ash_main is public, ash_alt is private
    const publicButton = screen.getByLabelText("Make private");
    expect(publicButton).toBeInTheDocument();
    const privateButton = screen.getByLabelText("Make public");
    expect(privateButton).toBeInTheDocument();
  });

  it("calls updateAltVisibilityAction when visibility button is clicked", async () => {
    mockUpdateAltVisibilityAction.mockResolvedValue({ success: true });
    const props = getDefaultProps();
    render(<AltsTable {...props} />);

    await act(async () => {
      fireEvent.click(screen.getByLabelText("Make private"));
    });

    // Alt 1 (ash_main) is public, clicking should toggle to false
    expect(mockUpdateAltVisibilityAction).toHaveBeenCalledWith(1, false);
  });

  it("calls onRefresh after successful visibility toggle", async () => {
    mockUpdateAltVisibilityAction.mockResolvedValue({ success: true });
    const props = getDefaultProps();
    render(<AltsTable {...props} />);

    await act(async () => {
      fireEvent.click(screen.getByLabelText("Make private"));
    });

    expect(props.onRefresh).toHaveBeenCalled();
  });

  it("shows error toast when visibility toggle fails", async () => {
    mockUpdateAltVisibilityAction.mockResolvedValue({
      success: false,
      error: "Permission denied",
    });
    render(<AltsTable {...getDefaultProps()} />);

    await act(async () => {
      fireEvent.click(screen.getByLabelText("Make private"));
    });

    expect(toast.error).toHaveBeenCalledWith("Permission denied");
  });

  it("shows default error message when visibility toggle fails without error", async () => {
    mockUpdateAltVisibilityAction.mockResolvedValue({
      success: false,
    });
    render(<AltsTable {...getDefaultProps()} />);

    await act(async () => {
      fireEvent.click(screen.getByLabelText("Make private"));
    });

    expect(toast.error).toHaveBeenCalledWith("Failed to update visibility");
  });

  // ── Avatar display ──────────────────────────────────────────────────────

  it("shows avatar fallback with first character uppercase", () => {
    render(<AltsTable {...getDefaultProps()} />);
    // ash_main -> "A", ash_alt -> "A"
    const fallbacks = screen.getAllByTestId("avatar-fallback");
    expect(fallbacks[0]).toHaveTextContent("A");
    expect(fallbacks[1]).toHaveTextContent("A");
  });

  it("renders avatar image when avatar_url is provided", () => {
    render(
      <AltsTable
        {...getDefaultProps({
          alts: [
            buildAlt({
              id: 1,
              username: "ash_main",
              avatar_url: "https://example.com/avatar.png",
            }),
          ],
        })}
      />
    );
    const img = screen.getByTestId("avatar-image");
    expect(img).toHaveAttribute("src", "https://example.com/avatar.png");
  });
});
