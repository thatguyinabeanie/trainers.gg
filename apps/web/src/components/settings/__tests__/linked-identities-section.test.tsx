/**
 * Tests for LinkedIdentitiesSection component
 * Verifies UI rendering, connect/disconnect functionality, and lockout protection
 */

import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";

import { ALL_DM_EVENT_TYPES } from "@trainers/supabase";

import { LinkedIdentitiesSection } from "../linked-identities-section";

// =============================================================================
// Module-level mocks
// =============================================================================

// Mock next/link as a simple anchor
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
  } & Record<string, unknown>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

// Mock TanStack Query — useQuery returns data from our per-test variable
const mockUseQuery = jest.fn();
const mockQueryClient = { invalidateQueries: jest.fn() };
jest.mock("@tanstack/react-query", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useQueryClient: () => mockQueryClient,
}));

// Mock dependencies
const mockLinkIdentity = jest.fn().mockResolvedValue({ data: { url: "" }, error: null });
const mockUnlinkIdentity = jest.fn();

jest.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    user: {
      id: "user-123",
      identities: mockUserIdentities,
    },
  }),
}));

jest.mock("@/lib/supabase/client", () => ({
  createClient: jest.fn(() => ({
    auth: {
      linkIdentity: mockLinkIdentity,
      unlinkIdentity: mockUnlinkIdentity,
    },
  })),
}));

const mockGetBlueskyStatus = jest.fn();
const mockUnlinkBlueskyAction = jest.fn();

jest.mock("@/actions/identities", () => ({
  getBlueskyStatus: (...args: unknown[]) => mockGetBlueskyStatus(...args),
  unlinkBlueskyAction: (...args: unknown[]) => mockUnlinkBlueskyAction(...args),
}));

jest.mock("@/lib/supabase/auth", () => ({
  oauthProviders: [
    { name: "x", displayName: "X", icon: "x", type: "supabase" },
    {
      name: "discord",
      displayName: "Discord",
      icon: "discord",
      type: "supabase",
    },
    {
      name: "twitch",
      displayName: "Twitch",
      icon: "twitch",
      type: "supabase",
    },
  ],
}));

// Mock toast
jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock window.location
delete (window as Partial<Window>).location;
window.location = { href: "", origin: "http://localhost:3000" } as Location;

// Test data
let mockUserIdentities: Array<{
  id: string;
  user_id: string;
  identity_id: string;
  provider: string;
}> = [];

