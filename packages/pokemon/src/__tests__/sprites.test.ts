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

describe("Champions-exclusive Mega sprite fallbacks", () => {
  it("returns Legends Z-A sprite URL for custom M-A Megas", () => {
    expect(getPokemonSprite("Dragonite-Mega").url).toBe(
      "https://www.serebii.net/legendsz-a/pokemon/149-m.png"
    );
    expect(getPokemonSprite("Starmie-Mega").url).toBe(
      "https://www.serebii.net/legendsz-a/pokemon/121-m.png"
    );
    expect(getPokemonSprite("Delphox-Mega").url).toBe(
      "https://www.serebii.net/legendsz-a/pokemon/655-m.png"
    );
  });

  it("returns Legends Z-A sprite URL for custom M-B Megas", () => {
    expect(getPokemonSprite("Raichu-Mega-X").url).toBe(
      "https://www.serebii.net/legendsz-a/pokemon/026-mx.png"
    );
    expect(getPokemonSprite("Staraptor-Mega").url).toBe(
      "https://www.serebii.net/legendsz-a/pokemon/398-m.png"
    );
    expect(getPokemonSprite("Falinks-Mega").url).toBe(
      "https://www.serebii.net/legendsz-a/pokemon/870-m.png"
    );
  });

  it("does NOT override official Gen 6/7 Megas", () => {
    expect(getPokemonSprite("Garchomp-Mega").url).not.toContain("serebii");
    expect(getPokemonSprite("Charizard-Mega-X").url).not.toContain("serebii");
  });

  it("returns non-pixelated sprite data for Champions Megas", () => {
    expect(getPokemonSprite("Dragonite-Mega").pixelated).toBe(false);
    expect(getPokemonSprite("Dragonite-Mega").w).toBe(96);
    expect(getPokemonSprite("Dragonite-Mega").h).toBe(96);
  });

  it("returns the override URL for a Champions Mega with no shiny option", () => {
    const overrideUrl = "https://www.serebii.net/legendsz-a/pokemon/149-m.png";
    expect(getPokemonSprite("Dragonite-Mega").url).toBe(overrideUrl);
    expect(getPokemonSprite("Dragonite-Mega", { shiny: false }).url).toBe(
      overrideUrl
    );
  });

  it("does NOT return the non-shiny override URL for a Champions Mega with shiny: true", () => {
    const nonShinyOverrideUrl =
      "https://www.serebii.net/legendsz-a/pokemon/149-m.png";
    const shinySprite = getPokemonSprite("Dragonite-Mega", { shiny: true });
    expect(shinySprite.url).not.toBe(nonShinyOverrideUrl);
    // Should fall through to Sprites.getPokemon, which produces a shiny URL
    expect(shinySprite.url).toContain("shiny");
  });
});
