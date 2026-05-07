import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { type DiscordIntegrationOverview } from "@trainers/supabase";

import { DiscordClient } from "../discord-client";

// =============================================================================
// Stub out child components so this suite stays focused on DiscordClient
// routing/tab logic.
// =============================================================================

jest.mock("@/components/discord/install-card", () => ({
  InstallCard: () => <div>Install card stub</div>,
}));

jest.mock("@/components/discord/status-header", () => ({
  StatusHeader: ({ server }: { server: { guild_id: string } }) => (
    <div data-testid="status-header">
      Status header stub — {server.guild_id}
    </div>
  ),
}));

jest.mock("@/components/discord/failure-banner", () => ({
  FailureBanner: ({ count }: { count: number }) => (
    <div data-testid="failure-banner">{count} delivery failures stub</div>
  ),
}));

jest.mock("@/components/discord/setup-wizard", () => ({
  SetupWizard: () => <div data-testid="setup-wizard">Setup wizard stub</div>,
}));

jest.mock("@/components/discord/bot-health-indicator", () => ({
  BotHealthIndicator: () => <div>Bot health stub</div>,
}));

jest.mock("@/components/discord/delivery-stats-card", () => ({
  DeliveryStatsCard: () => <div>Delivery stats stub</div>,
}));

jest.mock("@/components/discord/activity-feed", () => ({
  ActivityFeed: () => <div>Activity feed stub</div>,
}));

jest.mock("@/components/discord/linked-accounts-overview", () => ({
  LinkedAccountsOverview: () => <div>Linked accounts stub</div>,
}));

jest.mock("@/components/discord/embed-preview", () => ({
  EmbedPreview: () => <div>Embed preview stub</div>,
}));

jest.mock("@/components/discord/recommended-defaults-button", () => ({
  RecommendedDefaultsButton: () => <div>Recommended defaults stub</div>,
}));

jest.mock("@/components/discord/channel-mapping-table", () => ({
  ChannelMappingTable: () => <div>Channel mapping table stub</div>,
}));

jest.mock("@/components/discord/dm-settings-table", () => ({
  DmSettingsTable: () => <div>DM settings table stub</div>,
}));

jest.mock("@/components/discord/embed-color-picker", () => ({
  EmbedColorPicker: () => <div>Embed color picker stub</div>,
}));

jest.mock("@/components/discord/ping-role-config", () => ({
  PingRoleConfig: () => <div>Ping role config stub</div>,
}));

jest.mock("@/components/discord/role-mapping-table", () => ({
  RoleMappingTable: () => <div>Role mapping table stub</div>,
}));

jest.mock("@/components/discord/verified-role-config", () => ({
  VerifiedRoleConfig: () => <div>Verified role config stub</div>,
}));

jest.mock("@/components/discord/tournament-automation-settings", () => ({
  TournamentAutomationSettings: () => <div>Tournament automation stub</div>,
}));

jest.mock("@/components/discord/failures-tab-content", () => ({
  FailuresTabContent: () => <div>Failures tab content stub</div>,
}));

jest.mock("@/actions/discord-integration", () => ({
  getDeliveryStatsAction: jest
    .fn()
    .mockResolvedValue({ success: false, error: "noop" }),
  getActivityFeedAction: jest
    .fn()
    .mockResolvedValue({ success: false, error: "noop" }),
}));

// =============================================================================
// Module-level mocks
// =============================================================================

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
  useSearchParams: jest.fn(),
}));

// =============================================================================
// Test fixtures
// =============================================================================

const mockReplace = jest.fn();

const defaultOverview: DiscordIntegrationOverview = {
  server: {
    id: 1,
    community_id: 10,
    guild_id: "123456789",
    installed_by: "user-uuid-123",
    created_at: "2026-01-01T00:00:00Z",
    settings: { setup_completed: true },
  },
  channelMappings: [],
  dmSettings: [],
  roleMappings: [],
  recentFailureCount: 0,
};

const defaultProps = {
  community: { id: 10, name: "Test Community", slug: "test-community" },
  communitySlug: "test-community",
  guildChannels: null,
  guildRoles: null,
};

function setupNavMocks(tab: string | null = null) {
  (useRouter as jest.Mock).mockReturnValue({
    replace: mockReplace,
    refresh: jest.fn(),
  });
  (usePathname as jest.Mock).mockReturnValue(
    "/dashboard/community/test-community/settings/integrations/discord"
  );
  (useSearchParams as jest.Mock).mockReturnValue(
    new URLSearchParams(tab ? `tab=${tab}` : "")
  );
}

// =============================================================================
// Tests
// =============================================================================

