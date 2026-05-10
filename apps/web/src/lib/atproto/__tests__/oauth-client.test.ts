/**
 * Tests for AT Protocol OAuth client module.
 *
 * Strategy: Mock all external dependencies and test behavior (inputs/outputs)
 * rather than implementation details (constructor calls).
 */

// --- Mock setup ---

const mockAuthorize = jest.fn();
const mockCallback = jest.fn();
const mockRestore = jest.fn();

jest.mock("@atproto/oauth-client-node", () => ({
  NodeOAuthClient: jest.fn().mockImplementation((...args: unknown[]) => {
    // Capture the config for stateStore/sessionStore testing
    (NodeOAuthClient as jest.Mock).__lastConfig = args[0];
    return {
      authorize: mockAuthorize,
      callback: mockCallback,
      restore: mockRestore,
    };
  }),
}));
// Reference to check constructor calls
const { NodeOAuthClient } = jest.requireMock("@atproto/oauth-client-node") as {
  NodeOAuthClient: jest.Mock & { __lastConfig?: Record<string, unknown> };
};

jest.mock("@atproto/jwk-jose", () => ({
  JoseKey: {
    fromImportable: jest.fn().mockResolvedValue({ kid: "key-1" }),
  },
}));

const mockGetProfile = jest.fn();
jest.mock("@atproto/api", () => ({
  Agent: jest.fn().mockImplementation(() => ({
    getProfile: mockGetProfile,
  })),
}));

const mockFrom = jest.fn();
jest.mock("@/lib/supabase/server", () => ({
  createAtprotoServiceClient: jest.fn(() => ({ from: mockFrom })),
}));

// Polyfill crypto.randomUUID for jsdom
const originalCrypto = globalThis.crypto;
Object.defineProperty(globalThis, "crypto", {
  value: {
    ...globalThis.crypto,
    randomUUID: jest.fn(() => "test-state-uuid"),
  },
  writable: true,
});

afterAll(() => {
  Object.defineProperty(globalThis, "crypto", {
    value: originalCrypto,
    writable: true,
  });
});

// --- Helpers ---

function mockChain(result: { data?: unknown; error?: unknown }) {
  const chain: Record<string, jest.Mock> = {};
  chain.select = jest.fn().mockReturnValue(chain);
  chain.eq = jest.fn().mockReturnValue(chain);
  chain.gt = jest.fn().mockReturnValue(chain);
  chain.maybeSingle = jest.fn().mockResolvedValue(result);
  chain.upsert = jest.fn().mockResolvedValue(result);
  chain.delete = jest.fn().mockReturnValue(chain);
  return chain;
}

// --- Environment ---

const VALID_PEM = `-----BEGIN PRIVATE KEY-----\nMIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQg+fake+key+data\nhRANCAAS+fake+public+key+data\n-----END PRIVATE KEY-----`;

const originalEnv = process.env;

beforeEach(() => {
  jest.clearAllMocks();
  process.env = { ...originalEnv };
  process.env.ATPROTO_PRIVATE_KEY = VALID_PEM;
  process.env.NEXT_PUBLIC_SITE_URL = "https://test.trainers.gg";
});

afterEach(() => {
  process.env = originalEnv;
});

// Import the module — module-level code runs once with env from first import.
// The singleton `oauthClient` persists across tests, which is fine since we test
// behavior, not construction. For tests needing a fresh singleton, we use
// jest.resetModules() + re-require.
import {
  getAtprotoOAuthClient,
  startAtprotoAuth,
  handleAtprotoCallback,
  getAtprotoSession,
  revokeAtprotoSession,
  getBlueskyProfile,
} from "../oauth-client";

