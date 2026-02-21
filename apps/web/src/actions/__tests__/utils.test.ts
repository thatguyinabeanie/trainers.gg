/**
 * @jest-environment node
 */

import { z } from "@trainers/validators";

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
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("does not throw when the request is not from a bot", async () => {
    mockCheckBotId.mockResolvedValue({ isBot: false });

    await expect(rejectBots()).resolves.toBeUndefined();
  });

  it('throws "Access denied" when a bot is detected', async () => {
    mockCheckBotId.mockResolvedValue({ isBot: true });

    await expect(rejectBots()).rejects.toThrow("Access denied");
  });
});
