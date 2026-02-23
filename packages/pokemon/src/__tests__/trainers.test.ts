import { FEATURED_TRAINERS, getTrainerSpriteUrl } from "../trainers";

describe("trainer sprites", () => {
  describe("FEATURED_TRAINERS", () => {
    it("is a non-empty array", () => {
      expect(FEATURED_TRAINERS.length).toBeGreaterThan(0);
    });

    it("each entry has name and filename", () => {
      for (const trainer of FEATURED_TRAINERS) {
        expect(typeof trainer.name).toBe("string");
        expect(trainer.name.length).toBeGreaterThan(0);
        expect(typeof trainer.filename).toBe("string");
        expect(trainer.filename.length).toBeGreaterThan(0);
      }
    });

    it.each(["Cynthia", "Red", "Brock", "Misty"])("includes %s", (name) => {
      expect(FEATURED_TRAINERS.some((t) => t.name === name)).toBe(true);
    });

    it("has no duplicate filenames", () => {
      const filenames = FEATURED_TRAINERS.map((t) => t.filename);
      expect(new Set(filenames).size).toBe(filenames.length);
    });
  });

  describe("getTrainerSpriteUrl", () => {
    it("returns a Showdown CDN URL", () => {
      const url = getTrainerSpriteUrl("cynthia");
      expect(url).toBe(
        "https://play.pokemonshowdown.com/sprites/trainers/cynthia.png"
      );
    });
  });
});