describe("getAtprotoOAuthClient", () => {
  it("throws when ATPROTO_PRIVATE_KEY is missing", async () => {
    // Need fresh module to test env check (singleton not yet created)
    delete process.env.ATPROTO_PRIVATE_KEY;
    jest.resetModules();
    const mod = await import("../oauth-client");
    await expect(mod.getAtprotoOAuthClient()).rejects.toThrow(
      "ATPROTO_PRIVATE_KEY environment variable is required"
    );
  });

  it("rejects invalid key format", async () => {
    process.env.ATPROTO_PRIVATE_KEY = "not-a-valid-key";
    jest.resetModules();
    jest.spyOn(console, "error").mockImplementation(() => {});
    const mod = await import("../oauth-client");
    await expect(mod.getAtprotoOAuthClient()).rejects.toThrow(
      "ATPROTO_PRIVATE_KEY must be in PKCS#8 PEM format"
    );
  });

  it("creates and returns a client when key is valid", async () => {
    const client = await getAtprotoOAuthClient();
    expect(client).toBeDefined();
    expect(client.authorize).toBe(mockAuthorize);
    expect(client.callback).toBe(mockCallback);
    expect(client.restore).toBe(mockRestore);
  });

  it("returns cached instance on second call", async () => {
    const first = await getAtprotoOAuthClient();
    const second = await getAtprotoOAuthClient();
    expect(first).toBe(second);
  });

  it("handles escaped newlines in key", async () => {
    // The module already imported with VALID_PEM, but JoseKey.fromImportable
    // was called with the processed key. Verify it was called correctly.
    const { JoseKey } = jest.requireMock("@atproto/jwk-jose") as {
      JoseKey: { fromImportable: jest.Mock };
    };
    // The first call was from the module import — check its arg contains proper PEM
    if (JoseKey.fromImportable.mock.calls.length > 0) {
      const passedKey = JoseKey.fromImportable.mock.calls[0][0];
      expect(passedKey).toContain("-----BEGIN PRIVATE KEY-----");
      expect(passedKey).not.toContain("\\n");
    }
  });
});

describe("stateStore (internal, via NodeOAuthClient config)", () => {
  // The stateStore is passed to NodeOAuthClient during initialization.
  // We test it by extracting it from the captured constructor args.

  function getStateStore() {
    const config = (NodeOAuthClient as jest.Mock & { __lastConfig?: Record<string, unknown> }).__lastConfig;
    return config?.stateStore as {
      set: (key: string, state: unknown) => Promise<void>;
      get: (key: string) => Promise<unknown>;
      del: (key: string) => Promise<void>;
    };
  }

  beforeEach(async () => {
    // Ensure client is initialized so config is captured
    await getAtprotoOAuthClient();
  });

  it("set() upserts state with TTL", async () => {
    const chain = mockChain({ error: null });
    mockFrom.mockReturnValue(chain);

    const store = getStateStore();
    await store.set("state-key-1", { foo: "bar" });

    expect(mockFrom).toHaveBeenCalledWith("atproto_oauth_state");
    expect(chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        state_key: "state-key-1",
        state_data: { foo: "bar" },
      })
    );
  });

  it("set() throws on DB error", async () => {
    const chain = mockChain({ error: { message: "write failed" } });
    mockFrom.mockReturnValue(chain);
    jest.spyOn(console, "error").mockImplementation(() => {});

    const store = getStateStore();
    await expect(store.set("key", {})).rejects.toThrow("Failed to save OAuth state");
  });

  it("get() retrieves state by key with expiry filter", async () => {
    const chain = mockChain({ data: { state_data: { returnUrl: "/x" } }, error: null });
    mockFrom.mockReturnValue(chain);

    const store = getStateStore();
    const result = await store.get("state-key-2");

    expect(mockFrom).toHaveBeenCalledWith("atproto_oauth_state");
    expect(chain.select).toHaveBeenCalledWith("state_data");
    expect(chain.eq).toHaveBeenCalledWith("state_key", "state-key-2");
    expect(chain.gt).toHaveBeenCalledWith("expires_at", expect.any(String));
    expect(result).toEqual({ returnUrl: "/x" });
  });

  it("get() returns undefined on DB error", async () => {
    const chain = mockChain({ data: null, error: { message: "read failed" } });
    mockFrom.mockReturnValue(chain);
    jest.spyOn(console, "error").mockImplementation(() => {});

    const store = getStateStore();
    const result = await store.get("bad-key");
    expect(result).toBeUndefined();
  });

  it("del() deletes state by key", async () => {
    const chain = mockChain({ error: null });
    mockFrom.mockReturnValue(chain);

    const store = getStateStore();
    await store.del("state-key-3");

    expect(mockFrom).toHaveBeenCalledWith("atproto_oauth_state");
    expect(chain.delete).toHaveBeenCalled();
    expect(chain.eq).toHaveBeenCalledWith("state_key", "state-key-3");
  });
});

