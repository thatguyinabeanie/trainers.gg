"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { checkUsernameAvailability } from "@/app/(auth-pages)/actions";
import { markInviteUsed } from "@/app/invite/actions";
import { passwordSchema, usernameSchema } from "@trainers/validators";

const inviteSignUpSchema = z
  .object({
    username: usernameSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type InviteSignUpFormData = z.infer<typeof inviteSignUpSchema>;

interface InviteSignUpProps {
  email: string;
  token: string;
}

export function InviteSignUp({ email, token }: InviteSignUpProps) {
  const router = useRouter();
  const { signUpWithEmail, signInWithEmail } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<InviteSignUpFormData>({
    resolver: zodResolver(inviteSignUpSchema),
  });

  const onSubmit = async (data: InviteSignUpFormData) => {
    setError(null);
    setIsSubmitting(true);

    try {
      // Check username availability
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

      // Call the unified signup edge function
      const { error: signUpError } = await signUpWithEmail(
        email,
        data.password,
        {
          username: data.username.toLowerCase(),
        }
      );

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      // Sign in to get the session and user ID
      const { data: signInData, error: signInError } = await signInWithEmail(
        email,
        data.password
      );

      if (signInError || !signInData?.user) {
        // Account was created but sign-in failed — redirect to sign-in page
        router.push("/sign-in");
        return;
      }

      // Mark the invite as used
      await markInviteUsed(token, signInData.user.id);

      // Redirect to onboarding or dashboard
      router.push("/");
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
    <div className="flex w-full max-w-md flex-col items-center gap-8">
      {/* Branding */}
      <Link href="/" className="flex items-center gap-2">
        <div className="bg-primary flex size-10 items-center justify-center rounded-xl">
          <Trophy className="size-5 text-white" />
        </div>
        <span className="text-xl font-bold tracking-tight">trainers.gg</span>
      </Link>

      <Card className="w-full">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Create Your Account</CardTitle>
          <p className="text-muted-foreground mt-1 text-sm">
            You&apos;ve been invited to join the private beta
          </p>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            {error && (
              <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">
                {error}
              </div>
            )}

            {/* Email (read-only, pre-filled from invite) */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                readOnly
                className="bg-muted cursor-not-allowed"
              />
              <p className="text-muted-foreground text-xs">
                This is the email address your invite was sent to
              </p>
            </div>

            {/* Username */}
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
                <span className="text-muted-foreground border-l-input bg-muted select-none whitespace-nowrap border-l px-3 text-sm">
                  .{process.env.NEXT_PUBLIC_PDS_HANDLE_DOMAIN || "trainers.gg"}
                </span>
              </div>
              {errors.username && (
                <p className="text-destructive text-sm">
                  {errors.username.message}
                </p>
              )}
            </div>

            {/* Password */}
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

            {/* Confirm Password */}
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

          <p className="text-muted-foreground mt-4 text-center text-xs">
            By creating an account, you agree to our{" "}
            <Link href="/terms" className="text-primary hover:underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-primary hover:underline">
              Privacy Policy
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
