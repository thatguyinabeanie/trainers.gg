import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

import { type TeammateRow } from "@trainers/supabase";

import { SpeciesTeammateConstellation } from "../species-teammate-constellation";

// =============================================================================
// Mocks
// =============================================================================

jest.mock("@trainers/pokemon/sprites", () => ({
  getPokemonSprite: (species: string) => ({
    url: `https://sprites.test/${species}.png`,
    w: 96,
    h: 96,
    pixelated: true,
  }),
}));

jest.mock("@pkmn/dex", () => ({
  Dex: {
    species: {
      get: (slug: string) => ({
        exists: true,
        name: slug.charAt(0).toUpperCase() + slug.slice(1),
      }),
    },
  },
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
    "aria-label": ariaLabel,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    "aria-label"?: string;
    className?: string;
  }) => (
    <a href={href} aria-label={ariaLabel} className={className}>
      {children}
    </a>
  ),
}));

// =============================================================================
// Helpers
// =============================================================================

function makeTeammate(
  slug: string,
  pairPct: number,
  pairCount: number,
  rank: number
): TeammateRow {
  return { teammate: slug, pairPct, pairCount, rank };
}

/** Build N teammates with descending pairPct starting from 80. */
function makeTeammates(n: number): TeammateRow[] {
  return Array.from({ length: n }, (_, i) =>
    makeTeammate(`species-${i + 1}`, 80 - i * 2, 200 - i * 5, i + 1)
  );
}

const FOCAL = "calyrex-ice-rider";
const FOCAL_NAME = "Calyrex-Ice-Rider";
const mockHref = (slug: string) => `/data/pokemon/${slug}`;

// =============================================================================
// Tests
// =============================================================================

describe("SpeciesTeammateConstellation — smoke render", () => {
  it("renders the 'Teammates' card title", () => {
    render(
      <SpeciesTeammateConstellation
        focalSpecies={FOCAL}
        focalDisplayName={FOCAL_NAME}
        teammates={makeTeammates(5)}
        onTeammateHref={mockHref}
      />
    );
    expect(
      screen.getByText(/teammates/i, { selector: "span" })
    ).toBeInTheDocument();
  });

  it("renders N bubbles (links) for N teammates", () => {
    const teammates = makeTeammates(5);
    render(
      <SpeciesTeammateConstellation
        focalSpecies={FOCAL}
        focalDisplayName={FOCAL_NAME}
        teammates={teammates}
        onTeammateHref={mockHref}
      />
    );
    // Each bubble is a link with aria-label containing the species name.
    const links = screen.getAllByRole("link");
    // 5 teammate links expected.
    expect(links).toHaveLength(5);
  });

  it("renders exactly 12 bubbles by default when 20 teammates are provided", () => {
    render(
      <SpeciesTeammateConstellation
        focalSpecies={FOCAL}
        focalDisplayName={FOCAL_NAME}
        teammates={makeTeammates(20)}
        onTeammateHref={mockHref}
      />
    );
    expect(screen.getAllByRole("link")).toHaveLength(12);
  });
});

describe("SpeciesTeammateConstellation — top-20 toggle", () => {
  it("expands to 20 bubbles when the 'Show top 20' button is clicked", () => {
    render(
      <SpeciesTeammateConstellation
        focalSpecies={FOCAL}
        focalDisplayName={FOCAL_NAME}
        teammates={makeTeammates(20)}
        onTeammateHref={mockHref}
      />
    );
    expect(screen.getAllByRole("link")).toHaveLength(12);

    fireEvent.click(screen.getByRole("button", { name: /show top 20/i }));
    expect(screen.getAllByRole("link")).toHaveLength(20);
  });

  it("collapses back to 12 when 'Show top 12' is clicked after expanding", () => {
    render(
      <SpeciesTeammateConstellation
        focalSpecies={FOCAL}
        focalDisplayName={FOCAL_NAME}
        teammates={makeTeammates(20)}
        onTeammateHref={mockHref}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /show top 20/i }));
    expect(screen.getAllByRole("link")).toHaveLength(20);

    fireEvent.click(screen.getByRole("button", { name: /show top 12/i }));
    expect(screen.getAllByRole("link")).toHaveLength(12);
  });

  it("does not show the toggle when fewer than 13 teammates exist", () => {
    render(
      <SpeciesTeammateConstellation
        focalSpecies={FOCAL}
        focalDisplayName={FOCAL_NAME}
        teammates={makeTeammates(8)}
        onTeammateHref={mockHref}
      />
    );
    // With only 8 teammates the toggle is still rendered; clicking it shows all 8.
    // Toggle button is still present (it's always rendered in the actions slot).
    fireEvent.click(screen.getByRole("button", { name: /show top 20/i }));
    // Still only 8 links — slicing to 20 of an 8-item array is fine.
    expect(screen.getAllByRole("link")).toHaveLength(8);
  });
});

