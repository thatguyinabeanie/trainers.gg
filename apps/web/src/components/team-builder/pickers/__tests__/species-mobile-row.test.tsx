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
  getPokemonSprite: jest.fn().mockReturnValue("/sprite.png"),
}));

import { SpeciesMobileRow } from "../species-mobile-row";

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

  it("renders the species name", () => {
    render(<SpeciesMobileRow entry={baseEntry} onPick={jest.fn()} />);
    expect(screen.getByText("Garchomp-Mega")).toBeInTheDocument();
  });

  it("renders every ability as a chip", () => {
    render(<SpeciesMobileRow entry={baseEntry} onPick={jest.fn()} />);
    expect(screen.getByText("Sand Force")).toBeInTheDocument();
    expect(screen.getByText("Rough Skin")).toBeInTheDocument();
  });

  it("renders all six base-stat labels with values", () => {
    render(<SpeciesMobileRow entry={baseEntry} onPick={jest.fn()} />);
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
    render(<SpeciesMobileRow entry={baseEntry} onPick={jest.fn()} />);
    expect(screen.getByText("BST")).toBeInTheDocument();
    expect(screen.getByText("700")).toBeInTheDocument();
  });

  it("calls onPick with species name when the row is clicked", async () => {
    const user = userEvent.setup();
    const onPick = jest.fn();
    render(<SpeciesMobileRow entry={baseEntry} onPick={onPick} />);
    await user.click(screen.getByRole("button", { name: /garchomp-mega/i }));
    expect(onPick).toHaveBeenCalledWith("Garchomp-Mega");
    expect(onPick).toHaveBeenCalledTimes(1);
  });

  it("renders only the abilities present on the entry", () => {
    const entry = speciesSearchEntryFactory.build({
      species: "Palafin-Hero",
      abilities: ["Zero to Hero"],
      abilitySlot1: "Zero to Hero",
      abilitySlot2: null,
      hiddenAbility: null,
    });
    render(<SpeciesMobileRow entry={entry} onPick={jest.fn()} />);
    expect(screen.getByText("Zero to Hero")).toBeInTheDocument();
    expect(screen.queryByText("Sand Force")).not.toBeInTheDocument();
  });
});
