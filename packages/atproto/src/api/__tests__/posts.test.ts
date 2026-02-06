/**
 * Tests for AT Protocol Posts API
 */

import { type Agent, RichText } from "@atproto/api";
import type { BlobRef } from "@atproto/api";
import {
  createPost,
  deletePost,
  uploadImage,
  MAX_POST_LENGTH,
  getGraphemeLength,
  isPostTooLong,
  parseAtUri,
} from "../posts";
import type { CreatePostOptions } from "../../types";

// Mock the agent module
jest.mock("../../agent", () => ({
  withErrorHandling: jest.fn((fn) => fn()),
}));

// Mock RichText
jest.mock("@atproto/api", () => {
  const actual = jest.requireActual("@atproto/api");
  return {
    ...actual,
    RichText: jest.fn().mockImplementation((opts) => ({
      text: opts.text,
      facets: [],
      detectFacets: jest.fn().mockResolvedValue(undefined),
    })),
  };
});

describe("posts API", () => {
  let mockAgent: jest.Mocked<Agent>;

  beforeEach(() => {
    // Create a mock agent with all required methods
    mockAgent = {
      post: jest.fn(),
      deletePost: jest.fn(),
      uploadBlob: jest.fn(),
    } as unknown as jest.Mocked<Agent>;

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe("createPost", () => {
    describe("basic post creation", () => {
      it("creates a simple text post", async () => {
        const mockResponse = {
          uri: "at://did:plc:abc123/app.bsky.feed.post/xyz789",
          cid: "bafyreib2rxk3rh6kzwq",
        };
        mockAgent.post.mockResolvedValue(mockResponse);

        const result = await createPost(mockAgent, "Hello Bluesky!");

        expect(result).toEqual({
          uri: mockResponse.uri,
          cid: mockResponse.cid,
        });

        expect(mockAgent.post).toHaveBeenCalledWith(
          expect.objectContaining({
            $type: "app.bsky.feed.post",
            text: "Hello Bluesky!",
            createdAt: expect.any(String),
          })
        );
      });

      it("detects facets using RichText", async () => {
        const mockResponse = {
          uri: "at://did:plc:abc123/app.bsky.feed.post/xyz789",
          cid: "bafyreib2rxk3rh6kzwq",
        };
        mockAgent.post.mockResolvedValue(mockResponse);

        const mockDetectFacets = jest.fn();
        (RichText as jest.Mock).mockImplementation((opts) => ({
          text: opts.text,
          facets: [
            {
              index: { byteStart: 0, byteEnd: 10 },
              features: [{ $type: "app.bsky.richtext.facet#mention" }],
            },
          ],
          detectFacets: mockDetectFacets,
        }));

        await createPost(mockAgent, "Hello @user!");

        expect(RichText).toHaveBeenCalledWith({ text: "Hello @user!" });
        expect(mockDetectFacets).toHaveBeenCalledWith(mockAgent);
      });

      it("includes facets in the post record", async () => {
        const mockResponse = {
          uri: "at://did:plc:abc123/app.bsky.feed.post/xyz789",
          cid: "bafyreib2rxk3rh6kzwq",
        };
        mockAgent.post.mockResolvedValue(mockResponse);

        const mockFacets = [
          {
            index: { byteStart: 0, byteEnd: 10 },
            features: [{ $type: "app.bsky.richtext.facet#mention" }],
          },
        ];

        (RichText as jest.Mock).mockImplementation((opts) => ({
          text: opts.text,
          facets: mockFacets,
          detectFacets: jest.fn(),
        }));

        await createPost(mockAgent, "Hello @user!");

        expect(mockAgent.post).toHaveBeenCalledWith(
          expect.objectContaining({
            facets: mockFacets,
          })
        );
      });

      it("creates a post without facets", async () => {
        const mockResponse = {
          uri: "at://did:plc:abc123/app.bsky.feed.post/xyz789",
          cid: "bafyreib2rxk3rh6kzwq",
        };
        mockAgent.post.mockResolvedValue(mockResponse);

        (RichText as jest.Mock).mockImplementation((opts) => ({
          text: opts.text,
          facets: undefined,
          detectFacets: jest.fn(),
        }));

        await createPost(mockAgent, "Simple post");

        expect(mockAgent.post).toHaveBeenCalledWith(
          expect.objectContaining({
            text: "Simple post",
            facets: undefined,
          })
        );
      });
    });

    describe("reply posts", () => {
      it("creates a reply post", async () => {
        const mockResponse = {
          uri: "at://did:plc:abc123/app.bsky.feed.post/xyz789",
          cid: "bafyreib2rxk3rh6kzwq",
        };
        mockAgent.post.mockResolvedValue(mockResponse);

        const options: CreatePostOptions = {
          reply: {
            parent: {
              uri: "at://did:plc:parent/app.bsky.feed.post/parent123",
              cid: "bafyreib2rxk3parent",
            },
            root: {
              uri: "at://did:plc:root/app.bsky.feed.post/root123",
              cid: "bafyreib2rxk3root",
            },
          },
        };

        await createPost(mockAgent, "This is a reply", options);

        expect(mockAgent.post).toHaveBeenCalledWith(
          expect.objectContaining({
            text: "This is a reply",
            reply: {
              parent: {
                uri: "at://did:plc:parent/app.bsky.feed.post/parent123",
                cid: "bafyreib2rxk3parent",
              },
              root: {
                uri: "at://did:plc:root/app.bsky.feed.post/root123",
                cid: "bafyreib2rxk3root",
              },
            },
          })
        );
      });

      it("creates a reply to root post (parent and root same)", async () => {
        const mockResponse = {
          uri: "at://did:plc:abc123/app.bsky.feed.post/xyz789",
          cid: "bafyreib2rxk3rh6kzwq",
        };
        mockAgent.post.mockResolvedValue(mockResponse);

        const rootPost = {
          uri: "at://did:plc:root/app.bsky.feed.post/root123",
          cid: "bafyreib2rxk3root",
        };

        const options: CreatePostOptions = {
          reply: {
            parent: rootPost,
            root: rootPost,
          },
        };

        await createPost(mockAgent, "Reply to root", options);

        expect(mockAgent.post).toHaveBeenCalledWith(
          expect.objectContaining({
            reply: {
              parent: rootPost,
              root: rootPost,
            },
          })
        );
      });
    });

    describe("quote posts", () => {
      it("creates a quote post", async () => {
        const mockResponse = {
          uri: "at://did:plc:abc123/app.bsky.feed.post/xyz789",
          cid: "bafyreib2rxk3rh6kzwq",
        };
        mockAgent.post.mockResolvedValue(mockResponse);

        const options: CreatePostOptions = {
          quote: {
            uri: "at://did:plc:quoted/app.bsky.feed.post/quoted123",
            cid: "bafyreib2rxk3quoted",
          },
        };

        await createPost(mockAgent, "Check this out!", options);

        expect(mockAgent.post).toHaveBeenCalledWith(
          expect.objectContaining({
            text: "Check this out!",
            embed: {
              $type: "app.bsky.embed.record",
              record: {
                uri: "at://did:plc:quoted/app.bsky.feed.post/quoted123",
                cid: "bafyreib2rxk3quoted",
              },
            },
          })
        );
      });
    });

    describe("image embeds", () => {
      const mockBlob = {
        ref: {
          $link: "bafyreib2rxk3rh6kzwqimage",
        },
        mimeType: "image/jpeg",
        size: 123456,
      } as BlobRef;

      it("creates a post with a single image", async () => {
        const mockResponse = {
          uri: "at://did:plc:abc123/app.bsky.feed.post/xyz789",
          cid: "bafyreib2rxk3rh6kzwq",
        };
        mockAgent.post.mockResolvedValue(mockResponse);

        const options: CreatePostOptions = {
          images: [
            {
              blob: mockBlob,
              alt: "A beautiful sunset",
            },
          ],
        };

        await createPost(mockAgent, "Sunset photo", options);

        expect(mockAgent.post).toHaveBeenCalledWith(
          expect.objectContaining({
            embed: {
              $type: "app.bsky.embed.images",
              images: [
                {
                  image: mockBlob,
                  alt: "A beautiful sunset",
                  aspectRatio: undefined,
                },
              ],
            },
          })
        );
      });

      it("creates a post with multiple images", async () => {
        const mockResponse = {
          uri: "at://did:plc:abc123/app.bsky.feed.post/xyz789",
          cid: "bafyreib2rxk3rh6kzwq",
        };
        mockAgent.post.mockResolvedValue(mockResponse);

        const options: CreatePostOptions = {
          images: [
            { blob: mockBlob, alt: "Image 1" },
            { blob: mockBlob, alt: "Image 2" },
            { blob: mockBlob, alt: "Image 3" },
          ],
        };

        await createPost(mockAgent, "Photo album", options);

        expect(mockAgent.post).toHaveBeenCalledWith(
          expect.objectContaining({
            embed: {
              $type: "app.bsky.embed.images",
              images: [
                { image: mockBlob, alt: "Image 1", aspectRatio: undefined },
                { image: mockBlob, alt: "Image 2", aspectRatio: undefined },
                { image: mockBlob, alt: "Image 3", aspectRatio: undefined },
              ],
            },
          })
        );
      });

      it("creates a post with images including aspect ratios", async () => {
        const mockResponse = {
          uri: "at://did:plc:abc123/app.bsky.feed.post/xyz789",
          cid: "bafyreib2rxk3rh6kzwq",
        };
        mockAgent.post.mockResolvedValue(mockResponse);

        const options: CreatePostOptions = {
          images: [
            {
              blob: mockBlob,
              alt: "Wide image",
              aspectRatio: { width: 16, height: 9 },
            },
            {
              blob: mockBlob,
              alt: "Square image",
              aspectRatio: { width: 1, height: 1 },
            },
          ],
        };

        await createPost(mockAgent, "Images with ratios", options);

        expect(mockAgent.post).toHaveBeenCalledWith(
          expect.objectContaining({
            embed: {
              $type: "app.bsky.embed.images",
              images: [
                {
                  image: mockBlob,
                  alt: "Wide image",
                  aspectRatio: { width: 16, height: 9 },
                },
                {
                  image: mockBlob,
                  alt: "Square image",
                  aspectRatio: { width: 1, height: 1 },
                },
              ],
            },
          })
        );
      });

      it("creates a post with maximum 4 images", async () => {
        const mockResponse = {
          uri: "at://did:plc:abc123/app.bsky.feed.post/xyz789",
          cid: "bafyreib2rxk3rh6kzwq",
        };
        mockAgent.post.mockResolvedValue(mockResponse);

        const options: CreatePostOptions = {
          images: [
            { blob: mockBlob, alt: "Image 1" },
            { blob: mockBlob, alt: "Image 2" },
            { blob: mockBlob, alt: "Image 3" },
            { blob: mockBlob, alt: "Image 4" },
          ],
        };

        await createPost(mockAgent, "Four images", options);

        expect(mockAgent.post).toHaveBeenCalledWith(
          expect.objectContaining({
            embed: {
              $type: "app.bsky.embed.images",
              images: expect.arrayContaining([
                expect.objectContaining({ alt: "Image 1" }),
                expect.objectContaining({ alt: "Image 2" }),
                expect.objectContaining({ alt: "Image 3" }),
                expect.objectContaining({ alt: "Image 4" }),
              ]),
            },
          })
        );
      });
    });

    describe("external link embeds", () => {
      it("creates a post with an external link", async () => {
        const mockResponse = {
          uri: "at://did:plc:abc123/app.bsky.feed.post/xyz789",
          cid: "bafyreib2rxk3rh6kzwq",
        };
        mockAgent.post.mockResolvedValue(mockResponse);

        const options: CreatePostOptions = {
          external: {
            uri: "https://trainers.gg",
            title: "Trainers.gg",
            description: "Pokemon community platform",
          },
        };

        await createPost(mockAgent, "Check out this site!", options);

        expect(mockAgent.post).toHaveBeenCalledWith(
          expect.objectContaining({
            embed: {
              $type: "app.bsky.embed.external",
              external: {
                uri: "https://trainers.gg",
                title: "Trainers.gg",
                description: "Pokemon community platform",
                thumb: undefined,
              },
            },
          })
        );
      });

      it("creates a post with an external link and thumbnail", async () => {
        const mockResponse = {
          uri: "at://did:plc:abc123/app.bsky.feed.post/xyz789",
          cid: "bafyreib2rxk3rh6kzwq",
        };
        mockAgent.post.mockResolvedValue(mockResponse);

        const mockThumb = {
          ref: {
            $link: "bafyreib2rxk3thumb",
          },
          mimeType: "image/jpeg",
          size: 12345,
        } as BlobRef;

        const options: CreatePostOptions = {
          external: {
            uri: "https://trainers.gg",
            title: "Trainers.gg",
            description: "Pokemon community platform",
            thumb: mockThumb,
          },
        };

        await createPost(mockAgent, "Link with thumbnail", options);

        expect(mockAgent.post).toHaveBeenCalledWith(
          expect.objectContaining({
            embed: {
              $type: "app.bsky.embed.external",
              external: {
                uri: "https://trainers.gg",
                title: "Trainers.gg",
                description: "Pokemon community platform",
                thumb: mockThumb,
              },
            },
          })
        );
      });
    });

    describe("language tags", () => {
      it("creates a post with language tags", async () => {
        const mockResponse = {
          uri: "at://did:plc:abc123/app.bsky.feed.post/xyz789",
          cid: "bafyreib2rxk3rh6kzwq",
        };
        mockAgent.post.mockResolvedValue(mockResponse);

        const options: CreatePostOptions = {
          langs: ["en", "ja"],
        };

        await createPost(mockAgent, "Hello 世界", options);

        expect(mockAgent.post).toHaveBeenCalledWith(
          expect.objectContaining({
            text: "Hello 世界",
            langs: ["en", "ja"],
          })
        );
      });

      it("creates a post without language tags", async () => {
        const mockResponse = {
          uri: "at://did:plc:abc123/app.bsky.feed.post/xyz789",
          cid: "bafyreib2rxk3rh6kzwq",
        };
        mockAgent.post.mockResolvedValue(mockResponse);

        await createPost(mockAgent, "No language specified");

        expect(mockAgent.post).toHaveBeenCalledWith(
          expect.not.objectContaining({
            langs: expect.anything(),
          })
        );
      });
    });

    describe("embed priority", () => {
      it("prioritizes quote embed over images", async () => {
        const mockResponse = {
          uri: "at://did:plc:abc123/app.bsky.feed.post/xyz789",
          cid: "bafyreib2rxk3rh6kzwq",
        };
        mockAgent.post.mockResolvedValue(mockResponse);

        const mockBlob = {
          ref: { $link: "bafyreib2rxk3image" },
          mimeType: "image/jpeg",
          size: 123456,
        } as BlobRef;

        const options: CreatePostOptions = {
          quote: {
            uri: "at://did:plc:quoted/app.bsky.feed.post/quoted123",
            cid: "bafyreib2rxk3quoted",
          },
          images: [{ blob: mockBlob, alt: "Image" }],
        };

        await createPost(mockAgent, "Quote takes priority", options);

        const call = mockAgent.post.mock.calls[0]?.[0];
        expect(call?.embed?.$type).toBe("app.bsky.embed.record");
        expect(call?.embed).not.toHaveProperty("images");
      });

      it("prioritizes images over external link", async () => {
        const mockResponse = {
          uri: "at://did:plc:abc123/app.bsky.feed.post/xyz789",
          cid: "bafyreib2rxk3rh6kzwq",
        };
        mockAgent.post.mockResolvedValue(mockResponse);

        const mockBlob = {
          ref: { $link: "bafyreib2rxk3image" },
          mimeType: "image/jpeg",
          size: 123456,
        } as BlobRef;

        const options: CreatePostOptions = {
          images: [{ blob: mockBlob, alt: "Image" }],
          external: {
            uri: "https://example.com",
            title: "Example",
            description: "Example site",
          },
        };

        await createPost(mockAgent, "Images take priority", options);

        const call = mockAgent.post.mock.calls[0]?.[0];
        expect(call?.embed?.$type).toBe("app.bsky.embed.images");
        expect(call?.embed).not.toHaveProperty("external");
      });
    });

    describe("combined scenarios", () => {
      it("creates a reply with images", async () => {
        const mockResponse = {
          uri: "at://did:plc:abc123/app.bsky.feed.post/xyz789",
          cid: "bafyreib2rxk3rh6kzwq",
        };
        mockAgent.post.mockResolvedValue(mockResponse);

        const mockBlob = {
          ref: { $link: "bafyreib2rxk3image" },
          mimeType: "image/jpeg",
          size: 123456,
        } as BlobRef;

        const options: CreatePostOptions = {
          reply: {
            parent: {
              uri: "at://did:plc:parent/app.bsky.feed.post/parent123",
              cid: "bafyreib2rxk3parent",
            },
            root: {
              uri: "at://did:plc:root/app.bsky.feed.post/root123",
              cid: "bafyreib2rxk3root",
            },
          },
          images: [{ blob: mockBlob, alt: "Reply with image" }],
          langs: ["en"],
        };

        await createPost(mockAgent, "Reply with images", options);

        expect(mockAgent.post).toHaveBeenCalledWith(
          expect.objectContaining({
            text: "Reply with images",
            reply: expect.any(Object),
            embed: expect.objectContaining({
              $type: "app.bsky.embed.images",
            }),
            langs: ["en"],
          })
        );
      });

      it("creates a quote reply with language tags", async () => {
        const mockResponse = {
          uri: "at://did:plc:abc123/app.bsky.feed.post/xyz789",
          cid: "bafyreib2rxk3rh6kzwq",
        };
        mockAgent.post.mockResolvedValue(mockResponse);

        const options: CreatePostOptions = {
          reply: {
            parent: {
              uri: "at://did:plc:parent/app.bsky.feed.post/parent123",
              cid: "bafyreib2rxk3parent",
            },
            root: {
              uri: "at://did:plc:root/app.bsky.feed.post/root123",
              cid: "bafyreib2rxk3root",
            },
          },
          quote: {
            uri: "at://did:plc:quoted/app.bsky.feed.post/quoted123",
            cid: "bafyreib2rxk3quoted",
          },
          langs: ["en", "ja"],
        };

        await createPost(mockAgent, "Quote reply 引用返信", options);

        expect(mockAgent.post).toHaveBeenCalledWith(
          expect.objectContaining({
            reply: expect.any(Object),
            embed: expect.objectContaining({
              $type: "app.bsky.embed.record",
            }),
            langs: ["en", "ja"],
          })
        );
      });
    });

    describe("error handling", () => {
      it("propagates errors from agent.post", async () => {
        const mockError = new Error("API error");
        mockAgent.post.mockRejectedValue(mockError);

        await expect(createPost(mockAgent, "This will fail")).rejects.toThrow(
          "API error"
        );
      });

      it("propagates errors from RichText.detectFacets", async () => {
        const mockError = new Error("Facet detection failed");
        (RichText as jest.Mock).mockImplementation(() => ({
          text: "text",
          facets: [],
          detectFacets: jest.fn().mockRejectedValue(mockError),
        }));

        await expect(createPost(mockAgent, "This will fail")).rejects.toThrow(
          "Facet detection failed"
        );
      });
    });

    describe("createdAt timestamp", () => {
      it("includes an ISO 8601 timestamp", async () => {
        const mockResponse = {
          uri: "at://did:plc:abc123/app.bsky.feed.post/xyz789",
          cid: "bafyreib2rxk3rh6kzwq",
        };
        mockAgent.post.mockResolvedValue(mockResponse);

        // Reset RichText mock for this test
        (RichText as jest.Mock).mockImplementation((opts) => ({
          text: opts.text,
          facets: [],
          detectFacets: jest.fn().mockResolvedValue(undefined),
        }));

        const beforeTest = new Date().toISOString();
        await createPost(mockAgent, "Timestamp test");
        const afterTest = new Date().toISOString();

        const call = mockAgent.post.mock.calls[0]?.[0];
        const timestamp = call?.createdAt as string;

        expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
        expect(timestamp >= beforeTest).toBe(true);
        expect(timestamp <= afterTest).toBe(true);
      });
    });
  });

  describe("deletePost", () => {
    it("deletes a post by URI", async () => {
      mockAgent.deletePost.mockResolvedValue(undefined);

      const postUri = "at://did:plc:abc123/app.bsky.feed.post/xyz789";
      await deletePost(mockAgent, postUri);

      expect(mockAgent.deletePost).toHaveBeenCalledWith(postUri);
    });

    it("handles deletion errors", async () => {
      const mockError = new Error("Failed to delete post");
      mockAgent.deletePost.mockRejectedValue(mockError);

      const postUri = "at://did:plc:abc123/app.bsky.feed.post/xyz789";

      await expect(deletePost(mockAgent, postUri)).rejects.toThrow(
        "Failed to delete post"
      );
    });

    it("returns void on successful deletion", async () => {
      mockAgent.deletePost.mockResolvedValue(undefined);

      const postUri = "at://did:plc:abc123/app.bsky.feed.post/xyz789";
      const result = await deletePost(mockAgent, postUri);

      expect(result).toBeUndefined();
    });
  });

  describe("uploadImage", () => {
    it("uploads an image and returns blob reference", async () => {
      const mockBlobRef = {
        ref: {
          $link: "bafyreib2rxk3rh6kzwqimage",
        },
        mimeType: "image/jpeg",
        size: 123456,
      } as BlobRef;

      mockAgent.uploadBlob.mockResolvedValue({
        data: { blob: mockBlobRef },
      } as never);

      const imageData = new Uint8Array([1, 2, 3, 4, 5]);
      const mimeType = "image/jpeg";

      const result = await uploadImage(mockAgent, imageData, mimeType);

      expect(result).toEqual(mockBlobRef);
      expect(mockAgent.uploadBlob).toHaveBeenCalledWith(imageData, {
        encoding: mimeType,
      });
    });

    it("uploads a PNG image", async () => {
      const mockBlobRef = {
        ref: {
          $link: "bafyreib2rxk3pngimage",
        },
        mimeType: "image/png",
        size: 234567,
      } as BlobRef;

      mockAgent.uploadBlob.mockResolvedValue({
        data: { blob: mockBlobRef },
      } as never);

      const imageData = new Uint8Array([10, 20, 30, 40, 50]);
      const mimeType = "image/png";

      const result = await uploadImage(mockAgent, imageData, mimeType);

      expect(result).toEqual(mockBlobRef);
      expect(mockAgent.uploadBlob).toHaveBeenCalledWith(imageData, {
        encoding: "image/png",
      });
    });

    it("handles upload errors", async () => {
      const mockError = new Error("Upload failed");
      mockAgent.uploadBlob.mockRejectedValue(mockError);

      const imageData = new Uint8Array([1, 2, 3]);
      const mimeType = "image/jpeg";

      await expect(uploadImage(mockAgent, imageData, mimeType)).rejects.toThrow(
        "Upload failed"
      );
    });

    it("passes encoding option to uploadBlob", async () => {
      const mockBlobRef = {
        ref: { $link: "bafyreib2rxk3image" },
        mimeType: "image/webp",
        size: 100000,
      } as BlobRef;

      mockAgent.uploadBlob.mockResolvedValue({
        data: { blob: mockBlobRef },
      } as never);

      const imageData = new Uint8Array(100);
      const mimeType = "image/webp";

      await uploadImage(mockAgent, imageData, mimeType);

      expect(mockAgent.uploadBlob).toHaveBeenCalledWith(
        imageData,
        expect.objectContaining({
          encoding: "image/webp",
        })
      );
    });
  });

  describe("re-exported utilities", () => {
    describe("MAX_POST_LENGTH", () => {
      it("exports MAX_POST_LENGTH constant", () => {
        expect(MAX_POST_LENGTH).toBe(300);
      });
    });

    describe("getGraphemeLength", () => {
      it("calculates grapheme length correctly", () => {
        expect(getGraphemeLength("Hello")).toBe(5);
        expect(getGraphemeLength("Hello 世界")).toBe(8);
        expect(getGraphemeLength("👋🏻")).toBe(1); // Emoji with skin tone modifier
      });
    });

    describe("isPostTooLong", () => {
      it("returns false for posts within limit", () => {
        expect(isPostTooLong("Short post")).toBe(false);
      });

      it("returns true for posts exceeding limit", () => {
        const longPost = "a".repeat(301);
        expect(isPostTooLong(longPost)).toBe(true);
      });

      it("returns false for posts at exactly the limit", () => {
        const exactPost = "a".repeat(300);
        expect(isPostTooLong(exactPost)).toBe(false);
      });
    });

    describe("parseAtUri", () => {
      it("parses a valid AT-URI", () => {
        const uri = "at://did:plc:abc123/app.bsky.feed.post/xyz789";
        const result = parseAtUri(uri);

        expect(result).toEqual({
          did: "did:plc:abc123",
          collection: "app.bsky.feed.post",
          rkey: "xyz789",
        });
      });

      it("returns null for invalid AT-URI", () => {
        expect(parseAtUri("not-a-valid-uri")).toBeNull();
        expect(parseAtUri("https://example.com")).toBeNull();
        expect(parseAtUri("")).toBeNull();
      });

      it("returns null for AT-URIs without rkey", () => {
        const uri = "at://did:plc:abc123/app.bsky.feed.post";
        const result = parseAtUri(uri);

        // parseAtUri requires all three parts (did, collection, rkey)
        expect(result).toBeNull();
      });
    });
  });
});
