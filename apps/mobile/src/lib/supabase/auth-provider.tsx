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
  signInWithBluesky: (
    handle: string
  ) => Promise<{ error: Error | null; isNew?: boolean }>;
  linkBluesky: (handle: string) => Promise<{ error: Error | null }>;
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

  /**
   * Sign in (or sign up) with a Bluesky handle via AT Protocol OAuth.
   *
   * Flow:
   * 1. Initialize the ExpoOAuthClient and start the OAuth flow (opens browser)
   * 2. On success, the OAuth session contains the authenticated DID
   * 3. Send DID + handle to the bluesky-auth edge function
   * 4. Edge function verifies DID via public API, returns Supabase session
   * 5. Set the Supabase session from the edge function response
   *
   * The AT Protocol OAuth flow (DPoP + PKCE + PAR) cryptographically proves
   * the user authorized access. The edge function independently verifies the
   * DID exists and handle matches via the public Bluesky API.
   */
  const signInWithBluesky = async (
    handle: string
  ): Promise<{ error: Error | null; isNew?: boolean }> => {
    setLoading(true);

    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        setLoading(false);
        return { error: new Error("Missing Supabase configuration") };
      }

      // Strip leading @ if present
      const cleanHandle = handle.startsWith("@") ? handle.slice(1) : handle;

      // Step 1: Get the AT Protocol OAuth client (lazy singleton)
      const { getAtprotoOAuthClient } =
        await import("@/lib/atproto/oauth-client");
      const oauthClient = getAtprotoOAuthClient();

      // Step 2: Start the OAuth flow (opens system browser for authorization)
      // The ExpoOAuthClient handles DPoP, PKCE, PAR, and token storage.
      // On success, we get an OAuthSession with the authenticated DID.
      const oauthSession = await oauthClient.signIn(cleanHandle);

      // Extract the DID from the authenticated session
      const did = oauthSession.did;

      // Get the resolved handle from the session via Agent
      const { Agent } = await import("@atproto/api");
      const agent = new Agent(oauthSession);
      const sessionInfo = await agent.com.atproto.server.getSession();
      const resolvedHandle = sessionInfo.data.handle;

      // Step 3: Call the bluesky-auth edge function to get Supabase session
      // The edge function verifies the DID by resolving it from the public API
      const response = await fetch(`${supabaseUrl}/functions/v1/bluesky-auth`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          did,
          handle: resolvedHandle,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        setLoading(false);
        return {
          error: new Error(result.error || "Bluesky sign-in failed"),
        };
      }

      // Step 4: Set the Supabase session from the edge function response
      const { error: sessionError } = await getSupabase().auth.setSession({
        access_token: result.access_token,
        refresh_token: result.refresh_token,
      });

      setLoading(false);
      return { error: sessionError, isNew: result.is_new };
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

  /**
   * Link a Bluesky account to the currently authenticated Supabase user.
   *
   * Flow:
   * 1. Initialize the ExpoOAuthClient and start the OAuth flow (opens browser)
   * 2. On success, the OAuth session contains the authenticated DID
   * 3. Send DID + handle to the bluesky-auth edge function with link: true
   * 4. Edge function verifies DID, links it to the existing Supabase user
   * 5. Refresh the local session to pick up updated user metadata
   */
  const linkBluesky = async (
    handle: string
  ): Promise<{ error: Error | null }> => {
    setLoading(true);

    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;

      if (!supabaseUrl) {
        setLoading(false);
        return { error: new Error("Missing Supabase configuration") };
      }

      // Require an active Supabase session for linking
      const currentSession = session;
      if (!currentSession?.access_token) {
        setLoading(false);
        return {
          error: new Error("You must be signed in to link a Bluesky account"),
        };
      }

      // Strip leading @ if present
      const cleanHandle = handle.startsWith("@") ? handle.slice(1) : handle;

      // Step 1: Get the AT Protocol OAuth client (lazy singleton)
      const { getAtprotoOAuthClient } =
        await import("@/lib/atproto/oauth-client");
      const oauthClient = getAtprotoOAuthClient();

      // Step 2: Start the OAuth flow (opens system browser for authorization)
      const oauthSession = await oauthClient.signIn(cleanHandle);

      // Extract DID and resolved handle from the session
      const did = oauthSession.did;
      const { Agent } = await import("@atproto/api");
      const agent = new Agent(oauthSession);
      const sessionInfo = await agent.com.atproto.server.getSession();
      const resolvedHandle = sessionInfo.data.handle;

      // Step 3: Call the bluesky-auth edge function in link mode
      // Pass the user's Supabase JWT (not the anon key) for authentication
      const response = await fetch(`${supabaseUrl}/functions/v1/bluesky-auth`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentSession.access_token}`,
        },
        body: JSON.stringify({
          did,
          handle: resolvedHandle,
          link: true,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        setLoading(false);
        return {
          error: new Error(result.error || "Failed to link Bluesky account"),
        };
      }

      // Step 4: Refresh the session to pick up updated user metadata
      await fetchSession();

      setLoading(false);
      return { error: null };
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
    signInWithBluesky,
    linkBluesky,
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
