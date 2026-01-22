"use client";

/* global window */

import { useEffect, useMemo, useState } from "react";
import { type User, type Session } from "@supabase/supabase-js";
import { createPublicSupabaseClient } from "@trainers/supabase";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Create client once and memoize to prevent recreating on each render
  const supabase = useMemo(() => createPublicSupabaseClient(), []);

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
    provider: "google" | "discord" | "github" | "twitter"
  ) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${origin}/auth/callback`,
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
    }
  ) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
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
    return { data, error };
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
