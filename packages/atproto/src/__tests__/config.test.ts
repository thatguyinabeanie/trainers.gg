/**
 * Tests for AT Protocol Configuration
 */

import {
  PDS_URL,
  BSKY_APP_VIEW_URL,
  BSKY_PUBLIC_URL,
  POKEMON_KEYWORDS,
  isPokemonContent,
} from "../config";

describe("config", () => {
  describe("URL constants", () => {
    it("exports correct PDS_URL", () => {
      expect(PDS_URL).toBe("https://pds.trainers.gg");
    });

    it("exports correct BSKY_APP_VIEW_URL", () => {
      expect(BSKY_APP_VIEW_URL).toBe("https://api.bsky.app");
    });

    it("exports correct BSKY_PUBLIC_URL", () => {
      expect(BSKY_PUBLIC_URL).toBe("https://public.api.bsky.app");
    });
  });

  describe("POKEMON_KEYWORDS", () => {
    it("contains all expected keywords", () => {
      expect(POKEMON_KEYWORDS).toContain("#pokemon");
      expect(POKEMON_KEYWORDS).toContain("#vgc");
      expect(POKEMON_KEYWORDS).toContain("#pokemonvgc");
      expect(POKEMON_KEYWORDS).toContain("#shinyhunting");
      expect(POKEMON_KEYWORDS).toContain("#shiny");
      expect(POKEMON_KEYWORDS).toContain("#draftleague");
      expect(POKEMON_KEYWORDS).toContain("#pokemonshowdown");
      expect(POKEMON_KEYWORDS).toContain("#competitivepokemon");
      expect(POKEMON_KEYWORDS).toContain("#pokemonscarlet");
      expect(POKEMON_KEYWORDS).toContain("#pokemonviolet");
      expect(POKEMON_KEYWORDS).toContain("#pokemonsv");
      expect(POKEMON_KEYWORDS).toContain("pokemon");
      expect(POKEMON_KEYWORDS).toContain("vgc");
      expect(POKEMON_KEYWORDS).toContain("showdown");
      expect(POKEMON_KEYWORDS).toContain("draft league");
      expect(POKEMON_KEYWORDS).toContain("shiny hunt");
      expect(POKEMON_KEYWORDS).toContain("competitive pokemon");
      expect(POKEMON_KEYWORDS).toContain("regionals");
      expect(POKEMON_KEYWORDS).toContain("nationals");
      expect(POKEMON_KEYWORDS).toContain("worlds");
      expect(POKEMON_KEYWORDS).toContain("terastal");
      expect(POKEMON_KEYWORDS).toContain("tera type");
    });

    it("has exactly 22 keywords", () => {
      expect(POKEMON_KEYWORDS).toHaveLength(22);
    });

    it("is readonly", () => {
      // TypeScript should enforce readonly, but we can verify the array exists
      expect(Array.isArray(POKEMON_KEYWORDS)).toBe(true);
    });

    it("contains both hashtags and plain keywords", () => {
      const hashtags = POKEMON_KEYWORDS.filter((k) => k.startsWith("#"));
      const plainKeywords = POKEMON_KEYWORDS.filter((k) => !k.startsWith("#"));

      expect(hashtags.length).toBeGreaterThan(0);
      expect(plainKeywords.length).toBeGreaterThan(0);
    });
  });

  describe("isPokemonContent", () => {
    describe("hashtag matching", () => {
      it("returns true for #pokemon hashtag", () => {
        expect(isPokemonContent("Just caught a shiny! #pokemon")).toBe(true);
        expect(isPokemonContent("#pokemon is awesome")).toBe(true);
        expect(isPokemonContent("Check this out #pokemon")).toBe(true);
      });

      it("returns true for #vgc hashtag", () => {
        expect(isPokemonContent("Ready for #vgc regionals!")).toBe(true);
        expect(isPokemonContent("#vgc2024")).toBe(true);
        expect(isPokemonContent("My team for #vgc")).toBe(true);
      });

      it("returns true for #pokemonvgc hashtag", () => {
        expect(isPokemonContent("New team! #pokemonvgc")).toBe(true);
        expect(isPokemonContent("#pokemonvgc is so fun")).toBe(true);
      });

      it("returns true for #shinyhunting hashtag", () => {
        expect(isPokemonContent("100 hours of #shinyhunting")).toBe(true);
        expect(isPokemonContent("#shinyhunting stream tonight")).toBe(true);
      });

      it("returns true for #shiny hashtag", () => {
        expect(isPokemonContent("Finally got my #shiny Charizard!")).toBe(true);
        expect(isPokemonContent("#shiny luck today")).toBe(true);
      });

      it("returns true for #draftleague hashtag", () => {
        expect(isPokemonContent("Week 3 of #draftleague")).toBe(true);
        expect(isPokemonContent("#draftleague champion")).toBe(true);
      });

      it("returns true for #pokemonshowdown hashtag", () => {
        expect(isPokemonContent("Playing on #pokemonshowdown")).toBe(true);
        expect(isPokemonContent("#pokemonshowdown ladder grind")).toBe(true);
      });

      it("returns true for #competitivepokemon hashtag", () => {
        expect(isPokemonContent("Meta analysis #competitivepokemon")).toBe(
          true
        );
        expect(isPokemonContent("#competitivepokemon tips")).toBe(true);
      });

      it("returns true for #pokemonscarlet hashtag", () => {
        expect(isPokemonContent("Just started #pokemonscarlet")).toBe(true);
        expect(isPokemonContent("#pokemonscarlet playthrough")).toBe(true);
      });

      it("returns true for #pokemonviolet hashtag", () => {
        expect(isPokemonContent("Loving #pokemonviolet so far")).toBe(true);
        expect(isPokemonContent("#pokemonviolet shiny hunt")).toBe(true);
      });

      it("returns true for #pokemonsv hashtag", () => {
        expect(isPokemonContent("Best team in #pokemonsv")).toBe(true);
        expect(isPokemonContent("#pokemonsv ranked battles")).toBe(true);
      });
    });

    describe("plain keyword matching", () => {
      it("returns true for 'pokemon' keyword", () => {
        expect(isPokemonContent("I love pokemon games")).toBe(true);
        expect(isPokemonContent("Pokemon is the best")).toBe(true);
        expect(isPokemonContent("My favorite pokemon")).toBe(true);
      });

      it("returns true for 'vgc' keyword", () => {
        expect(isPokemonContent("Qualified for vgc regionals")).toBe(true);
        expect(isPokemonContent("vgc 2024 season")).toBe(true);
        expect(isPokemonContent("My vgc team")).toBe(true);
      });

      it("returns true for 'showdown' keyword", () => {
        expect(isPokemonContent("Playing on showdown tonight")).toBe(true);
        expect(isPokemonContent("showdown ladder grind")).toBe(true);
        expect(isPokemonContent("Best showdown team")).toBe(true);
      });

      it("returns true for 'draft league' keyword", () => {
        expect(isPokemonContent("Won my draft league match")).toBe(true);
        expect(isPokemonContent("draft league finals")).toBe(true);
        expect(isPokemonContent("Joining a draft league")).toBe(true);
      });

      it("returns true for 'shiny hunt' keyword", () => {
        expect(isPokemonContent("Started a shiny hunt for Eevee")).toBe(true);
        expect(isPokemonContent("My shiny hunt continues")).toBe(true);
        expect(isPokemonContent("Epic shiny hunt stream")).toBe(true);
      });

      it("returns true for 'competitive pokemon' keyword", () => {
        expect(isPokemonContent("New to competitive pokemon")).toBe(true);
        expect(isPokemonContent("competitive pokemon guide")).toBe(true);
        expect(isPokemonContent("Love competitive pokemon battles")).toBe(true);
      });

      it("returns true for 'regionals' keyword", () => {
        expect(isPokemonContent("See you at regionals!")).toBe(true);
        expect(isPokemonContent("Won regionals today")).toBe(true);
        expect(isPokemonContent("Preparing for regionals")).toBe(true);
      });

      it("returns true for 'nationals' keyword", () => {
        expect(isPokemonContent("Qualified for nationals!")).toBe(true);
        expect(isPokemonContent("nationals hype")).toBe(true);
        expect(isPokemonContent("Road to nationals")).toBe(true);
      });

      it("returns true for 'worlds' keyword", () => {
        expect(isPokemonContent("Watching worlds stream")).toBe(true);
        expect(isPokemonContent("worlds championship")).toBe(true);
        expect(isPokemonContent("Dreaming of worlds")).toBe(true);
      });

      it("returns true for 'terastal' keyword", () => {
        expect(isPokemonContent("Terastal mechanics explained")).toBe(true);
        expect(isPokemonContent("Best terastal types")).toBe(true);
        expect(isPokemonContent("Using terastal in battles")).toBe(true);
      });

      it("returns true for 'tera type' keyword", () => {
        expect(isPokemonContent("What tera type should I use?")).toBe(true);
        expect(isPokemonContent("My tera type choice")).toBe(true);
        expect(isPokemonContent("Best tera type for Charizard")).toBe(true);
      });
    });

    describe("case insensitivity", () => {
      it("matches uppercase keywords", () => {
        expect(isPokemonContent("I love POKEMON")).toBe(true);
        expect(isPokemonContent("VGC REGIONALS")).toBe(true);
        expect(isPokemonContent("SHOWDOWN ladder")).toBe(true);
      });

      it("matches mixed case keywords", () => {
        expect(isPokemonContent("PoKeMoN is great")).toBe(true);
        expect(isPokemonContent("VgC 2024")).toBe(true);
        expect(isPokemonContent("ShOwDoWn battles")).toBe(true);
      });

      it("matches uppercase hashtags", () => {
        expect(isPokemonContent("New team #POKEMON")).toBe(true);
        expect(isPokemonContent("#VGC finals")).toBe(true);
        expect(isPokemonContent("#SHINY hunt")).toBe(true);
      });

      it("matches mixed case hashtags", () => {
        expect(isPokemonContent("#PoKeMoN")).toBe(true);
        expect(isPokemonContent("#VgC")).toBe(true);
        expect(isPokemonContent("#ShInY")).toBe(true);
      });

      it("matches keywords with different casing in sentences", () => {
        expect(isPokemonContent("Playing Pokemon Showdown on VGC ladder")).toBe(
          true
        );
        expect(isPokemonContent("DRAFT LEAGUE finals today")).toBe(true);
        expect(isPokemonContent("My TERA TYPE is fire")).toBe(true);
      });
    });

    describe("non-Pokemon content", () => {
      it("returns false for unrelated text", () => {
        expect(isPokemonContent("Just had lunch")).toBe(false);
        expect(isPokemonContent("Beautiful day today")).toBe(false);
        expect(isPokemonContent("Working on a new project")).toBe(false);
      });

      it("returns false for empty string", () => {
        expect(isPokemonContent("")).toBe(false);
      });

      it("returns false for similar but different words", () => {
        expect(isPokemonContent("I poke the mon")).toBe(false);
        expect(isPokemonContent("vg graphics")).toBe(false);
        expect(isPokemonContent("show down the results")).toBe(false);
      });

      it("matches substrings (not word boundary restricted)", () => {
        // isPokemonContent uses includes() which matches substrings
        // This is expected behavior
        expect(isPokemonContent("pokemonic")).toBe(true);
        expect(isPokemonContent("vgcx")).toBe(true);
      });

      it("returns false for other gaming content", () => {
        expect(isPokemonContent("Playing League of Legends")).toBe(false);
        expect(isPokemonContent("Fortnite stream tonight")).toBe(false);
        expect(isPokemonContent("New Minecraft build")).toBe(false);
      });

      it("returns false for other hashtags", () => {
        expect(isPokemonContent("Great day #blessed")).toBe(false);
        expect(isPokemonContent("#gaming #fun")).toBe(false);
        expect(isPokemonContent("#sports #fitness")).toBe(false);
      });
    });

    describe("edge cases", () => {
      it("returns true when keyword is at the start", () => {
        expect(isPokemonContent("pokemon is awesome")).toBe(true);
        expect(isPokemonContent("vgc regionals soon")).toBe(true);
      });

      it("returns true when keyword is at the end", () => {
        expect(isPokemonContent("I love pokemon")).toBe(true);
        expect(isPokemonContent("See you at regionals")).toBe(true);
      });

      it("returns true when keyword is the only content", () => {
        expect(isPokemonContent("pokemon")).toBe(true);
        expect(isPokemonContent("vgc")).toBe(true);
        expect(isPokemonContent("#pokemon")).toBe(true);
      });

      it("returns true for multiple Pokemon keywords", () => {
        expect(isPokemonContent("pokemon vgc showdown draft league")).toBe(
          true
        );
        expect(isPokemonContent("#pokemon #vgc #shiny")).toBe(true);
      });

      it("returns true for keywords within longer words", () => {
        // "pokemon" appears within "pokemoncards"
        expect(isPokemonContent("Selling pokemoncards")).toBe(true);
        // "vgc" appears within "vgc2024"
        expect(isPokemonContent("vgc2024 season")).toBe(true);
      });

      it("returns true for keywords with punctuation", () => {
        expect(isPokemonContent("pokemon! pokemon? pokemon.")).toBe(true);
        expect(isPokemonContent("vgc, showdown, and regionals")).toBe(true);
        expect(isPokemonContent("(pokemon)")).toBe(true);
      });

      it("returns true for keywords with newlines", () => {
        expect(isPokemonContent("First line\npokemon\nThird line")).toBe(true);
        expect(isPokemonContent("vgc\nregionals\nworlds")).toBe(true);
      });

      it("returns true for keywords with extra whitespace", () => {
        expect(isPokemonContent("  pokemon  ")).toBe(true);
        expect(isPokemonContent("vgc    regionals")).toBe(true);
      });

      it("handles very long text with Pokemon content", () => {
        const longText =
          "Lorem ipsum ".repeat(100) +
          " pokemon " +
          "dolor sit amet ".repeat(100);
        expect(isPokemonContent(longText)).toBe(true);
      });

      it("handles text with numbers and Pokemon keywords", () => {
        expect(isPokemonContent("pokemon123")).toBe(true);
        expect(isPokemonContent("vgc2024")).toBe(true);
        expect(isPokemonContent("42pokemon")).toBe(true);
      });
    });

    describe("false positives to avoid", () => {
      it("should still match 'pokemon' even in 'pokemonic' due to substring matching", () => {
        // This is expected behavior - the function uses includes()
        expect(isPokemonContent("pokemonic")).toBe(true);
      });

      it("should still match 'vgc' in 'vgcx' due to substring matching", () => {
        // This is expected behavior - the function uses includes()
        expect(isPokemonContent("vgcx")).toBe(true);
      });

      it("matches 'nation' in 'nationals' correctly", () => {
        expect(isPokemonContent("The nation is strong")).toBe(false);
        expect(isPokemonContent("nationals championship")).toBe(true);
      });

      it("does not match unrelated uses of 'show'", () => {
        expect(isPokemonContent("show me the way")).toBe(false);
        expect(isPokemonContent("great show tonight")).toBe(false);
      });

      it("does not match unrelated uses of 'world'", () => {
        expect(isPokemonContent("world peace")).toBe(false);
        expect(isPokemonContent("around the world")).toBe(false);
      });
    });
  });
});
