import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import {
  createDiscordServer,
  deleteDiscordServer,
  deleteDiscordServerByGuildId,
  upsertChannelMapping,
  deleteChannelMapping,
  upsertDmSetting,
  deleteDmSetting,
  setDmPreference,
  upsertRoleMapping,
  toggleRoleMapping,
  deleteRoleMapping,
  recordChannelFailure,
  resetChannelFailures,
  markChannelEmailSent,
  recordDeliveryFailure,
} from "../discord";
import type { TypedClient } from "../../client";
import { createMockClient } from "@trainers/test-utils/mocks";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let mockClient: TypedClient;

beforeEach(() => {
  mockClient = createMockClient() as unknown as TypedClient;
  jest.clearAllMocks();
});

function mockFrom(returnValue: Record<string, unknown>) {
  return jest
    .spyOn(mockClient, "from")
    .mockReturnValueOnce(returnValue as unknown as ReturnType<TypedClient["from"]>);
}

// Shorthand for void insert mutations
function voidInsert(error: unknown = null) {
  return { insert: jest.fn().mockResolvedValue({ error }) };
}

// ---------------------------------------------------------------------------
// discord_servers
// ---------------------------------------------------------------------------

describe("createDiscordServer", () => {
  it("inserts a server row", async () => {
    mockFrom(voidInsert());
    await expect(
      createDiscordServer(mockClient, {
        guild_id: "g1",
        community_id: 1,
        installed_by: "u1",
      })
    ).resolves.toBeUndefined();
  });

  it("uses default empty settings when omitted", async () => {
    const insertFn = jest.fn().mockResolvedValue({ error: null });
    mockFrom({ insert: insertFn });
    await createDiscordServer(mockClient, {
      guild_id: "g1",
      community_id: 1,
      installed_by: "u1",
    });
    expect(insertFn).toHaveBeenCalledWith(
      expect.objectContaining({ settings: {} })
    );
  });

  it("throws on error", async () => {
    mockFrom(voidInsert({ message: "duplicate" }));
    await expect(
      createDiscordServer(mockClient, {
        guild_id: "g1",
        community_id: 1,
        installed_by: "u1",
      })
    ).rejects.toThrow("Failed to create Discord server: duplicate");
  });
});

describe("deleteDiscordServer", () => {
  it("deletes by id", async () => {
    mockFrom({
      delete: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
    });
    await expect(deleteDiscordServer(mockClient, 1)).resolves.toBeUndefined();
  });

  it("throws on error", async () => {
    mockFrom({
      delete: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: { message: "not found" } }),
      }),
    });
    await expect(deleteDiscordServer(mockClient, 999)).rejects.toThrow(
      "Failed to delete Discord server: not found"
    );
  });
});

describe("deleteDiscordServerByGuildId", () => {
  it("deletes by guild_id", async () => {
    mockFrom({
      delete: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
    });
    await expect(
      deleteDiscordServerByGuildId(mockClient, "g1")
    ).resolves.toBeUndefined();
  });

  it("throws on error", async () => {
    mockFrom({
      delete: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: { message: "fail" } }),
      }),
    });
    await expect(
      deleteDiscordServerByGuildId(mockClient, "g1")
    ).rejects.toThrow("Failed to delete Discord server by guild ID: fail");
  });
});

// ---------------------------------------------------------------------------
// discord_channels
// ---------------------------------------------------------------------------

describe("upsertChannelMapping", () => {
  it("returns the upserted row id", async () => {
    mockFrom({
      upsert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest
            .fn()
            .mockResolvedValue({ data: { id: 42 }, error: null }),
        }),
      }),
    });
    const result = await upsertChannelMapping(mockClient, {
      discord_server_id: 1,
      channel_id: "ch1",
      event_type: "round_posted",
    });
    expect(result).toEqual({ id: 42 });
  });

  it("throws on error", async () => {
    mockFrom({
      upsert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest
            .fn()
            .mockResolvedValue({ data: null, error: { message: "conflict" } }),
        }),
      }),
    });
    await expect(
      upsertChannelMapping(mockClient, {
        discord_server_id: 1,
        channel_id: "ch1",
        event_type: "round_posted",
      })
    ).rejects.toThrow("Failed to upsert channel mapping: conflict");
  });
});

describe("deleteChannelMapping", () => {
  it("deletes by id", async () => {
    mockFrom({
      delete: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
    });
    await expect(deleteChannelMapping(mockClient, 1)).resolves.toBeUndefined();
  });

  it("throws on error", async () => {
    mockFrom({
      delete: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: { message: "nope" } }),
      }),
    });
    await expect(deleteChannelMapping(mockClient, 1)).rejects.toThrow(
      "Failed to delete channel mapping: nope"
    );
  });
});

