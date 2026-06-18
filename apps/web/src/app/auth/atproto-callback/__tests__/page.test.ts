/**
 * @jest-environment node
 */

/**
 * Tests for the AT Protocol OAuth callback completion page.
 *
 * Key security invariant (A1): the redirect URL must never contain an
 * `&email=` parameter — we no longer emit the linked account's email
 * to avoid disclosing it via browser history, referrer headers, or proxies.
 */

const mockGet = jest.fn();
const mockDelete = jest.fn();
const mockMaybeSingle = jest.fn();
const mockFrom = jest.fn();
const mockRedirect = jest.fn();

jest.mock("next/headers", () => ({
  cookies: () =>
    Promise.resolve({
      get: mockGet,
      delete: mockDelete,
    }),
}));

jest.mock("next/navigation", () => ({
  redirect: (url: string) => {
    mockRedirect(url);
    // next/navigation redirect throws to halt Server Component execution
    throw new Error(`NEXT_REDIRECT:${url}`);
  },
}));

jest.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: () => ({
    from: mockFrom,
  }),
}));

// Import after mocks are registered
import AtprotoCallbackPage from "../page";

async function runPage() {
  try {
    await AtprotoCallbackPage();
  } catch (err) {
    // Swallow redirect throws — callers inspect mockRedirect
    if (!(err instanceof Error) || !err.message.startsWith("NEXT_REDIRECT:")) {
      throw err;
    }
  }
}

describe("AtprotoCallbackPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDelete.mockResolvedValue(undefined);

    // Default: successful DID lookup chain
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          maybeSingle: mockMaybeSingle,
        }),
      }),
    });
  });

  describe("missing DID cookie", () => {
    it("redirects to /sign-in?error=missing_session when cookie is absent", async () => {
      mockGet.mockReturnValue(undefined);

      await runPage();

      expect(mockRedirect).toHaveBeenCalledWith(
        "/sign-in?error=missing_session"
      );
    });
  });

  describe("DID not found in public.users", () => {
    it("redirects to /auth/link-bluesky when no user has this DID", async () => {
      mockGet.mockReturnValue({ value: "did:plc:unknown" });
      mockMaybeSingle.mockResolvedValue({ data: null, error: null });

      await runPage();

      expect(mockRedirect).toHaveBeenCalledWith("/auth/link-bluesky");
    });
  });

  describe("successful DID lookup", () => {
    beforeEach(() => {
      mockGet.mockReturnValue({ value: "did:plc:abc123" });
      mockMaybeSingle.mockResolvedValue({
        data: { id: "user-1", username: "ash_ketchum" },
        error: null,
      });
    });

    it("redirects to /sign-in?message=bluesky_verified", async () => {
      await runPage();

      expect(mockRedirect).toHaveBeenCalledWith(
        "/sign-in?message=bluesky_verified"
      );
    });

    it("does NOT include an email parameter in the redirect URL (A1 — no email disclosure)", async () => {
      await runPage();

      const redirectArg: string = mockRedirect.mock.calls[0]?.[0] ?? "";
      expect(redirectArg).not.toContain("email=");
      expect(redirectArg).not.toContain("&email");
    });

    it("attempts to delete the atproto_did cookie", async () => {
      await runPage();

      expect(mockDelete).toHaveBeenCalledWith("atproto_did");
    });

    it("still redirects to bluesky_verified even when cookie delete throws", async () => {
      mockDelete.mockRejectedValue(new Error("cookie mutation not allowed"));

      await runPage();

      expect(mockRedirect).toHaveBeenCalledWith(
        "/sign-in?message=bluesky_verified"
      );
    });
  });
});
