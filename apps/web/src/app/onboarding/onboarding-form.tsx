"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { COUNTRIES } from "@/lib/countries";
import { completeProfile, checkUsernameAvailability } from "./actions";

const onboardingSchema = z.object({
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
      { message: "You must be at least 13 years old" }
    ),
  country: z.string().min(1, "Country is required"),
});

type OnboardingFormData = z.infer<typeof onboardingSchema>;

export function OnboardingForm() {
  const router = useRouter();
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [detectedCountry, setDetectedCountry] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
  });

  const selectedCountry = watch("country");

  // Auto-detect country on mount
  useEffect(() => {
    const detectCountry = async () => {
      try {
        const response = await fetch("https://ipapi.co/json/");
        if (response.ok) {
          const data = await response.json();
          if (data.country_code) {
            setDetectedCountry(data.country_code);
            if (!selectedCountry) {
              setValue("country", data.country_code);
            }
          }
        }
      } catch {
        // Silently fail
      }
    };
    detectCountry();
  }, [setValue, selectedCountry]);

  // Pre-fill username from OAuth metadata if available
  useEffect(() => {
    if (user?.user_metadata) {
      const suggestedUsername =
        user.user_metadata.preferred_username ||
        user.user_metadata.user_name ||
        user.email?.split("@")[0];
      if (suggestedUsername) {
        setValue(
          "username",
          suggestedUsername.toLowerCase().replace(/[^a-z0-9_-]/g, "")
        );
      }
    }
  }, [user, setValue]);

  const onSubmit = async (data: OnboardingFormData) => {
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

      // Complete profile
      const result = await completeProfile({
        username: data.username.toLowerCase(),
        birthDate: data.birthDate,
        country: data.country,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      // Redirect to home or intended destination
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
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Complete Your Profile</CardTitle>
        <p className="text-muted-foreground text-sm">
          Just a few more details to get you started
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {error && (
            <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">
              {error}
            </div>
          )}

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

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Completing profile..." : "Continue"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
