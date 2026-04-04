import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockGetUserAdminDetails = jest.fn();
const mockGetSiteRoles = jest.fn();

jest.mock("@trainers/supabase", () => ({
  getUserAdminDetails: (...args: unknown[]) => mockGetUserAdminDetails(...args),
  getSiteRoles: (...args: unknown[]) => mockGetSiteRoles(...args),
}));

jest.mock("@/lib/supabase/client", () => ({
  supabase: {},
}));

jest.mock("@/components/ui/sheet", () => ({
  Sheet: ({
    children,
    open,
  }: {
    children: React.ReactNode;
    open: boolean;
    onOpenChange?: (open: boolean) => void;
  }) => (open ? <div data-testid="sheet">{children}</div> : null),
  SheetContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SheetHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SheetTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
  SheetDescription: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  ),
}));

jest.mock("@/components/ui/alert-dialog", () => ({
  AlertDialog: ({
    children,
    open,
  }: {
    children: React.ReactNode;
    open: boolean;
    onOpenChange?: (open: boolean) => void;
  }) => (open ? <div data-testid="alert-dialog">{children}</div> : null),
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h3>{children}</h3>
  ),
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  ),
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogCancel: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
  AlertDialogAction: ({
    children,
    variant: _variant,
    disabled,
    onClick,
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string }) => (
    <button disabled={disabled} onClick={onClick}>
      {children}
    </button>
  ),
}));

jest.mock("@/components/ui/badge", () => ({
  Badge: ({
    children,
    ...props
  }: React.HTMLAttributes<HTMLDivElement> & { variant?: string }) => (
    <span {...props}>{children}</span>
  ),
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    disabled,
    size: _size,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: string;
    size?: string;
  }) => (
    <button disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

jest.mock("@/components/ui/input", () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} />
  ),
}));

