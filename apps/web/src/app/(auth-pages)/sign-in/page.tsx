"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Trophy } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { SocialAuthButtons } from "@/components/auth/social-auth-buttons";
import { SignInView } from "@/components/auth/sign-in-form";
import { useAuth } from "@/hooks/use-auth";
import { resolveLoginIdentifier } from "@/app/(auth-pages)/actions";

/** Read the `redirect` query param directly from the URL. */
function getRedirectParam(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("redirect");
}

export default function SignInPage() {
  const router = useRouter();
  const { signInWithEmail } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleContinue = async (e: FormEvent) => {
    e.preventDefault();

    const trimmed = username.trim();
    if (!trimmed) return;

    if (showPassword) {
      // Step 2: sign in with username + password
      if (!password) return;

      setError(null);
      setIsSubmitting(true);

      try {
        const { email, error: resolveError } =
          await resolveLoginIdentifier(trimmed);

        if (resolveError || !email) {
          setError(resolveError || "No account found with that username");
          return;
        }

        const { error: signInError } = await signInWithEmail(email, password);

        if (signInError) {
          setError(signInError.message);
          return;
        }

        const redirectTo = getRedirectParam();
        router.push(
          redirectTo && redirectTo.startsWith("/") ? redirectTo : "/"
        );
        router.refresh();
      } catch {
        setError("An unexpected error occurred");
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Step 1: validate username exists, then show password
      setError(null);
      setIsSubmitting(true);

      try {
        const { email, error: resolveError } =
          await resolveLoginIdentifier(trimmed);

        if (resolveError || !email) {
          setError(resolveError || "No account found with that username");
          return;
        }

        setShowPassword(true);
      } catch {
        setError("An unexpected error occurred");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  if (showEmailForm) {
    return (
      <div className="flex w-full max-w-md flex-col items-center gap-8">
        <Link href="/" className="flex items-center gap-2">
          <div className="bg-primary flex size-8 items-center justify-center rounded-lg">
            <Trophy className="size-4 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight">trainers.gg</span>
        </Link>

        <SignInView hideHeading redirectTo={getRedirectParam() ?? undefined} />

        <button
          type="button"
          onClick={() => setShowEmailForm(false)}
          className="text-muted-foreground hover:text-foreground text-sm"
        >
          Back to all sign-in options
        </button>
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
          <h1 className="text-2xl font-bold tracking-tight">trainers.gg</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            The competitive Pokemon community platform
          </p>
        </div>
      </div>

      {/* Username sign-in */}
      <form onSubmit={handleContinue} className="flex w-full flex-col gap-4">
        {error && (
          <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Label htmlFor="username">Username</Label>
          <div className="border-input focus-within:ring-ring/50 focus-within:border-ring flex items-center overflow-hidden rounded-md border focus-within:ring-[3px]">
            <Input
              id="username"
              type="text"
              placeholder="username"
              autoComplete="username"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError(null);
                if (showPassword) setShowPassword(false);
              }}
              className="rounded-none border-0 shadow-none focus-visible:ring-0"
              autoFocus
            />
            <span className="text-muted-foreground border-l-input bg-muted border-l px-3 text-sm whitespace-nowrap select-none">
              .{process.env.NEXT_PUBLIC_PDS_HANDLE_DOMAIN || "trainers.gg"}
            </span>
          </div>
        </div>

        {showPassword && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/forgot-password"
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              autoFocus
            />
          </div>
        )}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting
            ? "Signing in..."
            : showPassword
              ? "Sign In"
              : "Continue"}
        </Button>
      </form>

      {/* Separator */}
      <div className="flex w-full items-center gap-4">
        <Separator className="flex-1" />
        <span className="text-muted-foreground text-sm">or</span>
        <Separator className="flex-1" />
      </div>

      {/* Social login buttons */}
      <div className="w-full">
        <SocialAuthButtons onEmailClick={() => setShowEmailForm(true)} />
      </div>

      {/* Sign up link */}
      <p className="text-muted-foreground text-center text-sm">
        New here?{" "}
        <Link
          href="/sign-up"
          className="text-primary font-medium hover:underline"
        >
          Create Account
        </Link>
      </p>

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
