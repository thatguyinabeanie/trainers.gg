import { render, screen } from "@testing-library/react";
import type React from "react";

import { organizationFactory } from "@trainers/test-utils/factories";

import { CommunityListRow } from "../community-list-row";

jest.mock("next/link", () => {
  const MockLink = ({
    children,
    href,
    className,
  }: {
    children: React.ReactNode;
    href: string;
    className?: string;
  }) => {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  };
  MockLink.displayName = "MockLink";
  return MockLink;
});

jest.mock("@/components/communities/social-link-icons", () => ({
  PlatformIcon: ({ platform }: { platform: string }) => (
    <svg data-testid={`icon-${platform}`} />
  ),
}));

describe("CommunityListRow", () => {
  it("renders community name", () => {
    const community = {
      ...organizationFactory.build({ name: "VGC League", slug: "vgc-league" }),
      activeTournamentsCount: 0,
      totalTournamentsCount: 0,
    };

    render(<CommunityListRow community={community} />);

    expect(screen.getByText("VGC League")).toBeInTheDocument();
  });

  it("links to community detail page", () => {
    const community = {
      ...organizationFactory.build({
        name: "Battle Stadium",
        slug: "battle-stadium",
      }),
      activeTournamentsCount: 0,
      totalTournamentsCount: 0,
    };

    render(<CommunityListRow community={community} />);

    const link = screen.getByRole("link", { name: /battle stadium/i });
    expect(link).toHaveAttribute("href", "/communities/battle-stadium");
  });

  it("renders description when present", () => {
    const community = {
      ...organizationFactory.build({
        name: "VGC League",
        slug: "vgc-league",
        description: "A competitive Pokemon community",
      }),
      activeTournamentsCount: 0,
      totalTournamentsCount: 0,
    };

    render(<CommunityListRow community={community} />);

    expect(
      screen.getByText("A competitive Pokemon community")
    ).toBeInTheDocument();
  });

  it("renders slug fallback when no description", () => {
    const community = {
      ...organizationFactory.build({
        name: "VGC League",
        slug: "vgc-league",
        description: null,
      }),
      activeTournamentsCount: 0,
      totalTournamentsCount: 0,
    };

    render(<CommunityListRow community={community} />);

    expect(screen.getByText("@vgc-league")).toBeInTheDocument();
  });

  it("renders discord as social icon when discord_invite_url is present", () => {
    const community = {
      ...organizationFactory.build({
        name: "VGC League",
        slug: "vgc-league",
        discord_invite_url: "https://discord.gg/vgc-league",
        social_links: [],
      }),
      activeTournamentsCount: 0,
      totalTournamentsCount: 0,
    };

    render(<CommunityListRow community={community} />);

    const discordLink = screen.getByLabelText("Discord");
    expect(discordLink).toBeInTheDocument();
    expect(discordLink).toHaveAttribute(
      "href",
      "https://discord.gg/vgc-league"
    );
  });
});