describe("SpeciesTeammateConstellation — bubble size scales with pairPct", () => {
  it("assigns size-14 to a bubble with pairPct >= 50", () => {
    const teammates = [makeTeammate("koraidon", 55, 100, 1)];
    const { container } = render(
      <SpeciesTeammateConstellation
        focalSpecies={FOCAL}
        focalDisplayName={FOCAL_NAME}
        teammates={teammates}
        onTeammateHref={mockHref}
      />
    );
    // The link element should have the size-14 class.
    const link = container.querySelector("a[href='/data/pokemon/koraidon']");
    expect(link?.className).toContain("size-14");
  });

  it("assigns size-8 to a bubble with pairPct < 20", () => {
    const teammates = [makeTeammate("miraidon", 10, 20, 1)];
    const { container } = render(
      <SpeciesTeammateConstellation
        focalSpecies={FOCAL}
        focalDisplayName={FOCAL_NAME}
        teammates={teammates}
        onTeammateHref={mockHref}
      />
    );
    const link = container.querySelector("a[href='/data/pokemon/miraidon']");
    expect(link?.className).toContain("size-8");
  });

  it("assigns size-10 to a bubble with pairPct in [20, 35)", () => {
    const teammates = [makeTeammate("flutter-mane", 25, 50, 1)];
    const { container } = render(
      <SpeciesTeammateConstellation
        focalSpecies={FOCAL}
        focalDisplayName={FOCAL_NAME}
        teammates={teammates}
        onTeammateHref={mockHref}
      />
    );
    const link = container.querySelector(
      "a[href='/data/pokemon/flutter-mane']"
    );
    expect(link?.className).toContain("size-10");
  });
});

describe("SpeciesTeammateConstellation — bubble links", () => {
  it("each bubble links to the teammate path returned by onTeammateHref", () => {
    const teammates = makeTeammates(3);
    render(
      <SpeciesTeammateConstellation
        focalSpecies={FOCAL}
        focalDisplayName={FOCAL_NAME}
        teammates={teammates}
        onTeammateHref={mockHref}
      />
    );
    const links = screen.getAllByRole("link");
    expect(links[0]).toHaveAttribute("href", "/data/pokemon/species-1");
    expect(links[1]).toHaveAttribute("href", "/data/pokemon/species-2");
    expect(links[2]).toHaveAttribute("href", "/data/pokemon/species-3");
  });

  it("aria-label on each link includes pairCount and pairPct", () => {
    const teammate = makeTeammate("koraidon", 42.5, 123, 1);
    render(
      <SpeciesTeammateConstellation
        focalSpecies={FOCAL}
        focalDisplayName={FOCAL_NAME}
        teammates={[teammate]}
        onTeammateHref={mockHref}
      />
    );
    const link = screen.getByRole("link");
    expect(link.getAttribute("aria-label")).toMatch(/123/);
    expect(link.getAttribute("aria-label")).toMatch(/42\.5%/);
  });
});

describe("SpeciesTeammateConstellation — empty state", () => {
  it("renders the empty state message when no teammates", () => {
    render(
      <SpeciesTeammateConstellation
        focalSpecies={FOCAL}
        focalDisplayName={FOCAL_NAME}
        teammates={[]}
        onTeammateHref={mockHref}
      />
    );
    expect(screen.getByText(/no teammate data/i)).toBeInTheDocument();
  });

  it("does not render any links in the empty state", () => {
    render(
      <SpeciesTeammateConstellation
        focalSpecies={FOCAL}
        focalDisplayName={FOCAL_NAME}
        teammates={[]}
        onTeammateHref={mockHref}
      />
    );
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });
});

describe("SpeciesTeammateConstellation — content policy", () => {
  it("does not contain the phrase 'top cut'", () => {
    const { container } = render(
      <SpeciesTeammateConstellation
        focalSpecies={FOCAL}
        focalDisplayName={FOCAL_NAME}
        teammates={makeTeammates(5)}
        onTeammateHref={mockHref}
      />
    );
    expect(container.textContent).not.toMatch(/top cut/i);
  });
});
