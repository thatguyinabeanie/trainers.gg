/**
 * @jest-environment node
 */

import {
  createAltAction,
  updateAltAction,
  deleteAltAction,
  setMainAltAction,
  updateProfileAction,
} from "../alts";

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

describe("createAltAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates an alt and returns the new id", async () => {
    mockCreateAlt.mockResolvedValue({ id: 101 });

    const result = await createAltAction({
      username: "ash_ketchum",
      displayName: "Ash",
    });

    expect(result).toEqual({ success: true, data: { id: 101 } });
    expect(mockCreateAlt).toHaveBeenCalledWith(mockSupabaseClient, {
      username: "ash_ketchum",
      displayName: "Ash",
      inGameName: undefined,
    });
  });

  it("returns a validation error for an invalid username (uppercase)", async () => {
    const result = await createAltAction({
      username: "InvalidUser!",
      displayName: "Test",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/lowercase/i);
    }
    // The mutation should never be called when validation fails
    expect(mockCreateAlt).not.toHaveBeenCalled();
  });

  it("returns an error when the mutation throws", async () => {
    mockCreateAlt.mockRejectedValue(new Error("Username already taken"));

    const result = await createAltAction({
      username: "duplicate_user",
      displayName: "Dupe",
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
      displayName: "New Name",
      bio: "Hello world",
    });

    expect(result).toEqual({ success: true, data: { success: true } });
    expect(mockUpdateAlt).toHaveBeenCalledWith(mockSupabaseClient, 1, {
      displayName: "New Name",
      bio: "Hello world",
    });
  });

  it("returns a validation error when displayName exceeds max length", async () => {
    const longName = "A".repeat(65);

    const result = await updateAltAction(1, { displayName: longName });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/64 characters/i);
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

describe("updateProfileAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("updates a profile successfully", async () => {
    mockUpdateAlt.mockResolvedValue(undefined);

    const result = await updateProfileAction(3, {
      displayName: "Updated Name",
      bio: "New bio",
    });

    expect(result).toEqual({ success: true, data: { success: true } });
    expect(mockUpdateAlt).toHaveBeenCalledWith(mockSupabaseClient, 3, {
      displayName: "Updated Name",
      bio: "New bio",
    });
  });

  it("returns a validation error when bio exceeds max length", async () => {
    const longBio = "B".repeat(257);

    const result = await updateProfileAction(3, { bio: longBio });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/256 characters/i);
    }
    expect(mockUpdateAlt).not.toHaveBeenCalled();
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
