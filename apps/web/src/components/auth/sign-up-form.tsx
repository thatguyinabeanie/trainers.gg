"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SocialAuthButtons } from "./social-auth-buttons";
import { useAuth } from "@/hooks/use-auth";
import { checkUsernameAvailability } from "@/app/(auth-pages)/actions";
import { COUNTRIES } from "@/lib/countries";

const passwordRequirements = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

const signUpSchema = z
  .object({
    firstName: z
      .string()
      .min(1, "First name is required")
      .max(50, "First name must be at most 50 characters"),
    lastName: z
      .string()
      .min(1, "Last name is required")
      .max(50, "Last name must be at most 50 characters"),
    username: z
      .string()
      .min(3, "Username must be at least 3 characters")
      .max(20, "Username must be at most 20 characters")
      .regex(
        /^[a-zA-Z0-9_-]+$/,
        "Username can only contain letters, numbers, underscores, and hyphens"
      ),
    birthDate: z
      .string()
      .min(1, "Date of birth is required")
      .refine(
        (val) => {
          const date = new Date(val);
          const now = new Date();
          const age = now.getFullYear() - date.getFullYear();
          return age >= 13;
        },
        { message: "You must be at least 13 years old to create an account" }
      ),
    country: z.string().min(1, "Country is required"),
    email: z
      .string()
      .min(1, "Email is required")
      .email("Please enter a valid email address"),
    password: passwordRequirements,
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type SignUpFormData = z.infer<typeof signUpSchema>;

export function SignUpForm() {
  const { signUpWithEmail } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [detectedCountry, setDetectedCountry] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
  });

  const selectedCountry = watch("country");

  // Auto-detect country on mount
  useEffect(() => {
    const detectCountry = async () => {
      try {
        // Use a free IP geolocation API
        const response = await fetch("https://ipapi.co/json/");
        if (response.ok) {
          const data = await response.json();
          if (data.country_code) {
            setDetectedCountry(data.country_code);
            // Only set if user hasn't already selected a country
            if (!selectedCountry) {
              setValue("country", data.country_code);
            }
          }
        }
      } catch {
        // Silently fail - country detection is optional
      }
    };
    detectCountry();
  }, [setValue, selectedCountry]);

  const onSubmit = async (data: SignUpFormData) => {
    setError(null);
    setIsSubmitting(true);

    try {
      // Check username availability first
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

      // Sign up with username and name in metadata
      const { error: signUpError } = await signUpWithEmail(
        data.email,
        data.password,
        {
          username: data.username.toLowerCase(),
          firstName: data.firstName.trim(),
          lastName: data.lastName.trim(),
          birthDate: data.birthDate,
          country: data.country,
        }
      );

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      setIsSuccess(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Check Your Email</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-center">
          <p className="text-muted-foreground">
            We&apos;ve sent you a verification link. Please check your email and
            click the link to verify your account.
          </p>
          <p className="text-muted-foreground text-sm">
            Already verified?{" "}
            <Link href="/sign-in" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Create an Account</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {error && (
            <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                type="text"
                placeholder="Ash"
                autoComplete="given-name"
                aria-invalid={errors.firstName ? "true" : undefined}
                {...register("firstName")}
              />
              {errors.firstName && (
                <p className="text-destructive text-sm">
                  {errors.firstName.message}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                type="text"
                placeholder="Ketchum"
                autoComplete="family-name"
                aria-invalid={errors.lastName ? "true" : undefined}
                {...register("lastName")}
              />
              {errors.lastName && (
                <p className="text-destructive text-sm">
                  {errors.lastName.message}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              placeholder="cooltrainer123"
              autoComplete="username"
              aria-invalid={errors.username ? "true" : undefined}
              {...register("username")}
            />
            {errors.username && (
              <p className="text-destructive text-sm">
                {errors.username.message}
              </p>
            )}
            <p className="text-muted-foreground text-xs">
              3-20 characters. Letters, numbers, underscores, and hyphens only.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="birthDate">Date of Birth</Label>
              <Input
                id="birthDate"
                type="date"
                autoComplete="bday"
                aria-invalid={errors.birthDate ? "true" : undefined}
                {...register("birthDate")}
              />
              {errors.birthDate && (
                <p className="text-destructive text-sm">
                  {errors.birthDate.message}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="country">Country</Label>
              <Select
                value={selectedCountry ?? ""}
                onValueChange={(value) => value && setValue("country", value)}
              >
                <SelectTrigger
                  id="country"
                  aria-invalid={errors.country ? "true" : undefined}
                >
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.country && (
                <p className="text-destructive text-sm">
                  {errors.country.message}
                </p>
              )}
              {detectedCountry && selectedCountry === detectedCountry && (
                <p className="text-muted-foreground text-xs">
                  Auto-detected from your location
                </p>
              )}
            </div>
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

        <div className="flex items-center gap-4">
          <Separator className="flex-1" />
          <span className="text-muted-foreground text-sm">or</span>
          <Separator className="flex-1" />
        </div>

        <SocialAuthButtons mode="signup" />

        <p className="text-muted-foreground text-center text-sm">
          Already have an account?{" "}
          <Link href="/sign-in" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
