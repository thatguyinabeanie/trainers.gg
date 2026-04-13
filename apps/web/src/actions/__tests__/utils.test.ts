/**
 * @jest-environment node
 */

import { z } from "@trainers/validators";

// Mock next/headers — rejectBots() reads the bypass header
const mockHeaders = jest.fn(async () => ({
  get: jest.fn(() => null),
}));
jest.mock("next/headers", () => ({
  headers: (...args: unknown[]) => mockHeaders(...args),
}));

// Mock botid/server
const mockCheckBotId = jest.fn();
jest.mock("botid/server", () => ({
  checkBotId: (...args: unknown[]) => mockCheckBotId(...args),
}));

// Mock @trainers/utils
const mockGetErrorMessage = jest.fn();
jest.mock("@trainers/utils", () => ({
  getErrorMessage: (...args: unknown[]) => mockGetErrorMessage(...args),
}));

import { rejectBots, withAction } from "../utils";

describe("withAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: getErrorMessage returns the fallback message
    mockGetErrorMessage.mockImplementation(
      (_error: unknown, fallback: string) => fallback
    );
  });

  it("returns { success: true, data } when the function succeeds", async () => {
    const result = await withAction(
      async () => ({ id: 42 }),
      "Something failed"
    );

    expect(result).toEqual({ success: true, data: { id: 42 } });
  });

  it("catches ZodError and returns the first validation message", async () => {
    const schema = z.object({
      name: z.string().min(1, "Name is required"),
    });

    const result = await withAction(async () => {
      schema.parse({ name: "" });
    }, "Validation failed");

    expect(result).toEqual({
      success: false,
      error: "Name is required",
    });
    // getErrorMessage should NOT be called for ZodErrors
    expect(mockGetErrorMessage).not.toHaveBeenCalled();
  });

  it("catches generic errors and returns the fallback message", async () => {
    mockGetErrorMessage.mockReturnValue("Something went wrong");

    const result = await withAction(async () => {
      throw new Error("unexpected db failure");
    }, "Something went wrong");

    expect(result).toEqual({
      success: false,
      error: "Something went wrong",
    });
    expect(mockGetErrorMessage).toHaveBeenCalledWith(
      expect.any(Error),
      "Something went wrong",
      expect.any(Boolean)
    );
  });

  it("passes shouldSanitize=true to getErrorMessage when NODE_ENV is production", async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    mockGetErrorMessage.mockReturnValue("Fallback");

    await withAction(async () => {
      throw new Error("secret internal error");
    }, "Fallback");

    // Third argument should be true in production
    expect(mockGetErrorMessage).toHaveBeenCalledWith(
      expect.any(Error),
      "Fallback",
      true
    );

    process.env.NODE_ENV = originalNodeEnv;
  });

  it("passes shouldSanitize=false to getErrorMessage when NODE_ENV is not production", async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "test";
    mockGetErrorMessage.mockReturnValue("actual error message");

    await withAction(async () => {
      throw new Error("actual error message");
    }, "Fallback");

    // Third argument should be false outside production
    expect(mockGetErrorMessage).toHaveBeenCalledWith(
      expect.any(Error),
      "Fallback",
      false
    );

    process.env.NODE_ENV = originalNodeEnv;
  });
});

describe("rejectBots", () => {
  const BYPASS_SECRET = "test-bypass-secret";

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
    // Default: no bypass header
    mockHeaders.mockResolvedValue({
      get: jest.fn(() => null),
    });
  });

  it("does not throw when the request is not from a bot", async () => {
    mockCheckBotId.mockResolvedValue({ isBot: false });

    await expect(rejectBots()).resolves.toBeUndefined();
  });

  it('throws "Access denied" when a bot is detected', async () => {
    mockCheckBotId.mockResolvedValue({ isBot: true });

    await expect(rejectBots()).rejects.toThrow("Access denied");
  });

  describe("E2E bypass", () => {
    it("skips BotID when valid bypass header and secret match", async () => {
      process.env.VERCEL_AUTOMATION_BYPASS_SECRET = BYPASS_SECRET;
      mockCheckBotId.mockResolvedValue({ isBot: true });
      mockHeaders.mockResolvedValueOnce({
        get: jest.fn((name: string) =>
          name === "x-vercel-protection-bypass" ? BYPASS_SECRET : null
        ),
      });

      await expect(rejectBots()).resolves.toBeUndefined();
      expect(mockCheckBotId).not.toHaveBeenCalled();
    });

    it("runs BotID when bypass header is missing", async () => {
      process.env.VERCEL_AUTOMATION_BYPASS_SECRET = BYPASS_SECRET;
      mockCheckBotId.mockResolvedValue({ isBot: false });

      await rejectBots();

      expect(mockCheckBotId).toHaveBeenCalled();
    });

    it("runs BotID when bypass secret doesn't match", async () => {
      process.env.VERCEL_AUTOMATION_BYPASS_SECRET = BYPASS_SECRET;
      mockCheckBotId.mockResolvedValue({ isBot: false });
      mockHeaders.mockResolvedValueOnce({
        get: jest.fn((name: string) =>
          name === "x-vercel-protection-bypass" ? "wrong-secret" : null
        ),
      });

      await rejectBots();

      expect(mockCheckBotId).toHaveBeenCalled();
    });

    it("runs BotID when VERCEL_AUTOMATION_BYPASS_SECRET is not set", async () => {
      mockCheckBotId.mockResolvedValue({ isBot: false });
      mockHeaders.mockResolvedValueOnce({
        get: jest.fn((name: string) =>
          name === "x-vercel-protection-bypass" ? "some-value" : null
        ),
      });

      await rejectBots();

      expect(mockCheckBotId).toHaveBeenCalled();
    });
  });
});
