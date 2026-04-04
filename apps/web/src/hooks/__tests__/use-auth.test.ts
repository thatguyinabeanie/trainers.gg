import { renderHook, act, waitFor } from "@testing-library/react";
import { useAuth } from "../use-auth";

// --- Supabase mock setup ---

const mockUnsubscribe = jest.fn();
const mockGetSession = jest.fn();
const mockOnAuthStateChange = jest.fn();
const mockSignOut = jest.fn();
const mockSignInWithOAuth = jest.fn();
const mockSignInWithPassword = jest.fn();
const mockResetPasswordForEmail = jest.fn();
const mockUpdateUser = jest.fn();

const mockAuth = {
  getSession: mockGetSession,
  onAuthStateChange: mockOnAuthStateChange,
  signOut: mockSignOut,
  signInWithOAuth: mockSignInWithOAuth,
  signInWithPassword: mockSignInWithPassword,
  resetPasswordForEmail: mockResetPasswordForEmail,
  updateUser: mockUpdateUser,
};

jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: mockAuth }),
}));

// Capture the auth state change callback so tests can trigger it
let authStateCallback: (event: string, session: unknown) => void = () => {};

function setupMocks({
  session = null,
  sessionError = null,
}: {
  session?: unknown;
  sessionError?: unknown;
} = {}) {
  mockGetSession.mockResolvedValue({
    data: { session },
    error: sessionError,
  });

  mockOnAuthStateChange.mockImplementation(
    (cb: (event: string, session: unknown) => void) => {
      authStateCallback = cb;
      return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
    }
  );
}

