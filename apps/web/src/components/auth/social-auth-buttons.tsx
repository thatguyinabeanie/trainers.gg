"use client";

import * as React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { oauthProviders } from "@/lib/supabase/auth";
import { BlueskyIcon } from "@/components/icons/bluesky-icon";

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

function MailIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-5"
      aria-hidden="true"
    >
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

const providerIcons: Record<string, () => React.ReactNode> = {
  google: GoogleIcon,
  twitter: XIcon,
  bluesky: () => <BlueskyIcon className="size-5" />,
};

interface SocialAuthButtonsProps {
  /** Called when user clicks the email button */
  onEmailClick?: () => void;
  /** Called when user clicks the Bluesky button */
  onBlueskyClick?: () => void;
}

/**
 * Social-login style auth buttons.
 *
 * Layout:
 * 1. Bluesky (primary / filled) — platform-native identity
 * 2. Apple (outline) — App Store requirement
 * 3. Google (outline)
 * 4. X (outline)
 * ---separator---
 * 5. Email (outline, muted)
 */
export function SocialAuthButtons({
  onEmailClick,
  onBlueskyClick,
}: SocialAuthButtonsProps) {
  const { signInWithOAuth } = useAuth();
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);

  const handleOAuthSignIn = async (provider: string) => {
    setLoadingProvider(provider);
    try {
      await signInWithOAuth(provider as "google" | "twitter");
    } finally {
      setLoadingProvider(null);
    }
  };

  const isDisabled = loadingProvider !== null;

  return (
    <div className="flex flex-col gap-3">
      {/* Bluesky — Primary / Most Prominent */}
      <Button
        type="button"
        className="bg-primary hover:bg-primary/90 h-11 w-full gap-2.5 text-white"
        disabled={isDisabled}
        onClick={onBlueskyClick}
      >
        <BlueskyIcon className="size-5" />
        Continue with Bluesky
      </Button>

      {/* Google & X from config */}
      {oauthProviders.map((provider) => {
        const Icon = providerIcons[provider.name];
        const isLoading = loadingProvider === provider.name;

        return (
          <Button
            key={provider.name}
            type="button"
            variant="outline"
            className="h-11 w-full gap-2.5"
            disabled={isDisabled}
            onClick={() => handleOAuthSignIn(provider.name)}
          >
            {isLoading ? (
              <span className="size-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : Icon ? (
              <Icon />
            ) : null}
            Continue with {provider.displayName}
          </Button>
        );
      })}

      {/* Separator */}
      <div className="flex items-center gap-4">
        <Separator className="flex-1" />
        <span className="text-muted-foreground text-sm">or</span>
        <Separator className="flex-1" />
      </div>

      {/* Email */}
      <Button
        type="button"
        variant="outline"
        className="text-muted-foreground h-11 w-full gap-2.5"
        disabled={isDisabled}
        onClick={onEmailClick}
      >
        <MailIcon />
        Continue with Email
      </Button>
    </div>
  );
}
