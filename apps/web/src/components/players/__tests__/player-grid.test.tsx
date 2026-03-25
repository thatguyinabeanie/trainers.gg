import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PlayerGrid } from "../player-grid";

// Mock PlayerCard to avoid rendering its internals
jest.mock("../player-card", () => ({
  PlayerCard: ({ username }: { username: string }) => (
    <div data-testid="player-card">{username}</div>
  ),
}));

const makePlayers = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    userId: `u${i}`,
    username: `player${i}`,
    avatarUrl: null,
    country: null,
    tournamentCount: i,
    winRate: 50,
    totalWins: i,
    totalLosses: i,
  }));

describe("PlayerGrid", () => {
  describe("empty state", () => {
    it("shows 'No players found' when list is empty and not searching", () => {
      render(
        <PlayerGrid
          players={[]}
          totalCount={0}
          page={1}
          onPageChange={jest.fn()}
          isSearching={false}
        />
      );

      expect(screen.getByText("No players found")).toBeInTheDocument();
      expect(
        screen.getByText("Check back later for community members.")
      ).toBeInTheDocument();
    });

    it("shows search-specific message when searching with no results", () => {
      render(
        <PlayerGrid
          players={[]}
          totalCount={0}
          page={1}
          onPageChange={jest.fn()}
          isSearching={true}
        />
      );

      expect(
        screen.getByText("Try adjusting your search or filters")
      ).toBeInTheDocument();
    });
  });

  describe("player list", () => {
    it("renders a card for each player", () => {
      const players = makePlayers(3);
      render(
        <PlayerGrid
          players={players}
          totalCount={3}
          page={1}
          onPageChange={jest.fn()}
          isSearching={false}
        />
      );

      expect(screen.getAllByTestId("player-card")).toHaveLength(3);
    });
  });

  describe("pagination", () => {
    it("hides pagination when only one page", () => {
      render(
        <PlayerGrid
          players={makePlayers(3)}
          totalCount={3}
          page={1}
          onPageChange={jest.fn()}
          isSearching={false}
        />
      );

      expect(screen.queryByRole("button", { name: /previous/i })).toBeNull();
    });

    it("shows pagination when multiple pages exist", () => {
      render(
        <PlayerGrid
          players={makePlayers(24)}
          totalCount={48}
          page={1}
          onPageChange={jest.fn()}
          isSearching={false}
        />
      );

      expect(
        screen.getByRole("button", { name: /previous/i })
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /next/i })).toBeInTheDocument();
    });

    it("disables Previous on first page", () => {
      render(
        <PlayerGrid
          players={makePlayers(24)}
          totalCount={48}
          page={1}
          onPageChange={jest.fn()}
          isSearching={false}
        />
      );

      expect(screen.getByRole("button", { name: /previous/i })).toBeDisabled();
    });

    it("disables Next on last page", () => {
      render(
        <PlayerGrid
          players={makePlayers(24)}
          totalCount={48}
          page={2}
          onPageChange={jest.fn()}
          isSearching={false}
        />
      );

      expect(screen.getByRole("button", { name: /next/i })).toBeDisabled();
    });

    it("calls onPageChange with previous page when Previous clicked", async () => {
      const onPageChange = jest.fn();
      render(
        <PlayerGrid
          players={makePlayers(24)}
          totalCount={72}
          page={2}
          onPageChange={onPageChange}
          isSearching={false}
        />
      );

      await userEvent.click(screen.getByRole("button", { name: /previous/i }));
      expect(onPageChange).toHaveBeenCalledWith(1);
    });

    it("calls onPageChange with next page when Next clicked", async () => {
      const onPageChange = jest.fn();
      render(
        <PlayerGrid
          players={makePlayers(24)}
          totalCount={72}
          page={1}
          onPageChange={onPageChange}
          isSearching={false}
        />
      );

      await userEvent.click(screen.getByRole("button", { name: /next/i }));
      expect(onPageChange).toHaveBeenCalledWith(2);
    });

    it("displays current page range and total", () => {
      render(
        <PlayerGrid
          players={makePlayers(24)}
          totalCount={48}
          page={1}
          onPageChange={jest.fn()}
          isSearching={false}
        />
      );

      expect(screen.getByText(/1–24 of 48 players/)).toBeInTheDocument();
    });
  });
});