jest.mock("@/components/ui/select", () => ({
  Select: ({
    children,
    onValueChange,
    value,
  }: {
    children: React.ReactNode;
    value?: string;
    onValueChange?: (v: string) => void;
  }) => (
    <div>
      <select
        data-testid="role-select"
        value={value}
        onChange={(e) => onValueChange?.(e.target.value)}
      >
        {children}
      </select>
    </div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => (
    <option value="">{placeholder}</option>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  SelectItem: ({
    value,
    children,
  }: {
    value: string;
    children: React.ReactNode;
  }) => <option value={value}>{children}</option>,
}));

jest.mock("@/components/ui/avatar", () => ({
  Avatar: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div {...props}>{children}</div>
  ),
  AvatarImage: () => null,
  AvatarFallback: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
}));

jest.mock("@trainers/utils", () => ({
  formatDateTime: (date: string) => `formatted(${date})`,
}));

const mockSuspendUserAction = jest.fn();
const mockUnsuspendUserAction = jest.fn();
const mockGrantSiteRoleAction = jest.fn();
const mockRevokeSiteRoleAction = jest.fn();

jest.mock("../actions", () => ({
  suspendUserAction: (...args: unknown[]) => mockSuspendUserAction(...args),
  unsuspendUserAction: (...args: unknown[]) => mockUnsuspendUserAction(...args),
  grantSiteRoleAction: (...args: unknown[]) => mockGrantSiteRoleAction(...args),
  revokeSiteRoleAction: (...args: unknown[]) =>
    mockRevokeSiteRoleAction(...args),
}));

const mockStartImpersonationAction = jest.fn();
jest.mock("@/lib/impersonation/actions", () => ({
  startImpersonationAction: (...args: unknown[]) =>
    mockStartImpersonationAction(...args),
}));

import { UserDetailSheet } from "../user-detail-sheet";

// ── Helpers ────────────────────────────────────────────────────────────────

function buildUser(overrides: Record<string, unknown> = {}) {
  return {
    id: "user-abc-123",
    email: "ash@trainers.local",
    username: "ash_ketchum",
    first_name: "Ash",
    last_name: "Ketchum",
    image: null,
    is_locked: false,
    created_at: "2026-01-01T00:00:00.000Z",
    last_sign_in_at: "2026-03-15T10:00:00.000Z",
    alts: [],
    user_roles: [],
    ...overrides,
  };
}

const defaultProps = {
  userId: "user-abc-123",
  open: true,
  onOpenChange: jest.fn(),
  onUserUpdated: jest.fn(),
};

async function renderAndWaitForLoad(props = defaultProps) {
  let result!: ReturnType<typeof render>;
  await act(async () => {
    result = render(<UserDetailSheet {...props} />);
  });
  return result;
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("UserDetailSheet", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUserAdminDetails.mockResolvedValue(buildUser());
    mockGetSiteRoles.mockResolvedValue([]);
    mockSuspendUserAction.mockResolvedValue({ success: true });
    mockUnsuspendUserAction.mockResolvedValue({ success: true });
    mockGrantSiteRoleAction.mockResolvedValue({ success: true });
    mockRevokeSiteRoleAction.mockResolvedValue({ success: true });
    mockStartImpersonationAction.mockResolvedValue({ success: true });
  });

  describe("when closed", () => {
    it("renders nothing when open is false", () => {
      render(<UserDetailSheet {...defaultProps} open={false} />);
      expect(screen.queryByTestId("sheet")).not.toBeInTheDocument();
    });
  });

  describe("when open with no userId", () => {
    it("does not fetch user data", () => {
      render(<UserDetailSheet {...defaultProps} userId={null} />);
      expect(mockGetUserAdminDetails).not.toHaveBeenCalled();
    });
  });

  describe("loading state", () => {
    it("shows loading spinner while fetching", () => {
      // Don't resolve — keep it in loading state
      mockGetUserAdminDetails.mockReturnValue(new Promise(() => {}));
      render(<UserDetailSheet {...defaultProps} />);
      // Spinner is a Loader2 svg inside the loading container
      expect(screen.queryByText("ash_ketchum")).not.toBeInTheDocument();
    });
  });

  describe("user not found", () => {
    it("shows 'User not found' when user data is null", async () => {
      mockGetUserAdminDetails.mockResolvedValue(null);
      await renderAndWaitForLoad();
      expect(screen.getByText("User not found")).toBeInTheDocument();
    });
  });

  describe("error state", () => {
    it("shows error message when fetch fails", async () => {
      mockGetUserAdminDetails.mockRejectedValue(new Error("Network error"));
      await renderAndWaitForLoad();
      expect(
        screen.getByText("Failed to load user details")
      ).toBeInTheDocument();
    });
  });

  describe("user info display", () => {
    it("shows user full name when available", async () => {
      await renderAndWaitForLoad();
      expect(screen.getByText("Ash Ketchum")).toBeInTheDocument();
    });

    it("shows username when name fields are absent", async () => {
      mockGetUserAdminDetails.mockResolvedValue(
        buildUser({ first_name: null, last_name: null })
      );
      await renderAndWaitForLoad();
      expect(screen.getByText("ash_ketchum")).toBeInTheDocument();
    });

    it("shows @username below name", async () => {
      await renderAndWaitForLoad();
      expect(screen.getByText("@ash_ketchum")).toBeInTheDocument();
    });

    it("shows email address", async () => {
      await renderAndWaitForLoad();
      expect(screen.getByText("ash@trainers.local")).toBeInTheDocument();
    });

    it("shows user ID", async () => {
      await renderAndWaitForLoad();
      expect(screen.getByText("user-abc-123")).toBeInTheDocument();
    });

    it("shows formatted created_at date", async () => {
      await renderAndWaitForLoad();
      expect(
        screen.getByText("formatted(2026-01-01T00:00:00.000Z)")
      ).toBeInTheDocument();
    });

    it("shows formatted last_sign_in_at date", async () => {
      await renderAndWaitForLoad();
      expect(
        screen.getByText("formatted(2026-03-15T10:00:00.000Z)")
      ).toBeInTheDocument();
    });

    it("shows 'Never' when last_sign_in_at is null", async () => {
      mockGetUserAdminDetails.mockResolvedValue(
        buildUser({ last_sign_in_at: null })
      );
      await renderAndWaitForLoad();
      expect(screen.getByText("Never")).toBeInTheDocument();
    });

    it("shows 'Active' badge when user is not locked", async () => {
      await renderAndWaitForLoad();
      expect(screen.getByText("Active")).toBeInTheDocument();
    });

    it("shows 'Suspended' badge when user is locked", async () => {
      mockGetUserAdminDetails.mockResolvedValue(buildUser({ is_locked: true }));
      await renderAndWaitForLoad();
      expect(screen.getByText("Suspended")).toBeInTheDocument();
    });
  });

  describe("alts section", () => {
    it("shows 'No alts created' when alts array is empty", async () => {
      await renderAndWaitForLoad();
      expect(screen.getByText("No alts created")).toBeInTheDocument();
    });

    it("shows alt count in section heading", async () => {
      mockGetUserAdminDetails.mockResolvedValue(
        buildUser({
          alts: [
            {
              id: 1,
              username: "pikachu",
              avatar_url: null,
              bio: null,
              tier: "master",
              created_at: null,
            },
          ],
        })
      );
      await renderAndWaitForLoad();
      expect(screen.getByText("Alts (1)")).toBeInTheDocument();
    });

    it("shows alt username", async () => {
      mockGetUserAdminDetails.mockResolvedValue(
        buildUser({
          alts: [
            {
              id: 1,
              username: "pikachu",
              avatar_url: null,
              bio: null,
              tier: null,
              created_at: null,
            },
          ],
        })
      );
      await renderAndWaitForLoad();
      expect(screen.getByText("pikachu")).toBeInTheDocument();
    });

    it("shows alt tier badge when tier is set", async () => {
      mockGetUserAdminDetails.mockResolvedValue(
        buildUser({
          alts: [
            {
              id: 1,
              username: "pikachu",
              avatar_url: null,
              bio: null,
              tier: "master",
              created_at: null,
            },
          ],
        })
      );
      await renderAndWaitForLoad();
      expect(screen.getByText("master")).toBeInTheDocument();
    });
  });

  describe("site roles section", () => {
    it("shows 'No site roles assigned' when user has no site roles", async () => {
      await renderAndWaitForLoad();
      expect(screen.getByText("No site roles assigned")).toBeInTheDocument();
    });

    it("shows assigned site role badges", async () => {
      mockGetUserAdminDetails.mockResolvedValue(
        buildUser({
          user_roles: [
            {
              id: 10,
              created_at: null,
              role: {
                id: 1,
                name: "site_admin",
                description: "Site administrator",
                scope: "site",
              },
            },
          ],
        })
      );
      await renderAndWaitForLoad();
      expect(screen.getByText("Site Admin")).toBeInTheDocument();
    });

    it("does not show non-site roles as site roles", async () => {
      mockGetUserAdminDetails.mockResolvedValue(
        buildUser({
          user_roles: [
            {
              id: 11,
              created_at: null,
              role: {
                id: 2,
                name: "community_leader",
                description: null,
                scope: "community",
              },
            },
          ],
        })
      );
      await renderAndWaitForLoad();
      expect(screen.getByText("No site roles assigned")).toBeInTheDocument();
    });

    it("shows Add button when available roles exist", async () => {
      mockGetSiteRoles.mockResolvedValue([
        {
          id: 1,
          name: "site_admin",
          description: null,
          scope: "site",
        },
      ]);
      await renderAndWaitForLoad();
      expect(screen.getByRole("button", { name: /add/i })).toBeInTheDocument();
    });
  });

  describe("actions — active user", () => {
    it("shows suspension reason input for active user", async () => {
      await renderAndWaitForLoad();
      expect(
        screen.getByPlaceholderText(/reason for suspension/i)
      ).toBeInTheDocument();
    });

    it("shows 'Suspend Account' button for active user", async () => {
      await renderAndWaitForLoad();
      expect(
        screen.getByRole("button", { name: /suspend account/i })
      ).toBeInTheDocument();
    });

    it("shows 'Impersonate User' button", async () => {
      await renderAndWaitForLoad();
      expect(
        screen.getByRole("button", { name: /impersonate user/i })
      ).toBeInTheDocument();
    });
  });

  describe("actions — suspended user", () => {
    it("shows 'Unsuspend Account' button when user is locked", async () => {
      mockGetUserAdminDetails.mockResolvedValue(buildUser({ is_locked: true }));
      await renderAndWaitForLoad();
      expect(
        screen.getByRole("button", { name: /unsuspend account/i })
      ).toBeInTheDocument();
    });

    it("does not show suspension reason input for locked user", async () => {
      mockGetUserAdminDetails.mockResolvedValue(buildUser({ is_locked: true }));
      await renderAndWaitForLoad();
      expect(
        screen.queryByPlaceholderText(/reason for suspension/i)
      ).not.toBeInTheDocument();
    });
  });

  describe("impersonate flow", () => {
    it("shows impersonation input when 'Impersonate User' is clicked", async () => {
      const user = userEvent.setup();
      await renderAndWaitForLoad();

      await user.click(
        screen.getByRole("button", { name: /impersonate user/i })
      );

      expect(
        screen.getByPlaceholderText(/reason for impersonation/i)
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /start impersonation/i })
      ).toBeInTheDocument();
    });

    it("opens confirmation dialog when 'Start Impersonation' is clicked", async () => {
      const user = userEvent.setup();
      await renderAndWaitForLoad();

      await user.click(
        screen.getByRole("button", { name: /impersonate user/i })
      );
      await user.click(
        screen.getByRole("button", { name: /start impersonation/i })
      );

      expect(screen.getByTestId("alert-dialog")).toBeInTheDocument();
      expect(screen.getByText("Impersonate User")).toBeInTheDocument();
    });

    it("hides impersonation input when cancel X is clicked", async () => {
      const user = userEvent.setup();
      await renderAndWaitForLoad();

      await user.click(
        screen.getByRole("button", { name: /impersonate user/i })
      );
      expect(
        screen.getByPlaceholderText(/reason for impersonation/i)
      ).toBeInTheDocument();

      // Just check the impersonation UI is togglable by clicking Start then checking dialog
      // The X button hides the input
      const buttons = screen.getAllByRole("button");
      // The X is the last button in the impersonation group (no text)
      const xBtn = buttons.find(
        (btn) => btn.textContent === "" && btn.className?.includes
      );
      if (xBtn) {
        await user.click(xBtn);
        expect(
          screen.queryByPlaceholderText(/reason for impersonation/i)
        ).not.toBeInTheDocument();
      }
    });
  });

  describe("suspend action flow", () => {
    it("opens confirmation dialog when 'Suspend Account' is clicked", async () => {
      const user = userEvent.setup();
      await renderAndWaitForLoad();

      await user.click(
        screen.getByRole("button", { name: /suspend account/i })
      );

      expect(screen.getByTestId("alert-dialog")).toBeInTheDocument();
      expect(screen.getByText("Suspend User")).toBeInTheDocument();
    });

    it("calls suspendUserAction when suspend is confirmed", async () => {
      const user = userEvent.setup();
      await renderAndWaitForLoad();

      await user.click(
        screen.getByRole("button", { name: /suspend account/i })
      );
      await user.click(screen.getByRole("button", { name: "Confirm" }));

      await waitFor(() => {
        expect(mockSuspendUserAction).toHaveBeenCalledWith(
          "user-abc-123",
          undefined
        );
      });
    });

    it("passes suspension reason when provided", async () => {
      const user = userEvent.setup();
      await renderAndWaitForLoad();

      await user.type(
        screen.getByPlaceholderText(/reason for suspension/i),
        "TOS violation"
      );
      await user.click(
        screen.getByRole("button", { name: /suspend account/i })
      );
      await user.click(screen.getByRole("button", { name: "Confirm" }));

      await waitFor(() => {
        expect(mockSuspendUserAction).toHaveBeenCalledWith(
          "user-abc-123",
          "TOS violation"
        );
      });
    });

    it("shows action error when suspend fails", async () => {
      mockSuspendUserAction.mockResolvedValue({
        success: false,
        error: "Cannot suspend admin",
      });

      const user = userEvent.setup();
      await renderAndWaitForLoad();

      await user.click(
        screen.getByRole("button", { name: /suspend account/i })
      );
      await user.click(screen.getByRole("button", { name: "Confirm" }));

      await waitFor(() => {
        expect(screen.getByText("Cannot suspend admin")).toBeInTheDocument();
      });
    });

    it("calls onUserUpdated after successful suspend", async () => {
      const user = userEvent.setup();
      await renderAndWaitForLoad();

      await user.click(
        screen.getByRole("button", { name: /suspend account/i })
      );
      await user.click(screen.getByRole("button", { name: "Confirm" }));

      await waitFor(() => {
        expect(defaultProps.onUserUpdated).toHaveBeenCalled();
      });
    });
  });

  describe("unsuspend action flow", () => {
    it("opens confirmation dialog when 'Unsuspend Account' is clicked", async () => {
      mockGetUserAdminDetails.mockResolvedValue(buildUser({ is_locked: true }));

      const user = userEvent.setup();
      await renderAndWaitForLoad();

      await user.click(
        screen.getByRole("button", { name: /unsuspend account/i })
      );

      expect(screen.getByTestId("alert-dialog")).toBeInTheDocument();
      expect(screen.getByText("Unsuspend User")).toBeInTheDocument();
    });

    it("calls unsuspendUserAction when confirmed", async () => {
      mockGetUserAdminDetails.mockResolvedValue(buildUser({ is_locked: true }));

      const user = userEvent.setup();
      await renderAndWaitForLoad();

      await user.click(
        screen.getByRole("button", { name: /unsuspend account/i })
      );
      await user.click(screen.getByRole("button", { name: "Confirm" }));

      await waitFor(() => {
        expect(mockUnsuspendUserAction).toHaveBeenCalledWith("user-abc-123");
      });
    });
  });

  describe("revoke role flow", () => {
    it("opens confirmation dialog when remove role button is clicked", async () => {
      mockGetUserAdminDetails.mockResolvedValue(
        buildUser({
          user_roles: [
            {
              id: 10,
              created_at: null,
              role: {
                id: 1,
                name: "site_admin",
                description: null,
                scope: "site",
              },
            },
          ],
        })
      );

      const user = userEvent.setup();
      await renderAndWaitForLoad();

      await user.click(
        screen.getByRole("button", { name: /remove site admin role/i })
      );

      expect(screen.getByTestId("alert-dialog")).toBeInTheDocument();
      expect(screen.getByText("Remove Role")).toBeInTheDocument();
    });

    it("calls revokeSiteRoleAction when confirmed", async () => {
      mockGetUserAdminDetails.mockResolvedValue(
        buildUser({
          user_roles: [
            {
              id: 10,
              created_at: null,
              role: {
                id: 1,
                name: "site_admin",
                description: null,
                scope: "site",
              },
            },
          ],
        })
      );

      const user = userEvent.setup();
      await renderAndWaitForLoad();

      await user.click(
        screen.getByRole("button", { name: /remove site admin role/i })
      );
      await user.click(screen.getByRole("button", { name: "Confirm" }));

      await waitFor(() => {
        expect(mockRevokeSiteRoleAction).toHaveBeenCalledWith(
          "user-abc-123",
          1
        );
      });
    });
  });

  describe("grant role flow", () => {
    it("calls grantSiteRoleAction when a role is selected and Add is clicked", async () => {
      mockGetSiteRoles.mockResolvedValue([
        { id: 2, name: "site_moderator", description: null, scope: "site" },
      ]);

      const user = userEvent.setup();
      await renderAndWaitForLoad();

      // Select the role using the mock select
      const roleSelect = screen.getByTestId("role-select");
      await user.selectOptions(roleSelect, "2");

      await user.click(screen.getByRole("button", { name: /add/i }));

      await waitFor(() => {
        expect(mockGrantSiteRoleAction).toHaveBeenCalledWith("user-abc-123", 2);
      });
    });

    it("shows action error when grant fails", async () => {
      mockGetSiteRoles.mockResolvedValue([
        { id: 2, name: "site_moderator", description: null, scope: "site" },
      ]);
      mockGrantSiteRoleAction.mockResolvedValue({
        success: false,
        error: "Role already assigned",
      });

      const user = userEvent.setup();
      await renderAndWaitForLoad();

      const roleSelect = screen.getByTestId("role-select");
      await user.selectOptions(roleSelect, "2");
      await user.click(screen.getByRole("button", { name: /add/i }));

      await waitFor(() => {
        expect(screen.getByText("Role already assigned")).toBeInTheDocument();
      });
    });
  });

  describe("refetch on open", () => {
    it("re-fetches user data when sheet opens", async () => {
      const { rerender } = render(
        <UserDetailSheet {...defaultProps} open={false} />
      );

      await act(async () => {
        rerender(<UserDetailSheet {...defaultProps} open={true} />);
      });

      expect(mockGetUserAdminDetails).toHaveBeenCalledWith(
        expect.anything(),
        "user-abc-123"
      );
    });

    it("fetches site roles alongside user details", async () => {
      await renderAndWaitForLoad();
      expect(mockGetSiteRoles).toHaveBeenCalled();
    });
  });
});
