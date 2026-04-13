/**
 * @jest-environment node
 *
 * Tests for useTeamBuilderAccess hook.
 *
 * The hook uses useState + useEffect to asynchronously decode the
 * `team_builder_access` JWT claim from the Supabase session. We mock
 * React's hooks so we can drive the async effect synchronously without
 * needing a jsdom environment or a full React render.
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import type { User, Session, SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Helpers — build minimal JWT tokens for test assertions
// ---------------------------------------------------------------------------

/**
 * Encode a JSON payload as a base64url segment (matching the JWT format the
 * hook parses: `header.payload.signature`).
 */
function makeJwt(claims: Record<string, unknown>): string {
  const payload = Buffer.from(JSON.stringify(claims))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
  return `header.${payload}.signature`;
}

// ---------------------------------------------------------------------------
// Mock React — capture state-setter calls and execute effects synchronously
// ---------------------------------------------------------------------------

// Capture the latest state setter invocations so we can inspect them.
const mockSetHasAccess = jest.fn<(value: boolean) => void>();
const mockSetIsLoading = jest.fn<(value: boolean) => void>();

// Track effects so we can run them manually.
const capturedEffects: Array<() => void | (() => void)> = [];

jest.mock("react", () => ({
  // useState returns [initialValue, setter] in call order:
  //   call 1 → hasAccess (initial: false)
  //   call 2 → isLoading (initial: true)
  useState: jest.fn((initial: unknown) => {
    if (initial === false) return [false, mockSetHasAccess];
    if (initial === true) return [true, mockSetIsLoading];
    return [initial, jest.fn()];
  }),
  // useEffect captures the callback so tests can invoke it.
  useEffect: jest.fn((cb: () => void | (() => void)) => {
    capturedEffects.push(cb);
  }),
}));

// Import the hook AFTER mocking React so the mock is in place.
import { useTeamBuilderAccess } from "../use-team-builder-access";

// ---------------------------------------------------------------------------
// Shared test helpers
// ---------------------------------------------------------------------------

/** Create a minimal SupabaseClient mock with a configurable getSession result. */
function makeSupabaseClient(session: Session | null): SupabaseClient {
  return {
    auth: {
      getSession: jest
        .fn<() => Promise<{ data: { session: Session | null } }>>()
        .mockResolvedValue({ data: { session } }),
    },
  } as unknown as SupabaseClient;
}

/** Build a minimal Supabase User. */
function makeUser(id = "user-123"): User {
  return { id } as User;
}

/** Build a minimal Session with the given JWT. */
function makeSession(accessToken: string): Session {
  return { access_token: accessToken } as Session;
}

/**
 * Run the hook and flush all captured effects.
 * Returns a promise that resolves when all effects complete.
 */
async function runHook(params: Parameters<typeof useTeamBuilderAccess>[0]) {
  // Clear any effects captured by previous test runs.
  capturedEffects.length = 0;

  useTeamBuilderAccess(params);

  // Execute all captured effects (the hook registers one useEffect).
  for (const effect of capturedEffects) {
    await effect();
  }
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  capturedEffects.length = 0;
});

// =============================================================================
// useTeamBuilderAccess
// =============================================================================

