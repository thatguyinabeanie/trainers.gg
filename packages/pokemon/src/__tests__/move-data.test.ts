import { getMoveType, getMoveCategory, getMoveBP } from "../move-data";

describe("getMoveType", () => {
  it("returns the type of a known move", () => {
    expect(getMoveType("Thunderbolt")).toBe("Electric");
  });

  it("returns the correct type for a Fire-type move", () => {
    expect(getMoveType("Flamethrower")).toBe("Fire");
  });

  it("returns the correct type for a Ground-type move", () => {
    expect(getMoveType("Earthquake")).toBe("Ground");
  });

  it("returns null for an unknown move", () => {
    expect(getMoveType("NotARealMove")).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(getMoveType("")).toBeNull();
  });

  it.each<[string, string]>([
    ["Protect", "Normal"],
    ["Fake Out", "Normal"],
    ["Ice Beam", "Ice"],
    ["Dark Pulse", "Dark"],
  ])("returns correct type for %s", (move, expectedType) => {
    expect(getMoveType(move)).toBe(expectedType);
  });
});

describe("getMoveCategory", () => {
  it("returns Special for Thunderbolt", () => {
    expect(getMoveCategory("Thunderbolt")).toBe("Special");
  });

  it("returns Physical for Earthquake", () => {
    expect(getMoveCategory("Earthquake")).toBe("Physical");
  });

  it("returns Status for Protect", () => {
    expect(getMoveCategory("Protect")).toBe("Status");
  });

  it("returns null for an unknown move", () => {
    expect(getMoveCategory("NotARealMove")).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(getMoveCategory("")).toBeNull();
  });

  it.each<[string, string]>([
    ["Fake Out", "Physical"],
    ["Ice Beam", "Special"],
    ["Flamethrower", "Special"],
    ["Close Combat", "Physical"],
    ["Tailwind", "Status"],
    ["Follow Me", "Status"],
  ])("returns correct category for %s", (move, expectedCategory) => {
    expect(getMoveCategory(move)).toBe(expectedCategory);
  });
});

describe("getMoveBP", () => {
  it("returns base power for Thunderbolt", () => {
    // Thunderbolt has base power 90 in gen9
    expect(getMoveBP("Thunderbolt")).toBe(90);
  });

  it("returns base power for Earthquake (100)", () => {
    expect(getMoveBP("Earthquake")).toBe(100);
  });

  it("returns null for Protect (status move with no base power)", () => {
    expect(getMoveBP("Protect")).toBeNull();
  });

  it("returns null for Tailwind (status move)", () => {
    expect(getMoveBP("Tailwind")).toBeNull();
  });

  it("returns null for an unknown move", () => {
    expect(getMoveBP("NotARealMove")).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(getMoveBP("")).toBeNull();
  });

  it.each<[string, number]>([
    ["Flamethrower", 90],
    ["Ice Beam", 90],
    ["Close Combat", 120],
    ["Fake Out", 40],
  ])("returns correct base power for %s", (move, expectedBP) => {
    expect(getMoveBP(move)).toBe(expectedBP);
  });
});
