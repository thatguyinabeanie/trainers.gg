"use client";

import { api } from "@/lib/convex/api";
import { useClerk, useSignIn, useSignUp, useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import {
  createContext,
  type ReactNode,
  useContext,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from "react";

interface UserProfile {
  _id: string;
  displayName: string;
  username: string;
  bio?: string;
  avatarUrl?: string;
}

interface User {
  id: string;
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { isLoaded: clerkLoaded, isSignedIn, user: clerkUser } = useUser();
  const { signIn: clerkSignIn } = useSignIn();
  const { signUp: clerkSignUp } = useSignUp();
  const { signOut: clerkSignOut } = useClerk();

  // Get current user data from Convex
  const user = useQuery(api.auth.getCurrentUser, {});
  const ensureUserProfile = useMutation(api.auth.ensureUserProfile);
  const createUserWithProfile = useMutation(api.auth.createUserWithProfile);

  // Track if we've already tried to create the user
  const hasTriedCreating = useRef(false);

  // If user is signed in via Clerk but doesn't exist in Convex, create them
  useEffect(() => {
    async function syncUser() {
      if (
        clerkLoaded &&
        isSignedIn &&
        clerkUser &&
        user === null &&
        !hasTriedCreating.current
      ) {
        hasTriedCreating.current = true;
        try {
          // Try to create user with profile
          await createUserWithProfile({
            clerkUserId: clerkUser.id,
            email: clerkUser.primaryEmailAddress?.emailAddress,
            name: clerkUser.fullName || undefined,
            image: clerkUser.imageUrl,
          });
        } catch (error) {
          // User might already exist, try to ensure profile exists
          try {
            await ensureUserProfile({});
          } catch (profileError) {
            console.error("Failed to ensure user profile:", profileError);
          }
        }
      }
    }

    syncUser();
  }, [
    clerkLoaded,
    isSignedIn,
    clerkUser,
    user,
    createUserWithProfile,
    ensureUserProfile,
  ]);

  // Reset the ref when user signs out
  useEffect(() => {
    if (!isSignedIn) {
      hasTriedCreating.current = false;
    }
  }, [isSignedIn]);

  const isLoading = !clerkLoaded || (isSignedIn && user === undefined);

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
  }, [clerkSignOut]);

  const value = useMemo(
    () => ({
      user: user || null,
      loading: isLoading,
      signIn,
      signUp,
      signOut,
    }),
    [user, isLoading, signIn, signUp, signOut]
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
      };
    }
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