describe("useTeamBuilderAccess", () => {
  // ---------------------------------------------------------------------------
  // Initial return value (synchronous)
  // ---------------------------------------------------------------------------

  describe("initial return value", () => {
    it("returns hasAccess:false and isLoading:true before the effect resolves", () => {
      const result = useTeamBuilderAccess({
        getSupabaseClient: () => makeSupabaseClient(null),
        user: makeUser(),
      });

      // Before any effect runs, useState initialises: hasAccess=false, isLoading=true.
      // userLoading defaults to false, so isLoading = false || true = true.
      expect(result).toEqual({ hasAccess: false, isLoading: true });
    });

    it("reflects userLoading:true in isLoading even when internal loading is false", () => {
      // userLoading=true → isLoading = true || isLoading-state
      // The useState mock returns isLoading-state=true initially, so this is true || true = true.
      const result = useTeamBuilderAccess({
        getSupabaseClient: () => makeSupabaseClient(null),
        user: makeUser(),
        userLoading: true,
      });

      expect(result.isLoading).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // No user
  // ---------------------------------------------------------------------------

  describe("when user is null", () => {
    it("sets hasAccess:false and clears isLoading without calling getSession", async () => {
      const getSupabaseClient = jest.fn(() => makeSupabaseClient(null));

      await runHook({ getSupabaseClient, user: null });

      expect(mockSetHasAccess).toHaveBeenCalledWith(false);
      expect(mockSetIsLoading).toHaveBeenCalledWith(false);
      // Should not attempt to fetch a session when there is no user.
      expect(getSupabaseClient).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Session with team_builder_access claim
  // ---------------------------------------------------------------------------

  describe("when session has team_builder_access:true", () => {
    it("sets hasAccess:true", async () => {
      const jwt = makeJwt({ sub: "user-123", team_builder_access: true });
      const client = makeSupabaseClient(makeSession(jwt));

      await runHook({ getSupabaseClient: () => client, user: makeUser() });

      expect(mockSetHasAccess).toHaveBeenCalledWith(true);
      expect(mockSetIsLoading).toHaveBeenCalledWith(false);
    });

    it("sets hasAccess:false when claim is explicitly false", async () => {
      const jwt = makeJwt({ sub: "user-123", team_builder_access: false });
      const client = makeSupabaseClient(makeSession(jwt));

      await runHook({ getSupabaseClient: () => client, user: makeUser() });

      expect(mockSetHasAccess).toHaveBeenCalledWith(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Session without team_builder_access claim
  // ---------------------------------------------------------------------------

  describe("when session JWT has no team_builder_access claim", () => {
    it("defaults hasAccess to false", async () => {
      const jwt = makeJwt({ sub: "user-123", role: "authenticated" });
      const client = makeSupabaseClient(makeSession(jwt));

      await runHook({ getSupabaseClient: () => client, user: makeUser() });

      expect(mockSetHasAccess).toHaveBeenCalledWith(false);
      expect(mockSetIsLoading).toHaveBeenCalledWith(false);
    });
  });

  // ---------------------------------------------------------------------------
  // No session (null from getSession)
  // ---------------------------------------------------------------------------

  describe("when getSession returns null session", () => {
    it("sets hasAccess:false when session is null", async () => {
      const client = makeSupabaseClient(null);

      await runHook({ getSupabaseClient: () => client, user: makeUser() });

      expect(mockSetHasAccess).toHaveBeenCalledWith(false);
      expect(mockSetIsLoading).toHaveBeenCalledWith(false);
    });

    it("sets hasAccess:false when session has no access_token", async () => {
      const sessionWithoutToken = { access_token: "" } as Session;
      const client = makeSupabaseClient(sessionWithoutToken);

      await runHook({ getSupabaseClient: () => client, user: makeUser() });

      expect(mockSetHasAccess).toHaveBeenCalledWith(false);
      expect(mockSetIsLoading).toHaveBeenCalledWith(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Malformed JWT — error paths
  // ---------------------------------------------------------------------------

  describe("when JWT is malformed", () => {
    it("catches JSON.parse errors and sets hasAccess:false", async () => {
      // A JWT whose payload segment is not valid base64url-encoded JSON.
      const malformedJwt = "header.!!not-valid-base64!!.signature";
      const client = makeSupabaseClient(makeSession(malformedJwt));

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      await runHook({ getSupabaseClient: () => client, user: makeUser() });

      expect(mockSetHasAccess).toHaveBeenCalledWith(false);
      expect(mockSetIsLoading).toHaveBeenCalledWith(false);

      consoleSpy.mockRestore();
    });

    it("catches errors when JWT has fewer than 3 parts", async () => {
      // split(".")[1] is undefined → the `if (payload)` guard is falsy.
      // hasAccess stays at its initial `false` (setHasAccess is never called).
      const malformedJwt = "nodots";
      const client = makeSupabaseClient(makeSession(malformedJwt));

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      await runHook({ getSupabaseClient: () => client, user: makeUser() });

      // setHasAccess is NOT called — the guard skips it, relying on initial false.
      expect(mockSetHasAccess).not.toHaveBeenCalled();
      expect(mockSetIsLoading).toHaveBeenCalledWith(false);

      consoleSpy.mockRestore();
    });

    it("catches errors when getSession rejects", async () => {
      const failingClient = {
        auth: {
          getSession: jest
            .fn<() => Promise<never>>()
            .mockRejectedValue(new Error("network error")),
        },
      } as unknown as SupabaseClient;

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      await runHook({
        getSupabaseClient: () => failingClient,
        user: makeUser(),
      });

      expect(mockSetHasAccess).toHaveBeenCalledWith(false);
      expect(mockSetIsLoading).toHaveBeenCalledWith(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        "Error reading team_builder_access JWT claim:",
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  // ---------------------------------------------------------------------------
  // userLoading propagation
  // ---------------------------------------------------------------------------

  describe("userLoading state", () => {
    it("forwards userLoading:true into isLoading result", () => {
      // The hook returns { isLoading: userLoading || isLoading }.
      // With userLoading=true and isLoading-state=true, result is true.
      const result = useTeamBuilderAccess({
        getSupabaseClient: () => makeSupabaseClient(null),
        user: null,
        userLoading: true,
      });

      expect(result.isLoading).toBe(true);
    });

    it("defaults userLoading to false when not provided", () => {
      // Without userLoading param: isLoading = false || isLoading-state.
      // useState mock returns isLoading-state=true initially.
      const result = useTeamBuilderAccess({
        getSupabaseClient: () => makeSupabaseClient(null),
        user: null,
      });

      // isLoading = false (default userLoading) || true (state) = true
      expect(result.isLoading).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Parameterized: claim value variations
  // ---------------------------------------------------------------------------

  describe("team_builder_access claim values", () => {
    it.each([
      ["true", true, true],
      ["false", false, false],
      ["absent (undefined)", undefined, false],
    ])(
      "sets hasAccess:%s when claim is %s",
      async (_label, claimValue, expectedAccess) => {
        const claims: Record<string, unknown> = { sub: "user-abc" };
        if (claimValue !== undefined) {
          claims["team_builder_access"] = claimValue;
        }
        const jwt = makeJwt(claims);
        const client = makeSupabaseClient(makeSession(jwt));

        await runHook({ getSupabaseClient: () => client, user: makeUser() });

        expect(mockSetHasAccess).toHaveBeenCalledWith(expectedAccess);
      }
    );
  });
});
