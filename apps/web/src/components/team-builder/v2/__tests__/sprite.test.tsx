import { render, screen } from "@testing-library/react";
import React from "react";

// =============================================================================
// Mock next/image — JSDOM can't render it; we just want an <img> rendered.
// =============================================================================
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

// =============================================================================
// Mock getPokemonSprite so tests don't depend on real sprite data.
// =============================================================================
const mockGetPokemonSprite = jest.fn();

jest.mock("@trainers/pokemon/sprites", () => ({
  getPokemonSprite: (...args: unknown[]) => mockGetPokemonSprite(...args),
}));

import { Sprite } from "../sprite";
import { type PokemonType } from "@trainers/pokemon";

// =============================================================================
// Tests
// =============================================================================

describe("Sprite", () => {
  beforeEach(() => {
    mockGetPokemonSprite.mockReturnValue({
      url: "https://example.com/garchomp.png",
      w: 96,
      h: 96,
      pixelated: false,
    });
  });

  it("renders an img element", () => {
    render(<Sprite species="Garchomp" types={["Dragon" as PokemonType]} />);
    expect(screen.getByRole("img")).toBeInTheDocument();
  });

  it("img has the alt set to the species name", () => {
    render(<Sprite species="Garchomp" types={["Dragon" as PokemonType]} />);
    expect(screen.getByAltText("Garchomp")).toBeInTheDocument();
  });

  it("img src comes from getPokemonSprite", () => {
    render(<Sprite species="Pikachu" types={["Electric" as PokemonType]} />);
    expect(screen.getByRole("img")).toHaveAttribute(
      "src",
      "https://example.com/garchomp.png"
    );
  });

  it("calls getPokemonSprite with the species name", () => {
    render(<Sprite species="Garchomp" types={["Dragon" as PokemonType]} />);
    expect(mockGetPokemonSprite).toHaveBeenCalledWith(
      "Garchomp",
      expect.objectContaining({ shiny: false })
    );
  });

  it("passes shiny: false to getPokemonSprite (non-shiny variant)", () => {
    render(<Sprite species="Pikachu" types={["Electric" as PokemonType]} />);
    expect(mockGetPokemonSprite).toHaveBeenCalledWith(
      "Pikachu",
      expect.objectContaining({ shiny: false })
    );
  });

  it("renders correctly with an empty types array", () => {
    render(<Sprite species="Shedinja" types={[]} />);
    expect(screen.getByAltText("Shedinja")).toBeInTheDocument();
  });

  it("applies image-rendering-pixelated class when sprite.pixelated is true", () => {
    mockGetPokemonSprite.mockReturnValue({
      url: "https://example.com/pixel.png",
      w: 40,
      h: 40,
      pixelated: true,
    });
    render(<Sprite species="OldMon" types={["Normal" as PokemonType]} />);
    const img = screen.getByRole("img");
    expect(img.className).toContain("image-rendering-pixelated");
  });

  it("does NOT apply image-rendering-pixelated when sprite.pixelated is false", () => {
    render(<Sprite species="Garchomp" types={["Dragon" as PokemonType]} />);
    const img = screen.getByRole("img");
    expect(img.className).not.toContain("image-rendering-pixelated");
  });

  it("renders with default size 128 when size not provided", () => {
    render(<Sprite species="Garchomp" types={["Dragon" as PokemonType]} />);
    const wrapper = screen.getByRole("img").parentElement;
    expect(wrapper).toHaveStyle({ width: "128px", height: "128px" });
  });

  it("respects a custom size prop", () => {
    render(
      <Sprite species="Garchomp" types={["Dragon" as PokemonType]} size={64} />
    );
    const wrapper = screen.getByRole("img").parentElement;
    expect(wrapper).toHaveStyle({ width: "64px", height: "64px" });
  });
});
