"use client";

import { PostHogProvider as PHProvider, usePostHog } from "posthog-js/react";
import { Suspense, useEffect, useRef, type ReactNode } from "react";

import { setErrorSink } from "@trainers/utils";

import { useAuthContext } from "@/components/auth/auth-provider";
import { getConsentStatus } from "@/components/cookie-consent";
import { captureException, initPostHog, posthog } from "@/lib/posthog/client";
import { PostHogPageview } from "@/lib/posthog/posthog-pageview";

function PostHogAuthSync({ isImpersonating }: { isImpersonating: boolean }) {
  const { user, isAuthenticated } = useAuthContext();
  const ph = usePostHog();
  const wasImpersonating = useRef(false);

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

  // During impersonation: stop session recording and tag events as impersonated
  useEffect(() => {
    if (!ph) return;

    try {
      if (isImpersonating) {
        ph.stopSessionRecording();
        ph.register({ $impersonated: true });
        wasImpersonating.current = true;
      } else {
        ph.unregister("$impersonated");
        // Only restart recording on true→false transition,
        // not on initial mount (consent controls recording otherwise)
        if (wasImpersonating.current) {
          ph.startSessionRecording();
          wasImpersonating.current = false;
        }
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

    // Wire the project-wide `logError` helper to PostHog so any package's
    // catch-block reporting (validators, supabase queries, calc dispatch)
    // ends up in the same exception stream as React error boundaries.
    // The default sink stays `console.error` for SSR / edge / Node.
    const restoreSink = setErrorSink((scope, error, context) => {
      const props = { scope, ...context };
      captureException(error, props);
      // Keep the console line too — Vercel runtime logs are still useful
      // for cross-referencing client errors with server traces.
      console.error(`[error-sink] ${scope}`, error, context ?? {});
    });

    // Re-apply consent for returning users who already opted in.
    // "denied" and "undecided" require no action because PostHog
    // starts opted out by default (opt_out_capturing_by_default: true).
    if (posthog.__loaded) {
      const consent = getConsentStatus();
      if (consent === "granted") {
        try {
          posthog.opt_in_capturing();
        } catch (e) {
          console.error("PostHog opt-in failed:", e);
        }
      }
    }

    // Listen for consent changes from the cookie banner
    function handleConsentChange(event: Event) {
      if (!posthog.__loaded) return;
      const status = (event as CustomEvent<string>).detail;
      if (status !== "granted" && status !== "denied") return;
      try {
        if (status === "granted") {
          posthog.opt_in_capturing();
        } else {
          posthog.opt_out_capturing();
        }
      } catch (err) {
        console.error("PostHog consent change failed:", err);
      }
    }

    window.addEventListener("consent-change", handleConsentChange);
    return () => {
      window.removeEventListener("consent-change", handleConsentChange);
      restoreSink();
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
