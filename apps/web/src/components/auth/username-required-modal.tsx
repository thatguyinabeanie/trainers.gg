"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { usernameSchema } from "@trainers/validators";
import { COUNTRIES } from "@trainers/utils";
import { Check, Loader2, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { checkUsernameAvailability } from "@/actions/profile";
import { completeOnboarding } from "@/actions/onboarding";
import { useAuth } from "@/hooks/use-auth";

type UsernameStatus = "idle" | "checking" | "available" | "taken" | "error";

/**
 * Blocking modal that appears on public pages when the user is authenticated
 * with a temp username. Cannot be closed — user must pick a username.
 */
export function UsernameRequiredModal() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [username, setUsername] = useState("");
  const [country, setCountry] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Determine if modal should show
  const currentUsername = user?.user_metadata?.username as string | undefined;
  const shouldShow =
    !loading &&
    !!user &&
    typeof currentUsername === "string" &&
    (currentUsername.startsWith("temp_") ||
      currentUsername.startsWith("user_"));

  // Debounced username availability check
  useEffect(() => {
    if (!username) {
      setUsernameStatus("idle");
      setUsernameError(null);
      return;
    }

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

    let cancelled = false;
    const timer = setTimeout(async () => {
      const result = await checkUsernameAvailability(username);
      if (cancelled) return;
      if (result.available) {
        setUsernameStatus("available");
        setUsernameError(null);
      } else {
        setUsernameStatus("taken");
        setUsernameError(result.error ?? "Username is not available");
      }
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [username]);

  const canSubmit =
    !isPending &&
    username.length > 0 &&
    country.length > 0 &&
    usernameStatus === "available";

  function handleSubmit() {
    setFormError(null);
    startTransition(async () => {
      const result = await completeOnboarding({
        username,
        country,
        bio: "",
      });

      if (result.success) {
        router.refresh();
      } else {
        setFormError(result.error ?? "Something went wrong");
        if (result.error?.toLowerCase().includes("taken")) {
          setUsernameStatus("taken");
        }
      }
    });
  }

  if (!shouldShow) return null;

  return (
    // disablePointerDismissal prevents outside-click dismiss.
    // onOpenChange ignores close requests (escape key, etc.) to keep modal blocking.
    <Dialog
      open
      modal
      disablePointerDismissal
      onOpenChange={(open) => {
        // Block all close attempts — user must complete the form
        if (!open) return;
      }}
    >
      <DialogContent showCloseButton={false} className="sm:max-w-sm">
        <DialogHeader className="text-center">
          <div className="mb-2 text-2xl">👋</div>
          <DialogTitle className="text-center">Choose Your Username</DialogTitle>
          <DialogDescription className="text-center">
            Pick a username to complete your profile
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="space-y-4">
          {formError && (
            <div className="rounded-lg border border-red-800/50 bg-red-950/50 px-3 py-2 text-sm text-red-300">
              {formError}
            </div>
          )}

          {/* Username */}
          <div className="space-y-2">
            <Label htmlFor="modal-username">Username</Label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-teal-400">
                @
              </div>
              <Input
                id="modal-username"
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
            <Label htmlFor="modal-country">Country</Label>
            <Select value={country} onValueChange={(v) => setCountry(v ?? "")}>
              <SelectTrigger id="modal-country">
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
              "Continue"
            )}
          </Button>

          <p className="text-muted-foreground text-center text-[11px]">
            Bio and other details can be added later in settings
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
