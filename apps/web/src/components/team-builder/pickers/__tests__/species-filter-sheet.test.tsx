import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { DEFAULT_SPECIES_FILTERS } from "../species-filter-state";
import { SpeciesFilterSheet } from "../species-filter-sheet";

jest.mock("../species-sidebar", () => ({
  SpeciesSidebar: () => <div data-testid="species-sidebar" />,
}));
jest.mock("../role-presets-panel", () => ({
  RolePresetsPanel: () => <div data-testid="role-presets-panel" />,
}));

const defaultProps = {
  open: true,
  onOpenChange: jest.fn(),
  filters: DEFAULT_SPECIES_FILTERS,
  onFiltersChange: jest.fn(),
  format: undefined,
  currentTeam: [] as Array<{ species: string }>,
  bucketCount: jest.fn().mockReturnValue(0),
  matchedCount: 42,
  onClearAll: jest.fn(),
};

describe("SpeciesFilterSheet", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders SpeciesSidebar and RolePresetsPanel when open", () => {
    render(<SpeciesFilterSheet {...defaultProps} />);
    expect(screen.getByTestId("species-sidebar")).toBeInTheDocument();
    expect(screen.getByTestId("role-presets-panel")).toBeInTheDocument();
  });

  it("shows Filters heading", () => {
    render(<SpeciesFilterSheet {...defaultProps} />);
    expect(
      screen.getByRole("heading", { name: /^filters$/i })
    ).toBeInTheDocument();
  });

  it("Clear all calls onClearAll then closes the sheet", async () => {
    const user = userEvent.setup();
    const onClearAll = jest.fn();
    const onOpenChange = jest.fn();
    render(
      <SpeciesFilterSheet
        {...defaultProps}
        onClearAll={onClearAll}
        onOpenChange={onOpenChange}
      />
    );
    await user.click(screen.getByRole("button", { name: /clear all/i }));
    expect(onClearAll).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("Show results footer shows matchedCount and closes on click", async () => {
    const user = userEvent.setup();
    const onOpenChange = jest.fn();
    render(
      <SpeciesFilterSheet
        {...defaultProps}
        matchedCount={42}
        onOpenChange={onOpenChange}
      />
    );
    const btn = screen.getByRole("button", { name: /show 42 results/i });
    expect(btn).toBeInTheDocument();
    await user.click(btn);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("does not render content when closed", () => {
    render(<SpeciesFilterSheet {...defaultProps} open={false} />);
    expect(screen.queryByTestId("species-sidebar")).not.toBeInTheDocument();
  });
});
