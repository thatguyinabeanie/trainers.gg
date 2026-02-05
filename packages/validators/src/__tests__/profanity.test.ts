import {
  containsProfanity,
  getProfanityMatches,
  censorProfanity,
  PROFANITY_ERROR_MESSAGE,
} from "../profanity";

describe("profanity filtering", () => {
  describe("containsProfanity", () => {
    it("should return false for clean text", () => {
      expect(containsProfanity("hello world")).toBe(false);
      expect(containsProfanity("Pokemon trainer")).toBe(false);
      expect(containsProfanity("good game well played")).toBe(false);
      expect(containsProfanity("Pikachu is awesome")).toBe(false);
      expect(containsProfanity("123456789")).toBe(false);
    });

    it("should return false for empty strings", () => {
      expect(containsProfanity("")).toBe(false);
      expect(containsProfanity("   ")).toBe(false);
    });

    it("should detect obvious profanity", () => {
      // Using actual test words that are in the profanity database
      // The obscenity library will detect these
      expect(containsProfanity("fuck")).toBe(true);
      expect(containsProfanity("shit")).toBe(true);
      expect(containsProfanity("bitch")).toBe(true);
    });

    it("should handle mixed case", () => {
      expect(containsProfanity("FUCK")).toBe(true);
      expect(containsProfanity("Shit")).toBe(true);
    });

    it("should handle profanity in context", () => {
      expect(containsProfanity("hello fuck world")).toBe(true);
      expect(containsProfanity("what the fuck")).toBe(true);
    });

    it("should detect leetspeak obfuscation", () => {
      // obscenity library handles leetspeak transformations
      // We test with patterns it should detect
      expect(containsProfanity("a$$")).toBe(true);
      expect(containsProfanity("b1tch")).toBe(true);
    });

    it("should not flag false positives from innocent words", () => {
      // The Scunthorpe problem - innocent words that contain profanity substrings
      // obscenity library is designed to minimize these false positives
      expect(containsProfanity("Scunthorpe")).toBe(false);
      expect(containsProfanity("class")).toBe(false);
      expect(containsProfanity("assist")).toBe(false);
      expect(containsProfanity("assessment")).toBe(false);
    });

    it("should handle Pokemon-related text", () => {
      expect(containsProfanity("Cofagrigus")).toBe(false);
      expect(containsProfanity("Sharpedo")).toBe(false);
      expect(containsProfanity("Slowpoke")).toBe(false);
      expect(containsProfanity("Jigglypuff")).toBe(false);
    });

    it("should handle usernames", () => {
      expect(containsProfanity("pokemonmaster")).toBe(false);
      expect(containsProfanity("trainer_123")).toBe(false);
      expect(containsProfanity("pikachu_fan")).toBe(false);
    });
  });

  describe("getProfanityMatches", () => {
    it("should return empty array for clean text", () => {
      const matches = getProfanityMatches("hello world");
      expect(matches).toEqual([]);
    });

    it("should return empty array for empty strings", () => {
      const matches = getProfanityMatches("");
      expect(matches).toEqual([]);
    });

    it("should return match information for profanity", () => {
      const matches = getProfanityMatches("fuck");
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0]).toHaveProperty("startIndex");
      expect(matches[0]).toHaveProperty("endIndex");
    });

    it("should detect multiple profanity instances", () => {
      const matches = getProfanityMatches("fuck and shit");
      expect(matches.length).toBeGreaterThan(1);
    });
  });

  describe("censorProfanity", () => {
    it("should return clean text unchanged", () => {
      expect(censorProfanity("hello world")).toBe("hello world");
      expect(censorProfanity("Pokemon trainer")).toBe("Pokemon trainer");
    });

    it("should return empty strings unchanged", () => {
      expect(censorProfanity("")).toBe("");
      expect(censorProfanity("   ")).toBe("   ");
    });

    it("should censor profanity with asterisks", () => {
      const censored = censorProfanity("fuck");
      expect(censored).toContain("*");
      expect(censored).not.toContain("fuck");
    });

    it("should censor profanity in context", () => {
      const input = "hello fuck world";
      const censored = censorProfanity(input);
      expect(censored).toContain("hello");
      expect(censored).toContain("world");
      expect(censored).toContain("*");
    });

    it("should censor multiple profanity instances", () => {
      const input = "fuck and shit";
      const censored = censorProfanity(input);
      expect(censored).toContain("and");
      expect(censored).toContain("*");
    });

    it("should preserve non-profane parts of text", () => {
      const input = "good game fuck";
      const censored = censorProfanity(input);
      expect(censored).toContain("good game");
    });
  });

  describe("PROFANITY_ERROR_MESSAGE", () => {
    it("should be a non-empty string", () => {
      expect(PROFANITY_ERROR_MESSAGE).toBeTruthy();
      expect(typeof PROFANITY_ERROR_MESSAGE).toBe("string");
      expect(PROFANITY_ERROR_MESSAGE.length).toBeGreaterThan(0);
    });

    it("should not contain specific profanity examples", () => {
      // Error message should be generic, not include examples
      expect(PROFANITY_ERROR_MESSAGE.toLowerCase()).not.toContain("fuck");
      expect(PROFANITY_ERROR_MESSAGE.toLowerCase()).not.toContain("shit");
    });

    it("should mention inappropriate content", () => {
      expect(PROFANITY_ERROR_MESSAGE.toLowerCase()).toContain("inappropriate");
    });
  });

  describe("edge cases", () => {
    it("should handle very long strings", () => {
      const longClean = "hello ".repeat(1000);
      expect(containsProfanity(longClean)).toBe(false);
    });

    it("should handle strings with special characters", () => {
      expect(containsProfanity("!@#$%^&*()")).toBe(false);
      expect(containsProfanity("pokemon!!!")).toBe(false);
    });

    it("should handle strings with numbers", () => {
      expect(containsProfanity("1234567890")).toBe(false);
      expect(containsProfanity("player123")).toBe(false);
    });

    it("should handle unicode characters", () => {
      expect(containsProfanity("ポケモン")).toBe(false);
      expect(containsProfanity("宝可梦")).toBe(false);
      expect(containsProfanity("포켓몬")).toBe(false);
    });

    it("should handle mixed alphanumeric and special chars", () => {
      expect(containsProfanity("player_123-xyz")).toBe(false);
      expect(containsProfanity("team-alpha")).toBe(false);
    });
  });

  describe("performance", () => {
    it("should handle multiple checks efficiently", () => {
      const testStrings = [
        "hello world",
        "pokemon trainer",
        "good game",
        "well played",
        "trainer 123",
      ];

      const start = Date.now();
      testStrings.forEach((str) => {
        containsProfanity(str);
      });
      const duration = Date.now() - start;

      // Should complete quickly (within 100ms for 5 checks)
      expect(duration).toBeLessThan(100);
    });
  });
});
