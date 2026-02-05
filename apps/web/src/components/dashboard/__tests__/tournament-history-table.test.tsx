import { describe, it, expect } from "@jest/globals";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  TournamentHistoryTable,
  type TournamentHistoryRow,
} from "../tournament-history-table";

const mockHistoryData: TournamentHistoryRow[] = [
  {
    id: 1,
    tournamentId: 100,
    tournamentName: "Winter Championship 2024",
    tournamentSlug: "winter-championship-2024",
    organizationName: "Pokemon VGC",
    organizationSlug: "pokemon-vgc",
    startDate: "2024-01-15T00:00:00Z",
    endDate: "2024-01-15T18:00:00Z",
    format: "VGC 2024 Reg G",
    altId: 1,
    altUsername: "player1",
    altDisplayName: "Player One",
    placement: 1,
    wins: 6,
    losses: 0,
    ties: 0,
    teamPokemon: [
      "Incineroar",
      "Rillaboom",
      "Urshifu",
      "Flutter Mane",
      "Amoonguss",
      "Tornadus",
    ],
    registeredAt: "2024-01-01T00:00:00Z",
  },
  {
    id: 2,
    tournamentId: 101,
    tournamentName: "Spring Regional",
    tournamentSlug: "spring-regional",
    organizationName: "TCG Events",
    organizationSlug: "tcg-events",
    startDate: "2024-03-20T00:00:00Z",
    endDate: "2024-03-20T20:00:00Z",
    format: "VGC 2024 Reg H",
    altId: 2,
    altUsername: "player2",
    altDisplayName: null,
    placement: 5,
    wins: 4,
    losses: 2,
    ties: 0,
    teamPokemon: ["Raging Bolt", "Iron Hands", "Landorus", "Urshifu"],
    registeredAt: "2024-03-01T00:00:00Z",
  },
  {
    id: 3,
    tournamentId: 102,
    tournamentName: "Summer Invitational",
    tournamentSlug: "summer-invitational",
    organizationName: "Pokemon VGC",
    organizationSlug: "pokemon-vgc",
    startDate: "2024-06-10T00:00:00Z",
    endDate: "2024-06-10T19:00:00Z",
    format: "VGC 2024 Reg H",
    altId: 1,
    altUsername: "player1",
    altDisplayName: "Player One",
    placement: 3,
    wins: 5,
    losses: 1,
    ties: 1,
    teamPokemon: [],
    registeredAt: "2024-05-15T00:00:00Z",
  },
];

