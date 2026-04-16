import { describe, it, expect } from "@jest/globals";

import { COMPETITIVE_MOVES } from "../competitive-moves";

describe("COMPETITIVE_MOVES", () => {
  it("is a Set", () => {
    expect(COMPETITIVE_MOVES).toBeInstanceOf(Set);
  });

  it("contains priority moves", () => {
    expect(COMPETITIVE_MOVES.has("Fake Out")).toBe(true);
    expect(COMPETITIVE_MOVES.has("Aqua Jet")).toBe(true);
    expect(COMPETITIVE_MOVES.has("Sucker Punch")).toBe(true);
    expect(COMPETITIVE_MOVES.has("Extreme Speed")).toBe(true);
    expect(COMPETITIVE_MOVES.has("Ice Shard")).toBe(true);
    expect(COMPETITIVE_MOVES.has("Mach Punch")).toBe(true);
    expect(COMPETITIVE_MOVES.has("Grassy Glide")).toBe(true);
    expect(COMPETITIVE_MOVES.has("Quick Attack")).toBe(true);
  });

  it("contains speed control moves", () => {
    expect(COMPETITIVE_MOVES.has("Tailwind")).toBe(true);
    expect(COMPETITIVE_MOVES.has("Trick Room")).toBe(true);
    expect(COMPETITIVE_MOVES.has("Icy Wind")).toBe(true);
    expect(COMPETITIVE_MOVES.has("Electroweb")).toBe(true);
    expect(COMPETITIVE_MOVES.has("Scary Face")).toBe(true);
  });

  it("contains redirection and support moves", () => {
    expect(COMPETITIVE_MOVES.has("Follow Me")).toBe(true);
    expect(COMPETITIVE_MOVES.has("Rage Powder")).toBe(true);
    expect(COMPETITIVE_MOVES.has("Ally Switch")).toBe(true);
    expect(COMPETITIVE_MOVES.has("Helping Hand")).toBe(true);
  });

  it("contains status moves", () => {
    expect(COMPETITIVE_MOVES.has("Spore")).toBe(true);
    expect(COMPETITIVE_MOVES.has("Will-O-Wisp")).toBe(true);
    expect(COMPETITIVE_MOVES.has("Thunder Wave")).toBe(true);
    expect(COMPETITIVE_MOVES.has("Taunt")).toBe(true);
    expect(COMPETITIVE_MOVES.has("Encore")).toBe(true);
  });

  it("contains pivoting moves", () => {
    expect(COMPETITIVE_MOVES.has("U-turn")).toBe(true);
    expect(COMPETITIVE_MOVES.has("Volt Switch")).toBe(true);
    expect(COMPETITIVE_MOVES.has("Flip Turn")).toBe(true);
    expect(COMPETITIVE_MOVES.has("Parting Shot")).toBe(true);
  });

  it("contains protection moves", () => {
    expect(COMPETITIVE_MOVES.has("Protect")).toBe(true);
    expect(COMPETITIVE_MOVES.has("Detect")).toBe(true);
    expect(COMPETITIVE_MOVES.has("Wide Guard")).toBe(true);
    expect(COMPETITIVE_MOVES.has("Quick Guard")).toBe(true);
    expect(COMPETITIVE_MOVES.has("Spiky Shield")).toBe(true);
    expect(COMPETITIVE_MOVES.has("King's Shield")).toBe(true);
  });

  it("contains utility moves", () => {
    expect(COMPETITIVE_MOVES.has("Knock Off")).toBe(true);
    expect(COMPETITIVE_MOVES.has("Trick")).toBe(true);
    expect(COMPETITIVE_MOVES.has("Switcheroo")).toBe(true);
    expect(COMPETITIVE_MOVES.has("Haze")).toBe(true);
    expect(COMPETITIVE_MOVES.has("Clear Smog")).toBe(true);
  });

  it("contains weather-setting moves", () => {
    expect(COMPETITIVE_MOVES.has("Rain Dance")).toBe(true);
    expect(COMPETITIVE_MOVES.has("Sunny Day")).toBe(true);
    expect(COMPETITIVE_MOVES.has("Sandstorm")).toBe(true);
    expect(COMPETITIVE_MOVES.has("Snowscape")).toBe(true);
  });

  it("contains terrain-setting moves", () => {
    expect(COMPETITIVE_MOVES.has("Electric Terrain")).toBe(true);
    expect(COMPETITIVE_MOVES.has("Grassy Terrain")).toBe(true);
    expect(COMPETITIVE_MOVES.has("Psychic Terrain")).toBe(true);
    expect(COMPETITIVE_MOVES.has("Misty Terrain")).toBe(true);
  });

  it("contains setup moves", () => {
    expect(COMPETITIVE_MOVES.has("Swords Dance")).toBe(true);
    expect(COMPETITIVE_MOVES.has("Nasty Plot")).toBe(true);
    expect(COMPETITIVE_MOVES.has("Calm Mind")).toBe(true);
    expect(COMPETITIVE_MOVES.has("Dragon Dance")).toBe(true);
    expect(COMPETITIVE_MOVES.has("Quiver Dance")).toBe(true);
  });

  it("contains spread moves", () => {
    expect(COMPETITIVE_MOVES.has("Earthquake")).toBe(true);
    expect(COMPETITIVE_MOVES.has("Rock Slide")).toBe(true);
    expect(COMPETITIVE_MOVES.has("Dazzling Gleam")).toBe(true);
    expect(COMPETITIVE_MOVES.has("Heat Wave")).toBe(true);
    expect(COMPETITIVE_MOVES.has("Muddy Water")).toBe(true);
    expect(COMPETITIVE_MOVES.has("Discharge")).toBe(true);
    expect(COMPETITIVE_MOVES.has("Blizzard")).toBe(true);
    expect(COMPETITIVE_MOVES.has("Hyper Voice")).toBe(true);
    expect(COMPETITIVE_MOVES.has("Bleakwind Storm")).toBe(true);
    expect(COMPETITIVE_MOVES.has("Lava Plume")).toBe(true);
    expect(COMPETITIVE_MOVES.has("Sludge Wave")).toBe(true);
    expect(COMPETITIVE_MOVES.has("Surf")).toBe(true);
    expect(COMPETITIVE_MOVES.has("Bulldoze")).toBe(true);
  });

  it("does not contain non-competitive moves", () => {
    expect(COMPETITIVE_MOVES.has("Splash")).toBe(false);
    expect(COMPETITIVE_MOVES.has("Tackle")).toBe(false);
    expect(COMPETITIVE_MOVES.has("")).toBe(false);
    expect(COMPETITIVE_MOVES.has("NotAMove")).toBe(false);
  });

  it.each([
    "Fake Out",
    "Protect",
    "Tailwind",
    "Trick Room",
    "Follow Me",
    "Spore",
    "Earthquake",
    "Knock Off",
    "U-turn",
    "Swords Dance",
  ])("contains the key competitive move: %s", (move) => {
    expect(COMPETITIVE_MOVES.has(move)).toBe(true);
  });

  it("has no duplicate entries (Set guarantees uniqueness)", () => {
    // Converting to array and back to Set should yield same size
    const asArray = Array.from(COMPETITIVE_MOVES);
    const deduped = new Set(asArray);
    expect(deduped.size).toBe(COMPETITIVE_MOVES.size);
  });

  it("has a reasonable number of entries covering major VGC categories", () => {
    // 8 priority + 5 speed control + 4 redirection + 5 status + 4 pivoting
    // + 6 protection + 5 utility + 4 weather + 4 terrain + 5 setup + 13 spread = 63
    expect(COMPETITIVE_MOVES.size).toBeGreaterThanOrEqual(50);
  });
});
