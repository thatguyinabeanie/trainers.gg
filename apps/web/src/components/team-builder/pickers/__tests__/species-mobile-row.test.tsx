import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { speciesSearchEntryFactory } from "@trainers/test-utils/factories";

// next/image — JSDOM can't render the Next image component
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

jest.mock("@trainers/pokemon/sprites", () => ({
  getPokemonSprite: jest.fn().mockReturnValue({ url: "/sprite.png", pixelated: false }),
}));

const mockGetLegalMoves = jest.fn();
const mockGetMoveData = jest.fn();

jest.mock("@trainers/pokemon", () => {
  const actual = jest.requireActual("@trainers/pokemon");
  return {
    ...actual,
    getLegalMoves: (...args: Parameters<typeof actual.getLegalMoves>) =>
      mockGetLegalMoves(...args),
    getMoveData: (name: string) => mockGetMoveData(name),
  };
});

import { SpeciesMobileRow } from "../species-mobile-row";

const FORMAT_ID = "gen9vgc2025regg";

const makeMoveData = (overrides: Partial<{
  name: string;
  type: string;
  category: "Physical" | "Special" | "Status";
  basePower: number;
  accuracy: number | true;
  shortDesc: string;
}> = {}) => ({
  name: "Dragon Claw",
  type: "Dragon",
  category: "Physical" as const,
  basePower: 80,
  accuracy: 100,
  shortDesc: "No additional effect.",
  ...overrides,
});

