"use client";

import { PostHogProvider as PHProvider, usePostHog } from "posthog-js/react";
import { Suspense, useEffect, type ReactNode } from "react";
import { useAuthContext } from "@/components/auth/auth-provider";
import { getConsentStatus } from "@/components/cookie-consent";
import { initPostHog, posthog } from "@/lib/posthog/client";
import { PostHogPageview } from "@/lib/posthog/posthog-pageview";

function PostHogAuthSync({ isImpersonating }: { isImpersonating: boolean }) {
  const { user, isAuthenticated } = useAuthContext();
  const ph = usePostHog();

  // Identify/reset user based on auth state
  useEffect(() => {
    if (!ph) return;

    try {
      if (isAuthenticated && user) {
        ph.identify(user.id, {
          email: user.email,
          username: user.user_metadata?.username as string | undefined,
          name: user.user_metadata?.full_name as string | undefined,
          bluesky_handle: user.user_metadata?.bluesky_handle as
            | string
            | undefined,
        });
      } else {
        ph.reset();
      }
    } catch (e) {
      console.error("PostHog auth sync failed:", e);
    }
  }, [ph, user, isAuthenticated]);

  // Disable session replay during impersonation
  useEffect(() => {
    if (!ph) return;

    try {
      if (isImpersonating) {
        ph.stopSessionRecording();
        ph.register({ $impersonated: true });
      } else {
        ph.unregister("$impersonated");
        ph.startSessionRecording();
      }
    } catch (e) {
      console.error("PostHog impersonation sync failed:", e);
    }
  }, [ph, isImpersonating]);

  return null;
}

interface PostHogProviderProps {
  children: ReactNode;
  isImpersonating?: boolean;
}

export function PostHogProvider({
  children,
  isImpersonating = false,
}: PostHogProviderProps) {
  useEffect(() => {
    initPostHog();

    // Apply initial consent state
    const consent = getConsentStatus();
    if (consent === "granted") {
      posthog.opt_in_capturing();
    }

    // Listen for consent changes from the cookie banner
    function handleConsentChange(e: Event) {
      const status = (e as CustomEvent<string>).detail;
      if (status === "granted") {
        posthog.opt_in_capturing();
      } else {
        posthog.opt_out_capturing();
      }
    }

    window.addEventListener("consent-change", handleConsentChange);
    return () => {
      window.removeEventListener("consent-change", handleConsentChange);
    };
  }, []);

  return (
    <PHProvider client={posthog}>
      <PostHogAuthSync isImpersonating={isImpersonating} />
      <Suspense fallback={null}>
        <PostHogPageview />
      </Suspense>
      {children}
    </PHProvider>
  );
}
