"use client";

import * as React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { oauthProviders, blueskyProvider } from "@/lib/supabase/auth";
import { BlueskyIcon } from "@/components/icons/bluesky-icon";

interface SocialAuthButtonsProps {
  mode: "signin" | "signup";
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
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

function DiscordIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        fill="currentColor"
        d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"
      />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 .297c-6.63 0-12 5.373-12 12c0 5.303 3.438 9.8 8.205 11.385c.6.113.82-.258.82-.577c0-.285-.01-1.04-.015-2.04c-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729c1.205.084 1.838 1.236 1.838 1.236c1.07 1.835 2.809 1.305 3.495.998c.108-.776.417-1.305.76-1.605c-2.665-.3-5.466-1.332-5.466-5.93c0-1.31.465-2.38 1.235-3.22c-.135-.303-.54-1.523.105-3.176c0 0 1.005-.322 3.3 1.23c.96-.267 1.98-.399 3-.405c1.02.006 2.04.138 3 .405c2.28-1.552 3.285-1.23 3.285-1.23c.645 1.653.24 2.873.12 3.176c.765.84 1.23 1.91 1.23 3.22c0 4.61-2.805 5.625-5.475 5.92c.42.36.81 1.096.81 2.22c0 1.606-.015 2.896-.015 3.286c0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
      />
    </svg>
  );
}

function TwitterIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        fill="currentColor"
        d="M18.244 2.25h3.308l-7.227 8.26l8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
      />
    </svg>
  );
}

const providerIcons: Record<string, () => React.ReactNode> = {
  google: GoogleIcon,
  discord: DiscordIcon,
  github: GitHubIcon,
  twitter: TwitterIcon,
  bluesky: () => <BlueskyIcon className="size-4" />,
};

export function SocialAuthButtons({ mode }: SocialAuthButtonsProps) {
  const { signInWithOAuth } = useAuth();
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [showBlueskyDialog, setShowBlueskyDialog] = useState(false);
  const [blueskyHandle, setBlueskyHandle] = useState("");
  const [blueskyError, setBlueskyError] = useState<string | null>(null);

  const handleOAuthSignIn = async (provider: string) => {
    setLoadingProvider(provider);
    try {
      await signInWithOAuth(
        provider as "google" | "discord" | "github" | "twitter"
      );
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleBlueskyClick = () => {
    setBlueskyError(null);
    setBlueskyHandle("");
    setShowBlueskyDialog(true);
  };

  const handleBlueskySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBlueskyError(null);

    const handle = blueskyHandle.trim();
    if (!handle) {
      setBlueskyError("Please enter your Bluesky handle");
      return;
    }

    setLoadingProvider("bluesky");

    try {
      // Redirect to the Bluesky OAuth login endpoint
      const params = new URLSearchParams({ handle });
      window.location.href = `/api/oauth/login?${params.toString()}`;
    } catch {
      setBlueskyError("Failed to start Bluesky login");
      setLoadingProvider(null);
    }
  };

  const actionText = mode === "signin" ? "Sign in" : "Sign up";

  return (
    <div className="flex flex-col gap-3">
      {oauthProviders.map((provider) => {
        const Icon = providerIcons[provider.name];
        const isLoading = loadingProvider === provider.name;

        return (
          <Button
            key={provider.name}
            type="button"
            variant="outline"
            className="w-full"
            disabled={loadingProvider !== null}
            onClick={() => handleOAuthSignIn(provider.name)}
          >
            {isLoading ? (
              <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : Icon ? (
              <Icon />
            ) : null}
            <span>
              {actionText} with {provider.displayName}
            </span>
          </Button>
        );
      })}

      {/* Bluesky Button */}
      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={loadingProvider !== null}
        onClick={handleBlueskyClick}
      >
        {loadingProvider === "bluesky" ? (
          <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          <BlueskyIcon className="size-4" />
        )}
        <span>
          {actionText} with {blueskyProvider.displayName}
        </span>
      </Button>

      {/* Bluesky Handle Input Dialog */}
      <Dialog open={showBlueskyDialog} onOpenChange={setShowBlueskyDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BlueskyIcon className="size-4" />
              {actionText} with Bluesky
            </DialogTitle>
            <DialogDescription>
              Enter your Bluesky handle to continue. This can be your
              trainers.gg handle or any Bluesky account.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleBlueskySubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Input
                type="text"
                placeholder="username.bsky.social or username.trainers.gg"
                value={blueskyHandle}
                onChange={(e) => setBlueskyHandle(e.target.value)}
                disabled={loadingProvider === "bluesky"}
                autoFocus
              />
              {blueskyError && (
                <p className="text-destructive text-sm">{blueskyError}</p>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowBlueskyDialog(false)}
                disabled={loadingProvider === "bluesky"}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loadingProvider === "bluesky"}>
                {loadingProvider === "bluesky" ? (
                  <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  "Continue"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
