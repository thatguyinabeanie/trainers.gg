/**
 * @jest-environment node
 */

// --- Mocks (declared before imports so jest.mock hoisting works) ---

// Mock botid/server — use jest.fn() inside the factory to avoid hoisting issues
jest.mock("botid/server", () => ({
  checkBotId: jest.fn().mockResolvedValue({ isBot: false }),
}));

// Mock @trainers/supabase
jest.mock("@trainers/supabase", () => ({
  getEmailByUsername: jest.fn(),
}));

// Mock Supabase client — the from() mock is configured per-test
const mockFrom = jest.fn();
jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(async () => ({ from: mockFrom })),
}));

// Import after mocks are declared
import {
  resolveLoginIdentifier,
  joinWaitlist,
  checkUsernameAvailability,
} from "../actions";
import { checkBotId } from "botid/server";
import { getEmailByUsername } from "@trainers/supabase";

// Cast to jest.Mock for type-safe mock API access
const mockCheckBotId = checkBotId as jest.Mock;
const mockGetEmailByUsername = getEmailByUsername as jest.Mock;

// --- Tests ---

describe("resolveLoginIdentifier", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("passes through an email address directly", async () => {
    const result = await resolveLoginIdentifier("user@example.com");

    expect(result).toEqual({ email: "user@example.com", error: null });
    // Should never hit the database for email input
    expect(mockGetEmailByUsername).not.toHaveBeenCalled();
  });

  it("trims whitespace and lowercases the email", async () => {
    const result = await resolveLoginIdentifier(" USER@EXAMPLE.COM ");

    expect(result).toEqual({ email: "user@example.com", error: null });
    expect(mockGetEmailByUsername).not.toHaveBeenCalled();
  });

  it("looks up a username in the database and returns the associated email", async () => {
    mockGetEmailByUsername.mockResolvedValue("found@example.com");

    const result = await resolveLoginIdentifier("ashketchum");

    expect(result).toEqual({ email: "found@example.com", error: null });
    expect(mockGetEmailByUsername).toHaveBeenCalledWith(
      expect.objectContaining({ from: mockFrom }),
      "ashketchum"
    );
  });

  it("returns an error when the username is not found", async () => {
    mockGetEmailByUsername.mockResolvedValue(null);

    const result = await resolveLoginIdentifier("unknownuser");

    expect(result).toEqual({
      email: null,
      error: "No account found with that username",
    });
  });

  it("returns a generic error when the database lookup throws", async () => {
    mockGetEmailByUsername.mockRejectedValue(new Error("DB connection failed"));

    const result = await resolveLoginIdentifier("someuser");

    expect(result).toEqual({
      email: null,
      error: "An error occurred. Please try again.",
    });
  });
});

describe("joinWaitlist", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset to non-bot by default
    mockCheckBotId.mockResolvedValue({ isBot: false });
  });

  it("inserts the email and returns success", async () => {
    const mockInsert = jest.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ insert: mockInsert });

    const result = await joinWaitlist("newuser@example.com");

    expect(result).toEqual({ success: true });
    expect(mockFrom).toHaveBeenCalledWith("waitlist");
    expect(mockInsert).toHaveBeenCalledWith({ email: "newuser@example.com" });
  });

  it("returns a duplicate error when the email already exists (code 23505)", async () => {
    const mockInsert = jest.fn().mockResolvedValue({
      error: { code: "23505", message: "duplicate key" },
    });
    mockFrom.mockReturnValue({ insert: mockInsert });

    const result = await joinWaitlist("existing@example.com");

    expect(result).toEqual({
      error: "This email is already on the waitlist",
    });
  });

  it("returns a generic error when the database insert fails", async () => {
    const mockInsert = jest.fn().mockResolvedValue({
      error: { code: "42000", message: "some other error" },
    });
    mockFrom.mockReturnValue({ insert: mockInsert });

    const result = await joinWaitlist("fail@example.com");

    expect(result).toEqual({
      error: "Failed to join waitlist. Please try again.",
    });
  });

  it("rejects the request when the caller is detected as a bot", async () => {
    mockCheckBotId.mockResolvedValue({ isBot: true });

    const result = await joinWaitlist("bot@example.com");

    expect(result).toEqual({ error: "Access denied" });
    // Should never reach the database
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

describe("checkUsernameAvailability", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rejects an invalid username format (too short)", async () => {
    const result = await checkUsernameAvailability("ab");

    expect(result).toEqual({
      available: false,
      error: "Invalid username format",
    });
    // Should never hit the database for invalid input
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("returns unavailable when the username exists in the users table", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "users") {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest
                .fn()
                .mockResolvedValue({ data: { id: "user-123" } }),
            }),
          }),
        };
      }
      // alts table fallback (should not be reached in this test)
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: null }),
          }),
        }),
      };
    });

    const result = await checkUsernameAvailability("taken_user");

    expect(result).toEqual({ available: false, error: null });
    expect(mockFrom).toHaveBeenCalledWith("users");
  });

  it("returns unavailable when the username exists in the alts table", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "users") {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: null }),
            }),
          }),
        };
      }
      if (table === "alts") {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: { id: 42 } }),
            }),
          }),
        };
      }
      return {};
    });

    const result = await checkUsernameAvailability("taken_alt");

    expect(result).toEqual({ available: false, error: null });
    expect(mockFrom).toHaveBeenCalledWith("users");
    expect(mockFrom).toHaveBeenCalledWith("alts");
  });

  it("returns available when the username is not found in either table", async () => {
    mockFrom.mockImplementation(() => ({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          maybeSingle: jest.fn().mockResolvedValue({ data: null }),
        }),
      }),
    }));

    const result = await checkUsernameAvailability("fresh_name");

    expect(result).toEqual({ available: true, error: null });
    expect(mockFrom).toHaveBeenCalledWith("users");
    expect(mockFrom).toHaveBeenCalledWith("alts");
  });
});
