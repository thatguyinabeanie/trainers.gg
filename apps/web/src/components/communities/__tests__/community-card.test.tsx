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

    render(<CommunityCard community={community} />);

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

    render(<CommunityCard community={community} />);

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

    render(<CommunityCard community={community} />);

    // Discord should appear as a social icon link, not a button
    const discordIcon = screen.getByLabelText("discord");
    expect(discordIcon).toBeInTheDocument();
    expect(discordIcon).toHaveAttribute(
      "href",
      "https://discord.gg/vgc-league"
    );
  });

  it("does not render tier badges", () => {
    const community = {
      ...organizationFactory.build({
        name: "VGC League",
        slug: "vgc-league",
        tier: "partner",
      }),
      activeTournamentsCount: 0,
      totalTournamentsCount: 0,
    };

    render(<CommunityCard community={community} />);

    expect(screen.queryByText("Partner")).not.toBeInTheDocument();
    expect(screen.queryByText("Verified")).not.toBeInTheDocument();
  });

  it("does not render tournament count", () => {
    const community = {
      ...organizationFactory.build({
        name: "VGC League",
        slug: "vgc-league",
      }),
      activeTournamentsCount: 5,
      totalTournamentsCount: 10,
    };

    render(<CommunityCard community={community} />);

    expect(screen.queryByText(/active tournament/i)).not.toBeInTheDocument();
  });
});