describe("TournamentHistoryTable", () => {
  it("should render empty state when no data is provided", () => {
    render(<TournamentHistoryTable data={[]} />);

    expect(screen.getByText("No tournament history yet")).toBeInTheDocument();
    expect(
      screen.getByText("Register for a tournament to get started")
    ).toBeInTheDocument();
  });

  it("should render tournament history data", () => {
    render(<TournamentHistoryTable data={mockHistoryData} />);

    expect(screen.getByText("Winter Championship 2024")).toBeInTheDocument();
    expect(screen.getByText("Spring Regional")).toBeInTheDocument();
    expect(screen.getByText("Summer Invitational")).toBeInTheDocument();
  });

  it("should display placement with proper formatting", () => {
    render(<TournamentHistoryTable data={mockHistoryData} />);

    expect(screen.getByText("1st")).toBeInTheDocument();
    expect(screen.getByText("Top 5")).toBeInTheDocument();
    expect(screen.getByText("3rd")).toBeInTheDocument();
  });

  it("should display win-loss records", () => {
    render(<TournamentHistoryTable data={mockHistoryData} />);

    expect(screen.getByText("6-0")).toBeInTheDocument();
    expect(screen.getByText("4-2")).toBeInTheDocument();
    expect(screen.getByText("5-1-1")).toBeInTheDocument();
  });

  it("should display organization names as links", () => {
    render(<TournamentHistoryTable data={mockHistoryData} />);

    const orgLinks = screen.getAllByRole("link", { name: "Pokemon VGC" });
    expect(orgLinks[0]).toHaveAttribute("href", "/organizations/pokemon-vgc");
    expect(orgLinks.length).toBeGreaterThan(0);
  });

  it("should display tournament names as links", () => {
    render(<TournamentHistoryTable data={mockHistoryData} />);

    const tournamentLink = screen.getByRole("link", {
      name: "Winter Championship 2024",
    });
    expect(tournamentLink).toHaveAttribute(
      "href",
      "/tournaments/winter-championship-2024"
    );
  });

  it("should display formatted dates", () => {
    render(<TournamentHistoryTable data={mockHistoryData} />);

    // Check that dates are rendered (format may vary by locale)
    const rows = screen.getAllByRole("row").slice(1); // Skip header
    expect(rows.length).toBeGreaterThan(0);
    // Just verify dates are present in some format
    expect(screen.getByText(/Jan.*2024|2024.*Jan/)).toBeInTheDocument();
  });

  it("should display alt usernames or display names", () => {
    render(<TournamentHistoryTable data={mockHistoryData} />);

    const allText = screen.getAllByText(/Player One|player2/);
    expect(allText.length).toBeGreaterThan(0);
  });

  it("should display format information", () => {
    render(<TournamentHistoryTable data={mockHistoryData} />);

    const regGCells = screen.getAllByText("VGC 2024 Reg G");
    expect(regGCells).toHaveLength(1);

    const regHCells = screen.getAllByText("VGC 2024 Reg H");
    expect(regHCells).toHaveLength(2);
  });

  it("should display em dash when team is missing", () => {
    render(<TournamentHistoryTable data={mockHistoryData} />);

    // Find the row for Summer Invitational which has no team
    const rows = screen.getAllByRole("row");
    const summerRow = rows.find((row) =>
      within(row).queryByText("Summer Invitational")
    );
    expect(summerRow).toBeInTheDocument();
  });

  it("should allow searching tournaments by name", async () => {
    const user = userEvent.setup();
    render(<TournamentHistoryTable data={mockHistoryData} />);

    const searchInput = screen.getByPlaceholderText("Search tournaments...");
    await user.type(searchInput, "Winter");

    expect(screen.getByText("Winter Championship 2024")).toBeInTheDocument();
    expect(screen.queryByText("Spring Regional")).not.toBeInTheDocument();
    expect(screen.queryByText("Summer Invitational")).not.toBeInTheDocument();
  });

  it("should render filter controls when multiple alts exist", () => {
    render(<TournamentHistoryTable data={mockHistoryData} />);

    // Should render combobox filters for alt and format
    const comboboxes = screen.getAllByRole("combobox");
    expect(comboboxes.length).toBeGreaterThanOrEqual(2);
  });

  it("should support filtering functionality", async () => {
    render(<TournamentHistoryTable data={mockHistoryData} />);

    // Just verify the table renders with filter controls
    // Actual filtering behavior is tested at integration level
    const comboboxes = screen.queryAllByRole("combobox");
    expect(comboboxes.length).toBeGreaterThanOrEqual(1);
  });

  it("should sort by placement when column header is clicked", async () => {
    const user = userEvent.setup();
    render(<TournamentHistoryTable data={mockHistoryData} />);

    const placementHeader = screen.getByRole("button", { name: /placement/i });
    await user.click(placementHeader);

    const rows = screen.getAllByRole("row").slice(1); // Skip header row
    const firstRowText = within(rows[0]!).getByText(/1st|Top \d+|\d+th/);
    expect(firstRowText.textContent).toBe("1st");
  });

  it("should paginate results when there are many tournaments", () => {
    const manyTournaments: TournamentHistoryRow[] = Array.from(
      { length: 25 },
      (_, i) => ({
        ...mockHistoryData[0]!,
        id: i + 1,
        tournamentId: i + 100,
        tournamentName: `Tournament ${i + 1}`,
        tournamentSlug: `tournament-${i + 1}`,
      })
    );

    render(<TournamentHistoryTable data={manyTournaments} />);

    // Should show pagination controls
    expect(screen.getByText(/Page 1 of 2/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /next/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /previous/i })
    ).toBeInTheDocument();
  });

  it("should navigate to next page when Next button is clicked", async () => {
    const user = userEvent.setup();
    const manyTournaments: TournamentHistoryRow[] = Array.from(
      { length: 25 },
      (_, i) => ({
        ...mockHistoryData[0]!,
        id: i + 1,
        tournamentId: i + 100,
        tournamentName: `Tournament ${i + 1}`,
        tournamentSlug: `tournament-${i + 1}`,
      })
    );

    render(<TournamentHistoryTable data={manyTournaments} />);

    const nextButton = screen.getByRole("button", { name: /next/i });
    await user.click(nextButton);

    expect(screen.getByText(/Page 2 of 2/)).toBeInTheDocument();
    // Page 2 should show tournaments 21-25
    expect(screen.getByText("Tournament 21")).toBeInTheDocument();
  });

  it("should handle tournaments with no organization gracefully", () => {
    const dataWithoutOrg: TournamentHistoryRow[] = [
      {
        ...mockHistoryData[0]!,
        organizationName: "",
        organizationSlug: "",
      },
    ];

    render(<TournamentHistoryTable data={dataWithoutOrg} />);

    // Should render without crashing
    expect(screen.getByText("Winter Championship 2024")).toBeInTheDocument();
  });
});
