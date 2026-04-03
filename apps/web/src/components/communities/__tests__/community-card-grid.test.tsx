import { render, screen } from "@testing-library/react";

// Mock next/link — render as plain anchor
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

// Mock community-card to avoid deep dependency chain
jest.mock("@/components/communities/community-card", () => ({
  CommunityCard: ({ community }: { community: { id: number; name: string } }) => (
    <div data-testid="community-card">{community.name}</div>
  ),
}));

import { CommunityCardGrid } from "../community-card-grid";
import type { CommunityWithCounts } from "@trainers/supabase";

function makeCommunity(overrides: Partial<CommunityWithCounts> = {}): CommunityWithCounts {
  return {
    id: 1,
    name: "Test Community",
    slug: "test-community",
    owner_user_id: "user-1",
    description: null,
    discord_invite_url: null,
    icon: null,
    logo_url: null,
    platform_fee_percentage: null,
    social_links: [],
    status: "active",
    subscription_expires_at: null,
    subscription_started_at: null,
    subscription_tier: null,
    tier: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    activeTournamentsCount: 0,
    totalTournamentsCount: 0,
    ...overrides,
  };
}

describe("CommunityCardGrid", () => {
  describe("empty state", () => {
    it("shows 'No communities found' when the list is empty", () => {
      render(<CommunityCardGrid communities={[]} />);
      expect(screen.getByText("No communities found")).toBeInTheDocument();
    });

    it("shows default prompt when not searching", () => {
      render(<CommunityCardGrid communities={[]} />);
      expect(
        screen.getByText("Check back later for more communities!")
      ).toBeInTheDocument();
    });

    it("shows search hint when isSearching is true", () => {
      render(<CommunityCardGrid communities={[]} isSearching />);
      expect(
        screen.getByText("Try adjusting your search query")
      ).toBeInTheDocument();
    });
  });

  describe("with communities", () => {
    it("renders a card for each community", () => {
      const communities = [
        makeCommunity({ id: 1, name: "Pallet Town VGC" }),
        makeCommunity({ id: 2, name: "Cerulean Showdown" }),
        makeCommunity({ id: 3, name: "Vermilion League" }),
      ];
      render(<CommunityCardGrid communities={communities} />);
      const cards = screen.getAllByTestId("community-card");
      expect(cards).toHaveLength(3);
    });

    it("does not show the empty state when communities are present", () => {
      render(
        <CommunityCardGrid communities={[makeCommunity({ id: 1, name: "VGC Club" })]} />
      );
      expect(screen.queryByText("No communities found")).not.toBeInTheDocument();
    });
  });
});
