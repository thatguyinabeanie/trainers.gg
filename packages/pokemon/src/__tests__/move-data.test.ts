import {
  getMoveType,
  getMoveCategory,
  getMoveBP,
  getMoveData,
} from "../move-data";

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

describe("getMoveData", () => {
  it("returns null for an unknown move", () => {
    expect(getMoveData("NotARealMove")).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(getMoveData("")).toBeNull();
  });

  it("returns full move data for Thunderbolt", () => {
    const data = getMoveData("Thunderbolt");
    expect(data).not.toBeNull();
    expect(data?.name).toBe("Thunderbolt");
    expect(data?.type).toBe("Electric");
    expect(data?.category).toBe("Special");
    expect(data?.basePower).toBe(90);
    expect(data?.shortDesc).toBeTruthy();
  });

  it("returns full move data for Earthquake", () => {
    const data = getMoveData("Earthquake");
    expect(data).not.toBeNull();
    expect(data?.name).toBe("Earthquake");
    expect(data?.type).toBe("Ground");
    expect(data?.category).toBe("Physical");
    expect(data?.basePower).toBe(100);
  });

  it("returns full move data for Protect (status move)", () => {
    const data = getMoveData("Protect");
    expect(data).not.toBeNull();
    expect(data?.name).toBe("Protect");
    expect(data?.type).toBe("Normal");
    expect(data?.category).toBe("Status");
    expect(data?.basePower).toBe(0);
  });

  it("returns accuracy as a number for standard moves", () => {
    const data = getMoveData("Thunderbolt");
    expect(data).not.toBeNull();
    expect(typeof data?.accuracy === "number" || data?.accuracy === true).toBe(
      true
    );
  });

  it("returns accuracy as true for moves that always hit", () => {
    // Aerial Ace always hits
    const data = getMoveData("Aerial Ace");
    expect(data).not.toBeNull();
    expect(data?.accuracy).toBe(true);
  });

  it("returns a shortDesc string for every found move", () => {
    const data = getMoveData("Ice Beam");
    expect(data).not.toBeNull();
    expect(typeof data?.shortDesc).toBe("string");
  });

  it.each<[string, string, string, number]>([
    ["Flamethrower", "Fire", "Special", 90],
    ["Close Combat", "Fighting", "Physical", 120],
    ["Tailwind", "Flying", "Status", 0],
    ["Fake Out", "Normal", "Physical", 40],
    ["Dazzling Gleam", "Fairy", "Special", 80],
    ["Knock Off", "Dark", "Physical", 65],
  ])(
    "getMoveData(%s) returns type=%s, category=%s, basePower=%d",
    (move, type, category, basePower) => {
      const data = getMoveData(move);
      expect(data).not.toBeNull();
      expect(data?.type).toBe(type);
      expect(data?.category).toBe(category);
      expect(data?.basePower).toBe(basePower);
    }
  );
});
