import { render, screen } from "@testing-library/react";
import { FeaturedStrip } from "../featured-strip";
import { organizationFactory } from "@trainers/test-utils/factories";
import type React from "react";

jest.mock("next/link", () => {
  const MockLink = ({
    children,
    href,
    className,
  }: {
    children: React.ReactNode;
    href: string;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  );
  MockLink.displayName = "MockLink";
  return MockLink;
});

describe("FeaturedStrip", () => {
  it("returns null when communities array is empty", () => {
    const { container } = render(<FeaturedStrip communities={[]} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders community names", () => {
    const communities = [
      organizationFactory.build({
        name: "Stellar Novas",
        slug: "stellar-novas",
      }),
      organizationFactory.build({ name: "VGC League", slug: "vgc-league" }),
    ];
    render(<FeaturedStrip communities={communities} />);
    expect(screen.getByText("Stellar Novas")).toBeInTheDocument();
    expect(screen.getByText("VGC League")).toBeInTheDocument();
  });

  it("renders links to community detail pages", () => {
    const communities = [
      organizationFactory.build({
        name: "Stellar Novas",
        slug: "stellar-novas",
      }),
    ];
    render(<FeaturedStrip communities={communities} />);
    const link = screen.getByRole("link", { name: /stellar novas/i });
    expect(link).toHaveAttribute("href", "/communities/stellar-novas");
  });

  it("shows partner indicator when tier is partner", () => {
    const communities = [
      organizationFactory.build({
        name: "Partner Org",
        slug: "partner-org",
        tier: "partner",
      }),
    ];
    render(<FeaturedStrip communities={communities} />);
    expect(screen.getByText("✦")).toBeInTheDocument();
  });

  it("does not show partner indicator when tier is null", () => {
    const communities = [
      organizationFactory.build({
        name: "Regular Org",
        slug: "regular-org",
        tier: null,
      }),
    ];
    render(<FeaturedStrip communities={communities} />);
    expect(screen.queryByText("✦")).not.toBeInTheDocument();
  });

  it("renders initials fallback when no logo or icon", () => {
    const communities = [
      organizationFactory.build({
        name: "Stellar Novas",
        slug: "stellar-novas",
        logo_url: null,
        icon: null,
      }),
    ];
    render(<FeaturedStrip communities={communities} />);
    expect(screen.getByText("SN")).toBeInTheDocument();
  });
});
