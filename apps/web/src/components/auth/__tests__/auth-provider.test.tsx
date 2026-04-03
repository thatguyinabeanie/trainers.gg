import { render, screen, waitFor, act } from "@testing-library/react";
import { renderHook } from "@testing-library/react";
import {
  AuthProvider,
  useAuthContext,
  getUserDisplayName,
} from "../auth-provider";
import { type ReactNode } from "react";

// --- Supabase mock ---

const mockUnsubscribe = jest.fn();
const mockGetSession = jest.fn();
const mockOnAuthStateChange = jest.fn();
const mockSignOut = jest.fn();

const mockAuth = {
  getSession: mockGetSession,
  onAuthStateChange: mockOnAuthStateChange,
  signOut: mockSignOut,
};

jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: mockAuth }),
}));

let authStateCallback: (event: string, session: unknown) => void = () => {};

function setupMocks({ session = null }: { session?: unknown } = {}) {
  mockGetSession.mockResolvedValue({ data: { session }, error: null });
  mockOnAuthStateChange.mockImplementation(
    (cb: (event: string, session: unknown) => void) => {
      authStateCallback = cb;
      return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
    }
  );
}

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

describe("AuthProvider", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
  });

  it("renders children", () => {
    render(
      <AuthProvider>
        <div data-testid="child">hello</div>
      </AuthProvider>
    );
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("starts with loading=true and no user", () => {
    const { result } = renderHook(() => useAuthContext(), { wrapper });
    expect(result.current.loading).toBe(true);
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it("resolves user from session after initial fetch", async () => {
    const fakeSession = { user: { id: "u1", email: "ash@example.com" } };
    setupMocks({ session: fakeSession });

    const { result } = renderHook(() => useAuthContext(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toMatchObject({ id: "u1" });
    expect(result.current.isAuthenticated).toBe(true);
  });

  it("sets user to null when session is absent", async () => {
    setupMocks({ session: null });

    const { result } = renderHook(() => useAuthContext(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it("updates user on auth state change", async () => {
    const { result } = renderHook(() => useAuthContext(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    const newSession = { user: { id: "u2", email: "misty@example.com" } };
    act(() => {
      authStateCallback("SIGNED_IN", newSession);
    });

    expect(result.current.user).toMatchObject({ id: "u2" });
  });

  it("clears user on sign out event", async () => {
    const fakeSession = { user: { id: "u1", email: "ash@example.com" } };
    setupMocks({ session: fakeSession });

    const { result } = renderHook(() => useAuthContext(), { wrapper });
    await waitFor(() => expect(result.current.user).not.toBeNull());

    act(() => {
      authStateCallback("SIGNED_OUT", null);
    });

    expect(result.current.user).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it("unsubscribes from auth listener on unmount", async () => {
    const { unmount } = renderHook(() => useAuthContext(), { wrapper });
    await waitFor(() => expect(mockOnAuthStateChange).toHaveBeenCalled());

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  // --- signOut ---

  it("calls supabase signOut and sets loading during the call", async () => {
    mockSignOut.mockResolvedValue({ error: null });

    const { result } = renderHook(() => useAuthContext(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.signOut();
    });

    expect(mockSignOut).toHaveBeenCalled();
  });

  it("logs error and clears loading when signOut fails", async () => {
    mockSignOut.mockResolvedValue({ error: { message: "Network error" } });
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const { result } = renderHook(() => useAuthContext(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.signOut();
    });

    expect(consoleSpy).toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
    consoleSpy.mockRestore();
  });

  // --- refetchUser ---

  it("refetches user when refetchUser is called", async () => {
    setupMocks({ session: null });
    const { result } = renderHook(() => useAuthContext(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    const newSession = { user: { id: "u3", email: "brock@example.com" } };
    mockGetSession.mockResolvedValue({ data: { session: newSession }, error: null });

    await act(async () => {
      await result.current.refetchUser();
    });

    expect(result.current.user).toMatchObject({ id: "u3" });
  });

  // --- logs error if getSession throws ---

  it("handles getSession throwing and sets user to null", async () => {
    mockGetSession.mockRejectedValue(new Error("Unexpected error"));
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const { result } = renderHook(() => useAuthContext(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.user).toBeNull();
    consoleSpy.mockRestore();
  });
});

describe("useAuthContext outside provider", () => {
  it("throws when used outside AuthProvider in browser", () => {
    // Simulate browser env — window is defined in jsdom
    expect(() => {
      renderHook(() => useAuthContext());
    }).toThrow("useAuthContext must be used within an AuthProvider");
  });
});

describe("getUserDisplayName", () => {
  it("returns 'Trainer' for null user", () => {
    expect(getUserDisplayName(null)).toBe("Trainer");
  });

  it("returns profile displayName when available", () => {
    const user = {
      id: "u1",
      app_metadata: {},
      user_metadata: {},
      aud: "authenticated",
      created_at: "",
      profile: { id: 1, displayName: "Ash Ketchum", username: "ash" },
    };
    expect(getUserDisplayName(user as Parameters<typeof getUserDisplayName>[0])).toBe(
      "Ash Ketchum"
    );
  });

  it("returns username from user_metadata when no profile", () => {
    const user = {
      id: "u1",
      app_metadata: {},
      user_metadata: { username: "ash_trainer" },
      aud: "authenticated",
      created_at: "",
    };
    expect(getUserDisplayName(user as Parameters<typeof getUserDisplayName>[0])).toBe(
      "ash_trainer"
    );
  });

  it("returns full_name from user_metadata when no username", () => {
    const user = {
      id: "u1",
      app_metadata: {},
      user_metadata: { full_name: "Ash Ketchum" },
      aud: "authenticated",
      created_at: "",
    };
    expect(getUserDisplayName(user as Parameters<typeof getUserDisplayName>[0])).toBe(
      "Ash Ketchum"
    );
  });

  it("returns bluesky_handle from user_metadata as fallback", () => {
    const user = {
      id: "u1",
      app_metadata: {},
      user_metadata: { bluesky_handle: "ash.bsky.social" },
      aud: "authenticated",
      created_at: "",
    };
    expect(getUserDisplayName(user as Parameters<typeof getUserDisplayName>[0])).toBe(
      "ash.bsky.social"
    );
  });

  it("returns email when no metadata names", () => {
    const user = {
      id: "u1",
      app_metadata: {},
      user_metadata: {},
      aud: "authenticated",
      created_at: "",
      email: "ash@example.com",
    };
    expect(getUserDisplayName(user as Parameters<typeof getUserDisplayName>[0])).toBe(
      "ash@example.com"
    );
  });

  it("returns 'Trainer' for placeholder bluesky emails", () => {
    const user = {
      id: "u1",
      app_metadata: {},
      user_metadata: {},
      aud: "authenticated",
      created_at: "",
      email: "temp@bluesky.trainers.gg",
    };
    expect(getUserDisplayName(user as Parameters<typeof getUserDisplayName>[0])).toBe(
      "Trainer"
    );
  });
});
