"use client";

import { useClerk, useSession, useSignIn, useSignUp, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import {
  createContext,
  type ReactNode,
  useContext,
  useCallback,
  useMemo,
  useEffect,
  useRef,
  useState,
} from "react";
import { useSupabaseClient } from "@/lib/supabase/client";

interface UserProfile {
  id: string;
  displayName: string;
  username: string;
  bio?: string;
  avatarUrl?: string;
}

interface User {
  id: string;
  clerkId: string;
  email?: string;
  name?: string;
  profile?: UserProfile | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    username: string,
    displayName: string
  ) => Promise<void>;
  signOut: () => Promise<void>;
  refetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { isLoaded: clerkLoaded, isSignedIn, user: clerkUser } = useUser();
  const { session } = useSession();
  const { signIn: clerkSignIn } = useSignIn();
  const { signUp: clerkSignUp } = useSignUp();
  const { signOut: clerkSignOut } = useClerk();
  const supabase = useSupabaseClient();

  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const hasTriedSync = useRef(false);

  // Fetch user from Supabase using Clerk user ID (sub claim)
  const fetchUser = useCallback(async () => {
    if (!clerkUser?.id || !session) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      // With Clerk + Supabase integration, we use clerk_id to find the user
      // The Supabase client is already authenticated via Clerk session token
      // Use .maybeSingle() to return null instead of throwing 406 when no row exists
      const { data: userData } = await supabase
        .from("users")
        .select("*")
        .eq("clerk_id", clerkUser.id)
        .maybeSingle();

      if (!userData) {
        // User doesn't exist in Supabase yet - will be created by syncUser
        setUser(null);
        return;
      }

      // Get profile (may not exist yet for new users)
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userData.id)
        .maybeSingle();

      setUser({
        id: userData.id,
        clerkId: clerkUser.id,
        email: userData.email ?? undefined,
        name: userData.name ?? undefined,
        profile: profileData
          ? {
              id: profileData.id,
              displayName: profileData.display_name,
              username: profileData.username,
              bio: profileData.bio ?? undefined,
              avatarUrl: profileData.avatar_url ?? undefined,
            }
          : null,
      });
    } catch (err) {
      console.error("Error fetching user:", err);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [clerkUser?.id, session, supabase]);

  // Sync Clerk user to Supabase if they don't exist
  const syncUser = useCallback(async () => {
    if (!clerkUser || !session) return;

    setIsSyncing(true);
    try {
      // Check if user exists by clerk_id
      // Use .maybeSingle() to return null instead of throwing 406 when no row exists
      const { data: existingUser } = await supabase
        .from("users")
        .select("id")
        .eq("clerk_id", clerkUser.id)
        .maybeSingle();

      if (!existingUser) {
        // Generate a UUID for the new user
        const userId = crypto.randomUUID();

        // Create user in Supabase
        const { data: newUser, error: createError } = await supabase
          .from("users")
          .insert({
            id: userId,
            clerk_id: clerkUser.id,
            email: clerkUser.primaryEmailAddress?.emailAddress,
            name: clerkUser.fullName,
            image: clerkUser.imageUrl,
          })
          .select()
          .single();

        if (createError) {
          console.error("Error creating user:", createError);
          console.error("Error details:", JSON.stringify(createError, null, 2));
          return;
        }

        // Create default profile
        if (newUser) {
          const username =
            clerkUser.username ||
            clerkUser.primaryEmailAddress?.emailAddress?.split("@")[0] ||
            `user_${newUser.id.slice(0, 8)}`;

          await supabase.from("profiles").insert({
            user_id: newUser.id,
            username: username.toLowerCase().replace(/[^a-z0-9_]/g, "_"),
            display_name: clerkUser.fullName || username,
            avatar_url: clerkUser.imageUrl,
          });
        }
      }

      // Fetch updated user data
      await fetchUser();
    } catch (err) {
      console.error("Error syncing user:", err);
    } finally {
      setIsSyncing(false);
    }
  }, [clerkUser, session, supabase, fetchUser]);

  // Sync user when Clerk auth state changes
  useEffect(() => {
    if (!clerkLoaded) return;

    if (isSignedIn && clerkUser && session && !hasTriedSync.current) {
      hasTriedSync.current = true;
      syncUser();
    } else if (!isSignedIn) {
      hasTriedSync.current = false;
      setUser(null);
      setIsLoading(false);
    }
  }, [clerkLoaded, isSignedIn, clerkUser, session, syncUser]);

  // Refresh user data when refetchUser is called
  const refetchUser = useCallback(async () => {
    setIsLoading(true);
    await fetchUser();
  }, [fetchUser]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      if (!clerkSignIn) {
        throw new Error("Sign in not available");
      }

      await clerkSignIn.create({
        identifier: email,
        password,
      });
      router.push("/");
    },
    [clerkSignIn, router]
  );

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      _username: string,
      _displayName: string
    ) => {
      if (!clerkSignUp) {
        throw new Error("Sign up not available");
      }

      await clerkSignUp.create({
        emailAddress: email,
        password,
      });
      router.push("/");
    },
    [clerkSignUp, router]
  );

  const signOut = useCallback(async () => {
    if (!clerkSignOut) {
      throw new Error("Sign out not available");
    }

    await clerkSignOut({ redirectUrl: "/" });
    setUser(null);
  }, [clerkSignOut]);

  const loading = !clerkLoaded || (isSignedIn && (isLoading || isSyncing));

  const value = useMemo(
    () => ({
      user,
      loading,
      signIn,
      signUp,
      signOut,
      refetchUser,
    }),
    [user, loading, signIn, signUp, signOut, refetchUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  // During SSR, return a safe default
  if (context === undefined) {
    if (typeof window === "undefined") {
      return {
        user: null,
        loading: true,
        signIn: async () => {},
        signUp: async () => {},
        signOut: async () => {},
        refetchUser: async () => {},
      };
    }
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
