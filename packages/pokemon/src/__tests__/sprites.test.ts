/**
 * @jest-environment node
 */

import { getPokemonSprite, type SpritePreference } from "../sprites";

describe("getPokemonSprite", () => {
  describe("sprite style preferences", () => {
    it("returns gen5 sprites by default", () => {
      const sprite = getPokemonSprite("pikachu");
      expect(sprite.url).toContain("/gen5/");
      expect(sprite.pixelated).toBe(true);
    });

    it("returns gen5 sprites when explicitly requested", () => {
      const sprite = getPokemonSprite("pikachu", { spriteStyle: "gen5" });
      expect(sprite.url).toContain("/gen5/");
      expect(sprite.url).toBe(
        "https://play.pokemonshowdown.com/sprites/gen5/pikachu.png"
      );
      expect(sprite.pixelated).toBe(true);
      expect(sprite.w).toBe(96);
      expect(sprite.h).toBe(96);
    });

    it("returns gen5ani sprites when requested", () => {
      const sprite = getPokemonSprite("pikachu", { spriteStyle: "gen5ani" });
      expect(sprite.url).toContain("/gen5ani/");
      expect(sprite.url).toBe(
        "https://play.pokemonshowdown.com/sprites/gen5ani/pikachu.gif"
      );
      expect(sprite.pixelated).toBe(true);
    });

    it("returns ani sprites when requested", () => {
      const sprite = getPokemonSprite("pikachu", { spriteStyle: "ani" });
      expect(sprite.url).toContain("/ani/");
      expect(sprite.url).toBe(
        "https://play.pokemonshowdown.com/sprites/ani/pikachu.gif"
      );
      expect(sprite.pixelated).toBe(false);
    });
  });

  describe("sprite data structure", () => {
    it("returns all required sprite data fields", () => {
      const sprite = getPokemonSprite("charizard");
      expect(sprite).toHaveProperty("url");
      expect(sprite).toHaveProperty("w");
      expect(sprite).toHaveProperty("h");
      expect(sprite).toHaveProperty("pixelated");
      expect(typeof sprite.url).toBe("string");
      expect(typeof sprite.w).toBe("number");
      expect(typeof sprite.h).toBe("number");
      expect(typeof sprite.pixelated).toBe("boolean");
    });
  });

  describe("Pokemon forms and variants", () => {
    it("handles Pokemon with forms correctly", () => {
      const ogerpon = getPokemonSprite("Ogerpon-Hearthflame");
      expect(ogerpon.url).toContain("ogerpon");

      const urshifu = getPokemonSprite("Urshifu-Rapid-Strike");
      expect(urshifu.url).toContain("urshifu");
    });

    it("handles shiny Pokemon", () => {
      const sprite = getPokemonSprite("mewtwo", { shiny: true });
      expect(sprite.url).toContain("shiny");
    });

    it("handles gendered Pokemon", () => {
      const maleSprite = getPokemonSprite("pikachu", { gender: "M" });
      expect(maleSprite.url).toBeTruthy();

      const femaleSprite = getPokemonSprite("pikachu", { gender: "F" });
      expect(femaleSprite.url).toBeTruthy();
    });
  });

  describe("combined options", () => {
    it("handles sprite style with shiny option", () => {
      const sprite = getPokemonSprite("charizard", {
        spriteStyle: "gen5ani",
        shiny: true,
      });
      expect(sprite.url).toContain("gen5ani");
      expect(sprite.url).toContain("shiny");
    });

    it("handles sprite style with gender option", () => {
      const sprite = getPokemonSprite("pikachu", {
        spriteStyle: "ani",
        gender: "F",
      });
      expect(sprite.url).toContain("/ani/");
    });

    it("handles all options together", () => {
      const sprite = getPokemonSprite("pikachu", {
        spriteStyle: "gen5ani",
        shiny: true,
        gender: "F",
      });
      expect(sprite.url).toContain("gen5ani");
      expect(sprite.url).toContain("shiny");
    });
  });

  describe("sprite preferences type safety", () => {
    it("accepts valid sprite preference values", () => {
      const preferences: SpritePreference[] = ["gen5", "gen5ani", "ani"];
      preferences.forEach((pref) => {
        const sprite = getPokemonSprite("pikachu", { spriteStyle: pref });
        expect(sprite.url).toBeTruthy();
      });
    });
  });
});
