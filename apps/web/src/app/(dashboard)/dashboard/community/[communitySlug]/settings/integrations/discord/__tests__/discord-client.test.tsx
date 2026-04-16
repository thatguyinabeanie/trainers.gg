import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { type DiscordIntegrationOverview } from "@trainers/supabase";

import { DiscordClient } from "../discord-client";

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
    settings: {},
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
  (useRouter as jest.Mock).mockReturnValue({ replace: mockReplace });
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

    it("renders the install card placeholder", () => {
      render(<DiscordClient {...defaultProps} overview={null} />);

      expect(
        screen.getByText(/install card renders here/i)
      ).toBeInTheDocument();
    });

    it("does not render tabs", () => {
      render(<DiscordClient {...defaultProps} overview={null} />);

      expect(
        screen.queryByRole("tab", { name: /notifications/i })
      ).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // State B — installed
  // ---------------------------------------------------------------------------

  describe("when overview is present (State B)", () => {
    it("renders the page header", () => {
      render(<DiscordClient {...defaultProps} overview={defaultOverview} />);

      expect(
        screen.getByRole("heading", { name: /discord/i })
      ).toBeInTheDocument();
    });

    it("renders the status header placeholder with guild id", () => {
      render(<DiscordClient {...defaultProps} overview={defaultOverview} />);

      expect(
        screen.getByText(/status header renders here/i)
      ).toBeInTheDocument();
      expect(screen.getByText(/123456789/)).toBeInTheDocument();
    });

    it("renders three tab triggers", () => {
      render(<DiscordClient {...defaultProps} overview={defaultOverview} />);

      expect(
        screen.getByRole("tab", { name: /notifications/i })
      ).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /roles/i })).toBeInTheDocument();
      expect(
        screen.getByRole("tab", { name: /failures/i })
      ).toBeInTheDocument();
    });

    it("renders the notifications tab content placeholder by default", () => {
      render(<DiscordClient {...defaultProps} overview={defaultOverview} />);

      expect(
        screen.getByText(/channel \+ dm tables render here/i)
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
    it("shows Roles tab content when ?tab=roles", () => {
      setupNavMocks("roles");
      render(<DiscordClient {...defaultProps} overview={defaultOverview} />);

      expect(screen.getByText(/roles table renders here/i)).toBeVisible();
    });

    it("falls back to Notifications tab content when ?tab=garbage", () => {
      setupNavMocks("garbage");
      render(<DiscordClient {...defaultProps} overview={defaultOverview} />);

      expect(
        screen.getByText(/channel \+ dm tables render here/i)
      ).toBeVisible();
    });

    it("shows Notifications tab content when no ?tab= param is present", () => {
      setupNavMocks(null);
      render(<DiscordClient {...defaultProps} overview={defaultOverview} />);

      expect(
        screen.getByText(/channel \+ dm tables render here/i)
      ).toBeVisible();
    });

    it("shows Failures tab content when ?tab=failures", () => {
      setupNavMocks("failures");
      render(<DiscordClient {...defaultProps} overview={defaultOverview} />);

      expect(screen.getByText(/failures table renders here/i)).toBeVisible();
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
      // Verify failures tab has no badge by checking no numeric badge appears
      // The tab trigger text "Failures" should be present but no count badge
      expect(screen.queryByText(/^\d+$/)).not.toBeInTheDocument();
    });
  });
});
