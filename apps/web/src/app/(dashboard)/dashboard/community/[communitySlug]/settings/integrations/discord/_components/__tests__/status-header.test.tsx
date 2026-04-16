import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// =============================================================================
// Module-level mocks (must precede component imports)
// =============================================================================

// --- next/navigation ---
const mockRouterRefresh = jest.fn();
const mockRouterRouter = { refresh: mockRouterRefresh };
jest.mock("next/navigation", () => ({
  useRouter: () => mockRouterRouter,
}));

// --- @/actions/discord-integration ---
const mockGetDiscordInstallUrlAction = jest.fn();
const mockDisconnectDiscordServerAction = jest.fn();
jest.mock("@/actions/discord-integration", () => ({
  getDiscordInstallUrlAction: (...args: unknown[]) =>
    mockGetDiscordInstallUrlAction(...args),
  disconnectDiscordServerAction: (...args: unknown[]) =>
    mockDisconnectDiscordServerAction(...args),
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

// --- @/components/icons/discord-icon ---
jest.mock("@/components/icons/discord-icon", () => ({
  DiscordIcon: ({ className }: { className?: string }) => (
    <svg data-testid="discord-icon" className={className} />
  ),
}));

// --- @/components/ui/button ---
jest.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    disabled,
    onClick,
    variant: _variant,
    size: _size,
    ...rest
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: string;
    size?: string;
  }) => (
    <button disabled={disabled} onClick={onClick} {...rest}>
      {children}
    </button>
  ),
}));

// --- @/components/ui/alert-dialog (shallow stub) ---
jest.mock("@/components/ui/alert-dialog", () => ({
  AlertDialog: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="alert-dialog">{children}</div>
  ),
  AlertDialogTrigger: ({
    children,
    render: _render,
    ...props
  }: {
    children: React.ReactNode;
    render?: React.ReactElement;
  } & React.HTMLAttributes<HTMLElement>) => (
    <div data-testid="alert-dialog-trigger" {...props}>
      {children}
    </div>
  ),
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="alert-dialog-content">{children}</div>
  ),
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  ),
  AlertDialogAction: ({
    children,
    onClick,
    disabled,
    variant: _variant,
    ...rest
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string }) => (
    <button
      data-testid="alert-dialog-action"
      onClick={onClick}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  ),
  AlertDialogCancel: ({ children }: { children: React.ReactNode }) => (
    <button data-testid="alert-dialog-cancel">{children}</button>
  ),
}));

// --- @trainers/utils ---
jest.mock("@trainers/utils", () => ({
  formatDate: (s: string) => `formatted:${s}`,
}));

// --- @/lib/utils ---
jest.mock("@/lib/utils", () => ({
  cn: (...classes: (string | boolean | undefined | null)[]) =>
    classes.filter(Boolean).join(" "),
}));

// Component imports after all mocks
import { StatusHeader } from "../status-header";
import { FailureBanner } from "../failure-banner";
import { ConfirmDisconnectDialog } from "../confirm-disconnect-dialog";

// =============================================================================
// Fixtures
// =============================================================================

const SERVER = {
  id: 1,
  community_id: 10,
  guild_id: "987654321",
  installed_by: "user-uuid-abc",
  created_at: "2026-01-15T10:00:00Z",
  settings: {},
};

// =============================================================================
// StatusHeader tests
// =============================================================================

describe("StatusHeader", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the guild ID", () => {
    render(
      <StatusHeader
        server={SERVER}
        communitySlug="my-community"
        communityId={10}
      />
    );
    expect(screen.getByText(/987654321/)).toBeInTheDocument();
  });

  it("renders the formatted installation date", () => {
    render(
      <StatusHeader
        server={SERVER}
        communitySlug="my-community"
        communityId={10}
      />
    );
    expect(
      screen.getByText(/formatted:2026-01-15T10:00:00Z/)
    ).toBeInTheDocument();
  });

  it("renders a Reinstall button", () => {
    render(
      <StatusHeader
        server={SERVER}
        communitySlug="my-community"
        communityId={10}
      />
    );
    expect(
      screen.getByRole("button", { name: /reinstall/i })
    ).toBeInTheDocument();
  });

  it("renders the ConfirmDisconnectDialog trigger area", () => {
    render(
      <StatusHeader
        server={SERVER}
        communitySlug="my-community"
        communityId={10}
      />
    );
    expect(screen.getByTestId("alert-dialog")).toBeInTheDocument();
  });

  it("calls getDiscordInstallUrlAction and redirects on Reinstall click (success)", async () => {
    mockGetDiscordInstallUrlAction.mockResolvedValue({
      success: true,
      data: { url: "https://discord.com/oauth2/authorize?test=1" },
    });

    // Spy on window.location.href assignment
    const originalLocation = window.location;
    // jsdom doesn't allow direct assignment — use defineProperty
    Object.defineProperty(window, "location", {
      writable: true,
      value: { href: "" },
    });

    const user = userEvent.setup();
    render(
      <StatusHeader
        server={SERVER}
        communitySlug="my-community"
        communityId={10}
      />
    );

    await user.click(screen.getByRole("button", { name: /reinstall/i }));

    await waitFor(() => {
      expect(mockGetDiscordInstallUrlAction).toHaveBeenCalledWith(10);
    });
    await waitFor(() => {
      expect(window.location.href).toBe(
        "https://discord.com/oauth2/authorize?test=1"
      );
    });

    // Restore
    Object.defineProperty(window, "location", {
      writable: true,
      value: originalLocation,
    });
  });

  it("shows an error toast on Reinstall failure", async () => {
    mockGetDiscordInstallUrlAction.mockResolvedValue({
      success: false,
      error: "Not configured",
    });

    const user = userEvent.setup();
    render(
      <StatusHeader
        server={SERVER}
        communitySlug="my-community"
        communityId={10}
      />
    );

    await user.click(screen.getByRole("button", { name: /reinstall/i }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Not configured");
    });
  });
});