describe("LinkedIdentitiesSection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUserIdentities = [];
    // Default: bluesky status query returns loaded with null, DM count returns 0
    mockUseQuery.mockImplementation((opts: { queryKey: string[] }) => {
      if (opts.queryKey[0] === "bluesky-status") {
        return { data: { did: null, handle: null }, isLoading: false };
      }
      // discord-dm-preferences-count
      return { data: 0, isLoading: false };
    });
    mockGetBlueskyStatus.mockResolvedValue({
      success: true,
      data: { did: null, pdsStatus: null, handle: null },
    });
  });

  describe("rendering", () => {
    it("shows loading state initially", () => {
      mockUseQuery.mockImplementation((opts: { queryKey: string[] }) => {
        if (opts.queryKey[0] === "bluesky-status") {
          return { data: undefined, isLoading: true };
        }
        return { data: 0, isLoading: false };
      });
      render(<LinkedIdentitiesSection />);
      expect(screen.getByRole("status")).toBeInTheDocument();
    });

    it("renders all OAuth providers", async () => {
      render(<LinkedIdentitiesSection />);

      await waitFor(() => {
        expect(screen.getByText("X")).toBeInTheDocument();
        expect(screen.getByText("Discord")).toBeInTheDocument();
        expect(screen.getByText("Twitch")).toBeInTheDocument();
      });
    });

    it("shows 'Not connected' for unlinked providers", async () => {
      render(<LinkedIdentitiesSection />);

      await waitFor(() => {
        const notConnected = screen.getAllByText("Not connected");
        // 3 OAuth providers + Bluesky
        expect(notConnected).toHaveLength(4);
      });
    });

    it("shows 'Connected' for linked providers", async () => {
      mockUserIdentities = [
        {
          id: "identity-1",
          user_id: "user-123",
          identity_id: "discord-123",
          provider: "discord",
        },
      ];

      render(<LinkedIdentitiesSection />);

      await waitFor(() => {
        expect(screen.getByText("Discord")).toBeInTheDocument();
        const discordContainer = screen.getByText("Discord").closest("div");
        expect(discordContainer).toHaveTextContent("Connected");
      });
    });

    it("renders Bluesky when user has DID", async () => {
      mockUseQuery.mockImplementation((opts: { queryKey: string[] }) => {
        if (opts.queryKey[0] === "bluesky-status") {
          return {
            data: {
              did: "did:plc:test123",
              handle: "testuser.trainers.gg",
            },
            isLoading: false,
          };
        }
        return { data: 0, isLoading: false };
      });

      render(<LinkedIdentitiesSection />);

      await waitFor(() => {
        expect(screen.getByText("Bluesky")).toBeInTheDocument();
        expect(screen.getByText("@testuser.trainers.gg")).toBeInTheDocument();
      });
    });

    it("shows Bluesky as 'Not connected' when user has no DID", async () => {
      mockGetBlueskyStatus.mockResolvedValue({
        success: true,
        data: { did: null, pdsStatus: null, handle: null },
      });

      render(<LinkedIdentitiesSection />);

      await waitFor(() => {
        expect(screen.getByText("Bluesky")).toBeInTheDocument();
      });

      // Find the Bluesky row and verify it shows "Not connected" with a Connect button
      const blueskyRow = screen
        .getByText("Bluesky")
        .closest(".flex.items-center.justify-between") as HTMLElement;
      expect(within(blueskyRow).getByText("Not connected")).toBeInTheDocument();
      expect(
        within(blueskyRow).getByRole("button", { name: /connect/i })
      ).toBeInTheDocument();
    });
  });

  describe("connect functionality", () => {
    it("calls linkIdentity when clicking Connect for OAuth provider", async () => {
      const user = userEvent.setup();
      render(<LinkedIdentitiesSection />);

      await waitFor(() => {
        expect(screen.getByText("Discord")).toBeInTheDocument();
      });

      // Find the Discord row specifically and click its Connect button
      const discordRow = screen
        .getByText("Discord")
        .closest(".flex.items-center.justify-between") as HTMLElement;
      const connectButton = within(discordRow).getByRole("button", {
        name: /connect/i,
      });
      await user.click(connectButton);

      expect(mockLinkIdentity).toHaveBeenCalledWith({
        provider: "discord",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=%2Fdashboard%2Fsettings%2Faccount`,
        },
      });
    });

    it("redirects to Bluesky OAuth when clicking Connect for Bluesky", async () => {
      const user = userEvent.setup();
      render(<LinkedIdentitiesSection />);

      await waitFor(() => {
        expect(screen.getByText("Bluesky")).toBeInTheDocument();
      });

      // Find the Bluesky row and click Connect
      const blueskyRow = screen
        .getByText("Bluesky")
        .closest(".flex.items-center.justify-between") as HTMLElement;
      const connectButton = within(blueskyRow).getByRole("button", {
        name: /connect/i,
      });
      await user.click(connectButton);

      expect(window.location.href).toBe(
        "/api/oauth/login?returnUrl=%2Fdashboard%2Fsettings%2Faccount"
      );
    });
  });

  describe("disconnect functionality", () => {
    it("calls unlinkIdentity when clicking Disconnect for OAuth provider", async () => {
      const user = userEvent.setup();
      mockUserIdentities = [
        {
          id: "identity-1",
          user_id: "user-123",
          identity_id: "discord-123",
          provider: "discord",
        },
        {
          id: "identity-2",
          user_id: "user-123",
          identity_id: "x-456",
          provider: "x",
        },
      ];
      mockUnlinkIdentity.mockResolvedValue({ error: null });

      render(<LinkedIdentitiesSection />);

      await waitFor(() => {
        expect(screen.getAllByText("Connected")).toHaveLength(2);
      });

      // Select by provider label to avoid depending on render order
      const xRow = screen
        .getByText("X")
        .closest(".flex.items-center.justify-between") as HTMLElement;
      const disconnectButton = within(xRow).getByRole("button", {
        name: /disconnect/i,
      });
      await user.click(disconnectButton);

      await waitFor(() => {
        expect(mockUnlinkIdentity).toHaveBeenCalledWith(
          expect.objectContaining({
            id: "identity-2",
            provider: "x",
          })
        );
      });
    });

    it("shows success toast after successful disconnect", async () => {
      const user = userEvent.setup();
      mockUserIdentities = [
        {
          id: "identity-1",
          user_id: "user-123",
          identity_id: "discord-123",
          provider: "discord",
        },
        {
          id: "identity-2",
          user_id: "user-123",
          identity_id: "x-456",
          provider: "x",
        },
      ];
      mockUnlinkIdentity.mockResolvedValue({ error: null });

      render(<LinkedIdentitiesSection />);

      await waitFor(() => {
        expect(screen.getAllByText("Connected")).toHaveLength(2);
      });

      const disconnectButtons = screen.getAllByRole("button", {
        name: /disconnect/i,
      });
      await user.click(disconnectButtons[0]);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("Account disconnected");
      });
    });

    it("shows error toast when disconnect fails", async () => {
      const user = userEvent.setup();
      mockUserIdentities = [
        {
          id: "identity-1",
          user_id: "user-123",
          identity_id: "discord-123",
          provider: "discord",
        },
        {
          id: "identity-2",
          user_id: "user-123",
          identity_id: "x-456",
          provider: "x",
        },
      ];
      mockUnlinkIdentity.mockResolvedValue({
        error: { message: "Failed to unlink" },
      });

      render(<LinkedIdentitiesSection />);

      await waitFor(() => {
        expect(screen.getAllByText("Connected")).toHaveLength(2);
      });

      const disconnectButtons = screen.getAllByRole("button", {
        name: /disconnect/i,
      });
      await user.click(disconnectButtons[0]);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to unlink");
      });
    });

    it("calls unlinkBlueskyAction when disconnecting Bluesky", async () => {
      const user = userEvent.setup();
      mockUserIdentities = [
        {
          id: "identity-1",
          user_id: "user-123",
          identity_id: "discord-123",
          provider: "discord",
        },
      ];
      mockUseQuery.mockImplementation((opts: { queryKey: string[] }) => {
        if (opts.queryKey[0] === "bluesky-status") {
          return {
            data: {
              did: "did:plc:test123",
              handle: "testuser.trainers.gg",
            },
            isLoading: false,
          };
        }
        return { data: 0, isLoading: false };
      });
      mockUnlinkBlueskyAction.mockResolvedValue({ success: true });

      render(<LinkedIdentitiesSection />);

      await waitFor(() => {
        expect(screen.getByText("Bluesky")).toBeInTheDocument();
      });

      // Find the Bluesky row container (go up from text to the flex justify-between div)
      const blueskyRow = screen
        .getByText("Bluesky")
        .closest(".flex.items-center.justify-between") as HTMLElement;
      const disconnectButton = within(blueskyRow).getByRole("button", {
        name: /disconnect/i,
      });
      await user.click(disconnectButton);

      await waitFor(() => {
        expect(mockUnlinkBlueskyAction).toHaveBeenCalled();
        expect(toast.success).toHaveBeenCalledWith(
          "Bluesky account disconnected"
        );
      });
    });
  });

  describe("lockout protection", () => {
    it("disables disconnect button when only one auth method exists", async () => {
      mockUserIdentities = [
        {
          id: "identity-1",
          user_id: "user-123",
          identity_id: "discord-123",
          provider: "discord",
        },
      ];
      mockGetBlueskyStatus.mockResolvedValue({
        success: true,
        data: { did: null, pdsStatus: null, handle: null },
      });

      render(<LinkedIdentitiesSection />);

      await waitFor(() => {
        expect(screen.getByText("Connected")).toBeInTheDocument();
      });

      const disconnectButton = screen.getByRole("button", {
        name: /disconnect/i,
      });
      expect(disconnectButton).toBeDisabled();
    });

    it("enables disconnect buttons when multiple auth methods exist", async () => {
      mockUserIdentities = [
        {
          id: "identity-1",
          user_id: "user-123",
          identity_id: "discord-123",
          provider: "discord",
        },
      ];
      mockUseQuery.mockImplementation((opts: { queryKey: string[] }) => {
        if (opts.queryKey[0] === "bluesky-status") {
          return {
            data: {
              did: "did:plc:test123",
              handle: "testuser.trainers.gg",
            },
            isLoading: false,
          };
        }
        return { data: 0, isLoading: false };
      });

      render(<LinkedIdentitiesSection />);

      await waitFor(() => {
        // Discord shows "Connected", Bluesky shows the handle
        expect(screen.getByText("Connected")).toBeInTheDocument();
        expect(screen.getByText("@testuser.trainers.gg")).toBeInTheDocument();
      });

      const disconnectButtons = screen.getAllByRole("button", {
        name: /disconnect/i,
      });
      disconnectButtons.forEach((button) => {
        expect(button).not.toBeDisabled();
      });
    });

    it("shows tooltip when disconnect is disabled", async () => {
      const user = userEvent.setup();
      mockUserIdentities = [
        {
          id: "identity-1",
          user_id: "user-123",
          identity_id: "discord-123",
          provider: "discord",
        },
      ];

      render(<LinkedIdentitiesSection />);

      await waitFor(() => {
        expect(screen.getByText("Connected")).toBeInTheDocument();
      });

      const disconnectButton = screen.getByRole("button", {
        name: /disconnect/i,
      });

      await user.hover(disconnectButton);

      await waitFor(() => {
        expect(
          screen.getByText("You must have at least one authentication method")
        ).toBeInTheDocument();
      });
    });

    it("prevents disconnect action when clicking disabled button", async () => {
      const user = userEvent.setup();
      mockUserIdentities = [
        {
          id: "identity-1",
          user_id: "user-123",
          identity_id: "discord-123",
          provider: "discord",
        },
      ];

      render(<LinkedIdentitiesSection />);

      await waitFor(() => {
        expect(screen.getByText("Connected")).toBeInTheDocument();
      });

      const disconnectButton = screen.getByRole("button", {
        name: /disconnect/i,
      });
      await user.click(disconnectButton);

      // Toast error should be shown if user somehow triggers the action
      // But the button is disabled, so the click won't trigger anything
      expect(mockUnlinkIdentity).not.toHaveBeenCalled();
      expect(mockUnlinkBlueskyAction).not.toHaveBeenCalled();
    });
  });

  describe("loading states", () => {
    it("shows 'Disconnecting...' text while unlinking", async () => {
      const user = userEvent.setup();
      mockUserIdentities = [
        {
          id: "identity-1",
          user_id: "user-123",
          identity_id: "discord-123",
          provider: "discord",
        },
        {
          id: "identity-2",
          user_id: "user-123",
          identity_id: "x-456",
          provider: "x",
        },
      ];

      // Delay the unlink response to see loading state
      mockUnlinkIdentity.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ error: null }), 100)
          )
      );

      render(<LinkedIdentitiesSection />);

      await waitFor(() => {
        expect(screen.getAllByText("Connected")).toHaveLength(2);
      });

      const disconnectButtons = screen.getAllByRole("button", {
        name: /disconnect/i,
      });
      await user.click(disconnectButtons[0]);

      // Should show loading text
      expect(screen.getByText("Disconnecting...")).toBeInTheDocument();
    });

    it("disables all disconnect buttons while one is loading", async () => {
      const user = userEvent.setup();
      mockUserIdentities = [
        {
          id: "identity-1",
          user_id: "user-123",
          identity_id: "discord-123",
          provider: "discord",
        },
        {
          id: "identity-2",
          user_id: "user-123",
          identity_id: "x-456",
          provider: "x",
        },
      ];

      mockUnlinkIdentity.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ error: null }), 100)
          )
      );

      render(<LinkedIdentitiesSection />);

      await waitFor(() => {
        expect(screen.getAllByText("Connected")).toHaveLength(2);
      });

      const disconnectButtons = screen.getAllByRole("button", {
        name: /disconnect/i,
      });

      await user.click(disconnectButtons[0]);

      // Other disconnect button should be disabled
      const otherButton = disconnectButtons[1];
      expect(otherButton).toBeDisabled();
    });
  });

  describe("error handling", () => {
    it("handles getBlueskyStatus failure gracefully", async () => {
      mockGetBlueskyStatus.mockResolvedValue({
        success: false,
        error: "Failed to fetch Bluesky status",
      });

      render(<LinkedIdentitiesSection />);

      await waitFor(() => {
        // Should still render OAuth providers
        expect(screen.getByText("Discord")).toBeInTheDocument();
        // Bluesky row still renders but shows "Not connected"
        expect(screen.getByText("Bluesky")).toBeInTheDocument();
      });

      const blueskyRow = screen
        .getByText("Bluesky")
        .closest(".flex.items-center.justify-between") as HTMLElement;
      expect(within(blueskyRow).getByText("Not connected")).toBeInTheDocument();
    });

    it("shows error toast when unlinkBlueskyAction fails", async () => {
      const user = userEvent.setup();
      mockUserIdentities = [
        {
          id: "identity-1",
          user_id: "user-123",
          identity_id: "discord-123",
          provider: "discord",
        },
      ];
      mockUseQuery.mockImplementation((opts: { queryKey: string[] }) => {
        if (opts.queryKey[0] === "bluesky-status") {
          return {
            data: {
              did: "did:plc:test123",
              handle: "testuser.trainers.gg",
            },
            isLoading: false,
          };
        }
        return { data: 0, isLoading: false };
      });
      mockUnlinkBlueskyAction.mockResolvedValue({
        success: false,
        error: "Failed to unlink Bluesky",
      });

      render(<LinkedIdentitiesSection />);

      await waitFor(() => {
        expect(screen.getByText("Bluesky")).toBeInTheDocument();
      });

      // Find the Bluesky row container (go up from text to the flex justify-between div)
      const blueskyRow = screen
        .getByText("Bluesky")
        .closest(".flex.items-center.justify-between") as HTMLElement;
      const disconnectButton = within(blueskyRow).getByRole("button", {
        name: /disconnect/i,
      });
      await user.click(disconnectButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to unlink Bluesky");
      });
    });
  });

  describe("Discord DM summary", () => {
    it("does NOT render DM summary when Discord is not linked", async () => {
      // mockUserIdentities is empty — Discord not linked
      render(<LinkedIdentitiesSection />);

      await waitFor(() => {
        expect(screen.getByText("Discord")).toBeInTheDocument();
      });

      expect(screen.queryByText(/DM notifications/)).not.toBeInTheDocument();
    });

    it("renders DM summary when Discord is linked", async () => {
      mockUseQuery.mockImplementation((opts: { queryKey: string[] }) => {
        if (opts.queryKey[0] === "bluesky-status") {
          return { data: { did: null, handle: null }, isLoading: false };
        }
        return { data: 7, isLoading: false };
      });
      mockUserIdentities = [
        {
          id: "identity-1",
          user_id: "user-123",
          identity_id: "discord-123",
          provider: "discord",
        },
      ];

      render(<LinkedIdentitiesSection />);

      await waitFor(() => {
        expect(screen.getByText("Discord")).toBeInTheDocument();
      });

      expect(screen.getByText(/DM notifications/)).toBeInTheDocument();
      expect(
        screen.getByText(
          new RegExp(`7 of ${ALL_DM_EVENT_TYPES.length} enabled`)
        )
      ).toBeInTheDocument();
    });

    it("Manage link points to /dashboard/settings/notifications#discord-dms", async () => {
      mockUseQuery.mockImplementation((opts: { queryKey: string[] }) => {
        if (opts.queryKey[0] === "bluesky-status") {
          return { data: { did: null, handle: null }, isLoading: false };
        }
        return { data: 3, isLoading: false };
      });
      mockUserIdentities = [
        {
          id: "identity-1",
          user_id: "user-123",
          identity_id: "discord-123",
          provider: "discord",
        },
      ];

      render(<LinkedIdentitiesSection />);

      await waitFor(() => {
        expect(screen.getByText("Discord")).toBeInTheDocument();
      });

      const manageLink = screen.getByRole("link", { name: /Manage/i });
      expect(manageLink).toHaveAttribute(
        "href",
        "/dashboard/settings/notifications#discord-dms"
      );
    });

    it("shows 0 enabled when no DM preferences are set", async () => {
      mockUseQuery.mockImplementation((opts: { queryKey: string[] }) => {
        if (opts.queryKey[0] === "bluesky-status") {
          return { data: { did: null, handle: null }, isLoading: false };
        }
        return { data: 0, isLoading: false };
      });
      mockUserIdentities = [
        {
          id: "identity-1",
          user_id: "user-123",
          identity_id: "discord-123",
          provider: "discord",
        },
      ];

      render(<LinkedIdentitiesSection />);

      await waitFor(() => {
        expect(screen.getByText("Discord")).toBeInTheDocument();
      });

      expect(
        screen.getByText(
          new RegExp(`0 of ${ALL_DM_EVENT_TYPES.length} enabled`)
        )
      ).toBeInTheDocument();
    });

    it("does NOT render DM summary for non-Discord linked providers", async () => {
      mockUserIdentities = [
        {
          id: "identity-1",
          user_id: "user-123",
          identity_id: "x-123",
          provider: "x",
        },
      ];

      render(<LinkedIdentitiesSection />);

      await waitFor(() => {
        expect(screen.getByText("X")).toBeInTheDocument();
      });

      expect(screen.queryByText(/DM notifications/)).not.toBeInTheDocument();
    });
  });
});