// ---------------------------------------------------------------------------
// discord_dm_settings
// ---------------------------------------------------------------------------

describe("upsertDmSetting", () => {
  it("upserts with explicit fallback_channel_id", async () => {
    const upsertFn = jest.fn().mockResolvedValue({ error: null });
    mockFrom({ upsert: upsertFn });
    await upsertDmSetting(mockClient, {
      discord_server_id: 1,
      event_type: "match_ready",
      delivery_mode: "dm_with_fallback",
      fallback_channel_id: "ch99",
    });
    expect(upsertFn).toHaveBeenCalledWith(
      expect.objectContaining({ fallback_channel_id: "ch99" }),
      expect.any(Object)
    );
  });

  it("defaults fallback_channel_id to null", async () => {
    const upsertFn = jest.fn().mockResolvedValue({ error: null });
    mockFrom({ upsert: upsertFn });
    await upsertDmSetting(mockClient, {
      discord_server_id: 1,
      event_type: "match_ready",
      delivery_mode: "dm_only",
    });
    expect(upsertFn).toHaveBeenCalledWith(
      expect.objectContaining({ fallback_channel_id: null }),
      expect.any(Object)
    );
  });

  it("throws on error", async () => {
    mockFrom({
      upsert: jest.fn().mockResolvedValue({ error: { message: "upsert fail" } }),
    });
    await expect(
      upsertDmSetting(mockClient, {
        discord_server_id: 1,
        event_type: "match_ready",
        delivery_mode: "dm_only",
      })
    ).rejects.toThrow("Failed to upsert DM setting: upsert fail");
  });
});

describe("deleteDmSetting", () => {
  it("deletes by id", async () => {
    mockFrom({
      delete: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
    });
    await expect(deleteDmSetting(mockClient, 5)).resolves.toBeUndefined();
  });

  it("throws on error", async () => {
    mockFrom({
      delete: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: { message: "del fail" } }),
      }),
    });
    await expect(deleteDmSetting(mockClient, 5)).rejects.toThrow(
      "Failed to delete DM setting: del fail"
    );
  });
});

// ---------------------------------------------------------------------------
// discord_user_dm_preferences
// ---------------------------------------------------------------------------

describe("setDmPreference", () => {
  it("upserts a preference row", async () => {
    mockFrom({
      upsert: jest.fn().mockResolvedValue({ error: null }),
    });
    await expect(
      setDmPreference(mockClient, "user1", "match_ready", true)
    ).resolves.toBeUndefined();
  });

  it("throws on error", async () => {
    mockFrom({
      upsert: jest
        .fn()
        .mockResolvedValue({ error: { message: "pref fail" } }),
    });
    await expect(
      setDmPreference(mockClient, "user1", "match_ready", true)
    ).rejects.toThrow("Failed to set DM preference: pref fail");
  });
});

// ---------------------------------------------------------------------------
// discord_role_mappings
// ---------------------------------------------------------------------------

describe("upsertRoleMapping", () => {
  it("returns the upserted row id", async () => {
    mockFrom({
      upsert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest
            .fn()
            .mockResolvedValue({ data: { id: 7 }, error: null }),
        }),
      }),
    });
    const result = await upsertRoleMapping(mockClient, {
      discord_server_id: 1,
      role_type: "staff",
      discord_role_id: "r1",
    });
    expect(result).toEqual({ id: 7 });
  });

  it("defaults enabled to true", async () => {
    const upsertFn = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest
          .fn()
          .mockResolvedValue({ data: { id: 7 }, error: null }),
      }),
    });
    mockFrom({ upsert: upsertFn });
    await upsertRoleMapping(mockClient, {
      discord_server_id: 1,
      role_type: "staff",
      discord_role_id: "r1",
    });
    expect(upsertFn).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: true }),
      expect.any(Object)
    );
  });

  it("passes explicit enabled value", async () => {
    const upsertFn = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest
          .fn()
          .mockResolvedValue({ data: { id: 7 }, error: null }),
      }),
    });
    mockFrom({ upsert: upsertFn });
    await upsertRoleMapping(mockClient, {
      discord_server_id: 1,
      role_type: "staff",
      discord_role_id: "r1",
      enabled: false,
    });
    expect(upsertFn).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
      expect.any(Object)
    );
  });

  it("throws on error", async () => {
    mockFrom({
      upsert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest
            .fn()
            .mockResolvedValue({ data: null, error: { message: "role fail" } }),
        }),
      }),
    });
    await expect(
      upsertRoleMapping(mockClient, {
        discord_server_id: 1,
        role_type: "staff",
        discord_role_id: "r1",
      })
    ).rejects.toThrow("Failed to upsert role mapping: role fail");
  });
});

