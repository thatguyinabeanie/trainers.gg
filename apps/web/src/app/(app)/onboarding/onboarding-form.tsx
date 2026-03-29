"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { usernameSchema } from "@trainers/validators";
import { COUNTRIES } from "@trainers/utils";
import { Check, Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { checkUsernameAvailability } from "@/actions/profile";
import { completeOnboarding } from "@/actions/onboarding";

type UsernameStatus = "idle" | "checking" | "available" | "taken" | "error";

export function OnboardingForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [username, setUsername] = useState("");
  const [country, setCountry] = useState("");
  const [bio, setBio] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Debounced username availability check
  useEffect(() => {
    if (!username) {
      setUsernameStatus("idle");
      setUsernameError(null);
      return;
    }

    // Local validation first
    const localResult = usernameSchema.safeParse(username);
    if (!localResult.success) {
      setUsernameStatus("error");
      setUsernameError(
        localResult.error.errors[0]?.message ?? "Invalid username"
      );
      return;
    }

    setUsernameStatus("checking");
    setUsernameError(null);

    const timer = setTimeout(async () => {
      const result = await checkUsernameAvailability(username);
      if (result.available) {
        setUsernameStatus("available");
        setUsernameError(null);
      } else {
        setUsernameStatus("taken");
        setUsernameError(result.error ?? "Username is not available");
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [username]);

  const canSubmit =
    !isPending &&
    username.length > 0 &&
    country.length > 0 &&
    bio.trim().length > 0 &&
    usernameStatus === "available";

  function handleSubmit() {
    setFormError(null);
    startTransition(async () => {
      const result = await completeOnboarding({
        username,
        country,
        bio,
        ...(birthDate ? { birthDate } : {}),
      });

      if (result.success) {
        router.push("/dashboard/overview");
      } else {
        setFormError(result.error ?? "Something went wrong");
        // If username was taken between check and submit
        if (result.error?.toLowerCase().includes("taken")) {
          setUsernameStatus("taken");
        }
      }
    });
  }

  return (
    <form action={handleSubmit} className="space-y-5">
      {formError && (
        <div className="rounded-lg border border-red-800/50 bg-red-950/50 px-4 py-3 text-sm text-red-300">
          {formError}
        </div>
      )}

      {/* Username */}
      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-teal-400">
            @
          </div>
          <Input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="cooltrainer"
            className="pl-7 pr-20"
            autoFocus
          />
          <div className="pointer-events-none absolute inset-y-0 right-10 flex items-center text-xs text-zinc-500">
            .trainers.gg
          </div>
          <div className="absolute inset-y-0 right-3 flex items-center">
            {usernameStatus === "checking" && (
              <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
            )}
            {usernameStatus === "available" && (
              <Check className="h-4 w-4 text-emerald-400" />
            )}
            {(usernameStatus === "taken" || usernameStatus === "error") && (
              <X className="h-4 w-4 text-red-400" />
            )}
          </div>
        </div>
        {usernameError && (
          <p className="text-xs text-red-400">{usernameError}</p>
        )}
        {usernameStatus === "available" && (
          <p className="text-xs text-emerald-400">Username is available</p>
        )}
      </div>

      {/* Country */}
      <div className="space-y-2">
        <Label htmlFor="country">Country</Label>
        <Select value={country} onValueChange={(v) => setCountry(v ?? "")}>
          <SelectTrigger id="country">
            <SelectValue placeholder="Select your country" />
          </SelectTrigger>
          <SelectContent>
            {COUNTRIES.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Bio */}
      <div className="space-y-2">
        <Label htmlFor="bio">Bio</Label>
        <Textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Tell us about yourself..."
          maxLength={160}
          rows={3}
        />
        <p className="text-right text-xs text-zinc-500">{bio.length}/160</p>
      </div>

      {/* Birth date (optional) */}
      <div className="space-y-2">
        <Label htmlFor="birthDate">
          Birth date{" "}
          <span className="font-normal text-zinc-500">(optional)</span>
        </Label>
        <Input
          id="birthDate"
          type="date"
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
        />
      </div>

      {/* Submit */}
      <Button
        type="submit"
        disabled={!canSubmit}
        className="w-full bg-teal-600 hover:bg-teal-500 disabled:opacity-50"
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Setting up...
          </>
        ) : (
          "Complete Setup"
        )}
      </Button>
    </form>
  );
}
