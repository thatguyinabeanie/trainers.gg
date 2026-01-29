import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { type User, type Session } from "@supabase/supabase-js";
import { getSupabase } from "./client";

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

  const fetchSession = async () => {
    try {
      const {
        data: { session },
        error,
      } = await getSupabase().auth.getSession();
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
  };

  useEffect(() => {
    fetchSession();

    const {
      data: { subscription },
    } = getSupabase().auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    setLoading(true);
    const { error } = await getSupabase().auth.signOut();
    if (error) {
      console.error("Error signing out:", error);
    }
    setLoading(false);
  };

  const signInWithEmail = async (email: string, password: string) => {
    setLoading(true);
    const { error } = await getSupabase().auth.signInWithPassword({
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

    try {
      // Call the unified signup edge function that creates both
      // Supabase Auth + Bluesky PDS accounts
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        setLoading(false);
        return { error: new Error("Missing Supabase configuration") };
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          email,
          password,
          username: metadata?.username?.toLowerCase(),
          firstName: metadata?.firstName,
          lastName: metadata?.lastName,
          birthDate: metadata?.birthDate,
          country: metadata?.country?.toUpperCase(),
        }),
      });

      const result = await response.json();

      if (!result.success) {
        setLoading(false);
        return {
          error: new Error(result.error || "Signup failed"),
        };
      }

      // Sign in the user after successful signup
      // The edge function created the account, now we need a session
      const { error } = await getSupabase().auth.signInWithPassword({
        email,
        password,
      });

      setLoading(false);
      return { error };
    } catch (err) {
      setLoading(false);
      return {
        error:
          err instanceof Error
            ? err
            : new Error("An unexpected error occurred"),
      };
    }
  };

  const resetPassword = async (email: string) => {
    const { error } = await getSupabase().auth.resetPasswordForEmail(email);
    return { error };
  };

  const refetchUser = async () => {
    setLoading(true);
    await fetchSession();
  };

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