// =============================================================================
// FailureBanner tests
// =============================================================================

describe("FailureBanner", () => {
  it("renders the failure count", () => {
    render(<FailureBanner count={3} onView={() => {}} />);
    expect(screen.getByText(/3/)).toBeInTheDocument();
    expect(screen.getByText(/delivery failures/i)).toBeInTheDocument();
  });

  it("renders 'failure' (singular) when count is 1", () => {
    render(<FailureBanner count={1} onView={() => {}} />);
    expect(screen.getByText(/1 delivery failure/i)).toBeInTheDocument();
  });

  it("renders the View link", () => {
    render(<FailureBanner count={5} onView={() => {}} />);
    expect(screen.getByRole("button", { name: /view/i })).toBeInTheDocument();
  });

  it("calls onView when the View button is clicked", async () => {
    const onView = jest.fn();
    const user = userEvent.setup();
    render(<FailureBanner count={5} onView={onView} />);

    await user.click(screen.getByRole("button", { name: /view/i }));

    expect(onView).toHaveBeenCalledTimes(1);
  });
});

// =============================================================================
// ConfirmDisconnectDialog tests
// =============================================================================

describe("ConfirmDisconnectDialog", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the dialog with title and description", () => {
    render(<ConfirmDisconnectDialog serverId={1} router={mockRouterRouter} />);
    expect(screen.getByText(/remove beanie bot/i)).toBeInTheDocument();
    expect(
      screen.getByText(/all channel mappings.*dm settings.*role assignments/i)
    ).toBeInTheDocument();
  });

  it("calls disconnectDiscordServerAction with the correct serverId on Confirm", async () => {
    mockDisconnectDiscordServerAction.mockResolvedValue({ success: true });

    const user = userEvent.setup();
    render(<ConfirmDisconnectDialog serverId={42} router={mockRouterRouter} />);

    await user.click(screen.getByTestId("alert-dialog-action"));

    await waitFor(() => {
      expect(mockDisconnectDiscordServerAction).toHaveBeenCalledWith(42);
    });
  });

  it("shows success toast and calls router.refresh() on success", async () => {
    mockDisconnectDiscordServerAction.mockResolvedValue({ success: true });

    const user = userEvent.setup();
    render(<ConfirmDisconnectDialog serverId={1} router={mockRouterRouter} />);

    await user.click(screen.getByTestId("alert-dialog-action"));

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith("Beanie Bot disconnected");
    });
    expect(mockRouterRefresh).toHaveBeenCalledTimes(1);
    expect(mockToastError).not.toHaveBeenCalled();
  });

  it("shows error toast and does NOT call router.refresh() on failure", async () => {
    mockDisconnectDiscordServerAction.mockResolvedValue({
      success: false,
      error: "Permission denied",
    });

    const user = userEvent.setup();
    render(<ConfirmDisconnectDialog serverId={1} router={mockRouterRouter} />);

    await user.click(screen.getByTestId("alert-dialog-action"));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Permission denied");
    });
    expect(mockRouterRefresh).not.toHaveBeenCalled();
    expect(mockToastSuccess).not.toHaveBeenCalled();
  });

  it("renders the Cancel button", () => {
    render(<ConfirmDisconnectDialog serverId={1} router={mockRouterRouter} />);
    expect(screen.getByTestId("alert-dialog-cancel")).toBeInTheDocument();
  });
});
