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
  getPokemonSprite: jest.fn().mockReturnValue({ url: "/sprite.png", pixelated: false }),
}));

// ── Vaul Drawer mock — JSDOM lacks setPointerCapture used by Vaul's gesture ──
jest.mock("@/components/ui/drawer", () => ({
  Drawer: ({
    children,
    open,
  }: {
    children: React.ReactNode;
    open: boolean;
    onOpenChange?: (open: boolean) => void;
  }) => (open ? <>{children}</> : null),
  DrawerContent: ({
    children,
  }: {
    children: React.ReactNode;
    showHandle?: boolean;
    className?: string;
  }) => <div>{children}</div>,
  DrawerTitle: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <h2 className={className}>{children}</h2>,
}));

// ── Stub heavy child filter components ─────────────────────────────────────
jest.mock("../species-sidebar", () => ({
  SpeciesSidebar: () => <div data-testid="species-sidebar" />,
}));
jest.mock("../role-presets-panel", () => ({
  RolePresetsPanel: () => <div data-testid="role-presets-panel" />,
}));

// ── Mock useFormatUsageData — isolate from TanStack Query / server action ──
const mockUseFormatUsageData = jest.fn<Map<string, { usagePct: number }>, []>();
jest.mock("../../use-format-usage-data", () => ({
  useFormatUsageData: () => mockUseFormatUsageData(),
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
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: empty usage map (no data available)
    mockUseFormatUsageData.mockReturnValue(new Map());
  });

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

  describe("search and filter interactions", () => {
    it("shows empty-state message when no species match", () => {
      const pokemonModule = jest.requireMock<{ searchSpecies: jest.Mock }>("@trainers/pokemon");
      pokemonModule.searchSpecies.mockReturnValueOnce([]);
      render(<SpeciesPickerMobile {...defaultProps} />);
      expect(
        screen.getByText(/no pokémon match these filters/i)
      ).toBeInTheDocument();
      expect(screen.queryByText("Garchomp-Mega")).not.toBeInTheDocument();
    });

    it("Filters button shows plain label when no filters are active", () => {
      render(<SpeciesPickerMobile {...defaultProps} />);
      // No active filters: aria-label is exactly "Open filters" with no count suffix
      expect(screen.getByRole("button", { name: "Open filters" })).toBeInTheDocument();
    });

    it("Filters button opens the filters panel and shows Filters heading", async () => {
      const user = userEvent.setup();
      render(<SpeciesPickerMobile {...defaultProps} />);
      await user.click(screen.getByRole("button", { name: /open filters/i }));
      expect(screen.getByRole("heading", { name: /^filters$/i })).toBeInTheDocument();
      expect(screen.getByTestId("species-sidebar")).toBeInTheDocument();
    });
  });

  describe("USG display", () => {
    it("renders '—' for all species when no usage data is available", () => {
      mockUseFormatUsageData.mockReturnValue(new Map());
      render(<SpeciesPickerMobile {...defaultProps} />);
      expect(
        screen.getByTestId("usg-mobile-Garchomp-Mega")
      ).toHaveTextContent("—");
      expect(
        screen.getByTestId("usg-mobile-Palafin-Hero")
      ).toHaveTextContent("—");
    });

    it("renders the usage % for a known species", () => {
      // Garchomp-Mega normalized slug is "garchomp-mega"
      mockUseFormatUsageData.mockReturnValue(
        new Map([["garchomp-mega", { usagePct: 52.3 }]])
      );
      render(<SpeciesPickerMobile {...defaultProps} />);
      expect(
        screen.getByTestId("usg-mobile-Garchomp-Mega")
      ).toHaveTextContent("52.3%");
    });

    it("renders '—' for a species not in the usage map", () => {
      // Only Garchomp-Mega has data; Palafin-Hero should show dash
      mockUseFormatUsageData.mockReturnValue(
        new Map([["garchomp-mega", { usagePct: 52.3 }]])
      );
      render(<SpeciesPickerMobile {...defaultProps} />);
      expect(
        screen.getByTestId("usg-mobile-Palafin-Hero")
      ).toHaveTextContent("—");
    });

    it("looks up usage via normalized slug — dex name matches DB slug", () => {
      // DB slugs are lowercase-hyphen; normalizeSpeciesSlug handles the conversion
      mockUseFormatUsageData.mockReturnValue(
        new Map([
          ["garchomp-mega", { usagePct: 52.3 }],
          ["palafin-hero", { usagePct: 30.5 }],
        ])
      );
      render(<SpeciesPickerMobile {...defaultProps} />);
      expect(
        screen.getByTestId("usg-mobile-Garchomp-Mega")
      ).toHaveTextContent("52.3%");
      expect(
        screen.getByTestId("usg-mobile-Palafin-Hero")
      ).toHaveTextContent("30.5%");
    });
  });
});