describe("useAuth", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
  });

  // --- Initial state ---

  it("starts in loading state", () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.loading).toBe(true);
    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it("sets user and session after initial getSession resolves", async () => {
    const fakeSession = {
      user: { id: "user-1", email: "ash@example.com" },
    };
    setupMocks({ session: fakeSession });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.session).toEqual(fakeSession);
    expect(result.current.user).toEqual(fakeSession.user);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it("leaves user null when no session exists", async () => {
    setupMocks({ session: null });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it("logs error and still resolves when getSession returns an error", async () => {
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    setupMocks({ sessionError: { message: "Session failure" } });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(consoleSpy).toHaveBeenCalled();
    expect(result.current.user).toBeNull();
    consoleSpy.mockRestore();
  });

  // --- Auth state changes ---

  it("updates state when auth state changes to signed in", async () => {
    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const newSession = {
      user: { id: "user-2", email: "misty@example.com" },
    };
    act(() => {
      authStateCallback("SIGNED_IN", newSession);
    });

    expect(result.current.user).toEqual(newSession.user);
    expect(result.current.session).toEqual(newSession);
  });

  it("clears user when auth state changes to signed out", async () => {
    const initialSession = { user: { id: "user-1", email: "ash@example.com" } };
    setupMocks({ session: initialSession });

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.user).not.toBeNull());

    act(() => {
      authStateCallback("SIGNED_OUT", null);
    });

    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
  });

  // --- Cleanup ---

  it("unsubscribes from auth state changes on unmount", async () => {
    const { unmount } = renderHook(() => useAuth());
    await waitFor(() => expect(mockOnAuthStateChange).toHaveBeenCalled());

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  // --- signOut ---

  it("sets loading during sign out then clears on success", async () => {
    mockSignOut.mockResolvedValue({ error: null });

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.signOut();
    });

    expect(mockSignOut).toHaveBeenCalled();
  });

  it("clears loading state when signOut returns an error", async () => {
    mockSignOut.mockResolvedValue({ error: { message: "Network error" } });
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.signOut();
    });

    expect(result.current.loading).toBe(false);
    consoleSpy.mockRestore();
  });

  // --- signInWithEmail ---

  it("returns data and null error on successful email sign in", async () => {
    const fakeData = { session: { user: { id: "u1" } } };
    mockSignInWithPassword.mockResolvedValue({ data: fakeData, error: null });

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let signInResult: Awaited<
      ReturnType<typeof result.current.signInWithEmail>
    >;
    await act(async () => {
      signInResult = await result.current.signInWithEmail("a@b.com", "pass123");
    });

    expect(signInResult!.error).toBeNull();
    expect(signInResult!.data).toEqual(fakeData);
    expect(result.current.loading).toBe(false);
  });

  it("returns error when email sign in fails", async () => {
    const fakeError = { message: "Invalid credentials" };
    mockSignInWithPassword.mockResolvedValue({ data: null, error: fakeError });

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let signInResult: Awaited<
      ReturnType<typeof result.current.signInWithEmail>
    >;
    await act(async () => {
      signInResult = await result.current.signInWithEmail("a@b.com", "wrong");
    });

    expect(signInResult!.error).toEqual(fakeError);
  });

  // --- signInWithOAuth ---

  it("calls signInWithOAuth with correct provider and callback URL", async () => {
    mockSignInWithOAuth.mockResolvedValue({ error: null });
    Object.defineProperty(window, "location", {
      value: { origin: "https://trainers.gg" },
      writable: true,
    });

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.signInWithOAuth("discord");
    });

    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: "discord",
      options: {
        redirectTo: "https://trainers.gg/auth/callback",
      },
    });
  });

  it("includes redirectPath in callback URL when provided", async () => {
    mockSignInWithOAuth.mockResolvedValue({ error: null });
    Object.defineProperty(window, "location", {
      value: { origin: "https://trainers.gg" },
      writable: true,
    });

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.signInWithOAuth("x", "/tournaments/vgc-cup");
    });

    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: "x",
      options: {
        redirectTo:
          "https://trainers.gg/auth/callback?next=%2Ftournaments%2Fvgc-cup",
      },
    });
  });

  it("logs error and returns it when OAuth sign in fails", async () => {
    const oauthError = { message: "Provider error" };
    mockSignInWithOAuth.mockResolvedValue({ error: oauthError });
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let oauthResult: Awaited<ReturnType<typeof result.current.signInWithOAuth>>;
    await act(async () => {
      oauthResult = await result.current.signInWithOAuth("twitch");
    });

    expect(oauthResult!.error).toEqual(oauthError);
    consoleSpy.mockRestore();
  });

  // --- signUpWithEmail ---

  it("calls signup edge function and signs in on success", async () => {
    const fakeData = { session: { user: { id: "u-new" } } };
    global.fetch = jest.fn().mockResolvedValue({
      json: jest.fn().mockResolvedValue({ success: true }),
    });
    mockSignInWithPassword.mockResolvedValue({ data: fakeData, error: null });

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let signUpResult: Awaited<
      ReturnType<typeof result.current.signUpWithEmail>
    >;
    await act(async () => {
      signUpResult = await result.current.signUpWithEmail("a@b.com", "Pass1!", {
        username: "ashketchum",
        country: "us",
      });
    });

    expect(signUpResult!.error).toBeNull();
    expect(mockSignInWithPassword).toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
  });

  it("returns error from edge function when signup fails", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: jest
        .fn()
        .mockResolvedValue({ success: false, error: "Username taken" }),
    });

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let signUpResult: Awaited<
      ReturnType<typeof result.current.signUpWithEmail>
    >;
    await act(async () => {
      signUpResult = await result.current.signUpWithEmail("a@b.com", "Pass1!");
    });

    expect(signUpResult!.data).toBeNull();
    expect(signUpResult!.error?.message).toBe("Username taken");
  });

  it("returns NETWORK_ERROR when fetch throws", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("Network down"));

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let signUpResult: Awaited<
      ReturnType<typeof result.current.signUpWithEmail>
    >;
    await act(async () => {
      signUpResult = await result.current.signUpWithEmail("a@b.com", "Pass1!");
    });

    expect(signUpResult!.error?.message).toBe("Network down");
    expect(signUpResult!.error?.code).toBe("NETWORK_ERROR");
  });

  // --- resetPassword ---

  it("calls resetPasswordForEmail with correct redirectTo", async () => {
    mockResetPasswordForEmail.mockResolvedValue({ error: null });
    Object.defineProperty(window, "location", {
      value: { origin: "https://trainers.gg" },
      writable: true,
    });

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.resetPassword("ash@example.com");
    });

    expect(mockResetPasswordForEmail).toHaveBeenCalledWith("ash@example.com", {
      redirectTo: "https://trainers.gg/reset-password",
    });
  });

  it("returns error from resetPassword when it fails", async () => {
    const resetError = { message: "Email not found" };
    mockResetPasswordForEmail.mockResolvedValue({ error: resetError });

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let resetResult: Awaited<ReturnType<typeof result.current.resetPassword>>;
    await act(async () => {
      resetResult = await result.current.resetPassword("a@b.com");
    });

    expect(resetResult!.error).toEqual(resetError);
  });

  // --- updatePassword ---

  it("calls updateUser with new password and returns result", async () => {
    mockUpdateUser.mockResolvedValue({ error: null });

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let updateResult: Awaited<ReturnType<typeof result.current.updatePassword>>;
    await act(async () => {
      updateResult = await result.current.updatePassword("NewPass1!");
    });

    expect(mockUpdateUser).toHaveBeenCalledWith({ password: "NewPass1!" });
    expect(updateResult!.error).toBeNull();
  });

  it("returns error when updatePassword fails", async () => {
    const updateError = { message: "Session expired" };
    mockUpdateUser.mockResolvedValue({ error: updateError });

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let updateResult: Awaited<ReturnType<typeof result.current.updatePassword>>;
    await act(async () => {
      updateResult = await result.current.updatePassword("NewPass1!");
    });

    expect(updateResult!.error).toEqual(updateError);
  });
});
