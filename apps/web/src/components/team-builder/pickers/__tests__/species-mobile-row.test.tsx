import { render, screen } from "@testing-library/react";
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
jest.mock("@trainers/pokemon", () => {
  const actual = jest.requireActual<typeof import("@trainers/pokemon")>("@trainers/pokemon");
  return {
    ...actual,
    getLegalMoves: (...args: Parameters<typeof actual.getLegalMoves>) =>
      mockGetLegalMoves(...args),
  };
});

import { SpeciesMobileRow } from "../species-mobile-row";

const FORMAT_ID = "gen9vgc2025regg";

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
    mockGetLegalMoves.mockReturnValue(new Set(["Dragon Claw", "Earthquake", "Fire Fang"]));
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

  describe("expand / collapse", () => {
    it("shows the expand button with aria-expanded=false initially", () => {
      render(<SpeciesMobileRow entry={baseEntry} onPick={jest.fn()} formatId={FORMAT_ID} />);
      const chevron = screen.getByRole("button", { name: /expand moves/i });
      expect(chevron).toHaveAttribute("aria-expanded", "false");
    });

    it("toggles aria-expanded when the chevron is clicked", async () => {
      const user = userEvent.setup();
      render(<SpeciesMobileRow entry={baseEntry} onPick={jest.fn()} formatId={FORMAT_ID} />);
      const chevron = screen.getByRole("button", { name: /expand moves/i });
      await user.click(chevron);
      expect(screen.getByRole("button", { name: /collapse moves/i })).toHaveAttribute(
        "aria-expanded",
        "true"
      );
    });

    it("renders move chips when expanded and moves are available", async () => {
      const user = userEvent.setup();
      mockGetLegalMoves.mockReturnValue(new Set(["Dragon Claw", "Earthquake"]));
      render(<SpeciesMobileRow entry={baseEntry} onPick={jest.fn()} formatId={FORMAT_ID} />);
      await user.click(screen.getByRole("button", { name: /expand moves/i }));
      expect(screen.getByText("Dragon Claw")).toBeInTheDocument();
      expect(screen.getByText("Earthquake")).toBeInTheDocument();
    });

    it("renders moves sorted alphabetically", async () => {
      const user = userEvent.setup();
      mockGetLegalMoves.mockReturnValue(new Set(["Surf", "Ice Beam", "Blizzard"]));
      render(<SpeciesMobileRow entry={baseEntry} onPick={jest.fn()} formatId={FORMAT_ID} />);
      await user.click(screen.getByRole("button", { name: /expand moves/i }));
      const chips = screen.getAllByText(/blizzard|ice beam|surf/i);
      expect(chips.map((c) => c.textContent)).toEqual(["Blizzard", "Ice Beam", "Surf"]);
    });

    it("shows fallback message when getLegalMoves returns unavailable", async () => {
      const user = userEvent.setup();
      const { LEGALITY_UNAVAILABLE } = jest.requireActual<typeof import("@trainers/pokemon")>("@trainers/pokemon");
      mockGetLegalMoves.mockReturnValue(LEGALITY_UNAVAILABLE);
      render(<SpeciesMobileRow entry={baseEntry} onPick={jest.fn()} formatId={FORMAT_ID} />);
      await user.click(screen.getByRole("button", { name: /expand moves/i }));
      expect(screen.getByText(/moves unavailable/i)).toBeInTheDocument();
    });

    it("collapses the moves panel when chevron is clicked again", async () => {
      const user = userEvent.setup();
      mockGetLegalMoves.mockReturnValue(new Set(["Dragon Claw"]));
      render(<SpeciesMobileRow entry={baseEntry} onPick={jest.fn()} formatId={FORMAT_ID} />);
      await user.click(screen.getByRole("button", { name: /expand moves/i }));
      expect(screen.getByText("Dragon Claw")).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: /collapse moves/i }));
      expect(screen.queryByText("Dragon Claw")).not.toBeInTheDocument();
    });

    it("passes the correct formatId to getLegalMoves", async () => {
      const user = userEvent.setup();
      mockGetLegalMoves.mockReturnValue(new Set(["Tackle"]));
      render(<SpeciesMobileRow entry={baseEntry} onPick={jest.fn()} formatId="gen9ou" />);
      await user.click(screen.getByRole("button", { name: /expand moves/i }));
      expect(mockGetLegalMoves).toHaveBeenCalledWith("Garchomp-Mega", "gen9ou");
    });
  });
});