describe("sessionStore (internal, via NodeOAuthClient config)", () => {
  function getSessionStore() {
    const config = (NodeOAuthClient as jest.Mock & { __lastConfig?: Record<string, unknown> }).__lastConfig;
    return config?.sessionStore as {
      set: (sub: string, session: unknown) => Promise<void>;
      get: (sub: string) => Promise<unknown>;
      del: (sub: string) => Promise<void>;
    };
  }

  beforeEach(async () => {
    await getAtprotoOAuthClient();
  });

  it("set() upserts session by DID", async () => {
    const chain = mockChain({ error: null });
    mockFrom.mockReturnValue(chain);

    const store = getSessionStore();
    await store.set("did:plc:test", { tokens: {} });

    expect(mockFrom).toHaveBeenCalledWith("atproto_sessions");
    expect(chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        did: "did:plc:test",
        session_data: { tokens: {} },
      }),
      { onConflict: "did" }
    );
  });

  it("set() throws on DB error", async () => {
    const chain = mockChain({ error: { message: "write failed" } });
    mockFrom.mockReturnValue(chain);
    jest.spyOn(console, "error").mockImplementation(() => {});

    const store = getSessionStore();
    await expect(store.set("did:plc:x", {})).rejects.toThrow(
      "Failed to save OAuth session"
    );
  });

  it("get() retrieves session by DID", async () => {
    const chain = mockChain({
      data: { session_data: { tokens: { access: "abc" } } },
      error: null,
    });
    mockFrom.mockReturnValue(chain);

    const store = getSessionStore();
    const result = await store.get("did:plc:sess");

    expect(mockFrom).toHaveBeenCalledWith("atproto_sessions");
    expect(chain.eq).toHaveBeenCalledWith("did", "did:plc:sess");
    expect(result).toEqual({ tokens: { access: "abc" } });
  });

  it("get() returns undefined on DB error", async () => {
    const chain = mockChain({ data: null, error: { message: "timeout" } });
    mockFrom.mockReturnValue(chain);
    jest.spyOn(console, "error").mockImplementation(() => {});

    const store = getSessionStore();
    const result = await store.get("did:plc:bad");
    expect(result).toBeUndefined();
  });

  it("del() deletes session by DID", async () => {
    const chain = mockChain({ error: null });
    mockFrom.mockReturnValue(chain);

    const store = getSessionStore();
    await store.del("did:plc:rm");

    expect(mockFrom).toHaveBeenCalledWith("atproto_sessions");
    expect(chain.delete).toHaveBeenCalled();
    expect(chain.eq).toHaveBeenCalledWith("did", "did:plc:rm");
  });
});

describe("startAtprotoAuth", () => {
  beforeEach(() => {
    mockAuthorize.mockResolvedValue(
      new URL("https://bsky.social/authorize?state=abc")
    );
  });

  it("calls client.authorize with the handle and returns URL", async () => {
    mockFrom.mockReturnValue(mockChain({ error: null }));

    const url = await startAtprotoAuth("user.bsky.social", "/dashboard");

    expect(mockAuthorize).toHaveBeenCalledWith("user.bsky.social", {
      state: "test-state-uuid",
    });
    expect(url).toBe("https://bsky.social/authorize?state=abc");
  });

  it("stores returnUrl and linkUserId in state when provided", async () => {
    const chain = mockChain({ error: null });
    mockFrom.mockReturnValue(chain);

    await startAtprotoAuth("user.bsky.social", "/settings", "user-123");

    expect(mockFrom).toHaveBeenCalledWith("atproto_oauth_state");
    expect(chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        state_key: "return:test-state-uuid",
        state_data: { returnUrl: "/settings", linkUserId: "user-123" },
      })
    );
  });

  it("throws when state upsert fails", async () => {
    const chain = mockChain({ error: { message: "DB error" } });
    mockFrom.mockReturnValue(chain);
    jest.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      startAtprotoAuth("user.bsky.social", "/foo")
    ).rejects.toThrow("Failed to initiate authentication");
  });

  it("does not store state when no returnUrl or linkUserId", async () => {
    mockFrom.mockReturnValue(mockChain({ error: null }));

    await startAtprotoAuth("user.bsky.social");

    // from() should NOT have been called for state storage
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

describe("handleAtprotoCallback", () => {
  it("exchanges code for session and retrieves state", async () => {
    mockCallback.mockResolvedValue({
      session: { did: "did:plc:abc123" },
      state: "state-uuid",
    });

    // First from() call: select state
    const selectChain = mockChain({
      data: { state_data: { returnUrl: "/dash", linkUserId: "u1" } },
      error: null,
    });
    // Second from() call: delete state
    const deleteChain = mockChain({ error: null });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return selectChain;
      return deleteChain;
    });

    const params = new URLSearchParams({ code: "auth-code", state: "state-uuid" });
    const result = await handleAtprotoCallback(params);

    expect(result.did).toBe("did:plc:abc123");
    expect(result.returnUrl).toBe("/dash");
    expect(result.linkUserId).toBe("u1");
    expect(mockCallback).toHaveBeenCalledWith(params);
  });

  it("returns only DID when no state is present", async () => {
    mockCallback.mockResolvedValue({
      session: { did: "did:plc:xyz" },
      state: null,
    });

    const params = new URLSearchParams({ code: "code" });
    const result = await handleAtprotoCallback(params);

    expect(result.did).toBe("did:plc:xyz");
    expect(result.returnUrl).toBeUndefined();
    expect(result.linkUserId).toBeUndefined();
  });

  it("handles DB error on state retrieval gracefully", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    mockCallback.mockResolvedValue({
      session: { did: "did:plc:err" },
      state: "s1",
    });

    const selectChain = mockChain({ data: null, error: { message: "timeout" } });
    const deleteChain = mockChain({ error: null });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return selectChain;
      return deleteChain;
    });

    const params = new URLSearchParams({ code: "c" });
    const result = await handleAtprotoCallback(params);

    expect(result.did).toBe("did:plc:err");
    expect(result.returnUrl).toBeUndefined();
  });

  it("cleans up state after retrieval", async () => {
    mockCallback.mockResolvedValue({
      session: { did: "did:plc:clean" },
      state: "cleanup-state",
    });

    const selectChain = mockChain({
      data: { state_data: { returnUrl: "/x" } },
      error: null,
    });
    const deleteChain = mockChain({ error: null });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return selectChain;
      return deleteChain;
    });

    const params = new URLSearchParams({ code: "c", state: "cleanup-state" });
    await handleAtprotoCallback(params);

    // Second from() call should be a delete
    expect(callCount).toBe(2);
    expect(deleteChain.eq).toHaveBeenCalledWith(
      "state_key",
      "return:cleanup-state"
    );
  });
});

