import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// --- next/navigation ---
const mockRouterRefresh = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: mockRouterRefresh,
  }),
}));

// --- @/actions/discord-integration ---
const mockRefreshDiscordGuildCacheAction = jest.fn();
jest.mock("@/actions/discord-integration", () => ({
  refreshDiscordGuildCacheAction: (...args: unknown[]) =>
    mockRefreshDiscordGuildCacheAction(...args),
}));

// --- sonner ---
const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();
jest.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

// --- @/components/ui/button ---
jest.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    disabled,
    onClick,
    type,
    "aria-label": ariaLabel,
    className,
    variant: _variant,
    size: _size,
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: string;
    size?: string;
  }) => (
    <button
      type={type ?? "button"}
      disabled={disabled}
      onClick={onClick}
      aria-label={ariaLabel}
      className={className}
    >
      {children}
    </button>
  ),
}));

// --- lucide-react ---
jest.mock("lucide-react", () => ({
  RefreshCw: ({ className }: { className?: string }) => (
    <svg data-testid="icon-refresh-cw" className={className} />
  ),
}));

// --- @/lib/utils ---
jest.mock("@/lib/utils", () => ({
  cn: (...classes: (string | boolean | undefined | null)[]) =>
    classes.filter(Boolean).join(" "),
}));

import { PickerRefreshButton } from "../picker-refresh-button";

// =============================================================================
// Tests
// =============================================================================

describe("PickerRefreshButton", () => {
  const SERVER_ID = 42;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  it("renders the refresh icon button", () => {
    render(<PickerRefreshButton serverId={SERVER_ID} />);

    const button = screen.getByRole("button", {
      name: "Refresh Discord channels and roles",
    });
    expect(button).toBeInTheDocument();
    expect(screen.getByTestId("icon-refresh-cw")).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Action call
  // ---------------------------------------------------------------------------

  it("calls refreshDiscordGuildCacheAction with the correct serverId on click", async () => {
    mockRefreshDiscordGuildCacheAction.mockResolvedValue({ success: true });

    const user = userEvent.setup();
    render(<PickerRefreshButton serverId={SERVER_ID} />);

    await user.click(
      screen.getByRole("button", { name: "Refresh Discord channels and roles" })
    );

    await waitFor(() => {
      expect(mockRefreshDiscordGuildCacheAction).toHaveBeenCalledWith(
        SERVER_ID
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Success path
  // ---------------------------------------------------------------------------

  it("shows success toast and calls router.refresh() on success", async () => {
    mockRefreshDiscordGuildCacheAction.mockResolvedValue({ success: true });

    const user = userEvent.setup();
    render(<PickerRefreshButton serverId={SERVER_ID} />);

    await user.click(
      screen.getByRole("button", { name: "Refresh Discord channels and roles" })
    );

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith(
        "Refreshed Discord channels and roles"
      );
    });
    expect(mockRouterRefresh).toHaveBeenCalledTimes(1);
    expect(mockToastError).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // Failure path
  // ---------------------------------------------------------------------------

  it("shows error toast and does NOT call router.refresh() on failure", async () => {
    mockRefreshDiscordGuildCacheAction.mockResolvedValue({
      success: false,
      error: "Discord API unavailable",
    });

    const user = userEvent.setup();
    render(<PickerRefreshButton serverId={SERVER_ID} />);

    await user.click(
      screen.getByRole("button", { name: "Refresh Discord channels and roles" })
    );

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Discord API unavailable");
    });
    expect(mockRouterRefresh).not.toHaveBeenCalled();
    expect(mockToastSuccess).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // Pending / disabled state
  // ---------------------------------------------------------------------------

  it("button is disabled while the action is pending", async () => {
    // Return a promise that never resolves so the pending state holds
    mockRefreshDiscordGuildCacheAction.mockReturnValue(new Promise(() => {}));

    const user = userEvent.setup();
    render(<PickerRefreshButton serverId={SERVER_ID} />);

    const button = screen.getByRole("button", {
      name: "Refresh Discord channels and roles",
    });

    await user.click(button);

    await waitFor(() => {
      expect(button).toBeDisabled();
    });
  });

  // ---------------------------------------------------------------------------
  // Spin class
  // ---------------------------------------------------------------------------

  it("applies animate-spin to the icon while pending", async () => {
    // Return a promise that never resolves so the pending state holds
    mockRefreshDiscordGuildCacheAction.mockReturnValue(new Promise(() => {}));

    const user = userEvent.setup();
    render(<PickerRefreshButton serverId={SERVER_ID} />);

    await user.click(
      screen.getByRole("button", { name: "Refresh Discord channels and roles" })
    );

    await waitFor(() => {
      expect(screen.getByTestId("icon-refresh-cw")).toHaveClass("animate-spin");
    });
  });
});
