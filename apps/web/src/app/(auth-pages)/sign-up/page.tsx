"use client";

import { useState } from "react";
import { Trophy } from "lucide-react";
import Link from "next/link";
import { SocialAuthButtons } from "@/components/auth/social-auth-buttons";
import { SignInForm } from "@/components/auth/sign-in-form";
import { BlueskyHandleForm } from "@/components/auth/bluesky-handle-form";
import { WaitlistForm } from "@/components/auth/waitlist-form";

export default function SignUpPage() {
  const maintenanceMode = process.env.NEXT_PUBLIC_MAINTENANCE_MODE === "true";
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [showBlueskyForm, setShowBlueskyForm] = useState(false);
  const [blueskyLoading, setBlueskyLoading] = useState(false);
  const [blueskyError, setBlueskyError] = useState<string | null>(null);

  if (maintenanceMode) {
    return <WaitlistForm />;
  }

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
      <div className="flex w-full max-w-md flex-col items-center gap-8">
        {/* Compact branding */}
        <Link href="/" className="flex items-center gap-2">
          <div className="bg-primary flex size-8 items-center justify-center rounded-lg">
            <Trophy className="size-4 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight">trainers.gg</span>
        </Link>

        <SignInForm defaultMode="signup" />

        <button
          type="button"
          onClick={handleBack}
          className="text-muted-foreground hover:text-foreground text-sm"
        >
          Back to all sign-in options
        </button>
      </div>
    );
  }

  if (showBlueskyForm) {
    return (
      <div className="flex w-full max-w-md flex-col items-center gap-8">
        {/* Compact branding */}
        <Link href="/" className="flex items-center gap-2">
          <div className="bg-primary flex size-8 items-center justify-center rounded-lg">
            <Trophy className="size-4 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight">trainers.gg</span>
        </Link>

        <BlueskyHandleForm
          onSubmit={handleBlueskySubmit}
          loading={blueskyLoading}
          error={blueskyError}
          onErrorClear={() => setBlueskyError(null)}
          onBack={handleBack}
        />
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-8">
      {/* Branding */}
      <div className="flex flex-col items-center gap-3">
        <div className="bg-primary flex size-16 items-center justify-center rounded-2xl">
          <Trophy className="size-8 text-white" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">
            Join trainers.gg
          </h1>
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
  );
}
