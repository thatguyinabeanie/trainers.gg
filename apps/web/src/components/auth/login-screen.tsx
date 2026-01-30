"use client";

import { useState } from "react";
import { Trophy } from "lucide-react";
import Link from "next/link";
import { SocialAuthButtons } from "./social-auth-buttons";
import { SignInForm } from "./sign-in-form";
import { BlueskyHandleForm } from "./bluesky-handle-form";

export function LoginScreen() {
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [showBlueskyForm, setShowBlueskyForm] = useState(false);
  const [blueskyLoading, setBlueskyLoading] = useState(false);
  const [blueskyError, setBlueskyError] = useState<string | null>(null);

  const handleBlueskySubmit = (handle: string) => {
    setBlueskyError(null);
    setBlueskyLoading(true);
    try {
      const params = new URLSearchParams({ handle });
      window.location.href = `/api/oauth/login?${params.toString()}`;
    } catch {
      setBlueskyError("Failed to start Bluesky login");
      setBlueskyLoading(false);
    }
  };

  const handleBack = () => {
    setShowEmailForm(false);
    setShowBlueskyForm(false);
    setBlueskyError(null);
    setBlueskyLoading(false);
  };

  if (showEmailForm) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8">
        <div className="flex w-full max-w-md flex-col items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="bg-primary flex size-8 items-center justify-center rounded-lg">
              <Trophy className="size-4 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight">
              trainers.gg
            </span>
          </Link>

          <SignInForm />

          <button
            type="button"
            onClick={handleBack}
            className="text-muted-foreground hover:text-foreground text-sm"
          >
            Back to all sign-in options
          </button>
        </div>
      </main>
    );
  }

  if (showBlueskyForm) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8">
        <div className="flex w-full max-w-md flex-col items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="bg-primary flex size-8 items-center justify-center rounded-lg">
              <Trophy className="size-4 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight">
              trainers.gg
            </span>
          </Link>

          <BlueskyHandleForm
            onSubmit={handleBlueskySubmit}
            loading={blueskyLoading}
            error={blueskyError}
            onErrorClear={() => setBlueskyError(null)}
            onBack={handleBack}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="flex w-full max-w-sm flex-col items-center gap-8">
        {/* Branding */}
        <div className="flex flex-col items-center gap-3">
          <div className="bg-primary flex size-16 items-center justify-center rounded-2xl">
            <Trophy className="size-8 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">trainers.gg</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              The competitive Pokemon community platform
            </p>
          </div>
        </div>

        {/* Social login buttons */}
        <div className="w-full">
          <SocialAuthButtons
            onEmailClick={() => setShowEmailForm(true)}
            onBlueskyClick={() => setShowBlueskyForm(true)}
          />
        </div>

        {/* Terms */}
        <p className="text-muted-foreground max-w-xs text-center text-xs">
          By continuing, you agree to our{" "}
          <Link href="/terms" className="text-primary hover:underline">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-primary hover:underline">
            Privacy Policy
          </Link>
        </p>
      </div>
    </main>
  );
}
