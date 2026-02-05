"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { type User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

interface Profile {
  id: number;
  displayName: string;
  username: string;
  bio?: string;
  avatarUrl?: string;
}

interface AuthUser extends User {
  profile?: Profile | null;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
  refetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchUser = useCallback(async () => {
    try {
      // Check for E2E test mode cookie (set by proxy.ts during auth bypass)
      const isE2EMode =
        typeof document !== "undefined" &&
        document.cookie.includes("e2e-test-mode=true");

      if (isE2EMode) {
        // In E2E mode, create a mock user matching the proxy.ts mock
        const mockUser: AuthUser = {
          id: "b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e",
          email: "player@trainers.local",
          aud: "authenticated",
          role: "authenticated",
          email_confirmed_at: new Date().toISOString(),
          phone: "",
          confirmed_at: new Date().toISOString(),
          last_sign_in_at: new Date().toISOString(),
          app_metadata: {},
          user_metadata: { username: "ash_ketchum" },
          identities: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setUser(mockUser);
        setLoading(false);
        return;
      }

      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      if (error) console.error("Error getting session:", error);
      if (session?.user) {
        setUser(session.user as AuthUser);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Session error:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [supabase.auth]);

  useEffect(() => {
    fetchUser();

    // Skip auth state change listener in E2E mode (mock user is static)
    const isE2EMode =
      typeof document !== "undefined" &&
      document.cookie.includes("e2e-test-mode=true");

    if (isE2EMode) {
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(session.user as AuthUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth, fetchUser]);

  const signOut = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error signing out:", error);
      setLoading(false);
    }
  };

  const refetchUser = async () => {
    setLoading(true);
    await fetchUser();
  };

  const value: AuthContextType = {
    user,
    loading,
    isAuthenticated: !!user,
    signOut,
    refetchUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    if (typeof window === "undefined") {
      return {
        user: null,
        loading: true,
        isAuthenticated: false,
        signOut: async () => {},
        refetchUser: async () => {},
      };
    }
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
}

// Legacy export for compatibility
export const useAuth = useAuthContext;

/**
 * Helper to get user's display name from Supabase auth user.
 * Checks user_metadata for various name fields, falls back to email.
 */
export function getUserDisplayName(user: AuthUser | null): string {
  if (!user) return "Trainer";

  // Check profile first (from database)
  if (user.profile?.displayName) {
    return user.profile.displayName;
  }

  // Check user_metadata (from auth)
  const metadata = user.user_metadata;
  const displayName =
    (metadata?.display_name as string | undefined) ??
    (metadata?.full_name as string | undefined) ??
    (metadata?.name as string | undefined) ??
    (metadata?.username as string | undefined) ??
    (metadata?.bluesky_handle as string | undefined);

  if (displayName) {
    return displayName;
  }

  // Don't show placeholder emails as display name
  if (user.email && !user.email.includes("@bluesky.trainers.gg")) {
    return user.email;
  }

  return "Trainer";
}
