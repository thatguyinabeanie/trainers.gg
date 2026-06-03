import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Capture props passed to child components
const mockOverviewTab = jest.fn(() => (
  <div data-testid="overview-tab">Overview</div>
));
const mockTournamentsTab = jest.fn(() => (
  <div data-testid="tournaments-tab">Tournaments</div>
));
const mockTeamsTab = jest.fn(() => <div data-testid="teams-tab">Teams</div>);

jest.mock("../overview-tab", () => ({
  OverviewTab: (props: unknown) => mockOverviewTab(props),
}));
jest.mock("../tournaments-tab", () => ({
  TournamentsTab: (props: unknown) => mockTournamentsTab(props),
}));
jest.mock("../teams-tab", () => ({
  TeamsTab: (props: unknown) => mockTeamsTab(props),
}));

import { PlayerProfileTabs } from "../player-profile-tabs";

const defaultProps = {
  allAltIds: [1, 2, 3],
  publicAltIds: [1],
  isOwner: false,
  altMap: { 1: "ash", 2: "red", 3: "secret_alt" } as Record<number, string>,
  handle: "ash_ketchum",
};

function renderComponent(props = defaultProps) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <PlayerProfileTabs {...props} />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("PlayerProfileTabs", () => {
  it("renders the Overview tab by default", () => {
    renderComponent();
    expect(screen.getByTestId("overview-tab")).toBeInTheDocument();
    expect(screen.queryByTestId("tournaments-tab")).not.toBeInTheDocument();
    expect(screen.queryByTestId("teams-tab")).not.toBeInTheDocument();
  });

  it("can switch to Tournaments tab", async () => {
    const user = userEvent.setup();
    renderComponent();

    await user.click(screen.getByRole("tab", { name: "Tournaments" }));

    expect(screen.getByTestId("tournaments-tab")).toBeInTheDocument();
    expect(screen.queryByTestId("overview-tab")).not.toBeInTheDocument();
  });

  it("can switch to Teams tab", async () => {
    const user = userEvent.setup();
    renderComponent();

    await user.click(screen.getByRole("tab", { name: "Teams" }));

    expect(screen.getByTestId("teams-tab")).toBeInTheDocument();
    expect(screen.queryByTestId("overview-tab")).not.toBeInTheDocument();
  });

  it("shows placeholder for Articles tab", async () => {
    const user = userEvent.setup();
    renderComponent();

    await user.click(screen.getByRole("tab", { name: "Articles" }));

    expect(screen.getByText("Articles coming soon.")).toBeInTheDocument();
  });

  it("shows placeholder for Achievements tab", async () => {
    const user = userEvent.setup();
    renderComponent();

    await user.click(screen.getByRole("tab", { name: "Achievements" }));

    expect(screen.getByText("Achievements coming soon.")).toBeInTheDocument();
  });

  it("passes correct props to OverviewTab", () => {
    renderComponent();

    expect(mockOverviewTab).toHaveBeenCalledWith({
      statsAltIds: [1, 2, 3],
      tournamentAltIds: [1], // publicAltIds when not owner
      altMap: { 1: "ash", 2: "red", 3: "secret_alt" },
      handle: "ash_ketchum",
    });
  });

  it("passes allAltIds as tournamentAltIds when isOwner is true", () => {
    renderComponent({ ...defaultProps, isOwner: true });

    expect(mockOverviewTab).toHaveBeenCalledWith(
      expect.objectContaining({
        tournamentAltIds: [1, 2, 3],
      })
    );
  });

  it("passes correct props to TournamentsTab", async () => {
    const user = userEvent.setup();
    renderComponent({ ...defaultProps, isOwner: true });

    await user.click(screen.getByRole("tab", { name: "Tournaments" }));

    expect(mockTournamentsTab).toHaveBeenCalledWith({
      altIds: [1, 2, 3], // allAltIds when owner
      allAltIds: [1, 2, 3],
      isOwner: true,
      altMap: { 1: "ash", 2: "red", 3: "secret_alt" },
      handle: "ash_ketchum",
    });
  });

  it("passes correct props to TeamsTab", async () => {
    const user = userEvent.setup();
    renderComponent();

    await user.click(screen.getByRole("tab", { name: "Teams" }));

    expect(mockTeamsTab).toHaveBeenCalledWith({
      altIds: [1], // publicAltIds when not owner
      handle: "ash_ketchum",
    });
  });
});
