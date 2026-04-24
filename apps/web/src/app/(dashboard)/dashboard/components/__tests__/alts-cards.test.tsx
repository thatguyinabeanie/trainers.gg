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
  AvatarFallback: ({ children }: { children: React.ReactNode }) => (
    <span data-testid="avatar-fallback">{children}</span>
  ),
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

import { type PlayerRating } from "@trainers/supabase";

import { AltsCards, type AltsCardsProps } from "../alts-cards";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type Alt = AltsCardsProps["alts"][number];

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
  overrides: Partial<AltsCardsProps> = {}
): AltsCardsProps {
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

describe("AltsCards", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    // Safe defaults for async action mocks — tests can override per case
    mockUpdateAltVisibilityAction.mockResolvedValue({ success: true });
    mockDeleteAltAction.mockResolvedValue({ success: true });
    window.confirm = jest.fn(() => true);
  });

  // ── Rendering ───────────────────────────────────────────────────────────

  it("renders a card for each alt", () => {
    render(<AltsCards {...getDefaultProps()} />);
    expect(screen.getByText("ash_main")).toBeInTheDocument();
    expect(screen.getByText("ash_alt")).toBeInTheDocument();
  });

  it("renders stat labels on each card", () => {
    render(<AltsCards {...getDefaultProps()} />);
    // 2 alts → 2 of each stat label
    expect(screen.getAllByText("Record")).toHaveLength(2);
    expect(screen.getAllByText("Win %")).toHaveLength(2);
    expect(screen.getAllByText("ELO")).toHaveLength(2);
    expect(screen.getAllByText("Events")).toHaveLength(2);
  });

  it("shows Main badge on the main alt only", () => {
    render(<AltsCards {...getDefaultProps()} />);
    expect(screen.getAllByText("Main")).toHaveLength(1);
  });

  // ── Stats display ──────────────────────────────────────────────────────

  it("displays zero values when no stats are provided", () => {
    render(<AltsCards {...getDefaultProps()} />);
    // Both cards show "0-0" for record
    expect(screen.getAllByText("0-0")).toHaveLength(2);
  });

  it("displays stats when bulkStats are provided", () => {
    render(
      <AltsCards
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
      <AltsCards
        {...getDefaultProps({
          bulkRatings: {
            // The component only reads `.rating`; stub the rest so tests
            // stay readable without a full PlayerRating factory.
            1: { rating: 1500 } as unknown as PlayerRating,
          },
        })}
      />
    );
    expect(screen.getByText("1500")).toBeInTheDocument();
  });

  it("displays em-dash for missing rating", () => {
    render(<AltsCards {...getDefaultProps()} />);
    // Each alt with no rating + no record contributes two em-dashes
    // (ELO and Win %). 2 alts × 2 em-dashes each = 4.
    expect(screen.getAllByText("—")).toHaveLength(4);
  });

  // ── Expand/collapse ────────────────────────────────────────────────────

  it("calls onAltSelect when a card header is clicked", () => {
    const props = getDefaultProps();
    render(<AltsCards {...props} />);
    const header = screen.getByText("ash_alt").closest('[role="button"]')!;
    fireEvent.click(header);
    expect(props.onAltSelect).toHaveBeenCalledWith("ash_alt");
  });

  it("calls onAltSelect(null) when already-selected card header is clicked", () => {
    const props = getDefaultProps({ selectedAltUsername: "ash_main" });
    render(<AltsCards {...props} />);
    // When expanded, TeamsSubTable mock also renders the username
    const header = screen
      .getAllByText("ash_main")[0]!
      .closest('[role="button"]')!;
    fireEvent.click(header);
    expect(props.onAltSelect).toHaveBeenCalledWith(null);
  });

  it("renders TeamsSubTable when a card is expanded", () => {
    render(
      <AltsCards {...getDefaultProps({ selectedAltUsername: "ash_alt" })} />
    );
    expect(screen.getByTestId("teams-sub-table-2")).toBeInTheDocument();
  });

  it("does not render TeamsSubTable when no card is expanded", () => {
    render(<AltsCards {...getDefaultProps()} />);
    expect(screen.queryByTestId("teams-sub-table-1")).not.toBeInTheDocument();
    expect(screen.queryByTestId("teams-sub-table-2")).not.toBeInTheDocument();
  });

  // ── Keyboard navigation ────────────────────────────────────────────────

  it("toggles expand on Enter key", () => {
    const props = getDefaultProps();
    render(<AltsCards {...props} />);
    const header = screen.getByText("ash_alt").closest('[role="button"]')!;
    fireEvent.keyDown(header, { key: "Enter" });
    expect(props.onAltSelect).toHaveBeenCalledWith("ash_alt");
  });

  it("toggles expand on Space key", () => {
    const props = getDefaultProps();
    render(<AltsCards {...props} />);
    const header = screen.getByText("ash_alt").closest('[role="button"]')!;
    fireEvent.keyDown(header, { key: " " });
    expect(props.onAltSelect).toHaveBeenCalledWith("ash_alt");
  });

  // ── Delete ──────────────────────────────────────────────────────────────

  it("does not render delete button for main alt in TeamsSubTable", () => {
    render(
      <AltsCards {...getDefaultProps({ selectedAltUsername: "ash_main" })} />
    );
    expect(screen.queryByTestId("delete-alt-btn")).not.toBeInTheDocument();
  });

  it("calls deleteAltAction when delete button is clicked on a non-main alt", async () => {
    mockDeleteAltAction.mockResolvedValue({ success: true });
    const props = getDefaultProps({ selectedAltUsername: "ash_alt" });
    render(<AltsCards {...props} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId("delete-alt-btn"));
    });

    expect(mockDeleteAltAction).toHaveBeenCalledWith(2);
    expect(toast.success).toHaveBeenCalledWith("Alt deleted");
    expect(props.onRefresh).toHaveBeenCalled();
  });

  it("shows error toast when delete fails", async () => {
    mockDeleteAltAction.mockResolvedValue({
      success: false,
      error: "Network error",
    });
    render(
      <AltsCards {...getDefaultProps({ selectedAltUsername: "ash_alt" })} />
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId("delete-alt-btn"));
    });

    expect(toast.error).toHaveBeenCalledWith("Network error");
  });

  it("skips delete when user cancels the confirm prompt", async () => {
    window.confirm = jest.fn(() => false);
    render(
      <AltsCards {...getDefaultProps({ selectedAltUsername: "ash_alt" })} />
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId("delete-alt-btn"));
    });

    expect(mockDeleteAltAction).not.toHaveBeenCalled();
  });

  // ── Visibility toggle ──────────────────────────────────────────────────

  it("renders public/private toggle for each alt", () => {
    render(<AltsCards {...getDefaultProps()} />);
    expect(screen.getByLabelText("Make private")).toBeInTheDocument();
    expect(screen.getByLabelText("Make public")).toBeInTheDocument();
  });

  it("calls updateAltVisibilityAction when toggle is clicked", async () => {
    mockUpdateAltVisibilityAction.mockResolvedValue({ success: true });
    const props = getDefaultProps();
    render(<AltsCards {...props} />);

    await act(async () => {
      fireEvent.click(screen.getByLabelText("Make private"));
    });

    // ash_main is id=1, is_public=true → clicking toggles to false
    expect(mockUpdateAltVisibilityAction).toHaveBeenCalledWith(1, false);
  });

  it("calls onRefresh after successful visibility toggle", async () => {
    mockUpdateAltVisibilityAction.mockResolvedValue({ success: true });
    const props = getDefaultProps();
    render(<AltsCards {...props} />);

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
    render(<AltsCards {...getDefaultProps()} />);

    await act(async () => {
      fireEvent.click(screen.getByLabelText("Make private"));
    });

    expect(toast.error).toHaveBeenCalledWith("Permission denied");
  });

  it("shows default error when visibility toggle fails without error message", async () => {
    mockUpdateAltVisibilityAction.mockResolvedValue({ success: false });
    render(<AltsCards {...getDefaultProps()} />);

    await act(async () => {
      fireEvent.click(screen.getByLabelText("Make private"));
    });

    expect(toast.error).toHaveBeenCalledWith("Failed to update visibility");
  });

  it("does not toggle expansion when the visibility toggle is clicked", () => {
    const props = getDefaultProps();
    render(<AltsCards {...props} />);

    fireEvent.click(screen.getByLabelText("Make private"));

    // Clicking the toggle should not bubble up to the header's onClick
    expect(props.onAltSelect).not.toHaveBeenCalled();
  });

  it.each([
    ["Enter", "Enter"],
    ["Space", " "],
  ])(
    "does not toggle expansion when %s is pressed on the visibility toggle",
    (_name, key) => {
      const props = getDefaultProps();
      render(<AltsCards {...props} />);

      // Keydown bubbles from the button to the header; the header guard
      // should ignore events where currentTarget !== target.
      fireEvent.keyDown(screen.getByLabelText("Make private"), { key });

      expect(props.onAltSelect).not.toHaveBeenCalled();
    }
  );

  it.each([
    ["Enter", "Enter"],
    ["Space", " "],
  ])(
    "does not toggle expansion when %s is pressed on the avatar trigger",
    (_name, key) => {
      const props = getDefaultProps();
      render(<AltsCards {...props} />);

      // First popover-trigger belongs to the first card's avatar
      const triggers = screen.getAllByTestId("popover-trigger");
      fireEvent.keyDown(triggers[0]!, { key });

      expect(props.onAltSelect).not.toHaveBeenCalled();
    }
  );

  // ── Avatar display ──────────────────────────────────────────────────────

  it("shows avatar fallback with first character uppercase", () => {
    render(<AltsCards {...getDefaultProps()} />);
    const fallbacks = screen.getAllByTestId("avatar-fallback");
    expect(fallbacks[0]).toHaveTextContent("A");
    expect(fallbacks[1]).toHaveTextContent("A");
  });

  it("renders avatar image when avatar_url is provided", () => {
    render(
      <AltsCards
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
