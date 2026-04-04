import { render, screen } from "@testing-library/react";
import type React from "react";

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

jest.mock("@/components/communities/community-list-row", () => ({
  CommunityListRow: ({
    community,
  }: {
    community: { id: number; name: string };
  }) => <div data-testid="community-list-row">{community.name}</div>,
}));

import { CommunityList } from "../community-list";
import type { CommunityWithCounts } from "@trainers/supabase";

function makeCommunity(
  overrides: Partial<CommunityWithCounts> = {}
): CommunityWithCounts {
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
    is_featured: false,
    featured_order: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    activeTournamentsCount: 0,
    totalTournamentsCount: 0,
    ...overrides,
  };
}

describe("CommunityList", () => {
  describe("empty state", () => {
    it("shows 'No communities found' when the list is empty", () => {
      render(<CommunityList communities={[]} />);
      expect(screen.getByText("No communities found")).toBeInTheDocument();
    });

    it("shows default prompt when not searching", () => {
      render(<CommunityList communities={[]} />);
      expect(
        screen.getByText("Check back later for more communities!")
      ).toBeInTheDocument();
    });

    it("shows search hint when isSearching is true", () => {
      render(<CommunityList communities={[]} isSearching />);
      expect(
        screen.getByText("Try adjusting your search query")
      ).toBeInTheDocument();
    });
  });

  describe("with communities", () => {
    it("renders a row for each community", () => {
      const communities = [
        makeCommunity({ id: 1, name: "Pallet Town VGC" }),
        makeCommunity({ id: 2, name: "Cerulean Showdown" }),
        makeCommunity({ id: 3, name: "Vermilion League" }),
      ];
      render(<CommunityList communities={communities} />);
      const rows = screen.getAllByTestId("community-list-row");
      expect(rows).toHaveLength(3);
    });

    it("does not show the empty state when communities are present", () => {
      render(
        <CommunityList
          communities={[makeCommunity({ id: 1, name: "VGC Club" })]}
        />
      );
      expect(
        screen.queryByText("No communities found")
      ).not.toBeInTheDocument();
    });
  });
});
