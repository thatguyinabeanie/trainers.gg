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
import { COUNTRIES } from "@trainers/utils";
import {
  completeProfile,
  checkUsernameAvailability,
  getCurrentUserData,
} from "./actions";

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

type PdsStatus = "pending" | "active" | "failed" | "suspended" | "external";

export function OnboardingForm() {
  const router = useRouter();
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [detectedCountry, setDetectedCountry] = useState<string | null>(null);
  const [pdsStatus, setPdsStatus] = useState<PdsStatus | null>(null);
  const [blueskyHandle, setBlueskyHandle] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  // Fetch user data including pds_status on mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userData = await getCurrentUserData();
        if (userData) {
          setPdsStatus(userData.pdsStatus);
          setBlueskyHandle(
            userData.blueskyHandle || userData.pdsHandle || null
          );

          // Pre-fill form fields from user data
          if (userData.username) {
            setValue("username", userData.username);
          }
          if (userData.birthDate) {
            setValue("birthDate", userData.birthDate);
          }
          if (userData.country) {
            setValue("country", userData.country);
          }
        }
      } catch (err) {
        console.error("Failed to fetch user data:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUserData();
  }, [setValue]);

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

  // Pre-fill username from OAuth metadata if available (only for non-external users)
  useEffect(() => {
    if (user?.user_metadata && pdsStatus !== "external") {
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
  }, [user, setValue, pdsStatus]);

  // For Bluesky OAuth users, pre-fill with their handle
  useEffect(() => {
    if (pdsStatus === "external" && blueskyHandle) {
      // Extract username from handle (e.g., "pikachu" from "pikachu.bsky.social")
      const username = blueskyHandle.split(".")[0]?.toLowerCase() || "";
      if (username) {
        setValue("username", username.replace(/[^a-z0-9_-]/g, ""));
      }
    }
  }, [pdsStatus, blueskyHandle, setValue]);

  const isBlueskyUser = pdsStatus === "external";
  const isSocialOAuthUser = pdsStatus === "pending" || pdsStatus === null;

  const onSubmit = async (data: OnboardingFormData) => {
    setError(null);
    setIsSubmitting(true);

    // Show provisioning state for Social OAuth users
    if (isSocialOAuthUser) {
      setIsProvisioning(true);
    }

    try {
      // Only check username availability if the user can change it
      if (!isBlueskyUser) {
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
      }

      // Complete profile (this will also provision PDS for Social OAuth users)
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
      setIsProvisioning(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Complete Your Profile</CardTitle>
        <p className="text-muted-foreground text-sm">
          {isBlueskyUser
            ? "Just a few more details to get you started"
            : "Choose your username and complete your profile"}
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {error && (
            <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">
              {error}
            </div>
          )}

          {isProvisioning && (
            <div className="bg-primary/10 text-primary rounded-lg p-3 text-sm">
              Creating your Bluesky account...
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
              disabled={isBlueskyUser}
              className={isBlueskyUser ? "bg-muted cursor-not-allowed" : ""}
              {...register("username")}
            />
            {errors.username && (
              <p className="text-destructive text-sm">
                {errors.username.message}
              </p>
            )}
            {isBlueskyUser ? (
              <p className="text-muted-foreground text-xs">
                Your Bluesky handle ({blueskyHandle}) will be used as your
                username
              </p>
            ) : (
              <p className="text-muted-foreground text-xs">
                3-20 characters. Letters, numbers, underscores, and hyphens
                only. This will also be your @username.trainers.gg Bluesky
                handle.
              </p>
            )}
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

          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting || isProvisioning}
          >
            {isProvisioning
              ? "Creating Bluesky account..."
              : isSubmitting
                ? "Completing profile..."
                : "Continue"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
