"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import { useAuth, getUserDisplayName } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Save, Check, X } from "lucide-react";
import { toast } from "sonner";
import { COUNTRIES } from "@trainers/utils";
import {
  checkUsernameAvailability,
  getCurrentUserProfile,
  updateProfile,
} from "@/actions/profile";

export default function ProfileSettingsPage() {
  const { user } = useAuth();
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);

  // Form state
  const [username, setUsername] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [country, setCountry] = useState("");

  // Username availability
  const [usernameStatus, setUsernameStatus] = useState<
    "idle" | "checking" | "available" | "taken" | "error"
  >("idle");
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [originalUsername, setOriginalUsername] = useState("");

  const displayName = user ? getUserDisplayName(user) : "";
  const avatarUrl =
    user?.profile?.avatarUrl ??
    (user?.user_metadata?.avatar_url as string | undefined);

  // Load current profile data
  useEffect(() => {
    async function loadProfile() {
      const profile = await getCurrentUserProfile();
      if (profile) {
        setUsername(profile.username ?? "");
        setOriginalUsername(profile.username ?? "");
        setBirthDate(profile.birthDate ?? "");
        setCountry(profile.country ?? "");
      }
      setIsLoading(false);
    }
    loadProfile();
  }, []);

  // Debounced username availability check
  const checkAvailability = useCallback(
    async (value: string) => {
      if (!value || value === originalUsername) {
        setUsernameStatus("idle");
        setUsernameError(null);
        return;
      }

      // Basic validation before server check
      if (value.length < 3) {
        setUsernameStatus("error");
        setUsernameError("Username must be at least 3 characters");
        return;
      }

      if (value.length > 20) {
        setUsernameStatus("error");
        setUsernameError("Username must be at most 20 characters");
        return;
      }

      if (!/^[a-z0-9_-]+$/.test(value)) {
        setUsernameStatus("error");
        setUsernameError(
          "Username can only contain lowercase letters, numbers, underscores, and hyphens"
        );
        return;
      }

      setUsernameStatus("checking");
      setUsernameError(null);

      const result = await checkUsernameAvailability(value);

      if (result.available) {
        setUsernameStatus("available");
        setUsernameError(null);
      } else {
        setUsernameStatus("taken");
        setUsernameError(result.error ?? "Username is not available");
      }
    },
    [originalUsername]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      checkAvailability(username);
    }, 500);

    return () => clearTimeout(timer);
  }, [username, checkAvailability]);

  const isPlaceholderUsername =
    originalUsername.startsWith("temp_") ||
    originalUsername.startsWith("user_");

  const hasUsernameChanged =
    username !== originalUsername && username.length > 0;

  const canSave =
    !isPending &&
    (hasUsernameChanged
      ? usernameStatus === "available"
      : username === originalUsername) &&
    usernameStatus !== "checking";

  const handleSave = () => {
    startTransition(async () => {
      const updates: {
        username?: string;
        birthDate?: string;
        country?: string;
      } = {};

      if (hasUsernameChanged) {
        updates.username = username;
      }

      // Always send birthDate and country if they have values
      if (birthDate) {
        updates.birthDate = birthDate;
      }

      if (country) {
        updates.country = country;
      }

      if (Object.keys(updates).length === 0) {
        toast.info("No changes to save");
        return;
      }

      const result = await updateProfile(updates);

      if (result.success) {
        toast.success("Profile updated");
        setOriginalUsername(username);
        setUsernameStatus("idle");
      } else {
        toast.error(result.error);
      }
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex min-h-[200px] items-center justify-center">
          <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>
          Your account details and public profile information
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Avatar display */}
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
            <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
              {displayName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{displayName}</p>
            <p className="text-muted-foreground text-sm">@{originalUsername}</p>
          </div>
        </div>

        {/* Username field */}
        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          {isPlaceholderUsername && (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              You have a temporary username. Choose a permanent one below.
            </p>
          )}
          <div className="relative">
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              placeholder="Choose a username"
              className="pr-10"
            />
            {usernameStatus === "checking" && (
              <Loader2 className="text-muted-foreground absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 animate-spin" />
            )}
            {usernameStatus === "available" && (
              <Check className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-emerald-500" />
            )}
            {(usernameStatus === "taken" || usernameStatus === "error") && (
              <X className="text-destructive absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2" />
            )}
          </div>
          {usernameError && (
            <p className="text-destructive text-sm">{usernameError}</p>
          )}
          {usernameStatus === "available" && (
            <p className="text-sm text-emerald-600 dark:text-emerald-400">
              Username is available
            </p>
          )}
          <p className="text-muted-foreground text-xs">
            3-20 characters. Lowercase letters, numbers, underscores, and
            hyphens.
          </p>
        </div>

        {/* Birth date field */}
        <div className="space-y-2">
          <Label htmlFor="birthDate">Birth Date</Label>
          <Input
            id="birthDate"
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
          />
        </div>

        {/* Country dropdown */}
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

        <Button onClick={handleSave} disabled={!canSave}>
          {isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Changes
        </Button>
      </CardContent>
    </Card>
  );
}