describe("toggleRoleMapping", () => {
  it("updates enabled flag", async () => {
    mockFrom({
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
    });
    await expect(
      toggleRoleMapping(mockClient, 1, false)
    ).resolves.toBeUndefined();
  });

  it("throws on error", async () => {
    mockFrom({
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: { message: "toggle fail" } }),
      }),
    });
    await expect(toggleRoleMapping(mockClient, 1, false)).rejects.toThrow(
      "Failed to toggle role mapping: toggle fail"
    );
  });
});

describe("deleteRoleMapping", () => {
  it("deletes by id", async () => {
    mockFrom({
      delete: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
    });
    await expect(deleteRoleMapping(mockClient, 1)).resolves.toBeUndefined();
  });

  it("throws on error", async () => {
    mockFrom({
      delete: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: { message: "del role" } }),
      }),
    });
    await expect(deleteRoleMapping(mockClient, 1)).rejects.toThrow(
      "Failed to delete role mapping: del role"
    );
  });
});

// ---------------------------------------------------------------------------
// discord_channel_failures — recordChannelFailure
// ---------------------------------------------------------------------------

describe("recordChannelFailure", () => {
  it("increments counter when row exists", async () => {
    const fromSpy = jest.spyOn(mockClient, "from");
    // First call: read existing row
    fromSpy.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: { id: 10, consecutive_failures: 3 },
              error: null,
            }),
          }),
        }),
      }),
    } as unknown as ReturnType<TypedClient["from"]>);
    // Second call: update
    fromSpy.mockReturnValueOnce({
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
    } as unknown as ReturnType<TypedClient["from"]>);

    const result = await recordChannelFailure(mockClient, 1, "ch1");
    expect(result).toEqual({ consecutive_failures: 4 });
  });

  it("inserts new row when none exists", async () => {
    const fromSpy = jest.spyOn(mockClient, "from");
    // Read: no row
    fromSpy.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest
              .fn()
              .mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }),
    } as unknown as ReturnType<TypedClient["from"]>);
    // Insert: success
    fromSpy.mockReturnValueOnce({
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { consecutive_failures: 1 },
            error: null,
          }),
        }),
      }),
    } as unknown as ReturnType<TypedClient["from"]>);

    const result = await recordChannelFailure(mockClient, 1, "ch1");
    expect(result).toEqual({ consecutive_failures: 1 });
  });

  it("retries on race condition (23505)", async () => {
    const fromSpy = jest.spyOn(mockClient, "from");
    // Read: no row
    fromSpy.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest
              .fn()
              .mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }),
    } as unknown as ReturnType<TypedClient["from"]>);
    // Insert: duplicate key
    fromSpy.mockReturnValueOnce({
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { code: "23505", message: "duplicate key" },
          }),
        }),
      }),
    } as unknown as ReturnType<TypedClient["from"]>);
    // Retry read
    fromSpy.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 20, consecutive_failures: 1 },
              error: null,
            }),
          }),
        }),
      }),
    } as unknown as ReturnType<TypedClient["from"]>);
    // Retry update
    fromSpy.mockReturnValueOnce({
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
    } as unknown as ReturnType<TypedClient["from"]>);

    const result = await recordChannelFailure(mockClient, 1, "ch1");
    expect(result).toEqual({ consecutive_failures: 2 });
  });

  it("throws on read error", async () => {
    const fromSpy = jest.spyOn(mockClient, "from");
    fromSpy.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest
              .fn()
              .mockResolvedValue({ data: null, error: { message: "read err" } }),
          }),
        }),
      }),
    } as unknown as ReturnType<TypedClient["from"]>);

    await expect(recordChannelFailure(mockClient, 1, "ch1")).rejects.toThrow(
      "Failed to read channel failure record: read err"
    );
  });

  it("throws on non-23505 insert error", async () => {
    const fromSpy = jest.spyOn(mockClient, "from");
    fromSpy.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest
              .fn()
              .mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }),
    } as unknown as ReturnType<TypedClient["from"]>);
    fromSpy.mockReturnValueOnce({
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { code: "42P01", message: "table missing" },
          }),
        }),
      }),
    } as unknown as ReturnType<TypedClient["from"]>);

    await expect(recordChannelFailure(mockClient, 1, "ch1")).rejects.toThrow(
      "Failed to record channel failure (insert): table missing"
    );
  });

  it("throws on retry read error", async () => {
    const fromSpy = jest.spyOn(mockClient, "from");
    fromSpy.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest
              .fn()
              .mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }),
    } as unknown as ReturnType<TypedClient["from"]>);
    fromSpy.mockReturnValueOnce({
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { code: "23505", message: "dup" },
          }),
        }),
      }),
    } as unknown as ReturnType<TypedClient["from"]>);
    fromSpy.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: "retry read fail" },
            }),
          }),
        }),
      }),
    } as unknown as ReturnType<TypedClient["from"]>);

    await expect(recordChannelFailure(mockClient, 1, "ch1")).rejects.toThrow(
      "Failed to read channel failure on retry: retry read fail"
    );
  });
});

