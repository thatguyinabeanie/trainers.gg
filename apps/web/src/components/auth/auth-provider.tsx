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

  const refetchUser = useCallback(async () => {
    setLoading(true);
    await fetchUser();
  }, [fetchUser]);

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
 * Checks user_metadata for full_name or name, falls back to email.
 */
export function getUserDisplayName(user: AuthUser | null): string {
  if (!user) return "Trainer";
  const fullName =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined);
  return user.profile?.displayName ?? fullName ?? user.email ?? "Trainer";
}