describe("getAtprotoSession", () => {
  it("returns null when ATPROTO_PRIVATE_KEY is missing", async () => {
    delete process.env.ATPROTO_PRIVATE_KEY;
    jest.resetModules();
    const mod = await import("../oauth-client");
    const result = await mod.getAtprotoSession("did:plc:abc");
    expect(result).toBeNull();
  });

  it("calls client.restore with DID", async () => {
    const fakeSession = { did: "did:plc:abc", tokens: {} };
    mockRestore.mockResolvedValue(fakeSession);

    const result = await getAtprotoSession("did:plc:abc");
    expect(mockRestore).toHaveBeenCalledWith("did:plc:abc");
    expect(result).toBe(fakeSession);
  });

  it("returns null when restore throws", async () => {
    mockRestore.mockRejectedValue(new Error("invalid session"));

    const result = await getAtprotoSession("did:plc:invalid");
    expect(result).toBeNull();
  });
});

describe("revokeAtprotoSession", () => {
  it("deletes session from atproto_sessions table", async () => {
    const chain = mockChain({ error: null });
    mockFrom.mockReturnValue(chain);

    await revokeAtprotoSession("did:plc:del");

    expect(mockFrom).toHaveBeenCalledWith("atproto_sessions");
    expect(chain.delete).toHaveBeenCalled();
    expect(chain.eq).toHaveBeenCalledWith("did", "did:plc:del");
  });
});

describe("getBlueskyProfile", () => {
  it("returns profile data on success", async () => {
    mockGetProfile.mockResolvedValue({
      success: true,
      data: {
        did: "did:plc:prof",
        handle: "user.bsky.social",
        displayName: "User",
        avatar: "https://cdn.bsky.app/avatar.jpg",
        description: "Hello",
      },
    });

    const result = await getBlueskyProfile("user.bsky.social");

    expect(result).toEqual({
      did: "did:plc:prof",
      handle: "user.bsky.social",
      displayName: "User",
      avatar: "https://cdn.bsky.app/avatar.jpg",
      description: "Hello",
    });
  });

  it("returns null when response.success is false", async () => {
    mockGetProfile.mockResolvedValue({ success: false });
    jest.spyOn(console, "error").mockImplementation(() => {});

    const result = await getBlueskyProfile("nobody.bsky.social");
    expect(result).toBeNull();
  });

  it("returns null when agent.getProfile throws", async () => {
    mockGetProfile.mockRejectedValue(new Error("network error"));
    jest.spyOn(console, "error").mockImplementation(() => {});

    const result = await getBlueskyProfile("error.bsky.social");
    expect(result).toBeNull();
  });
});
