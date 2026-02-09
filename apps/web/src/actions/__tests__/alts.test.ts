/**
 * @jest-environment node
 */

// Mock Supabase client
const mockSupabaseClient = {};
jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(async () => mockSupabaseClient),
}));

// Mock @trainers/supabase mutations
const mockCreateAlt = jest.fn();
const mockUpdateAlt = jest.fn();
const mockDeleteAlt = jest.fn();
const mockSetMainAlt = jest.fn();
jest.mock("@trainers/supabase", () => ({
  createAlt: (...args: unknown[]) => mockCreateAlt(...args),
  updateAlt: (...args: unknown[]) => mockUpdateAlt(...args),
  deleteAlt: (...args: unknown[]) => mockDeleteAlt(...args),
  setMainAlt: (...args: unknown[]) => mockSetMainAlt(...args),
}));

import {
  createAltAction,
  updateAltAction,
  deleteAltAction,
  setMainAltAction,
} from "../alts";

describe("createAltAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates an alt and returns the new id", async () => {
    mockCreateAlt.mockResolvedValue({ id: 101 });

    const result = await createAltAction({
      username: "ash_ketchum",
    });

    expect(result).toEqual({ success: true, data: { id: 101 } });
    expect(mockCreateAlt).toHaveBeenCalledWith(mockSupabaseClient, {
      username: "ash_ketchum",
      inGameName: undefined,
    });
  });

  it("returns a validation error for an invalid username (special characters)", async () => {
    const result = await createAltAction({
      username: "InvalidUser!",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/letters, numbers, underscores/i);
    }
    // The mutation should never be called when validation fails
    expect(mockCreateAlt).not.toHaveBeenCalled();
  });

  it("returns an error when the mutation throws", async () => {
    mockCreateAlt.mockRejectedValue(new Error("Username already taken"));

    const result = await createAltAction({
      username: "duplicate_user",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeTruthy();
    }
  });
});

describe("updateAltAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("updates an alt successfully", async () => {
    mockUpdateAlt.mockResolvedValue(undefined);

    const result = await updateAltAction(1, {
      inGameName: "Player#1234",
    });

    expect(result).toEqual({ success: true, data: { success: true } });
    expect(mockUpdateAlt).toHaveBeenCalledWith(mockSupabaseClient, 1, {
      inGameName: "Player#1234",
    });
  });

  it("returns a validation error when inGameName exceeds max length", async () => {
    const longName = "A".repeat(51);

    const result = await updateAltAction(1, { inGameName: longName });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/50 characters/i);
    }
    expect(mockUpdateAlt).not.toHaveBeenCalled();
  });
});

describe("deleteAltAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("deletes an alt successfully", async () => {
    mockDeleteAlt.mockResolvedValue(undefined);

    const result = await deleteAltAction(5);

    expect(result).toEqual({ success: true, data: { success: true } });
    expect(mockDeleteAlt).toHaveBeenCalledWith(mockSupabaseClient, 5);
  });

  it("returns an error when the mutation throws", async () => {
    mockDeleteAlt.mockRejectedValue(
      new Error("Cannot delete alt in active tournament")
    );

    const result = await deleteAltAction(5);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeTruthy();
    }
  });
});

describe("setMainAltAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("sets the main alt successfully", async () => {
    mockSetMainAlt.mockResolvedValue(undefined);

    const result = await setMainAltAction(7);

    expect(result).toEqual({ success: true, data: { success: true } });
    expect(mockSetMainAlt).toHaveBeenCalledWith(mockSupabaseClient, 7);
  });
});

describe("ID validation (shared across actions)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rejects a negative alt ID", async () => {
    const result = await deleteAltAction(-1);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeTruthy();
    }
    expect(mockDeleteAlt).not.toHaveBeenCalled();
  });

  it("rejects a non-integer alt ID", async () => {
    const result = await setMainAltAction(3.14);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeTruthy();
    }
    expect(mockSetMainAlt).not.toHaveBeenCalled();
  });
});
