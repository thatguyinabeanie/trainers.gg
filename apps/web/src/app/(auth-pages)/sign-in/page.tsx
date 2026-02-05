"use client";

import { type FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Trophy } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UsernameInput } from "@/components/ui/username-input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { SocialAuthButtons } from "@/components/auth/social-auth-buttons";
import { SignInView } from "@/components/auth/sign-in-form";
import { useAuth } from "@/hooks/use-auth";
import { resolveLoginIdentifier } from "@/app/(auth-pages)/actions";
import { getRedirectParam, withRedirectParam } from "@/app/(auth-pages)/utils";

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
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

        const redirectTo = getRedirectParam(searchParams);
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

        <SignInView
          hideHeading
          redirectTo={getRedirectParam(searchParams) ?? undefined}
        />

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
          <div
            role="alert"
            className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm"
          >
            {error}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Label htmlFor="username">Username</Label>
          <UsernameInput
            id="username"
            placeholder="username"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              setError(null);
              if (showPassword) setShowPassword(false);
            }}
            autoFocus
          />
        </div>

        {showPassword && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
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
            <div className="flex justify-end">
              <Link
                href="/forgot-password"
                className="text-muted-foreground hover:text-primary text-sm"
              >
                Forgot password?
              </Link>
            </div>
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
        <SocialAuthButtons
          onEmailClick={() => setShowEmailForm(true)}
          redirectTo={getRedirectParam(searchParams) ?? undefined}
        />
      </div>

      {/* Sign up link */}
      <p className="text-muted-foreground text-center text-sm">
        New here?{" "}
        <Link
          href={withRedirectParam("/sign-up", searchParams)}
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
