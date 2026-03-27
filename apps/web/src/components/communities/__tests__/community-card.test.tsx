import { render, screen } from "@testing-library/react";
import { CommunityCard } from "../community-card";
import { organizationFactory } from "@trainers/test-utils/factories";
import type React from "react";

// Mock Next.js Link component
jest.mock("next/link", () => {
  const MockLink = ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => {
    return <a href={href}>{children}</a>;
  };
  MockLink.displayName = "MockLink";
  return MockLink;
});

describe("CommunityCard", () => {
  it("renders community name", () => {
    const community = {
      ...organizationFactory.build({ name: "VGC League", slug: "vgc-league" }),
      activeTournamentsCount: 0,
      totalTournamentsCount: 0,
    };

    render(<CommunityCard community={community} />);

    expect(screen.getByText("VGC League")).toBeInTheDocument();
  });

  it("renders Discord invite button when discord_invite_url is present", () => {
    const community = {
      ...organizationFactory.build({
        name: "VGC League",
        slug: "vgc-league",
        discord_invite_url: "https://discord.gg/vgc-league",
      }),
      activeTournamentsCount: 0,
      totalTournamentsCount: 0,
    };

    render(<CommunityCard community={community} />);

    const discordLink = screen.getByRole("link", { name: /join discord/i });
    expect(discordLink).toBeInTheDocument();
    expect(discordLink).toHaveAttribute(
      "href",
      "https://discord.gg/vgc-league"
    );
  });

  it("does not render Discord button when discord_invite_url is null", () => {
    const community = {
      ...organizationFactory.build({
        name: "VGC League",
        slug: "vgc-league",
        discord_invite_url: null,
      }),
      activeTournamentsCount: 0,
      totalTournamentsCount: 0,
    };

    render(<CommunityCard community={community} />);

    expect(
      screen.queryByRole("link", { name: /join discord/i })
    ).not.toBeInTheDocument();
  });

  it("renders tournament count", () => {
    const community = {
      ...organizationFactory.build({
        name: "TCG Masters",
        slug: "tcg-masters",
      }),
      activeTournamentsCount: 5,
      totalTournamentsCount: 20,
    };

    render(<CommunityCard community={community} />);

    expect(screen.getByText("5 active tournaments")).toBeInTheDocument();
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

    render(<CommunityCard community={community} />);

    const link = screen.getByRole("link", { name: "Battle Stadium" });
    expect(link).toHaveAttribute("href", "/communities/battle-stadium");
  });
});
