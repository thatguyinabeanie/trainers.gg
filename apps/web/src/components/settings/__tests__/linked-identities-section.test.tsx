/**
 * Tests for LinkedIdentitiesSection component
 * Verifies UI rendering, connect/disconnect functionality, and lockout protection
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LinkedIdentitiesSection } from "../linked-identities-section";

// Mock dependencies
const mockSignInWithOAuth = jest.fn();
const mockUnlinkIdentity = jest.fn();

jest.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    user: {
      id: "user-123",
      identities: mockUserIdentities,
    },
    signInWithOAuth: mockSignInWithOAuth,
  }),
}));

jest.mock("@/lib/supabase/client", () => ({
  createClient: jest.fn(() => ({
    auth: {
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
    { name: "google", displayName: "Google", icon: "google", type: "supabase" },
    { name: "twitter", displayName: "X", icon: "twitter", type: "supabase" },
    {
      name: "discord",
      displayName: "Discord",
      icon: "discord",
      type: "supabase",
    },
    { name: "github", displayName: "GitHub", icon: "github", type: "supabase" },
  ],
}));

// Mock toast
const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();

jest.mock("sonner", () => ({
  toast: {
    success: mockToastSuccess,
    error: mockToastError,
  },
}));

// Mock window.location
delete (window as Partial<Window>).location;
window.location = { href: "" } as Location;

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
    mockGetBlueskyStatus.mockResolvedValue({
      success: true,
      data: { did: null, pdsStatus: null, handle: null },
    });
  });

  describe("rendering", () => {
    it("shows loading state initially", () => {
      render(<LinkedIdentitiesSection />);
      expect(screen.getByRole("status")).toBeInTheDocument();
    });

    it("renders all OAuth providers", async () => {
      render(<LinkedIdentitiesSection />);

      await waitFor(() => {
        expect(screen.getByText("Google")).toBeInTheDocument();
        expect(screen.getByText("X")).toBeInTheDocument();
        expect(screen.getByText("Discord")).toBeInTheDocument();
        expect(screen.getByText("GitHub")).toBeInTheDocument();
      });
    });

    it("shows 'Not connected' for unlinked providers", async () => {
      render(<LinkedIdentitiesSection />);

      await waitFor(() => {
        const notConnected = screen.getAllByText("Not connected");
        expect(notConnected).toHaveLength(4); // All 4 OAuth providers
      });
    });

    it("shows 'Connected' for linked providers", async () => {
      mockUserIdentities = [
        {
          id: "identity-1",
          user_id: "user-123",
          identity_id: "google-123",
          provider: "google",
        },
      ];

      render(<LinkedIdentitiesSection />);

      await waitFor(() => {
        expect(screen.getByText("Google")).toBeInTheDocument();
        const googleContainer = screen.getByText("Google").closest("div");
        expect(googleContainer).toHaveTextContent("Connected");
      });
    });

    it("renders Bluesky when user has DID", async () => {
      mockGetBlueskyStatus.mockResolvedValue({
        success: true,
        data: {
          did: "did:plc:test123",
          pdsStatus: "active",
          handle: "testuser.trainers.gg",
        },
      });

      render(<LinkedIdentitiesSection />);

      await waitFor(() => {
        expect(screen.getByText("Bluesky")).toBeInTheDocument();
        expect(screen.getByText("@testuser.trainers.gg")).toBeInTheDocument();
      });
    });

    it("does not render Bluesky when user has no DID", async () => {
      mockGetBlueskyStatus.mockResolvedValue({
        success: true,
        data: { did: null, pdsStatus: null, handle: null },
      });

      render(<LinkedIdentitiesSection />);

      await waitFor(() => {
        expect(screen.queryByText("Bluesky")).not.toBeInTheDocument();
      });
    });
  });

  describe("connect functionality", () => {
    it("calls signInWithOAuth when clicking Connect for OAuth provider", async () => {
      const user = userEvent.setup();
      render(<LinkedIdentitiesSection />);

      await waitFor(() => {
        expect(screen.getByText("Google")).toBeInTheDocument();
      });

      const connectButtons = screen.getAllByRole("button", {
        name: /connect/i,
      });
      await user.click(connectButtons[0]); // Click first Connect button (Google)

      expect(mockSignInWithOAuth).toHaveBeenCalledWith(
        "google",
        "/dashboard/settings/account"
      );
    });

    it("redirects to Bluesky OAuth for Bluesky connect", async () => {
      // Currently doesn't show Bluesky connect button in the UI
      // This test is for future enhancement when we add ability to link Bluesky separately
    });
  });

  describe("disconnect functionality", () => {
    it("calls unlinkIdentity when clicking Disconnect for OAuth provider", async () => {
      const user = userEvent.setup();
      mockUserIdentities = [
        {
          id: "identity-1",
          user_id: "user-123",
          identity_id: "google-123",
          provider: "google",
        },
        {
          id: "identity-2",
          user_id: "user-123",
          identity_id: "github-456",
          provider: "github",
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
      await user.click(disconnectButtons[0]); // Disconnect Google

      await waitFor(() => {
        expect(mockUnlinkIdentity).toHaveBeenCalledWith(
          expect.objectContaining({
            id: "identity-1",
            provider: "google",
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
          identity_id: "google-123",
          provider: "google",
        },
        {
          id: "identity-2",
          user_id: "user-123",
          identity_id: "github-456",
          provider: "github",
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
        expect(mockToastSuccess).toHaveBeenCalledWith("Account disconnected");
      });
    });

    it("shows error toast when disconnect fails", async () => {
      const user = userEvent.setup();
      mockUserIdentities = [
        {
          id: "identity-1",
          user_id: "user-123",
          identity_id: "google-123",
          provider: "google",
        },
        {
          id: "identity-2",
          user_id: "user-123",
          identity_id: "github-456",
          provider: "github",
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
        expect(mockToastError).toHaveBeenCalledWith("Failed to unlink");
      });
    });

    it("calls unlinkBlueskyAction when disconnecting Bluesky", async () => {
      const user = userEvent.setup();
      mockUserIdentities = [
        {
          id: "identity-1",
          user_id: "user-123",
          identity_id: "google-123",
          provider: "google",
        },
      ];
      mockGetBlueskyStatus.mockResolvedValue({
        success: true,
        data: {
          did: "did:plc:test123",
          pdsStatus: "active",
          handle: "testuser.trainers.gg",
        },
      });
      mockUnlinkBlueskyAction.mockResolvedValue({ success: true });

      render(<LinkedIdentitiesSection />);

      await waitFor(() => {
        expect(screen.getByText("Bluesky")).toBeInTheDocument();
      });

      const disconnectButton = screen.getByRole("button", {
        name: /disconnect/i,
      });
      await user.click(disconnectButton);

      await waitFor(() => {
        expect(mockUnlinkBlueskyAction).toHaveBeenCalled();
        expect(mockToastSuccess).toHaveBeenCalledWith(
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
          identity_id: "google-123",
          provider: "google",
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
          identity_id: "google-123",
          provider: "google",
        },
      ];
      mockGetBlueskyStatus.mockResolvedValue({
        success: true,
        data: {
          did: "did:plc:test123",
          pdsStatus: "active",
          handle: "testuser.trainers.gg",
        },
      });

      render(<LinkedIdentitiesSection />);

      await waitFor(() => {
        expect(screen.getAllByText(/connected/i)).toHaveLength(2); // Google + Bluesky
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
          identity_id: "google-123",
          provider: "google",
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
          identity_id: "google-123",
          provider: "google",
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
          identity_id: "google-123",
          provider: "google",
        },
        {
          id: "identity-2",
          user_id: "user-123",
          identity_id: "github-456",
          provider: "github",
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
          identity_id: "google-123",
          provider: "google",
        },
        {
          id: "identity-2",
          user_id: "user-123",
          identity_id: "github-456",
          provider: "github",
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
        expect(screen.getByText("Google")).toBeInTheDocument();
        // Should not render Bluesky section
        expect(screen.queryByText("Bluesky")).not.toBeInTheDocument();
      });
    });

    it("shows error toast when unlinkBlueskyAction fails", async () => {
      const user = userEvent.setup();
      mockUserIdentities = [
        {
          id: "identity-1",
          user_id: "user-123",
          identity_id: "google-123",
          provider: "google",
        },
      ];
      mockGetBlueskyStatus.mockResolvedValue({
        success: true,
        data: {
          did: "did:plc:test123",
          pdsStatus: "active",
          handle: "testuser.trainers.gg",
        },
      });
      mockUnlinkBlueskyAction.mockResolvedValue({
        success: false,
        error: "Failed to unlink Bluesky",
      });

      render(<LinkedIdentitiesSection />);

      await waitFor(() => {
        expect(screen.getByText("Bluesky")).toBeInTheDocument();
      });

      const disconnectButton = screen.getByRole("button", {
        name: /disconnect/i,
      });
      await user.click(disconnectButton);

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith("Failed to unlink Bluesky");
      });
    });
  });
});
