import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

import { type Tables } from "@trainers/supabase";

// Mock next/image used inside Sprite
jest.mock("next/image", () => ({
  __esModule: true,
  default: function MockImage({
    alt,
    ...rest
  }: {
    alt: string;
    [key: string]: unknown;
  }) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={alt} {...rest} />;
  },
}));

// Mock getPokemonSprite used inside Sprite
jest.mock("@trainers/pokemon/sprites", () => ({
  getPokemonSprite: jest.fn().mockReturnValue({
    url: "https://example.com/sprite.png",
    w: 40,
    h: 40,
    pixelated: false,
  }),
}));

import { AttackerChipStrip } from "../calc/attacker-chip-strip";

// =============================================================================
// Helpers
// =============================================================================

function makePokemon(species: string): Tables<"pokemon"> {
  return {
    id: 1,
    species,
    ability: "Rough Skin",
    nature: "Jolly",
    move1: "Earthquake",
    move2: null,
    move3: null,
    move4: null,
    held_item: null,
    tera_type: null,
    ev_hp: 4,
    ev_attack: 252,
    ev_defense: 0,
    ev_special_attack: 0,
    ev_special_defense: 0,
    ev_speed: 252,
    iv_hp: 31,
    iv_attack: 31,
    iv_defense: 31,
    iv_special_attack: 31,
    iv_special_defense: 31,
    iv_speed: 31,
    level: 50,
    gender: null,
    nickname: null,
    notes: null,
    is_shiny: false,
    format_legal: true,
    created_at: null,
  };
}

// =============================================================================
// AttackerChipStrip tests
// =============================================================================

describe("AttackerChipStrip", () => {
  // ---------------------------------------------------------------------------
  // Renders correct number of chips
  // ---------------------------------------------------------------------------

  it("renders 6 buttons for a full team", () => {
    const pokemon = [
      makePokemon("Garchomp"),
      makePokemon("Incineroar"),
      makePokemon("Flutter Mane"),
      makePokemon("Iron Hands"),
      makePokemon("Amoonguss"),
      makePokemon("Gholdengo"),
    ];
    render(
      <AttackerChipStrip pokemon={pokemon} activeIdx={0} onPick={jest.fn()} />
    );
    expect(screen.getAllByRole("button")).toHaveLength(6);
  });

  it("renders 6 buttons even with null slots (empty team)", () => {
    const pokemon: (Tables<"pokemon"> | null)[] = [null, null, null, null, null, null];
    render(
      <AttackerChipStrip pokemon={pokemon} activeIdx={0} onPick={jest.fn()} />
    );
    expect(screen.getAllByRole("button")).toHaveLength(6);
  });

  // ---------------------------------------------------------------------------
  // Slot number badges
  // ---------------------------------------------------------------------------

  it.each([
    ["01", 0],
    ["02", 1],
    ["06", 5],
  ])("slot %s badge is rendered", (badge) => {
    const pokemon = Array.from({ length: 6 }, (_, i) =>
      i < 3 ? makePokemon("Garchomp") : null
    ) as (Tables<"pokemon"> | null)[];
    render(
      <AttackerChipStrip pokemon={pokemon} activeIdx={0} onPick={jest.fn()} />
    );
    expect(screen.getByText(badge)).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Active state
  // ---------------------------------------------------------------------------

  it("active chip has aria-pressed=true", () => {
    const pokemon = [makePokemon("Garchomp"), null, null, null, null, null];
    render(
      <AttackerChipStrip pokemon={pokemon} activeIdx={0} onPick={jest.fn()} />
    );
    const buttons = screen.getAllByRole("button");
    expect(buttons[0]).toHaveAttribute("aria-pressed", "true");
  });

  it("inactive chips have aria-pressed=false", () => {
    const pokemon = [
      makePokemon("Garchomp"),
      makePokemon("Incineroar"),
      null,
      null,
      null,
      null,
    ];
    render(
      <AttackerChipStrip pokemon={pokemon} activeIdx={0} onPick={jest.fn()} />
    );
    const buttons = screen.getAllByRole("button");
    expect(buttons[1]).toHaveAttribute("aria-pressed", "false");
  });

  // ---------------------------------------------------------------------------
  // Click interaction
  // ---------------------------------------------------------------------------

  it("clicking a filled chip calls onPick with the slot index", async () => {
    const user = userEvent.setup();
    const onPick = jest.fn();
    const pokemon = [
      makePokemon("Garchomp"),
      makePokemon("Incineroar"),
      null,
      null,
      null,
      null,
    ];
    render(
      <AttackerChipStrip pokemon={pokemon} activeIdx={0} onPick={onPick} />
    );
    const buttons = screen.getAllByRole("button");
    await user.click(buttons[1]!);
    expect(onPick).toHaveBeenCalledWith(1);
  });

  it("clicking the active chip still calls onPick", async () => {
    const user = userEvent.setup();
    const onPick = jest.fn();
    const pokemon = [makePokemon("Garchomp"), null, null, null, null, null];
    render(
      <AttackerChipStrip pokemon={pokemon} activeIdx={0} onPick={onPick} />
    );
    const buttons = screen.getAllByRole("button");
    await user.click(buttons[0]!);
    expect(onPick).toHaveBeenCalledWith(0);
  });

  // ---------------------------------------------------------------------------
  // Empty / null slots
  // ---------------------------------------------------------------------------

  it("null slots render a disabled button", () => {
    const pokemon: (Tables<"pokemon"> | null)[] = [null, null, null, null, null, null];
    render(
      <AttackerChipStrip pokemon={pokemon} activeIdx={0} onPick={jest.fn()} />
    );
    const buttons = screen.getAllByRole("button");
    for (const button of buttons) {
      expect(button).toBeDisabled();
    }
  });

  it("clicking a null slot does NOT call onPick (button is disabled)", async () => {
    const user = userEvent.setup();
    const onPick = jest.fn();
    const pokemon: (Tables<"pokemon"> | null)[] = [null, null, null, null, null, null];
    render(
      <AttackerChipStrip pokemon={pokemon} activeIdx={0} onPick={onPick} />
    );
    const buttons = screen.getAllByRole("button");
    // userEvent respects the disabled attribute
    await user.click(buttons[0]!);
    expect(onPick).not.toHaveBeenCalled();
  });

  it("empty slots render a — placeholder text", () => {
    const pokemon: (Tables<"pokemon"> | null)[] = [null, null, null, null, null, null];
    render(
      <AttackerChipStrip pokemon={pokemon} activeIdx={0} onPick={jest.fn()} />
    );
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBe(6);
  });
});