describe("SpeciesMobileRow", () => {
  const baseEntry = speciesSearchEntryFactory.build({
    species: "Garchomp-Mega",
    types: ["Dragon", "Ground"],
    abilities: ["Sand Force", "Rough Skin"],
    abilitySlot1: "Sand Force",
    abilitySlot2: "Rough Skin",
    hiddenAbility: null,
    baseStats: { hp: 108, atk: 170, def: 115, spa: 120, spd: 95, spe: 92 },
    bst: 700,
  });

  beforeEach(() => {
    mockGetLegalMoves.mockReturnValue(new Set(["Dragon Claw"]));
    mockGetMoveData.mockReturnValue(makeMoveData());
  });

  it("renders the species name", () => {
    render(<SpeciesMobileRow entry={baseEntry} onPick={jest.fn()} formatId={FORMAT_ID} />);
    expect(screen.getByText("Garchomp-Mega")).toBeInTheDocument();
  });

  it("renders every ability as a chip", () => {
    render(<SpeciesMobileRow entry={baseEntry} onPick={jest.fn()} formatId={FORMAT_ID} />);
    expect(screen.getByText("Sand Force")).toBeInTheDocument();
    expect(screen.getByText("Rough Skin")).toBeInTheDocument();
  });

  it("renders all six base-stat labels with values", () => {
    render(<SpeciesMobileRow entry={baseEntry} onPick={jest.fn()} formatId={FORMAT_ID} />);
    expect(screen.getByText("HP")).toBeInTheDocument();
    expect(screen.getByText("108")).toBeInTheDocument();
    expect(screen.getByText("Atk")).toBeInTheDocument();
    expect(screen.getByText("170")).toBeInTheDocument();
    expect(screen.getByText("Def")).toBeInTheDocument();
    expect(screen.getByText("115")).toBeInTheDocument();
    expect(screen.getByText("SpA")).toBeInTheDocument();
    expect(screen.getByText("120")).toBeInTheDocument();
    expect(screen.getByText("SpD")).toBeInTheDocument();
    expect(screen.getByText("95")).toBeInTheDocument();
    expect(screen.getByText("Spe")).toBeInTheDocument();
    expect(screen.getByText("92")).toBeInTheDocument();
  });

  it("renders BST", () => {
    render(<SpeciesMobileRow entry={baseEntry} onPick={jest.fn()} formatId={FORMAT_ID} />);
    expect(screen.getByText("BST")).toBeInTheDocument();
    expect(screen.getByText("700")).toBeInTheDocument();
  });

  it("calls onPick with species name when the row is clicked", async () => {
    const user = userEvent.setup();
    const onPick = jest.fn();
    render(<SpeciesMobileRow entry={baseEntry} onPick={onPick} formatId={FORMAT_ID} />);
    await user.click(screen.getByRole("button", { name: /garchomp-mega/i }));
    expect(onPick).toHaveBeenCalledWith("Garchomp-Mega");
    expect(onPick).toHaveBeenCalledTimes(1);
  });

  it("does not call onPick when the expand chevron is clicked", async () => {
    const user = userEvent.setup();
    const onPick = jest.fn();
    render(<SpeciesMobileRow entry={baseEntry} onPick={onPick} formatId={FORMAT_ID} />);
    await user.click(screen.getByRole("button", { name: /expand moves/i }));
    expect(onPick).not.toHaveBeenCalled();
  });

  it("renders only the abilities present on the entry", () => {
    const entry = speciesSearchEntryFactory.build({
      species: "Palafin-Hero",
      abilities: ["Zero to Hero"],
      abilitySlot1: "Zero to Hero",
      abilitySlot2: null,
      hiddenAbility: null,
    });
    render(<SpeciesMobileRow entry={entry} onPick={jest.fn()} formatId={FORMAT_ID} />);
    expect(screen.getByText("Zero to Hero")).toBeInTheDocument();
    expect(screen.queryByText("Sand Force")).not.toBeInTheDocument();
  });

  it("applies bg-primary/5 class to the row container when isSelected is true", () => {
    render(<SpeciesMobileRow entry={baseEntry} onPick={jest.fn()} formatId={FORMAT_ID} isSelected />);
    expect(screen.getByTestId("species-mobile-row")).toHaveClass("bg-primary/5");
  });

  it("does not apply bg-primary/5 when isSelected is false", () => {
    render(<SpeciesMobileRow entry={baseEntry} onPick={jest.fn()} formatId={FORMAT_ID} isSelected={false} />);
    expect(screen.getByTestId("species-mobile-row")).not.toHaveClass("bg-primary/5");
  });

  it("renders hiddenAbility as a chip when populated", () => {
    const entry = speciesSearchEntryFactory.build({
      species: "Greninja",
      abilitySlot1: "Torrent",
      abilitySlot2: null,
      hiddenAbility: "Protean",
    });
    render(<SpeciesMobileRow entry={entry} onPick={jest.fn()} formatId={FORMAT_ID} />);
    expect(screen.getByText("Torrent")).toBeInTheDocument();
    expect(screen.getByText("Protean")).toBeInTheDocument();
  });

  describe("USG display", () => {
    it("renders nothing usage-related when usagePct is undefined", () => {
      render(
        <SpeciesMobileRow entry={baseEntry} onPick={jest.fn()} formatId={FORMAT_ID} />
      );
      // No chip testid, no USG label, no dash placeholder
      expect(
        screen.queryByTestId("usg-mobile-Garchomp-Mega")
      ).not.toBeInTheDocument();
      expect(screen.queryByText("USG")).not.toBeInTheDocument();
    });

    it("renders nothing usage-related when usagePct is 0", () => {
      render(
        <SpeciesMobileRow entry={baseEntry} onPick={jest.fn()} formatId={FORMAT_ID} usagePct={0} />
      );
      expect(
        screen.queryByTestId("usg-mobile-Garchomp-Mega")
      ).not.toBeInTheDocument();
      expect(screen.queryByText("USG")).not.toBeInTheDocument();
    });

    it("renders the formatted percentage chip on the name line when usagePct is > 0", () => {
      render(
        <SpeciesMobileRow entry={baseEntry} onPick={jest.fn()} formatId={FORMAT_ID} usagePct={52.3} />
      );
      const chip = screen.getByTestId("usg-mobile-Garchomp-Mega");
      expect(chip).toHaveTextContent("52.3%");
      // Chip must be a sibling of the type icons, not in the stat strip
      expect(chip.closest("span")).toHaveClass("tabular-nums");
    });

    it("renders one decimal place for a round percentage", () => {
      render(
        <SpeciesMobileRow entry={baseEntry} onPick={jest.fn()} formatId={FORMAT_ID} usagePct={30} />
      );
      expect(
        screen.getByTestId("usg-mobile-Garchomp-Mega")
      ).toHaveTextContent("30.0%");
    });

    it("does not render a USG label on the stat strip", () => {
      render(
        <SpeciesMobileRow entry={baseEntry} onPick={jest.fn()} formatId={FORMAT_ID} usagePct={15.7} />
      );
      // The stat strip no longer has a "USG" text label
      expect(screen.queryByText("USG")).not.toBeInTheDocument();
      // But the chip itself is still present on the name line
      expect(
        screen.getByTestId("usg-mobile-Garchomp-Mega")
      ).toHaveTextContent("15.7%");
    });
  });

  describe("expand / collapse", () => {
    it("shows the expand button with aria-expanded=false initially", () => {
      render(<SpeciesMobileRow entry={baseEntry} onPick={jest.fn()} formatId={FORMAT_ID} />);
      const chevron = screen.getByRole("button", { name: /expand moves/i });
      expect(chevron).toHaveAttribute("aria-expanded", "false");
    });

    it("toggles aria-expanded when the chevron is clicked", async () => {
      const user = userEvent.setup();
      render(<SpeciesMobileRow entry={baseEntry} onPick={jest.fn()} formatId={FORMAT_ID} />);
      await user.click(screen.getByRole("button", { name: /expand moves/i }));
      expect(screen.getByRole("button", { name: /collapse moves/i })).toHaveAttribute(
        "aria-expanded",
        "true"
      );
    });

    it("renders move name, BP, and ACC when expanded", async () => {
      const user = userEvent.setup();
      mockGetLegalMoves.mockReturnValue(new Set(["Earthquake"]));
      mockGetMoveData.mockReturnValue(
        makeMoveData({ name: "Earthquake", type: "Ground", basePower: 100, accuracy: 100 })
      );
      render(<SpeciesMobileRow entry={baseEntry} onPick={jest.fn()} formatId={FORMAT_ID} />);
      await user.click(screen.getByRole("button", { name: /expand moves/i }));
      expect(screen.getByText("Earthquake")).toBeInTheDocument();
      expect(screen.getByText("100")).toBeInTheDocument();
      expect(screen.getByText("100%")).toBeInTheDocument();
    });

    it("renders the category icon for Physical moves", async () => {
      const user = userEvent.setup();
      mockGetLegalMoves.mockReturnValue(new Set(["Dragon Claw"]));
      mockGetMoveData.mockReturnValue(makeMoveData({ category: "Physical" }));
      render(<SpeciesMobileRow entry={baseEntry} onPick={jest.fn()} formatId={FORMAT_ID} />);
      await user.click(screen.getByRole("button", { name: /expand moves/i }));
      expect(screen.getByAltText("Physical")).toBeInTheDocument();
    });

    it("renders the move description when it has additional effect text", async () => {
      const user = userEvent.setup();
      mockGetLegalMoves.mockReturnValue(new Set(["Iron Head"]));
      mockGetMoveData.mockReturnValue(
        makeMoveData({ name: "Iron Head", shortDesc: "30% chance to flinch." })
      );
      render(<SpeciesMobileRow entry={baseEntry} onPick={jest.fn()} formatId={FORMAT_ID} />);
      await user.click(screen.getByRole("button", { name: /expand moves/i }));
      expect(screen.getByText("30% chance to flinch.")).toBeInTheDocument();
    });

    it("renders sort buttons for Name, BP, and ACC", async () => {
      const user = userEvent.setup();
      render(<SpeciesMobileRow entry={baseEntry} onPick={jest.fn()} formatId={FORMAT_ID} />);
      await user.click(screen.getByRole("button", { name: /expand moves/i }));
      expect(screen.getByRole("button", { name: /^name/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^bp/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^acc/i })).toBeInTheDocument();
    });

    it("sorts moves by BP descending by default (highest BP first)", async () => {
      const user = userEvent.setup();
      mockGetLegalMoves.mockReturnValue(new Set(["Tackle", "Earthquake"]));
      mockGetMoveData.mockImplementation((name: string) =>
        name === "Tackle"
          ? makeMoveData({ name: "Tackle", basePower: 40 })
          : makeMoveData({ name: "Earthquake", basePower: 100 })
      );
      render(<SpeciesMobileRow entry={baseEntry} onPick={jest.fn()} formatId={FORMAT_ID} />);
      await user.click(screen.getByRole("button", { name: /expand moves/i }));
      const names = screen.getAllByText(/tackle|earthquake/i).map((el) => el.textContent);
      expect(names[0]).toBe("Earthquake");
      expect(names[1]).toBe("Tackle");
    });

    it("shows fallback message when getLegalMoves returns unavailable", async () => {
      const user = userEvent.setup();
      const { LEGALITY_UNAVAILABLE } = jest.requireActual("@trainers/pokemon");
      mockGetLegalMoves.mockReturnValue(LEGALITY_UNAVAILABLE);
      render(<SpeciesMobileRow entry={baseEntry} onPick={jest.fn()} formatId={FORMAT_ID} />);
      await user.click(screen.getByRole("button", { name: /expand moves/i }));
      expect(screen.getByText(/moves unavailable/i)).toBeInTheDocument();
    });

    it("collapses the moves panel when chevron is clicked again", async () => {
      const user = userEvent.setup();
      mockGetLegalMoves.mockReturnValue(new Set(["Dragon Claw"]));
      mockGetMoveData.mockReturnValue(makeMoveData());
      render(<SpeciesMobileRow entry={baseEntry} onPick={jest.fn()} formatId={FORMAT_ID} />);
      await user.click(screen.getByRole("button", { name: /expand moves/i }));
      expect(screen.getByText("Dragon Claw")).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: /collapse moves/i }));
      expect(screen.queryByText("Dragon Claw")).not.toBeInTheDocument();
    });

    it("passes the correct formatId to getLegalMoves", async () => {
      const user = userEvent.setup();
      render(<SpeciesMobileRow entry={baseEntry} onPick={jest.fn()} formatId="gen9ou" />);
      await user.click(screen.getByRole("button", { name: /expand moves/i }));
      expect(mockGetLegalMoves).toHaveBeenCalledWith("Garchomp-Mega", "gen9ou");
    });

    it("shows — for BP when basePower is 0 (status moves)", async () => {
      const user = userEvent.setup();
      mockGetLegalMoves.mockReturnValue(new Set(["Swords Dance"]));
      mockGetMoveData.mockReturnValue(
        makeMoveData({ name: "Swords Dance", category: "Status", basePower: 0, accuracy: true })
      );
      render(<SpeciesMobileRow entry={baseEntry} onPick={jest.fn()} formatId={FORMAT_ID} />);
      await user.click(screen.getByRole("button", { name: /expand moves/i }));
      // BP and ACC both show — for status moves
      const dashes = within(screen.getByTestId("species-mobile-row")).getAllByText("—");
      expect(dashes.length).toBeGreaterThanOrEqual(2);
    });
  });
});