// ---------------------------------------------------------------------------
// resetChannelFailures / markChannelEmailSent
// ---------------------------------------------------------------------------

describe("resetChannelFailures", () => {
  it("resets counters for the channel", async () => {
    mockFrom({
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      }),
    });
    await expect(
      resetChannelFailures(mockClient, 1, "ch1")
    ).resolves.toBeUndefined();
  });

  it("throws on error", async () => {
    mockFrom({
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest
            .fn()
            .mockResolvedValue({ error: { message: "reset fail" } }),
        }),
      }),
    });
    await expect(
      resetChannelFailures(mockClient, 1, "ch1")
    ).rejects.toThrow("Failed to reset channel failures: reset fail");
  });
});

describe("markChannelEmailSent", () => {
  it("marks email sent timestamp", async () => {
    mockFrom({
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      }),
    });
    await expect(
      markChannelEmailSent(mockClient, 1, "ch1")
    ).resolves.toBeUndefined();
  });

  it("throws on error", async () => {
    mockFrom({
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest
            .fn()
            .mockResolvedValue({ error: { message: "email fail" } }),
        }),
      }),
    });
    await expect(markChannelEmailSent(mockClient, 1, "ch1")).rejects.toThrow(
      "Failed to mark channel email sent: email fail"
    );
  });
});

// ---------------------------------------------------------------------------
// discord_delivery_failures
// ---------------------------------------------------------------------------

describe("recordDeliveryFailure", () => {
  it("looks up community_id then inserts failure row", async () => {
    const fromSpy = jest.spyOn(mockClient, "from");
    // Server lookup
    fromSpy.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { community_id: 42 },
            error: null,
          }),
        }),
      }),
    } as unknown as ReturnType<TypedClient["from"]>);
    // Insert failure
    fromSpy.mockReturnValueOnce({
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest
            .fn()
            .mockResolvedValue({ data: { id: 100 }, error: null }),
        }),
      }),
    } as unknown as ReturnType<TypedClient["from"]>);

    const result = await recordDeliveryFailure(mockClient, {
      discord_server_id: 1,
      type: "channel",
      event_type: "round_posted",
      target: "#general",
      error_reason: "403 Forbidden",
    });
    expect(result).toEqual({ id: 100 });
  });

  it("throws on server lookup failure", async () => {
    mockFrom({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { message: "server not found" },
          }),
        }),
      }),
    });
    await expect(
      recordDeliveryFailure(mockClient, {
        discord_server_id: 999,
        type: "dm",
        event_type: "match_ready",
        target: "user#1234",
        error_reason: "Unknown",
      })
    ).rejects.toThrow(
      "Failed to resolve community for delivery failure: server not found"
    );
  });

  it("throws on insert failure", async () => {
    const fromSpy = jest.spyOn(mockClient, "from");
    fromSpy.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { community_id: 42 },
            error: null,
          }),
        }),
      }),
    } as unknown as ReturnType<TypedClient["from"]>);
    fromSpy.mockReturnValueOnce({
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { message: "insert fail" },
          }),
        }),
      }),
    } as unknown as ReturnType<TypedClient["from"]>);

    await expect(
      recordDeliveryFailure(mockClient, {
        discord_server_id: 1,
        type: "role_sync",
        event_type: "staff",
        target: "role:123",
        error_reason: "Missing permissions",
      })
    ).rejects.toThrow("Failed to record delivery failure: insert fail");
  });

  it("defaults optional fields", async () => {
    const fromSpy = jest.spyOn(mockClient, "from");
    fromSpy.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { community_id: 42 },
            error: null,
          }),
        }),
      }),
    } as unknown as ReturnType<TypedClient["from"]>);
    const insertFn = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest
          .fn()
          .mockResolvedValue({ data: { id: 101 }, error: null }),
      }),
    });
    fromSpy.mockReturnValueOnce({
      insert: insertFn,
    } as unknown as ReturnType<TypedClient["from"]>);

    await recordDeliveryFailure(mockClient, {
      discord_server_id: 1,
      type: "channel",
      event_type: "round_posted",
      target: "#general",
      error_reason: "timeout",
    });

    expect(insertFn).toHaveBeenCalledWith(
      expect.objectContaining({
        error_code: null,
        payload: null,
        delivered_via_fallback: false,
      })
    );
  });
});
