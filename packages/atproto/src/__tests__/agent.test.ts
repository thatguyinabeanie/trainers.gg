/**
 * Tests for AT Protocol Agent Utilities
 */

import { Agent } from "@atproto/api";
import { getPublicAgent, withErrorHandling } from "../agent";
import { BlueskyAuthError, BlueskyApiError } from "../errors";

// Mock console.error to avoid cluttering test output
const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

describe("agent", () => {
  afterEach(() => {
    consoleErrorSpy.mockClear();
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  describe("getPublicAgent", () => {
    it("returns an Agent instance", () => {
      const agent = getPublicAgent();
      expect(agent).toBeInstanceOf(Agent);
    });

    it("configures the Agent with the public Bluesky URL", () => {
      const agent = getPublicAgent();
      // Agent is initialized with the correct URL
      // We can't easily test the internal service URL without accessing private properties
      // So we just verify it was constructed successfully
      expect(agent).toBeInstanceOf(Agent);
    });

    it("returns a new instance on each call", () => {
      const agent1 = getPublicAgent();
      const agent2 = getPublicAgent();
      expect(agent1).not.toBe(agent2);
    });
  });

  describe("withErrorHandling", () => {
    describe("successful API calls", () => {
      it("returns the result when the API call succeeds", async () => {
        const result = await withErrorHandling(async () => ({
          success: true,
          data: "test",
        }));
        expect(result).toEqual({ success: true, data: "test" });
      });

      it("preserves the return type of the API call", async () => {
        const numberResult = await withErrorHandling(async () => 42);
        expect(numberResult).toBe(42);

        const objectResult = await withErrorHandling(async () => ({
          id: 1,
          name: "test",
        }));
        expect(objectResult).toEqual({ id: 1, name: "test" });
      });
    });

    describe("BlueskyAuthError and BlueskyApiError passthrough", () => {
      it("re-throws BlueskyAuthError without modification", async () => {
        const authError = new BlueskyAuthError("Custom auth error");
        await expect(
          withErrorHandling(async () => {
            throw authError;
          })
        ).rejects.toThrow(authError);
      });

      it("re-throws BlueskyApiError without modification", async () => {
        const apiError = new BlueskyApiError(
          "Custom API error",
          500,
          "ServerError"
        );
        await expect(
          withErrorHandling(async () => {
            throw apiError;
          })
        ).rejects.toThrow(apiError);
      });
    });

    describe("InvalidToken error mapping", () => {
      it("maps InvalidToken to BlueskyAuthError", async () => {
        const xrpcError = {
          status: 401,
          error: "InvalidToken",
          message: "Token is invalid",
        };

        await expect(
          withErrorHandling(async () => {
            throw xrpcError;
          })
        ).rejects.toThrow(BlueskyAuthError);
      });

      it("includes session expiry message for InvalidToken", async () => {
        const xrpcError = {
          status: 401,
          error: "InvalidToken",
          message: "Token is invalid",
        };

        await expect(
          withErrorHandling(async () => {
            throw xrpcError;
          })
        ).rejects.toThrow("Your session has expired. Please sign in again.");
      });
    });

    describe("ExpiredToken error mapping", () => {
      it("maps ExpiredToken to BlueskyAuthError", async () => {
        const xrpcError = {
          status: 401,
          error: "ExpiredToken",
          message: "Token has expired",
        };

        await expect(
          withErrorHandling(async () => {
            throw xrpcError;
          })
        ).rejects.toThrow(BlueskyAuthError);
      });

      it("includes session expiry message for ExpiredToken", async () => {
        const xrpcError = {
          status: 401,
          error: "ExpiredToken",
          message: "Token has expired",
        };

        await expect(
          withErrorHandling(async () => {
            throw xrpcError;
          })
        ).rejects.toThrow("Your session has expired. Please sign in again.");
      });
    });

    describe("RateLimitExceeded error mapping", () => {
      it("maps RateLimitExceeded to BlueskyApiError", async () => {
        const xrpcError = {
          status: 429,
          error: "RateLimitExceeded",
          message: "Rate limit exceeded",
        };

        await expect(
          withErrorHandling(async () => {
            throw xrpcError;
          })
        ).rejects.toThrow(BlueskyApiError);
      });

      it("includes user-friendly message for RateLimitExceeded", async () => {
        const xrpcError = {
          status: 429,
          error: "RateLimitExceeded",
          message: "Rate limit exceeded",
        };

        await expect(
          withErrorHandling(async () => {
            throw xrpcError;
          })
        ).rejects.toThrow(
          "Too many requests. Please wait a moment and try again."
        );
      });

      it("includes status code in BlueskyApiError for RateLimitExceeded", async () => {
        const xrpcError = {
          status: 429,
          error: "RateLimitExceeded",
          message: "Rate limit exceeded",
        };

        try {
          await withErrorHandling(async () => {
            throw xrpcError;
          });
          throw new Error("Expected error to be thrown");
        } catch (error) {
          expect(error).toBeInstanceOf(BlueskyApiError);
          expect((error as BlueskyApiError).statusCode).toBe(429);
          expect((error as BlueskyApiError).errorType).toBe(
            "RateLimitExceeded"
          );
        }
      });
    });

    describe("RecordNotFound error mapping", () => {
      it("maps RecordNotFound to BlueskyApiError", async () => {
        const xrpcError = {
          status: 404,
          error: "RecordNotFound",
          message: "Record not found",
        };

        await expect(
          withErrorHandling(async () => {
            throw xrpcError;
          })
        ).rejects.toThrow(BlueskyApiError);
      });

      it("includes user-friendly message for RecordNotFound", async () => {
        const xrpcError = {
          status: 404,
          error: "RecordNotFound",
          message: "Record not found",
        };

        await expect(
          withErrorHandling(async () => {
            throw xrpcError;
          })
        ).rejects.toThrow("The requested content was not found.");
      });

      it("includes status code and error type for RecordNotFound", async () => {
        const xrpcError = {
          status: 404,
          error: "RecordNotFound",
          message: "Record not found",
        };

        try {
          await withErrorHandling(async () => {
            throw xrpcError;
          });
          throw new Error("Expected error to be thrown");
        } catch (error) {
          expect(error).toBeInstanceOf(BlueskyApiError);
          expect((error as BlueskyApiError).statusCode).toBe(404);
          expect((error as BlueskyApiError).errorType).toBe("RecordNotFound");
        }
      });
    });

    describe("InvalidRequest error mapping", () => {
      it("maps InvalidRequest to BlueskyApiError", async () => {
        const xrpcError = {
          status: 400,
          error: "InvalidRequest",
          message: "Invalid request parameters",
        };

        await expect(
          withErrorHandling(async () => {
            throw xrpcError;
          })
        ).rejects.toThrow(BlueskyApiError);
      });

      it("includes user-friendly message for InvalidRequest", async () => {
        const xrpcError = {
          status: 400,
          error: "InvalidRequest",
          message: "Invalid request parameters",
        };

        await expect(
          withErrorHandling(async () => {
            throw xrpcError;
          })
        ).rejects.toThrow("Invalid request. Please check your input.");
      });

      it("includes status code and error type for InvalidRequest", async () => {
        const xrpcError = {
          status: 400,
          error: "InvalidRequest",
          message: "Invalid request parameters",
        };

        try {
          await withErrorHandling(async () => {
            throw xrpcError;
          });
          throw new Error("Expected error to be thrown");
        } catch (error) {
          expect(error).toBeInstanceOf(BlueskyApiError);
          expect((error as BlueskyApiError).statusCode).toBe(400);
          expect((error as BlueskyApiError).errorType).toBe("InvalidRequest");
        }
      });
    });

    describe("unknown XRPC error mapping", () => {
      it("maps unknown error types to BlueskyApiError with original message", async () => {
        const xrpcError = {
          status: 500,
          error: "UnknownError",
          message: "Something went wrong",
        };

        await expect(
          withErrorHandling(async () => {
            throw xrpcError;
          })
        ).rejects.toThrow(BlueskyApiError);
      });

      it("preserves the original message for unknown error types", async () => {
        const xrpcError = {
          status: 500,
          error: "UnknownError",
          message: "Custom error message",
        };

        await expect(
          withErrorHandling(async () => {
            throw xrpcError;
          })
        ).rejects.toThrow("Custom error message");
      });

      it("includes status code and error type for unknown errors", async () => {
        const xrpcError = {
          status: 503,
          error: "ServiceUnavailable",
          message: "Service temporarily unavailable",
        };

        try {
          await withErrorHandling(async () => {
            throw xrpcError;
          });
          throw new Error("Expected error to be thrown");
        } catch (error) {
          expect(error).toBeInstanceOf(BlueskyApiError);
          expect((error as BlueskyApiError).statusCode).toBe(503);
          expect((error as BlueskyApiError).errorType).toBe(
            "ServiceUnavailable"
          );
        }
      });

      it("uses default message when message is missing", async () => {
        const xrpcError = {
          status: 500,
          error: "UnknownError",
        };

        await expect(
          withErrorHandling(async () => {
            throw xrpcError;
          })
        ).rejects.toThrow("An error occurred");
      });
    });

    describe("non-XRPC error handling", () => {
      it("maps unknown errors to generic BlueskyApiError", async () => {
        const unknownError = new Error("Random error");

        await expect(
          withErrorHandling(async () => {
            throw unknownError;
          })
        ).rejects.toThrow(BlueskyApiError);
      });

      it("includes generic message for unknown errors", async () => {
        const unknownError = new Error("Random error");

        await expect(
          withErrorHandling(async () => {
            throw unknownError;
          })
        ).rejects.toThrow("An unexpected error occurred. Please try again.");
      });

      it("logs unknown errors to console", async () => {
        const unknownError = new Error("Random error");

        try {
          await withErrorHandling(async () => {
            throw unknownError;
          });
          throw new Error("Expected error to be thrown");
        } catch {
          expect(consoleErrorSpy).toHaveBeenCalledWith(
            "Unknown Bluesky API error:",
            unknownError
          );
        }
      });

      it("handles string errors", async () => {
        await expect(
          withErrorHandling(async () => {
            throw "String error";
          })
        ).rejects.toThrow("An unexpected error occurred. Please try again.");
      });

      it("handles null errors", async () => {
        await expect(
          withErrorHandling(async () => {
            throw null;
          })
        ).rejects.toThrow("An unexpected error occurred. Please try again.");
      });

      it("handles undefined errors", async () => {
        await expect(
          withErrorHandling(async () => {
            throw undefined;
          })
        ).rejects.toThrow("An unexpected error occurred. Please try again.");
      });
    });

    describe("error object variations", () => {
      it("handles XRPC error with only status", async () => {
        const xrpcError = {
          status: 500,
        };

        await expect(
          withErrorHandling(async () => {
            throw xrpcError;
          })
        ).rejects.toThrow("An error occurred");
      });

      it("handles XRPC error with empty message", async () => {
        const xrpcError = {
          status: 400,
          error: "BadRequest",
          message: "",
        };

        await expect(
          withErrorHandling(async () => {
            throw xrpcError;
          })
        ).rejects.toThrow("An error occurred");
      });

      it("does not treat objects without status as XRPC errors", async () => {
        const notXrpcError = {
          code: "ERROR",
          message: "Not an XRPC error",
        };

        await expect(
          withErrorHandling(async () => {
            throw notXrpcError;
          })
        ).rejects.toThrow("An unexpected error occurred. Please try again.");
      });
    });
  });
});
