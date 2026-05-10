import { describe, it, expect } from "@jest/globals";
import { formatPlacement } from "../utils";

describe("formatPlacement", () => {
  it.each([
    [1, "1st"],
    [2, "2nd"],
    [3, "3rd"],
    [4, "4th"],
    [5, "5th"],
  ])("basic ordinals: %i → %s", (rank, expected) => {
    expect(formatPlacement(rank)).toBe(expected);
  });

  it.each([
    [11, "11th"],
    [12, "12th"],
    [13, "13th"],
  ])("teens: %i → %s", (rank, expected) => {
    expect(formatPlacement(rank)).toBe(expected);
  });

  it.each([
    [21, "21st"],
    [22, "22nd"],
    [23, "23rd"],
    [24, "24th"],
  ])("higher numbers: %i → %s", (rank, expected) => {
    expect(formatPlacement(rank)).toBe(expected);
  });

  it.each([
    [111, "111th"],
    [112, "112th"],
    [113, "113th"],
  ])("hundreds teens: %i → %s", (rank, expected) => {
    expect(formatPlacement(rank)).toBe(expected);
  });

  it.each([
    [101, "101st"],
    [102, "102nd"],
    [103, "103rd"],
  ])("large numbers: %i → %s", (rank, expected) => {
    expect(formatPlacement(rank)).toBe(expected);
  });
});
