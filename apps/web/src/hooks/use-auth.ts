"use client";

/* global window */

import { useEffect, useState } from "react";
import { type User, type Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Create SSR-compatible client that syncs session to cookies
  const supabase = createClient();

  useEffect(() => {
    const getInitialSession = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      if (error) {
        console.error("Error getting session:", error);
      }
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    };

    getInitialSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  const signOut = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error signing out:", error);
      setLoading(false);
    }
  };

  const signInWithOAuth = async (
    provider: "google" | "discord" | "github" | "twitter",
    /** Optional path to redirect to after auth (e.g. "/tournaments/slug") */
    redirectPath?: string
  ) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const callbackUrl = redirectPath
      ? `${origin}/auth/callback?next=${encodeURIComponent(redirectPath)}`
      : `${origin}/auth/callback`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: callbackUrl,
      },
    });
    if (error) {
      console.error(`Error signing in with ${provider}:`, error);
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    return { data, error };
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
      inviteToken?: string;
    }
  ) => {
    setLoading(true);

    try {
      // Call the unified signup edge function that creates both
      // Supabase Auth + Bluesky PDS accounts
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/signup`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            email,
            password,
            username: metadata?.username?.toLowerCase(),
            firstName: metadata?.firstName,
            lastName: metadata?.lastName,
            birthDate: metadata?.birthDate,
            country: metadata?.country?.toUpperCase(),
            inviteToken: metadata?.inviteToken,
          }),
        }
      );

      const result = await response.json();

      if (!result.success) {
        setLoading(false);
        return {
          data: null,
          error: {
            message: result.error || "Signup failed",
            code: result.code,
          },
        };
      }

      // Sign in the user after successful signup
      // The edge function created the account, now we need a session
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      setLoading(false);
      return { data, error };
    } catch (err) {
      setLoading(false);
      return {
        data: null,
        error: {
          message:
            err instanceof Error ? err.message : "An unexpected error occurred",
          code: "NETWORK_ERROR",
        },
      };
    }
  };

  const resetPassword = async (email: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/reset-password`,
    });
    return { error };
  };

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    return { error };
  };

  return {
    user,
    session,
    loading,
    isAuthenticated: !!user,
    signOut,
    signInWithOAuth,
    signInWithEmail,
    signUpWithEmail,
    resetPassword,
    updatePassword,
  };
}
