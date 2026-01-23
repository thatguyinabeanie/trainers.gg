import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { type User, type Session } from "@supabase/supabase-js";
import { supabase } from "./client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
  signInWithEmail: (
    email: string,
    password: string
  ) => Promise<{ error: Error | null }>;
  signUpWithEmail: (
    email: string,
    password: string,
    metadata?: {
      username?: string;
      firstName?: string;
      lastName?: string;
      birthDate?: string;
      country?: string;
    }
  ) => Promise<{ error: Error | null }>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  refetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSession = useCallback(async () => {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      if (error) console.error("Error getting session:", error);
      setSession(session);
      setUser(session?.user ?? null);
    } catch (error) {
      console.error("Session error:", error);
      setSession(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchSession]);

  const signOut = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error signing out:", error);
    }
    setLoading(false);
  };

  const signInWithEmail = async (email: string, password: string) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    return { error };
  };

  const signUpWithEmail = async (
    email: string,
    password: string,
    metadata?: {
      username?: string;
      firstName?: string;
      lastName?: string;
      birthDate?: string;
      country?: string;
    }
  ) => {
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: metadata?.username?.toLowerCase(),
          first_name: metadata?.firstName,
          last_name: metadata?.lastName,
          birth_date: metadata?.birthDate,
          country: metadata?.country?.toUpperCase(),
        },
      },
    });
    setLoading(false);
    return { error };
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    return { error };
  };

  const refetchUser = useCallback(async () => {
    setLoading(true);
    await fetchSession();
  }, [fetchSession]);

  const value: AuthContextType = {
    user,
    session,
    loading,
    isAuthenticated: !!user,
    signOut,
    signInWithEmail,
    signUpWithEmail,
    resetPassword,
    refetchUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

/**
 * Helper to get user's display name from Supabase auth user.
 * Checks user_metadata for full_name or name, falls back to email.
 */
export function getUserDisplayName(user: User | null): string {
  if (!user) return "Trainer";
  const fullName =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined);
  const firstName = user.user_metadata?.first_name as string | undefined;
  const lastName = user.user_metadata?.last_name as string | undefined;
  const name =
    firstName && lastName
      ? `${firstName} ${lastName}`
      : (firstName ?? lastName);
  return fullName ?? name ?? user.email ?? "Trainer";
}
