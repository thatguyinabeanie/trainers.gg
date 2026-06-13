// =============================================================================
// Mocks — declared before the hook is imported so Jest hoisting works
// =============================================================================

const mockUseApiQuery = jest.fn();

// We control fetch responses per-test (repo convention — see overview-tab.test).
const mockFetch = jest.fn();
global.fetch = mockFetch;

// The hook also imports getCurrentUser (for its return-type only) — provide a
// no-op so the module loads under Jest.
jest.mock("@trainers/supabase", () => ({
  getCurrentUser: jest.fn(),
}));

// useApiQuery now lives behind the dedicated react-query subpath.
jest.mock("@trainers/supabase/react-query", () => ({
  useApiQuery: (...args: unknown[]) => mockUseApiQuery(...args),
}));

import { renderHook } from "@testing-library/react";

import { useCurrentUser } from "../use-current-user";

// =============================================================================
// Helpers
// =============================================================================

const USER_WITH_ALT = {
  id: "user-1",
  email: "ash@trainers.local",
  name: "Ash Ketchum",
  spritePreference: "gen5",
  alt: {
    id: 7,
    displayName: "ash_ketchum",
    username: "ash_ketchum",
    bio: null,
    avatarUrl: null,
  },
};

const USER_WITHOUT_ALT = { ...USER_WITH_ALT, alt: null };

/** Build a minimal useApiQuery return value for a given state. */
function queryResult(
  overrides: Partial<{ data: unknown; isLoading: boolean; error: Error | null }>
) {
  return { data: undefined, isLoading: false, error: null, ...overrides };
}

// =============================================================================
// Setup
// =============================================================================

beforeEach(() => {
  jest.clearAllMocks();
});

// =============================================================================
// Query wiring
// =============================================================================

describe("query wiring", () => {
  it("queries the me/profile key with a 60s staleTime", () => {
    mockUseApiQuery.mockReturnValue(queryResult({ data: USER_WITH_ALT }));

    renderHook(() => useCurrentUser());

    const [queryKey, fetcher, options] = mockUseApiQuery.mock.calls[0];
    expect(queryKey).toEqual(["me", "profile"]);
    expect(typeof fetcher).toBe("function");
    expect(options).toEqual({ staleTime: 60_000 });
  });

  it("fetches /api/v1/me/profile and returns the parsed JSON", async () => {
    mockUseApiQuery.mockReturnValue(queryResult({ data: USER_WITH_ALT }));
    const payload = { success: true, data: USER_WITH_ALT };
    // jsdom's Response lacks a usable .json(), so return a plain object whose
    // .json() resolves to the payload — the repo convention for fetch mocks.
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue(payload),
    });

    renderHook(() => useCurrentUser());
    const fetcher = mockUseApiQuery.mock.calls[0][1] as () => Promise<unknown>;
    const result = await fetcher();

    expect(mockFetch).toHaveBeenCalledWith("/api/v1/me/profile");
    expect(result).toEqual(payload);
  });
});

// =============================================================================
// Return shape mapping
// =============================================================================

describe("return shape", () => {
  it("maps a user with an alt to the full authenticated shape", () => {
    mockUseApiQuery.mockReturnValue(queryResult({ data: USER_WITH_ALT }));

    const { result } = renderHook(() => useCurrentUser());

    expect(result.current.user).toBe(USER_WITH_ALT);
    expect(result.current.alt).toBe(USER_WITH_ALT.alt);
    expect(result.current.profile).toBe(USER_WITH_ALT.alt);
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.hasProfile).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("reports an authenticated user without an alt as hasProfile=false", () => {
    mockUseApiQuery.mockReturnValue(queryResult({ data: USER_WITHOUT_ALT }));

    const { result } = renderHook(() => useCurrentUser());

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.hasProfile).toBe(false);
    expect(result.current.alt).toBeNull();
    expect(result.current.profile).toBeNull();
  });

  it("reports no user (data:null) as unauthenticated", () => {
    mockUseApiQuery.mockReturnValue(queryResult({ data: null }));

    const { result } = renderHook(() => useCurrentUser());

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.hasProfile).toBe(false);
    expect(result.current.alt).toBeNull();
    expect(result.current.profile).toBeNull();
  });

  it("surfaces the loading state", () => {
    mockUseApiQuery.mockReturnValue(
      queryResult({ data: undefined, isLoading: true })
    );

    const { result } = renderHook(() => useCurrentUser());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.isAuthenticated).toBe(false);
  });

  it("surfaces the error state", () => {
    const error = new Error("boom");
    mockUseApiQuery.mockReturnValue(queryResult({ data: undefined, error }));

    const { result } = renderHook(() => useCurrentUser());

    expect(result.current.error).toBe(error);
    expect(result.current.isAuthenticated).toBe(false);
  });
});
