import { render, screen } from "@testing-library/react";
import { UpcomingTournamentsPreview } from "../upcoming-tournaments-preview";

// Mock next/cache — unstable_cache just calls through
jest.mock("next/cache", () => ({
  unstable_cache: (fn: () => unknown) => fn,
}));

// Mock Next.js Link
jest.mock("next/link", () => {
  return function MockLink({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) {
    return <a href={href}>{children}</a>;
  };
});

// Mock Supabase static client
jest.mock("@/lib/supabase/server", () => ({
  createStaticClient: jest.fn(),
}));

// Mock cache tags
jest.mock("@/lib/cache", () => ({
  CacheTags: { TOURNAMENTS_LIST: "tournaments-list" },
}));

// Mock the tournament query
const mockListTournamentsGrouped = jest.fn();
jest.mock("@trainers/supabase", () => ({
  listTournamentsGrouped: (...args: unknown[]) =>
    mockListTournamentsGrouped(...args),
}));

// Mock UpcomingTournaments display component
jest.mock("@/components/tournaments/tournament-list", () => ({
  UpcomingTournaments: ({
    tournaments,
  }: {
    tournaments: { id: number; name: string }[];
  }) => (
    <div data-testid="upcoming-tournaments">
      {tournaments.map((t) => (
        <div key={t.id}>{t.name}</div>
      ))}
    </div>
  ),
}));

describe("UpcomingTournamentsPreview", () => {
  it("renders empty state when no upcoming tournaments", async () => {
    mockListTournamentsGrouped.mockResolvedValue({
      active: [],
      upcoming: [],
      completed: [],
    });

    const Component = await UpcomingTournamentsPreview();
    render(Component);

    expect(
      screen.getByText("No upcoming tournaments right now. Check back soon!")
    ).toBeInTheDocument();
  });

  it("renders tournaments and View All link when tournaments exist", async () => {
    mockListTournamentsGrouped.mockResolvedValue({
      active: [],
      upcoming: [
        { id: 1, name: "VGC Regional" },
        { id: 2, name: "Local League" },
      ],
      completed: [],
    });

    const Component = await UpcomingTournamentsPreview();
    render(Component);

    expect(screen.getByText("VGC Regional")).toBeInTheDocument();
    expect(screen.getByText("Local League")).toBeInTheDocument();

    const viewAllLink = screen.getByRole("link", { name: "View All" });
    expect(viewAllLink).toHaveAttribute("href", "/tournaments");
  });

  it("limits to 5 tournaments", async () => {
    const tournaments = Array.from({ length: 8 }, (_, i) => ({
      id: i + 1,
      name: `Tournament ${i + 1}`,
    }));

    mockListTournamentsGrouped.mockResolvedValue({
      active: [],
      upcoming: tournaments,
      completed: [],
    });

    const Component = await UpcomingTournamentsPreview();
    render(Component);

    // Should only render 5 of the 8
    expect(screen.getByText("Tournament 1")).toBeInTheDocument();
    expect(screen.getByText("Tournament 5")).toBeInTheDocument();
    expect(screen.queryByText("Tournament 6")).not.toBeInTheDocument();
  });
});
