import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

// =============================================================================
// Mocks
// =============================================================================

const mockGetFormsForSpecies = jest.fn();
const mockGetCanonicalBaseSpecies = jest.fn();
const mockGetMegaStoneForSpecies = jest.fn();

jest.mock("@trainers/pokemon", () => ({
  getFormsForSpecies: (...args: unknown[]) => mockGetFormsForSpecies(...args),
  getCanonicalBaseSpecies: (...args: unknown[]) => mockGetCanonicalBaseSpecies(...args),
  getMegaStoneForSpecies: (...args: unknown[]) => mockGetMegaStoneForSpecies(...args),
}));

import { FormChips } from "../form-chips";

// =============================================================================
// Tests
// =============================================================================

describe("FormChips", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns null when species has only one form", () => {
    mockGetFormsForSpecies.mockReturnValue(["Garchomp"]);
    const { container } = render(
      <FormChips currentSpecies="Garchomp" currentItem={null} onPick={jest.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders chips for alt forms", () => {
    mockGetFormsForSpecies.mockReturnValue(["Charizard", "Charizard-Mega-X", "Charizard-Mega-Y"]);
    mockGetCanonicalBaseSpecies.mockReturnValue("Charizard");
    mockGetMegaStoneForSpecies.mockImplementation((form: string) => {
      if (form === "Charizard-Mega-X") return "Charizardite X";
      if (form === "Charizard-Mega-Y") return "Charizardite Y";
      return null;
    });

    render(
      <FormChips currentSpecies="Charizard" currentItem={null} onPick={jest.fn()} />
    );
    expect(screen.getByText("Mega X")).toBeInTheDocument();
    expect(screen.getByText("Mega Y")).toBeInTheDocument();
  });

  it("disables mega chip when item does not match", () => {
    mockGetFormsForSpecies.mockReturnValue(["Charizard", "Charizard-Mega-X"]);
    mockGetCanonicalBaseSpecies.mockReturnValue("Charizard");
    mockGetMegaStoneForSpecies.mockReturnValue("Charizardite X");

    render(
      <FormChips currentSpecies="Charizard" currentItem={null} onPick={jest.fn()} />
    );
    const chip = screen.getByText("Mega X");
    expect(chip.closest("button")).toBeDisabled();
  });

  it("enables mega chip when correct item is held", () => {
    mockGetFormsForSpecies.mockReturnValue(["Charizard", "Charizard-Mega-X"]);
    mockGetCanonicalBaseSpecies.mockReturnValue("Charizard");
    mockGetMegaStoneForSpecies.mockReturnValue("Charizardite X");

    render(
      <FormChips currentSpecies="Charizard" currentItem="Charizardite X" onPick={jest.fn()} />
    );
    const chip = screen.getByText("Mega X");
    expect(chip.closest("button")).not.toBeDisabled();
  });

  it("calls onPick with base form when clicking active chip (toggle off)", () => {
    mockGetFormsForSpecies.mockReturnValue(["Charizard", "Charizard-Mega-X"]);
    mockGetCanonicalBaseSpecies.mockReturnValue("Charizard");
    mockGetMegaStoneForSpecies.mockReturnValue("Charizardite X");

    const onPick = jest.fn();
    render(
      <FormChips currentSpecies="Charizard-Mega-X" currentItem="Charizardite X" onPick={onPick} />
    );
    fireEvent.click(screen.getByText("Mega X"));
    expect(onPick).toHaveBeenCalledWith("Charizard");
  });

  it("enables non-mega alt forms without item requirement", () => {
    mockGetFormsForSpecies.mockReturnValue(["Aegislash", "Aegislash-Blade"]);
    mockGetCanonicalBaseSpecies.mockReturnValue("Aegislash");
    mockGetMegaStoneForSpecies.mockReturnValue(null);

    render(
      <FormChips currentSpecies="Aegislash" currentItem={null} onPick={jest.fn()} />
    );
    const chip = screen.getByText("Blade");
    expect(chip.closest("button")).not.toBeDisabled();
  });
});
