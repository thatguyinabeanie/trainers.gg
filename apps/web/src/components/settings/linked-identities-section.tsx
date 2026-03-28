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
  twitter: XIcon,
  discord: DiscordIcon,
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
        provider as "discord" | "twitter",
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BlueskyIcon className="size-5" />
          <div>
            <p className="text-sm font-medium">Bluesky</p>
            <p className="text-muted-foreground text-xs">
              {blueskyDid
                ? blueskyHandle
                  ? `@${blueskyHandle}`
                  : "Connected"
                : "Not connected"}
            </p>
          </div>
        </div>
        {blueskyDid ? (
          canUnlink ? (
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
          )
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleLink("bluesky")}
          >
            Connect
          </Button>
        )}
      </div>

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
