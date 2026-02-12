"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { oauthProviders } from "@/lib/supabase/auth";
import { BlueskyIcon } from "@/components/icons/bluesky-icon";
import { toast } from "sonner";
import { unlinkBlueskyAction, getBlueskyStatus } from "@/actions/identities";

// Provider icons (reusing from social-auth-buttons pattern)
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
      <path
        fill="currentColor"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="currentColor"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="currentColor"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="currentColor"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
      <path
        fill="currentColor"
        d="M18.244 2.25h3.308l-7.227 8.26l8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
      />
    </svg>
  );
}

function DiscordIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
      <path
        fill="currentColor"
        d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"
      />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
      />
    </svg>
  );
}

// Type for user identity from Supabase Auth
interface UserIdentity {
  id: string;
  user_id: string;
  identity_id: string;
  provider: string;
  identity_data?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

const providerIcons: Record<string, () => React.JSX.Element> = {
  google: GoogleIcon,
  twitter: XIcon,
  discord: DiscordIcon,
  github: GitHubIcon,
};

/**
 * Linked Accounts Section
 * Displays all linked OAuth identities and Bluesky, with connect/disconnect buttons
 * Includes lockout protection to prevent unlinking the last authentication method
 */
export function LinkedIdentitiesSection() {
  const { user, signInWithOAuth } = useAuth();
  const supabase = createClient();
  const [identities, setIdentities] = useState<UserIdentity[]>([]);
  const [blueskyDid, setBlueskyDid] = useState<string | null>(null);
  const [blueskyHandle, setBlueskyHandle] = useState<string | null>(null);
  const [unlinking, setUnlinking] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load identities and Bluesky status on mount
  useEffect(() => {
    const loadIdentities = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      // Set identities from user object
      setIdentities((user.identities as UserIdentity[]) || []);

      // Fetch Bluesky status from server
      const result = await getBlueskyStatus();
      if (result.success) {
        setBlueskyDid(result.data.did);
        setBlueskyHandle(result.data.handle);
      }

      setLoading(false);
    };

    loadIdentities();
  }, [user]);

  // Calculate total linked methods for lockout protection
  const totalLinkedMethods = identities.length + (blueskyDid ? 1 : 0);
  const canUnlink = totalLinkedMethods > 1;

  /**
   * Handle linking a new identity
   */
  const handleLink = async (provider: string) => {
    if (provider === "bluesky") {
      // Redirect to Bluesky OAuth flow
      const returnUrl = encodeURIComponent("/dashboard/settings/account");
      window.location.href = `/api/oauth/login?returnUrl=${returnUrl}`;
    } else {
      // Use standard Supabase OAuth
      await signInWithOAuth(
        provider as "google" | "twitter" | "discord" | "github",
        "/dashboard/settings/account"
      );
    }
  };

  /**
   * Handle unlinking an identity
   */
  const handleUnlink = async (identityId: string, provider: string) => {
    if (!canUnlink) {
      toast.error("You must have at least one authentication method");
      return;
    }

    setUnlinking(identityId);
    try {
      if (provider === "bluesky") {
        // Unlink Bluesky via server action
        const result = await unlinkBlueskyAction();
        if (result.success) {
          setBlueskyDid(null);
          setBlueskyHandle(null);
          toast.success("Bluesky account disconnected");
        } else {
          toast.error(result.error || "Failed to disconnect Bluesky");
        }
      } else {
        // Unlink standard OAuth identity
        const identity = identities.find((i) => i.id === identityId);
        if (!identity) {
          toast.error("Identity not found");
          return;
        }

        const { error } = await supabase.auth.unlinkIdentity(identity);

        if (error) {
          toast.error(error.message);
        } else {
          // Remove from local state
          setIdentities((prev) => prev.filter((i) => i.id !== identityId));
          toast.success("Account disconnected");
        }
      }
    } catch (error) {
      console.error("Failed to unlink identity:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setUnlinking(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <span
          role="status"
          aria-label="Loading"
          className="border-primary size-6 animate-spin rounded-full border-2 border-t-transparent"
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Bluesky */}
      {blueskyDid && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BlueskyIcon className="size-5" />
            <div>
              <p className="text-sm font-medium">Bluesky</p>
              <p className="text-muted-foreground text-xs">
                {blueskyHandle ? `@${blueskyHandle}` : "Connected"}
              </p>
            </div>
          </div>
          {canUnlink ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleUnlink("bluesky", "bluesky")}
              disabled={unlinking !== null}
            >
              {unlinking === "bluesky" ? "Disconnecting..." : "Disconnect"}
            </Button>
          ) : (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger render={<span />}>
                  <Button variant="outline" size="sm" disabled>
                    Disconnect
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>You must have at least one authentication method</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      )}

      {/* Standard OAuth providers */}
      {oauthProviders.map((provider) => {
        const identity = identities.find((i) => i.provider === provider.name);
        const Icon = providerIcons[provider.name];
        const isUnlinking = unlinking === identity?.id;

        return (
          <div
            key={provider.name}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              {Icon && <Icon />}
              <div>
                <p className="text-sm font-medium">{provider.displayName}</p>
                <p className="text-muted-foreground text-xs">
                  {identity ? "Connected" : "Not connected"}
                </p>
              </div>
            </div>
            {identity ? (
              canUnlink ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleUnlink(identity.id, provider.name)}
                  disabled={unlinking !== null}
                >
                  {isUnlinking ? "Disconnecting..." : "Disconnect"}
                </Button>
              ) : (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger render={<span />}>
                      <Button variant="outline" size="sm" disabled>
                        Disconnect
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>You must have at least one authentication method</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleLink(provider.name)}
              >
                Connect
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}
