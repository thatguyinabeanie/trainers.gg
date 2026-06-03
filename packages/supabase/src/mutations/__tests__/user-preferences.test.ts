import { describe, it, expect, jest, beforeEach } from "@jest/globals";

import { createMockClient } from "@trainers/test-utils/mocks";

import type { TypedClient } from "../../client";
import { upsertUserPreferences } from "../user-preferences";

describe("upsertUserPreferences", () => {
  const userId = "user-abc-123";
  const preferences = {
    speedTiers: { defaultView: "sidepane", openOnLoad: true },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("calls upsert on the user_preferences table", async () => {
    const mockClient = createMockClient() as unknown as TypedClient;
    const fromSpy = jest.spyOn(mockClient, "from");
    const upsertMock = jest.fn().mockResolvedValue({ error: null });

    fromSpy.mockReturnValueOnce({
      upsert: upsertMock,
    } as unknown as ReturnType<TypedClient["from"]>);

    await upsertUserPreferences(mockClient, userId, preferences);

    expect(fromSpy).toHaveBeenCalledWith("user_preferences");
  });

  it("upserts with user_id and preferences payload", async () => {
    const mockClient = createMockClient() as unknown as TypedClient;
    const fromSpy = jest.spyOn(mockClient, "from");
    const upsertMock = jest.fn().mockResolvedValue({ error: null });

    fromSpy.mockReturnValueOnce({
      upsert: upsertMock,
    } as unknown as ReturnType<TypedClient["from"]>);

    await upsertUserPreferences(mockClient, userId, preferences);

    expect(upsertMock).toHaveBeenCalledWith(
      { user_id: userId, preferences },
      { onConflict: "user_id" }
    );
  });

  it("uses the onConflict: 'user_id' option for upsert", async () => {
    const mockClient = createMockClient() as unknown as TypedClient;
    const fromSpy = jest.spyOn(mockClient, "from");
    const upsertMock = jest.fn().mockResolvedValue({ error: null });

    fromSpy.mockReturnValueOnce({
      upsert: upsertMock,
    } as unknown as ReturnType<TypedClient["from"]>);

    await upsertUserPreferences(mockClient, userId, preferences);

    expect(upsertMock).toHaveBeenCalledWith(expect.anything(), {
      onConflict: "user_id",
    });
  });

  it("resolves without error on success", async () => {
    const mockClient = createMockClient() as unknown as TypedClient;
    const fromSpy = jest.spyOn(mockClient, "from");

    fromSpy.mockReturnValueOnce({
      upsert: jest.fn().mockResolvedValue({ error: null }),
    } as unknown as ReturnType<TypedClient["from"]>);

    await expect(
      upsertUserPreferences(mockClient, userId, preferences)
    ).resolves.toBeUndefined();
  });

  it("throws on a database error", async () => {
    const mockClient = createMockClient() as unknown as TypedClient;
    const dbError = new Error("unique constraint violation");
    const fromSpy = jest.spyOn(mockClient, "from");

    fromSpy.mockReturnValueOnce({
      upsert: jest.fn().mockResolvedValue({ error: dbError }),
    } as unknown as ReturnType<TypedClient["from"]>);

    await expect(
      upsertUserPreferences(mockClient, userId, preferences)
    ).rejects.toThrow("unique constraint violation");
  });

  it("handles updating existing preferences with new values", async () => {
    const updatedPreferences = {
      speedTiers: { defaultView: "dialog", openOnLoad: false },
    };
    const mockClient = createMockClient() as unknown as TypedClient;
    const fromSpy = jest.spyOn(mockClient, "from");
    const upsertMock = jest.fn().mockResolvedValue({ error: null });

    fromSpy.mockReturnValueOnce({
      upsert: upsertMock,
    } as unknown as ReturnType<TypedClient["from"]>);

    await upsertUserPreferences(mockClient, userId, updatedPreferences);

    expect(upsertMock).toHaveBeenCalledWith(
      { user_id: userId, preferences: updatedPreferences },
      { onConflict: "user_id" }
    );
  });

  it("handles an empty preferences object", async () => {
    const mockClient = createMockClient() as unknown as TypedClient;
    const fromSpy = jest.spyOn(mockClient, "from");
    const upsertMock = jest.fn().mockResolvedValue({ error: null });

    fromSpy.mockReturnValueOnce({
      upsert: upsertMock,
    } as unknown as ReturnType<TypedClient["from"]>);

    await upsertUserPreferences(mockClient, userId, {});

    expect(upsertMock).toHaveBeenCalledWith(
      { user_id: userId, preferences: {} },
      { onConflict: "user_id" }
    );
  });
});
