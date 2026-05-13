import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ── next/image mock ────────────────────────────────────────────────────────
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
  ALL_TYPES: ["Normal", "Fire", "Water", "Dragon"],
  buildSpeciesSearchIndex: jest.fn().mockReturnValue([
    {
      species: "Garchomp-Mega",
      types: ["Dragon", "Ground"],
      abilities: ["Sand Force"],
      abilitySlot1: "Sand Force",
      abilitySlot2: null,
      hiddenAbility: null,
      roles: ["spread"],
      baseStats: { hp: 108, atk: 170, def: 115, spa: 120, spd: 95, spe: 92 },
      bst: 700,
    },
    {
      species: "Palafin-Hero",
      types: ["Water"],
      abilities: ["Zero to Hero"],
      abilitySlot1: "Zero to Hero",
      abilitySlot2: null,
      hiddenAbility: null,
      roles: ["spread"],
      baseStats: { hp: 100, atk: 160, def: 97, spa: 106, spd: 87, spe: 100 },
      bst: 650,
    },
  ]),
  getAllLegalMoves: jest.fn().mockReturnValue([]),
  isLegalSpecies: jest.fn().mockReturnValue(true),
  getLegalMoves: jest.fn().mockReturnValue([]),
  getMoveData: jest.fn().mockReturnValue(null),
  searchSpecies: jest.fn((index) => index),
}));

jest.mock("@trainers/pokemon/sprites", () => ({
  getPokemonSprite: jest.fn().mockReturnValue("/sprite.png"),
}));

// ── Stub heavy child filter components ─────────────────────────────────────
jest.mock("../species-sidebar", () => ({
  SpeciesSidebar: () => <div data-testid="species-sidebar" />,
}));
jest.mock("../role-presets-panel", () => ({
  RolePresetsPanel: () => <div data-testid="role-presets-panel" />,
}));

import { SpeciesPickerMobile } from "../species-picker-mobile";

const defaultProps = {
  open: true,
  onOpenChange: jest.fn(),
  value: null,
  format: undefined,
  currentTeam: [] as Array<{ species: string }>,
  onPick: jest.fn(),
};

describe("SpeciesPickerMobile", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("list view (default)", () => {
    it("renders the search input", () => {
      render(<SpeciesPickerMobile {...defaultProps} />);
      expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
    });

    it("renders the Filters button", () => {
      render(<SpeciesPickerMobile {...defaultProps} />);
      expect(
        screen.getByRole("button", { name: /open filters/i })
      ).toBeInTheDocument();
    });

    it("renders the species count", () => {
      render(<SpeciesPickerMobile {...defaultProps} />);
      expect(screen.getByText(/2\/2/)).toBeInTheDocument();
    });

    it("renders mobile rows for every matched species", () => {
      render(<SpeciesPickerMobile {...defaultProps} />);
      expect(screen.getByText("Garchomp-Mega")).toBeInTheDocument();
      expect(screen.getByText("Palafin-Hero")).toBeInTheDocument();
    });

    it("calls onPick and onOpenChange(false) when a row is tapped", async () => {
      const user = userEvent.setup();
      const onPick = jest.fn();
      const onOpenChange = jest.fn();
      render(
        <SpeciesPickerMobile
          {...defaultProps}
          onPick={onPick}
          onOpenChange={onOpenChange}
        />
      );
      await user.click(screen.getByRole("button", { name: /garchomp-mega/i }));
      expect(onPick).toHaveBeenCalledWith("Garchomp-Mega");
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it("hides the chip strip when no filters are active", () => {
      render(<SpeciesPickerMobile {...defaultProps} />);
      expect(
        screen.queryByRole("button", { name: /remove .* filter/i })
      ).not.toBeInTheDocument();
    });

    it("does NOT render filters-view components in list view", () => {
      render(<SpeciesPickerMobile {...defaultProps} />);
      expect(screen.queryByTestId("species-sidebar")).not.toBeInTheDocument();
      expect(screen.queryByTestId("role-presets-panel")).not.toBeInTheDocument();
    });
  });

  describe("filters view", () => {
    it("switches to filters view when Filters button is clicked", async () => {
      const user = userEvent.setup();
      render(<SpeciesPickerMobile {...defaultProps} />);
      await user.click(screen.getByRole("button", { name: /open filters/i }));
      expect(screen.getByTestId("species-sidebar")).toBeInTheDocument();
      expect(screen.getByTestId("role-presets-panel")).toBeInTheDocument();
    });

    it("renders Filters heading and Back button in filters view", async () => {
      const user = userEvent.setup();
      render(<SpeciesPickerMobile {...defaultProps} />);
      await user.click(screen.getByRole("button", { name: /open filters/i }));
      expect(
        screen.getByRole("heading", { name: /^filters$/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /back to results/i })
      ).toBeInTheDocument();
    });

    it("renders Clear all button in filters view", async () => {
      const user = userEvent.setup();
      render(<SpeciesPickerMobile {...defaultProps} />);
      await user.click(screen.getByRole("button", { name: /open filters/i }));
      expect(
        screen.getByRole("button", { name: /clear all/i })
      ).toBeInTheDocument();
    });

    it("returns to list view when Back button is clicked", async () => {
      const user = userEvent.setup();
      render(<SpeciesPickerMobile {...defaultProps} />);
      await user.click(screen.getByRole("button", { name: /open filters/i }));
      await user.click(screen.getByRole("button", { name: /back to results/i }));
      expect(screen.queryByTestId("species-sidebar")).not.toBeInTheDocument();
      expect(screen.getByText("Garchomp-Mega")).toBeInTheDocument();
    });

    it('returns to list view when "Show N results" is clicked', async () => {
      const user = userEvent.setup();
      render(<SpeciesPickerMobile {...defaultProps} />);
      await user.click(screen.getByRole("button", { name: /open filters/i }));
      await user.click(screen.getByRole("button", { name: /show 2 results/i }));
      expect(screen.queryByTestId("species-sidebar")).not.toBeInTheDocument();
      expect(screen.getByText("Palafin-Hero")).toBeInTheDocument();
    });
  });

  describe("when closed", () => {
    it("does not render any drawer content", () => {
      render(<SpeciesPickerMobile {...defaultProps} open={false} />);
      expect(screen.queryByPlaceholderText(/search/i)).not.toBeInTheDocument();
    });
  });
});
