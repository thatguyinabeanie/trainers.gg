"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import {
  resolveLoginIdentifier,
  checkUsernameAvailability,
} from "@/app/(auth-pages)/actions";
import {
  passwordSchema,
  usernameSchema,
  emailSchema,
} from "@trainers/validators";

// --- Schemas ---

const signInSchema = z.object({
  identifier: z
    .string()
    .min(1, "Email or username is required")
    .refine(
      (val) => {
        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
        const isUsername = /^[a-zA-Z0-9_-]{3,20}$/.test(val);
        return isEmail || isUsername;
      },
      { message: "Please enter a valid email or username" }
    ),
  password: z.string().min(1, "Password is required"),
});

const signUpSchema = z
  .object({
    username: usernameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type SignInFormData = z.infer<typeof signInSchema>;
type SignUpFormData = z.infer<typeof signUpSchema>;

interface SignInFormProps {
  /** Start in sign-up mode */
  defaultMode?: "signin" | "signup";
  /** Optional path to redirect to after auth (e.g. "/tournaments/slug") */
  redirectTo?: string;
}

export function SignInForm({
  defaultMode = "signin",
  redirectTo,
}: SignInFormProps) {
  const [mode, setMode] = useState<"signin" | "signup">(defaultMode);
  const isSignUp = mode === "signup";

  return isSignUp ? (
    <SignUpView onToggle={() => setMode("signin")} redirectTo={redirectTo} />
  ) : (
    <SignInView onToggle={() => setMode("signup")} redirectTo={redirectTo} />
  );
}

// --- Sign In View ---

export function SignInView({
  onToggle,
  hideHeading,
  redirectTo,
}: {
  onToggle?: () => void;
  hideHeading?: boolean;
  /** URL path to navigate to after sign-in (e.g. "/tournaments/slug") */
  redirectTo?: string;
}) {
  const router = useRouter();
  const { signInWithEmail } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
  });

  const onSubmit = async (data: SignInFormData) => {
    setError(null);
    setIsSubmitting(true);

    try {
      const { email, error: resolveError } = await resolveLoginIdentifier(
        data.identifier
      );

      if (resolveError || !email) {
        setError(resolveError || "Could not find account");
        return;
      }

      const { error: signInError } = await signInWithEmail(
        email,
        data.password
      );

      if (signInError) {
        setError(signInError.message);
        return;
      }

      router.push(redirectTo && redirectTo.startsWith("/") ? redirectTo : "/");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex w-full max-w-md flex-col gap-6">
      {!hideHeading && (
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">Welcome Back</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Sign in to your account
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {error && (
          <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Label htmlFor="identifier">Email or Username</Label>
          <Input
            id="identifier"
            type="text"
            placeholder="you@example.com or ash"
            autoComplete="username"
            aria-invalid={errors.identifier ? "true" : undefined}
            {...register("identifier")}
          />
          {errors.identifier && (
            <p className="text-destructive text-sm">
              {errors.identifier.message}
            </p>
          )}
          <p className="text-muted-foreground text-xs">
            Enter your email or username (no @trainers.gg needed)
          </p>
        </div>

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
            aria-invalid={errors.password ? "true" : undefined}
            {...register("password")}
          />
          {errors.password && (
            <p className="text-destructive text-sm">
              {errors.password.message}
            </p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Signing in..." : "Sign In"}
        </Button>
      </form>

      {onToggle && (
        <p className="text-muted-foreground text-center text-sm">
          New here?{" "}
          <button
            type="button"
            onClick={onToggle}
            className="text-primary font-medium hover:underline"
          >
            Create Account
          </button>
        </p>
      )}
    </div>
  );
}

// --- Sign Up View ---

function SignUpView({
  onToggle,
  redirectTo,
}: {
  onToggle: () => void;
  /** Optional path to redirect to after sign-up */
  redirectTo?: string;
}) {
  const router = useRouter();
  const { signUpWithEmail } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
  });

  const onSubmit = async (data: SignUpFormData) => {
    setError(null);
    setIsSubmitting(true);

    try {
      const { available, error: usernameError } =
        await checkUsernameAvailability(data.username);

      if (usernameError) {
        setError(usernameError);
        return;
      }

      if (!available) {
        setError("Username is already taken");
        return;
      }

      const { error: signUpError } = await signUpWithEmail(
        data.email,
        data.password,
        {
          username: data.username.toLowerCase(),
        }
      );

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      router.push(redirectTo && redirectTo.startsWith("/") ? redirectTo : "/");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex w-full max-w-md flex-col gap-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">Join trainers.gg</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Create your account
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
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
              placeholder="cooltrainer123"
              autoComplete="username"
              aria-invalid={errors.username ? "true" : undefined}
              className="rounded-none border-0 shadow-none focus-visible:ring-0"
              {...register("username")}
            />
            <span className="text-muted-foreground border-l-input bg-muted border-l px-3 text-sm whitespace-nowrap select-none">
              .{process.env.NEXT_PUBLIC_PDS_HANDLE_DOMAIN || "trainers.gg"}
            </span>
          </div>
          {errors.username && (
            <p className="text-destructive text-sm">
              {errors.username.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            aria-invalid={errors.email ? "true" : undefined}
            {...register("email")}
          />
          {errors.email && (
            <p className="text-destructive text-sm">{errors.email.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="Create a password"
            autoComplete="new-password"
            aria-invalid={errors.password ? "true" : undefined}
            {...register("password")}
          />
          {errors.password && (
            <p className="text-destructive text-sm">
              {errors.password.message}
            </p>
          )}
          <ul className="text-muted-foreground list-inside list-disc text-xs">
            <li>At least 8 characters</li>
            <li>At least one uppercase letter</li>
            <li>At least one lowercase letter</li>
            <li>At least one number</li>
            <li>At least one symbol (!@#$%^&*...)</li>
          </ul>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="Confirm your password"
            autoComplete="new-password"
            aria-invalid={errors.confirmPassword ? "true" : undefined}
            {...register("confirmPassword")}
          />
          {errors.confirmPassword && (
            <p className="text-destructive text-sm">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Creating account..." : "Create Account"}
        </Button>
      </form>

      <p className="text-muted-foreground text-center text-sm">
        Already have an account?{" "}
        <button
          type="button"
          onClick={onToggle}
          className="text-primary font-medium hover:underline"
        >
          Sign In
        </button>
      </p>
    </div>
  );
}
