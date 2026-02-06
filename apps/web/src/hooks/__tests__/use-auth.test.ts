import { renderHook, waitFor, act } from "@testing-library/react";
import { useAuth } from "../use-auth";
import { createClient } from "@/lib/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

// Mock Supabase client
jest.mock("@/lib/supabase/client", () => ({
  createClient: jest.fn(),
}));

// Mock window.location
const mockWindowLocation = () => {
  delete (window as any).location;
  window.location = {
    origin: "http://localhost:3000",
  } as any;
};

describe("useAuth", () => {
  let mockSupabase: any;
  let mockAuth: any;
  let mockSubscription: any;

  beforeEach(() => {
    mockWindowLocation();

    mockSubscription = {
      unsubscribe: jest.fn(),
    };

    mockAuth = {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: mockSubscription },
      })),
      signOut: jest.fn(),
      signInWithOAuth: jest.fn(),
      signInWithPassword: jest.fn(),
      resetPasswordForEmail: jest.fn(),
      updateUser: jest.fn(),
    };

    mockSupabase = {
      auth: mockAuth,
    };

    (createClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("initial state", () => {
    it("should start with loading true and no user", () => {
      mockAuth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const { result } = renderHook(() => useAuth());

      expect(result.current.loading).toBe(true);
      expect(result.current.user).toBeNull();
      expect(result.current.session).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it("should load session on mount", async () => {
      const mockUser: User = {
        id: "user-123",
        email: "test@example.com",
        aud: "authenticated",
        role: "authenticated",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        app_metadata: {},
        user_metadata: {},
      } as User;

      const mockSession: Session = {
        access_token: "token-123",
        refresh_token: "refresh-123",
        expires_in: 3600,
        expires_at: Date.now() / 1000 + 3600,
        token_type: "bearer",
        user: mockUser,
      };

      mockAuth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.session).toEqual(mockSession);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it("should handle session error gracefully", async () => {
      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      mockAuth.getSession.mockResolvedValue({
        data: { session: null },
        error: new Error("Session error"),
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.session).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error getting session:",
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe("auth state changes", () => {
    it("should update state on auth state change", async () => {
      mockAuth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Simulate auth state change
      const mockUser: User = {
        id: "user-456",
        email: "newuser@example.com",
        aud: "authenticated",
        role: "authenticated",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        app_metadata: {},
        user_metadata: {},
      } as User;

      const mockSession: Session = {
        access_token: "new-token",
        refresh_token: "new-refresh",
        expires_in: 3600,
        expires_at: Date.now() / 1000 + 3600,
        token_type: "bearer",
        user: mockUser,
      };

      const onAuthStateChangeCallback =
        mockAuth.onAuthStateChange.mock.calls[0][0];

      act(() => {
        onAuthStateChangeCallback("SIGNED_IN", mockSession);
      });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
        expect(result.current.session).toEqual(mockSession);
        expect(result.current.isAuthenticated).toBe(true);
      });
    });

    it("should clear user on sign out event", async () => {
      const mockUser: User = {
        id: "user-789",
        email: "test@example.com",
        aud: "authenticated",
        role: "authenticated",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        app_metadata: {},
        user_metadata: {},
      } as User;

      const mockSession: Session = {
        access_token: "token-789",
        refresh_token: "refresh-789",
        expires_in: 3600,
        expires_at: Date.now() / 1000 + 3600,
        token_type: "bearer",
        user: mockUser,
      };

      mockAuth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      const onAuthStateChangeCallback =
        mockAuth.onAuthStateChange.mock.calls[0][0];

      act(() => {
        onAuthStateChangeCallback("SIGNED_OUT", null);
      });

      await waitFor(() => {
        expect(result.current.user).toBeNull();
        expect(result.current.session).toBeNull();
        expect(result.current.isAuthenticated).toBe(false);
      });
    });
  });

  describe("cleanup", () => {
    it("should unsubscribe from auth state changes on unmount", async () => {
      mockAuth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const { unmount } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(mockAuth.onAuthStateChange).toHaveBeenCalled();
      });

      unmount();

      expect(mockSubscription.unsubscribe).toHaveBeenCalled();
    });
  });

  describe("signOut", () => {
    it("should call Supabase signOut and set loading", async () => {
      mockAuth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      mockAuth.signOut.mockResolvedValue({ error: null });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.signOut();
      });

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(mockAuth.signOut).toHaveBeenCalled();
      });
    });

    it("should handle sign out error", async () => {
      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      mockAuth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const signOutError = new Error("Sign out failed");
      mockAuth.signOut.mockResolvedValue({ error: signOutError });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.signOut();
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error signing out:",
        signOutError
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe("signInWithOAuth", () => {
    it("should call Supabase signInWithOAuth with correct parameters", async () => {
      mockAuth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      mockAuth.signInWithOAuth.mockResolvedValue({ error: null });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.signInWithOAuth("google");
      });

      expect(mockAuth.signInWithOAuth).toHaveBeenCalledWith({
        provider: "google",
        options: {
          redirectTo: "http://localhost:3000/auth/callback",
        },
      });
    });

    it("should include redirect path in callback URL", async () => {
      mockAuth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      mockAuth.signInWithOAuth.mockResolvedValue({ error: null });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.signInWithOAuth("discord", "/dashboard");
      });

      expect(mockAuth.signInWithOAuth).toHaveBeenCalledWith({
        provider: "discord",
        options: {
          redirectTo: "http://localhost:3000/auth/callback?next=%2Fdashboard",
        },
      });
    });

    it("should handle OAuth error", async () => {
      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      mockAuth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const oauthError = new Error("OAuth failed");
      mockAuth.signInWithOAuth.mockResolvedValue({ error: oauthError });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.signInWithOAuth("github");
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error signing in with github:",
        oauthError
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe("signInWithEmail", () => {
    it("should sign in with email and password successfully", async () => {
      mockAuth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const mockUser: User = {
        id: "user-email",
        email: "test@example.com",
        aud: "authenticated",
        role: "authenticated",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        app_metadata: {},
        user_metadata: {},
      } as User;

      const mockSession: Session = {
        access_token: "email-token",
        refresh_token: "email-refresh",
        expires_in: 3600,
        expires_at: Date.now() / 1000 + 3600,
        token_type: "bearer",
        user: mockUser,
      };

      mockAuth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let response;
      await act(async () => {
        response = await result.current.signInWithEmail(
          "test@example.com",
          "password123"
        );
      });

      expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
      });

      expect(response).toEqual({
        data: { user: mockUser, session: mockSession },
        error: null,
      });
    });

    it("should handle sign in error", async () => {
      mockAuth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const signInError = new Error("Invalid credentials");
      mockAuth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: signInError,
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let response;
      await act(async () => {
        response = await result.current.signInWithEmail(
          "wrong@example.com",
          "wrongpass"
        );
      });

      expect(response).toEqual({
        data: { user: null, session: null },
        error: signInError,
      });
    });
  });

  describe("signUpWithEmail", () => {
    beforeEach(() => {
      global.fetch = jest.fn();
    });

    afterEach(() => {
      (global.fetch as jest.Mock).mockRestore();
    });

    it("should sign up with email and metadata successfully", async () => {
      mockAuth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const mockUser: User = {
        id: "new-user",
        email: "newuser@example.com",
        aud: "authenticated",
        role: "authenticated",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        app_metadata: {},
        user_metadata: {},
      } as User;

      const mockSession: Session = {
        access_token: "new-token",
        refresh_token: "new-refresh",
        expires_in: 3600,
        expires_at: Date.now() / 1000 + 3600,
        token_type: "bearer",
        user: mockUser,
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        json: async () => ({ success: true }),
      });

      mockAuth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let response;
      await act(async () => {
        response = await result.current.signUpWithEmail(
          "newuser@example.com",
          "password123",
          {
            username: "newuser",
            firstName: "New",
            lastName: "User",
            country: "us",
          }
        );
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/functions/v1/signup"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
          body: JSON.stringify({
            email: "newuser@example.com",
            password: "password123",
            username: "newuser",
            firstName: "New",
            lastName: "User",
            country: "US",
            inviteToken: undefined,
          }),
        })
      );

      expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({
        email: "newuser@example.com",
        password: "password123",
      });

      expect(response).toEqual({
        data: { user: mockUser, session: mockSession },
        error: null,
      });
    });

    it("should handle signup edge function error", async () => {
      mockAuth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        json: async () => ({
          success: false,
          error: "Username already taken",
          code: "USERNAME_TAKEN",
        }),
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let response;
      await act(async () => {
        response = await result.current.signUpWithEmail(
          "duplicate@example.com",
          "password123",
          { username: "duplicate" }
        );
      });

      expect(response).toEqual({
        data: null,
        error: {
          message: "Username already taken",
          code: "USERNAME_TAKEN",
        },
      });

      expect(mockAuth.signInWithPassword).not.toHaveBeenCalled();
    });

    it("should handle network error", async () => {
      mockAuth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      (global.fetch as jest.Mock).mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let response;
      await act(async () => {
        response = await result.current.signUpWithEmail(
          "test@example.com",
          "password123"
        );
      });

      expect(response).toEqual({
        data: null,
        error: {
          message: "Network error",
          code: "NETWORK_ERROR",
        },
      });
    });
  });

  describe("resetPassword", () => {
    it("should call resetPasswordForEmail with correct URL", async () => {
      mockAuth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      mockAuth.resetPasswordForEmail.mockResolvedValue({ error: null });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let response;
      await act(async () => {
        response = await result.current.resetPassword("reset@example.com");
      });

      expect(mockAuth.resetPasswordForEmail).toHaveBeenCalledWith(
        "reset@example.com",
        {
          redirectTo: "http://localhost:3000/reset-password",
        }
      );

      expect(response).toEqual({ error: null });
    });

    it("should handle reset password error", async () => {
      mockAuth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const resetError = new Error("Email not found");
      mockAuth.resetPasswordForEmail.mockResolvedValue({ error: resetError });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let response;
      await act(async () => {
        response = await result.current.resetPassword("notfound@example.com");
      });

      expect(response).toEqual({ error: resetError });
    });
  });

  describe("updatePassword", () => {
    it("should update password successfully", async () => {
      mockAuth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      mockAuth.updateUser.mockResolvedValue({ error: null });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let response;
      await act(async () => {
        response = await result.current.updatePassword("newpassword123");
      });

      expect(mockAuth.updateUser).toHaveBeenCalledWith({
        password: "newpassword123",
      });

      expect(response).toEqual({ error: null });
    });

    it("should handle update password error", async () => {
      mockAuth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const updateError = new Error("Password too weak");
      mockAuth.updateUser.mockResolvedValue({ error: updateError });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let response;
      await act(async () => {
        response = await result.current.updatePassword("weak");
      });

      expect(response).toEqual({ error: updateError });
    });
  });
});
