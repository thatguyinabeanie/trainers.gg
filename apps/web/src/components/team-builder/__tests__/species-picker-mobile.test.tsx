import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// ── next/image mock (JSDOM can't render Next.js Image) ─────────────────────
jest.mock("next/image", () => ({
  __esModule: true,
  default: function MockImage({
    src,
    alt,
    width,
    height,
    ...rest
  }: {
    src: string;
    alt: string;
    width: number;
    height: number;
    [key: string]: unknown;
  }) {
    return <img src={src} alt={alt} width={width} height={height} {...rest} />;
  },
}));

// ── @trainers/pokemon mock ─────────────────────────────────────────────────
jest.mock("@trainers/pokemon", () => ({
  ALL_TYPES: ["Normal", "Fire", "Water"],
  buildSpeciesSearchIndex: jest.fn().mockReturnValue([]),
  getAllLegalMoves: jest.fn().mockReturnValue([]),
  isLegalSpecies: jest.fn().mockReturnValue(true),
  getLegalMoves: jest.fn().mockReturnValue([]),
  getMoveData: jest.fn().mockReturnValue(null),
  searchSpecies: jest.fn().mockReturnValue([]),
}));

jest.mock("@trainers/pokemon/sprites", () => ({
  getPokemonSprite: jest.fn().mockReturnValue("/sprite.png"),
}));

// ── useIsMobile mock ───────────────────────────────────────────────────────
const mockUseIsMobile = jest.fn();
jest.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => mockUseIsMobile(),
}));

// ── Stub heavy child components ────────────────────────────────────────────
jest.mock("../pickers/species-sidebar", () => ({
  SpeciesSidebar: () => <div data-testid="species-sidebar" />,
}));
jest.mock("../pickers/role-presets-panel", () => ({
  RolePresetsPanel: () => <div data-testid="role-presets-panel" />,
}));
jest.mock("../pickers/species-filter-sheet", () => ({
  SpeciesFilterSheet: ({ open }: { open: boolean }) =>
    open ? <div data-testid="filter-sheet" /> : null,
}));
jest.mock("../pickers/species-smart-search", () => ({
  SpeciesSmartSearch: () => null,
}));
jest.mock("../pickers/species-expanded-panel", () => ({
  SpeciesExpandedPanel: () => null,
}));
jest.mock("../pickers/ability-cell", () => ({
  AbilityCell: () => null,
}));

import { SpeciesPicker } from "../pickers/species-picker";

const defaultProps = {
  value: null,
  format: undefined,
  currentTeam: [] as Array<{ species: string }>,
  onPick: jest.fn(),
  onClose: jest.fn(),
};

describe("SpeciesPicker — conditional mount", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("desktop (default)", () => {
    beforeEach(() => mockUseIsMobile.mockReturnValue(false));

    it("renders the sidebar on desktop", () => {
      render(<SpeciesPicker {...defaultProps} />);
      expect(screen.getByTestId("species-sidebar")).toBeInTheDocument();
    });

    it("does not render SpeciesFilterSheet on desktop", () => {
      render(<SpeciesPicker {...defaultProps} />);
      expect(screen.queryByTestId("filter-sheet")).not.toBeInTheDocument();
    });

    it("shows 'of' count format on desktop", () => {
      render(<SpeciesPicker {...defaultProps} />);
      expect(screen.getByText(/0 of 0/)).toBeInTheDocument();
    });
  });

  describe("mobile filter UI", () => {
    beforeEach(() => mockUseIsMobile.mockReturnValue(true));

    it("hides the sidebar rail on mobile", () => {
      render(<SpeciesPicker {...defaultProps} />);
      expect(screen.queryByTestId("species-sidebar")).not.toBeInTheDocument();
    });

    it("renders a Filters button in the search header", () => {
      render(<SpeciesPicker {...defaultProps} />);
      expect(
        screen.getByRole("button", { name: /open filters/i })
      ).toBeInTheDocument();
    });

    it("opens SpeciesFilterSheet when Filters button is clicked", async () => {
      const user = userEvent.setup();
      render(<SpeciesPicker {...defaultProps} />);
      expect(screen.queryByTestId("filter-sheet")).not.toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: /open filters/i }));
      expect(screen.getByTestId("filter-sheet")).toBeInTheDocument();
    });

    it("chip strip is hidden when no filters are active", () => {
      render(<SpeciesPicker {...defaultProps} />);
      // No teal dismissible chip buttons should exist
      const chipButtons = screen
        .queryAllByRole("button")
        .filter((btn) => btn.textContent?.includes("×") && btn !== screen.queryByRole("button", { name: /open filters/i }));
      expect(chipButtons).toHaveLength(0);
    });

    it("uses compact slash count format on mobile", () => {
      render(<SpeciesPicker {...defaultProps} />);
      expect(screen.getByText(/^0\/0$/)).toBeInTheDocument();
    });
  });
});
