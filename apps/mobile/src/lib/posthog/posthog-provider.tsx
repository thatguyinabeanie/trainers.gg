import { PostHogProvider as PHProvider } from "posthog-react-native";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/lib/supabase/auth-provider";
import { getPostHog } from "@/lib/posthog/client";
import { PostHogNavigation } from "@/lib/posthog/posthog-navigation";

/**
 * Syncs auth state with PostHog identity.
 * Identifies the user on sign in, resets on sign out.
 */
function PostHogAuthSync() {
  const { user, isAuthenticated } = useAuth();
  const posthog = getPostHog();

  useEffect(() => {
    if (!posthog) return;

    if (isAuthenticated && user) {
      const username = user.user_metadata?.username as string | undefined;
      const blueskyHandle = user.user_metadata?.bluesky_handle as
        | string
        | undefined;
      posthog.identify(user.id, {
        ...(user.email && { email: user.email }),
        ...(username && { username }),
        ...(blueskyHandle && { bluesky_handle: blueskyHandle }),
      });
    } else {
      posthog.reset();
    }
  }, [posthog, user, isAuthenticated]);

  return null;
}

interface PostHogProviderProps {
  children: ReactNode;
}

/**
 * PostHog provider for the mobile app.
 * Wraps children with the PostHog SDK provider, auth sync, and navigation tracking.
 * Renders children without PostHog when env vars are missing (local dev).
 */
export function PostHogProvider({ children }: PostHogProviderProps) {
  const posthog = getPostHog();

  // When PostHog is not configured, render children directly
  if (!posthog) {
    return <>{children}</>;
  }

  return (
    <PHProvider
      client={posthog}
      autocapture={{ captureScreens: false, captureTouches: true }}
    >
      <PostHogAuthSync />
      <PostHogNavigation />
      {children}
    </PHProvider>
  );
}