describe("DiscordClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupNavMocks();
  });

  // ---------------------------------------------------------------------------
  // State A — not installed
  // ---------------------------------------------------------------------------

  describe("when overview is null (State A)", () => {
    it("renders the page header", () => {
      render(<DiscordClient {...defaultProps} overview={null} />);

      expect(
        screen.getByRole("heading", { name: /discord/i })
      ).toBeInTheDocument();
    });

    it("renders the install card", () => {
      render(<DiscordClient {...defaultProps} overview={null} />);

      expect(screen.getByText(/install card stub/i)).toBeInTheDocument();
    });

    it("does not render tabs", () => {
      render(<DiscordClient {...defaultProps} overview={null} />);

      expect(
        screen.queryByRole("tab", { name: /overview/i })
      ).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Setup wizard
  // ---------------------------------------------------------------------------

  describe("setup wizard", () => {
    it("shows setup wizard when setup_completed is not true", () => {
      const notCompleted = {
        ...defaultOverview,
        server: { ...defaultOverview.server, settings: {} },
      };
      render(<DiscordClient {...defaultProps} overview={notCompleted} />);

      expect(screen.getByTestId("setup-wizard")).toBeInTheDocument();
    });

    it("does not show wizard when setup_completed is true", () => {
      render(<DiscordClient {...defaultProps} overview={defaultOverview} />);

      expect(screen.queryByTestId("setup-wizard")).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // State B — installed and setup complete
  // ---------------------------------------------------------------------------

  describe("when overview is present (State B)", () => {
    it("renders the page header", () => {
      render(<DiscordClient {...defaultProps} overview={defaultOverview} />);

      expect(
        screen.getByRole("heading", { name: /discord/i })
      ).toBeInTheDocument();
    });

    it("renders the StatusHeader with guild id", () => {
      render(<DiscordClient {...defaultProps} overview={defaultOverview} />);

      expect(screen.getByTestId("status-header")).toBeInTheDocument();
      expect(screen.getByText(/123456789/)).toBeInTheDocument();
    });

    it("renders five tab triggers", () => {
      render(<DiscordClient {...defaultProps} overview={defaultOverview} />);

      expect(
        screen.getByRole("tab", { name: /overview/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("tab", { name: /notifications/i })
      ).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /roles/i })).toBeInTheDocument();
      expect(
        screen.getByRole("tab", { name: /automation/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("tab", { name: /failures/i })
      ).toBeInTheDocument();
    });

    it("renders the overview tab content by default", () => {
      render(<DiscordClient {...defaultProps} overview={defaultOverview} />);

      // Overview tab shows recommended defaults and linked accounts stubs
      expect(
        screen.getByText(/recommended defaults stub/i)
      ).toBeInTheDocument();
    });

    it("does not show the failure banner when recentFailureCount is 0", () => {
      render(<DiscordClient {...defaultProps} overview={defaultOverview} />);

      expect(screen.queryByText(/delivery failures/i)).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Tab state from query param
  // ---------------------------------------------------------------------------

  describe("tab selection from ?tab= query param", () => {
    it("shows Notifications tab content when ?tab=notifications", () => {
      setupNavMocks("notifications");
      render(<DiscordClient {...defaultProps} overview={defaultOverview} />);

      expect(screen.getByText(/channel mapping table stub/i)).toBeVisible();
    });

    it("shows Roles tab content when ?tab=roles", () => {
      setupNavMocks("roles");
      render(<DiscordClient {...defaultProps} overview={defaultOverview} />);

      expect(screen.getByText(/role mapping table stub/i)).toBeVisible();
    });

    it("shows Automation tab content when ?tab=automation", () => {
      setupNavMocks("automation");
      render(<DiscordClient {...defaultProps} overview={defaultOverview} />);

      expect(screen.getByText(/tournament automation stub/i)).toBeVisible();
    });

    it("falls back to Overview tab content when ?tab=garbage", () => {
      setupNavMocks("garbage");
      render(<DiscordClient {...defaultProps} overview={defaultOverview} />);

      expect(screen.getByText(/recommended defaults stub/i)).toBeVisible();
    });

    it("shows Overview tab content when no ?tab= param is present", () => {
      setupNavMocks(null);
      render(<DiscordClient {...defaultProps} overview={defaultOverview} />);

      expect(screen.getByText(/recommended defaults stub/i)).toBeVisible();
    });

    it("shows Failures tab content when ?tab=failures", () => {
      setupNavMocks("failures");
      render(<DiscordClient {...defaultProps} overview={defaultOverview} />);

      expect(
        screen.getByText(/no failures in the last 24 hours/i)
      ).toBeVisible();
    });
  });

  // ---------------------------------------------------------------------------
  // Tab click navigation
  // ---------------------------------------------------------------------------

  describe("tab click calls router.replace", () => {
    it("calls router.replace with ?tab=roles when Roles tab is clicked", async () => {
      const user = userEvent.setup();
      render(<DiscordClient {...defaultProps} overview={defaultOverview} />);

      await user.click(screen.getByRole("tab", { name: /roles/i }));

      expect(mockReplace).toHaveBeenCalledWith(
        expect.stringContaining("tab=roles"),
        { scroll: false }
      );
    });

    it("calls router.replace with ?tab=failures when Failures tab is clicked", async () => {
      const user = userEvent.setup();
      render(<DiscordClient {...defaultProps} overview={defaultOverview} />);

      await user.click(screen.getByRole("tab", { name: /failures/i }));

      expect(mockReplace).toHaveBeenCalledWith(
        expect.stringContaining("tab=failures"),
        { scroll: false }
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Failure badge
  // ---------------------------------------------------------------------------

  describe("failure count badge", () => {
    it("renders the failure badge on the Failures tab when count > 0", () => {
      render(
        <DiscordClient
          {...defaultProps}
          overview={{ ...defaultOverview, recentFailureCount: 3 }}
        />
      );

      expect(screen.getByText("3")).toBeInTheDocument();
    });

    it("renders the failure banner when recentFailureCount > 0", () => {
      render(
        <DiscordClient
          {...defaultProps}
          overview={{ ...defaultOverview, recentFailureCount: 3 }}
        />
      );

      expect(screen.getByText(/delivery failures/i)).toBeInTheDocument();
    });

    it("does not render the failure badge when count is 0", () => {
      render(<DiscordClient {...defaultProps} overview={defaultOverview} />);

      // The badge span only renders when failureCount > 0
      expect(screen.queryByText(/^\d+$/)).not.toBeInTheDocument();
    });
  });
});
