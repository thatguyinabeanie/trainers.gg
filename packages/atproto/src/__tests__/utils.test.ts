/**
 * Tests for AT Protocol Utilities
 */

import {
  MAX_POST_LENGTH,
  getGraphemeLength,
  isPostTooLong,
  parseAtUri,
} from "../utils";

describe("utils", () => {
  describe("MAX_POST_LENGTH", () => {
    it("is set to 300", () => {
      expect(MAX_POST_LENGTH).toBe(300);
    });
  });

  describe("getGraphemeLength", () => {
    describe("basic ASCII text", () => {
      it("counts simple ASCII characters correctly", () => {
        expect(getGraphemeLength("Hello")).toBe(5);
        expect(getGraphemeLength("Pokemon")).toBe(7);
        expect(getGraphemeLength("trainers.gg")).toBe(11);
      });

      it("counts empty string as 0", () => {
        expect(getGraphemeLength("")).toBe(0);
      });

      it("counts spaces correctly", () => {
        expect(getGraphemeLength("a b c")).toBe(5);
        expect(getGraphemeLength("   ")).toBe(3);
      });

      it("counts newlines correctly", () => {
        expect(getGraphemeLength("line1\nline2")).toBe(11);
        expect(getGraphemeLength("a\nb\nc")).toBe(5);
      });

      it("counts special characters as individual graphemes", () => {
        expect(getGraphemeLength("!@#$%^&*()")).toBe(10);
        expect(getGraphemeLength("Hello, world!")).toBe(13);
      });
    });

    describe("emoji handling", () => {
      it("counts single emoji as 1 grapheme", () => {
        expect(getGraphemeLength("😀")).toBe(1);
        expect(getGraphemeLength("🎮")).toBe(1);
        expect(getGraphemeLength("⚡")).toBe(1);
      });

      it("counts multiple emoji correctly", () => {
        expect(getGraphemeLength("😀😀😀")).toBe(3);
        expect(getGraphemeLength("🎮⚡🔥")).toBe(3);
      });

      it("counts emoji with text correctly", () => {
        expect(getGraphemeLength("Hello 😀")).toBe(7);
        expect(getGraphemeLength("Pokemon 🎮⚡")).toBe(10);
      });

      it("counts multi-codepoint emoji as single graphemes", () => {
        // Family emoji (👨‍👩‍👧‍👦) is multiple codepoints but 1 grapheme
        expect(getGraphemeLength("👨‍👩‍👧‍👦")).toBe(1);
        // Flag emojis are 2 codepoints but 1 grapheme
        expect(getGraphemeLength("🇺🇸")).toBe(1);
        expect(getGraphemeLength("🇯🇵")).toBe(1);
      });

      it("counts emoji with skin tone modifiers as single graphemes", () => {
        expect(getGraphemeLength("👍🏻")).toBe(1); // thumbs up + light skin tone
        expect(getGraphemeLength("👍🏿")).toBe(1); // thumbs up + dark skin tone
        expect(getGraphemeLength("🙋🏽‍♀️")).toBe(1); // woman raising hand + medium skin tone
      });

      it("counts zero-width joiner sequences as single graphemes", () => {
        expect(getGraphemeLength("👨‍💻")).toBe(1); // man technologist
        expect(getGraphemeLength("👩‍🚀")).toBe(1); // woman astronaut
        expect(getGraphemeLength("🧑‍🎨")).toBe(1); // artist
      });
    });

    describe("Unicode characters", () => {
      it("counts accented characters as single graphemes", () => {
        expect(getGraphemeLength("café")).toBe(4);
        expect(getGraphemeLength("naïve")).toBe(5);
        expect(getGraphemeLength("résumé")).toBe(6);
      });

      it("counts combining diacritics correctly", () => {
        // e + combining acute accent
        expect(getGraphemeLength("e\u0301")).toBe(1);
        // a + combining tilde
        expect(getGraphemeLength("ã")).toBe(1);
      });

      it("counts non-Latin scripts correctly", () => {
        expect(getGraphemeLength("こんにちは")).toBe(5); // Japanese hiragana
        expect(getGraphemeLength("你好")).toBe(2); // Chinese
        expect(getGraphemeLength("안녕")).toBe(2); // Korean
        expect(getGraphemeLength("مرحبا")).toBe(5); // Arabic
      });

      it("counts symbols and special Unicode characters", () => {
        expect(getGraphemeLength("™®©")).toBe(3);
        expect(getGraphemeLength("←→↑↓")).toBe(4);
        expect(getGraphemeLength("♠♣♥♦")).toBe(4);
      });
    });

    describe("edge cases", () => {
      it("handles very long strings", () => {
        const longString = "a".repeat(1000);
        expect(getGraphemeLength(longString)).toBe(1000);
      });

      it("handles strings with only emoji", () => {
        const emojiString = "😀".repeat(50);
        expect(getGraphemeLength(emojiString)).toBe(50);
      });

      it("handles mixed content with emoji, text, and Unicode", () => {
        const mixed = "Hello 世界 👋 café!";
        // Actual count: H-e-l-l-o-space-世-界-space-👋-space-c-a-f-é-! = 16
        expect(getGraphemeLength(mixed)).toBe(16);
      });

      it("handles strings with consecutive newlines", () => {
        expect(getGraphemeLength("\n\n\n")).toBe(3);
        expect(getGraphemeLength("text\n\nmore")).toBe(10);
      });

      it("handles strings with tabs", () => {
        expect(getGraphemeLength("\t")).toBe(1);
        expect(getGraphemeLength("a\tb\tc")).toBe(5);
      });
    });

    describe("300 character boundary", () => {
      it("correctly counts exactly 300 ASCII characters", () => {
        const text = "a".repeat(300);
        expect(getGraphemeLength(text)).toBe(300);
      });

      it("correctly counts exactly 300 emoji", () => {
        const text = "😀".repeat(300);
        expect(getGraphemeLength(text)).toBe(300);
      });

      it("correctly counts 299 graphemes", () => {
        const text = "a".repeat(299);
        expect(getGraphemeLength(text)).toBe(299);
      });

      it("correctly counts 301 graphemes", () => {
        const text = "a".repeat(301);
        expect(getGraphemeLength(text)).toBe(301);
      });
    });
  });

  describe("isPostTooLong", () => {
    describe("posts within limit", () => {
      it("returns false for empty string", () => {
        expect(isPostTooLong("")).toBe(false);
      });

      it("returns false for exactly 300 characters", () => {
        const text = "a".repeat(300);
        expect(isPostTooLong(text)).toBe(false);
      });

      it("returns false for 299 characters", () => {
        const text = "a".repeat(299);
        expect(isPostTooLong(text)).toBe(false);
      });

      it("returns false for short posts", () => {
        expect(isPostTooLong("Hello, world!")).toBe(false);
        expect(isPostTooLong("This is a test post")).toBe(false);
      });

      it("returns false for 300 emoji", () => {
        const text = "😀".repeat(300);
        expect(isPostTooLong(text)).toBe(false);
      });
    });

    describe("posts exceeding limit", () => {
      it("returns true for 301 characters", () => {
        const text = "a".repeat(301);
        expect(isPostTooLong(text)).toBe(true);
      });

      it("returns true for 302 characters", () => {
        const text = "a".repeat(302);
        expect(isPostTooLong(text)).toBe(true);
      });

      it("returns true for very long posts", () => {
        const text = "a".repeat(1000);
        expect(isPostTooLong(text)).toBe(true);
      });

      it("returns true for 301 emoji", () => {
        const text = "😀".repeat(301);
        expect(isPostTooLong(text)).toBe(true);
      });
    });

    describe("mixed content at boundary", () => {
      it("returns false for 300 mixed graphemes (text + emoji)", () => {
        const text = "a".repeat(150) + "😀".repeat(150);
        expect(isPostTooLong(text)).toBe(false);
      });

      it("returns true for 301 mixed graphemes (text + emoji)", () => {
        const text = "a".repeat(151) + "😀".repeat(150);
        expect(isPostTooLong(text)).toBe(true);
      });

      it("handles complex emoji that count as single graphemes", () => {
        // 295 letters + 5 complex emoji = 300 total
        const text = "a".repeat(295) + "👨‍👩‍👧‍👦🇺🇸👍🏻👩‍🚀🧑‍🎨";
        expect(isPostTooLong(text)).toBe(false);
      });
    });
  });

  describe("parseAtUri", () => {
    describe("valid AT-URIs", () => {
      it("parses a valid post URI", () => {
        const uri = "at://did:plc:abc123/app.bsky.feed.post/xyz789";
        const result = parseAtUri(uri);

        expect(result).toEqual({
          did: "did:plc:abc123",
          collection: "app.bsky.feed.post",
          rkey: "xyz789",
        });
      });

      it("parses a valid profile URI", () => {
        const uri = "at://did:plc:user123/app.bsky.actor.profile/self";
        const result = parseAtUri(uri);

        expect(result).toEqual({
          did: "did:plc:user123",
          collection: "app.bsky.actor.profile",
          rkey: "self",
        });
      });

      it("parses a valid like URI", () => {
        const uri = "at://did:plc:xyz/app.bsky.feed.like/like123";
        const result = parseAtUri(uri);

        expect(result).toEqual({
          did: "did:plc:xyz",
          collection: "app.bsky.feed.like",
          rkey: "like123",
        });
      });

      it("parses a valid repost URI", () => {
        const uri = "at://did:plc:abc/app.bsky.feed.repost/repost456";
        const result = parseAtUri(uri);

        expect(result).toEqual({
          did: "did:plc:abc",
          collection: "app.bsky.feed.repost",
          rkey: "repost456",
        });
      });

      it("parses URIs with different DID formats", () => {
        // did:plc format
        const plcUri = "at://did:plc:abc123/app.bsky.feed.post/xyz";
        expect(parseAtUri(plcUri)?.did).toBe("did:plc:abc123");

        // did:web format
        const webUri = "at://did:web:example.com/app.bsky.feed.post/xyz";
        expect(parseAtUri(webUri)?.did).toBe("did:web:example.com");
      });

      it("parses URIs with complex rkeys", () => {
        const uri = "at://did:plc:abc/app.bsky.feed.post/3k2j4h5g6f7d8s9a";
        const result = parseAtUri(uri);

        expect(result?.rkey).toBe("3k2j4h5g6f7d8s9a");
      });

      it("parses URIs with long DIDs", () => {
        const longDid =
          "did:plc:abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnop";
        const uri = `at://${longDid}/app.bsky.feed.post/xyz`;
        const result = parseAtUri(uri);

        expect(result?.did).toBe(longDid);
      });
    });

    describe("invalid AT-URIs", () => {
      it("returns null for non-AT protocol URIs", () => {
        expect(parseAtUri("https://example.com/post/123")).toBeNull();
        expect(parseAtUri("http://example.com")).toBeNull();
        expect(parseAtUri("ftp://example.com")).toBeNull();
      });

      it("returns null for malformed AT-URIs", () => {
        expect(parseAtUri("at://")).toBeNull();
        expect(parseAtUri("at://did:plc:abc")).toBeNull();
        expect(parseAtUri("at://did:plc:abc/collection")).toBeNull();
      });

      it("returns null for AT-URIs with extra segments", () => {
        expect(
          parseAtUri("at://did:plc:abc/app.bsky.feed.post/xyz/extra")
        ).toBeNull();
        expect(
          parseAtUri("at://did:plc:abc/app.bsky.feed.post/xyz/extra/more")
        ).toBeNull();
      });

      it("returns null for AT-URIs missing protocol", () => {
        expect(parseAtUri("did:plc:abc/app.bsky.feed.post/xyz")).toBeNull();
        expect(parseAtUri("//did:plc:abc/app.bsky.feed.post/xyz")).toBeNull();
      });

      it("returns null for empty string", () => {
        expect(parseAtUri("")).toBeNull();
      });

      it("returns null for URIs with wrong protocol", () => {
        expect(parseAtUri("at:/did:plc:abc/app.bsky.feed.post/xyz")).toBeNull();
        expect(
          parseAtUri("at:///did:plc:abc/app.bsky.feed.post/xyz")
        ).toBeNull();
      });

      it("returns null for URIs with missing DID", () => {
        expect(parseAtUri("at:///app.bsky.feed.post/xyz")).toBeNull();
      });

      it("returns null for URIs with missing collection", () => {
        expect(parseAtUri("at://did:plc:abc//xyz")).toBeNull();
      });

      it("returns null for URIs with missing rkey", () => {
        expect(parseAtUri("at://did:plc:abc/app.bsky.feed.post/")).toBeNull();
      });

      it("returns null for URIs with only slashes after protocol", () => {
        expect(parseAtUri("at://////")).toBeNull();
      });

      it("accepts URIs with special characters (regex allows them)", () => {
        // The regex pattern [^/]+ allows any non-slash characters
        // This is expected behavior - parseAtUri does basic structural validation only
        const result1 = parseAtUri(
          "at://did:plc:abc?query=1/app.bsky.feed.post/xyz"
        );
        expect(result1).not.toBeNull();
        expect(result1?.did).toBe("did:plc:abc?query=1");

        const result2 = parseAtUri(
          "at://did:plc:abc/app.bsky.feed.post/xyz#fragment"
        );
        expect(result2).not.toBeNull();
        expect(result2?.rkey).toBe("xyz#fragment");
      });
    });

    describe("edge cases", () => {
      it("handles URIs with numbers in all segments", () => {
        const uri = "at://did:plc:123/app.bsky.456.789/012";
        const result = parseAtUri(uri);

        expect(result).toEqual({
          did: "did:plc:123",
          collection: "app.bsky.456.789",
          rkey: "012",
        });
      });

      it("handles URIs with hyphens and underscores", () => {
        const uri = "at://did:plc:abc-123/app.bsky.feed_post/xyz-789";
        const result = parseAtUri(uri);

        expect(result).toEqual({
          did: "did:plc:abc-123",
          collection: "app.bsky.feed_post",
          rkey: "xyz-789",
        });
      });

      it("handles URIs with dots in DID", () => {
        const uri = "at://did:web:example.com/app.bsky.feed.post/xyz";
        const result = parseAtUri(uri);

        expect(result?.did).toBe("did:web:example.com");
      });

      it("returns non-null result for valid URIs (type guard)", () => {
        const uri = "at://did:plc:abc/app.bsky.feed.post/xyz";
        const result = parseAtUri(uri);

        if (result) {
          // TypeScript should know result is not null here
          expect(result.did).toBeDefined();
          expect(result.collection).toBeDefined();
          expect(result.rkey).toBeDefined();
        } else {
          throw new Error("Expected result to be non-null for valid URI");
        }
      });

      it("does not trim leading whitespace but accepts trailing whitespace", () => {
        // Leading whitespace breaks the at:// protocol match
        expect(
          parseAtUri(" at://did:plc:abc/app.bsky.feed.post/xyz ")
        ).toBeNull();
        expect(
          parseAtUri(" at://did:plc:abc/app.bsky.feed.post/xyz")
        ).toBeNull();

        // Trailing whitespace is captured by [^/]+ pattern
        const result = parseAtUri("at://did:plc:abc/app.bsky.feed.post/xyz ");
        expect(result).not.toBeNull();
        expect(result?.rkey).toBe("xyz ");
      });
    });
  });
});
