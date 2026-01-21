"use client";

import { useMemo, useRef } from "react";
import { useSession } from "@clerk/nextjs";
import { createSupabaseClient } from "@trainers/supabase";

/**
 * Hook to get a Supabase client authenticated with the current Clerk session.
 * Use this in client components.
 *
 * Requires Third-Party Auth configured in Supabase Dashboard.
 * See: https://supabase.com/docs/guides/auth/third-party/clerk
 */
export function useSupabaseClient() {
  const { session, isLoaded } = useSession();

  // Use a ref to store the session so the client doesn't recreate on every render
  const sessionRef = useRef(session);
  sessionRef.current = session;

  // Create the client once - the accessToken function captures the ref
  // which always points to the current session
  const client = useMemo(() => {
    return createSupabaseClient(async () => {
      const currentSession = sessionRef.current;
      if (!currentSession) {
        // Session not loaded or user not signed in
        return null;
      }
      try {
        const token = await currentSession.getToken();
        return token ?? null;
      } catch (error) {
        console.error("Failed to get Clerk session token:", error);
        return null;
      }
    });
    // Empty deps - client is created once, uses ref for session
  }, []);

  return { client, isSessionLoaded: isLoaded };
}
