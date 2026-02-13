"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  registerForTournament,
  getCurrentUserAltsAction,
  getRegistrationDetailsAction,
  updateRegistrationAction,
} from "@/actions/tournaments";
import { useAuthContext } from "@/components/auth/auth-provider";
import { Loader2 } from "lucide-react";

// --------------------------------------------------------------------------
// Types
// --------------------------------------------------------------------------

interface Alt {
  id: number;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  first_name: string | null;
  last_name: string | null;
  country: string | null;
}

export interface RegisterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tournamentId: number;
  tournamentSlug: string;
  tournamentName: string;
  isFull: boolean;
  mode?: "register" | "edit";
  onSuccess?: () => void;
}

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

/** Convert ISO 3166-1 alpha-2 country code to flag emoji */
function countryCodeToFlag(code: string): string {
  const upper = code.toUpperCase();
  const offset = 0x1f1e6 - 65; // Regional indicator A
  return String.fromCodePoint(
    upper.charCodeAt(0) + offset,
    upper.charCodeAt(1) + offset
  );
}

/** Compute shortened name: "First L" */
function getShortenedName(alt: Alt): string {
  if (alt.first_name) {
    const lastInitial = alt.last_name?.charAt(0) ?? "";
    return `${alt.first_name} ${lastInitial}`.trim();
  }
  return alt.username;
}

/** Compute full name: "First Last" */
function getFullName(alt: Alt): string {
  if (alt.first_name) {
    return `${alt.first_name} ${alt.last_name ?? ""}`.trim();
  }
  return alt.username;
}

/** Get display name for the selected option */
function getDisplayName(
  alt: Alt,
  option: "username" | "shortened" | "full"
): string {
  switch (option) {
    case "username":
      return alt.username;
    case "shortened":
      return getShortenedName(alt);
    case "full":
      return getFullName(alt);
  }
}

// --------------------------------------------------------------------------
// Schema
// --------------------------------------------------------------------------

const registrationSchema = z.object({
  altId: z.string().optional(),
  inGameName: z.string().optional(),
  displayNameOption: z.enum(["username", "shortened", "full"]),
  showCountryFlag: z.boolean(),
});

type RegistrationFormData = z.infer<typeof registrationSchema>;

// --------------------------------------------------------------------------
// Component
// --------------------------------------------------------------------------

export function RegisterModal({
  open,
  onOpenChange,
  tournamentId,
  tournamentSlug,
  tournamentName,
  isFull,
  mode = "register",
  onSuccess,
}: RegisterModalProps) {
  const isEditMode = mode === "edit";
  const router = useRouter();
  const { isAuthenticated } = useAuthContext();
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alts, setAlts] = useState<Alt[]>([]);
  const [registrationSuccess, setRegistrationSuccess] = useState<{
    status: "registered" | "waitlist";
  } | null>(null);

  const form = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      altId: "",
      inGameName: "",
      displayNameOption: "username",
      showCountryFlag: true,
    },
  });

  const { isSubmitting } = form.formState;
  const selectedAltId = form.watch("altId");
  const inGameName = form.watch("inGameName");
  const displayNameOption = form.watch("displayNameOption");
  const showCountryFlag = form.watch("showCountryFlag");

  // Derived state
  const selectedAlt = alts.find((a) => a.id.toString() === selectedAltId);
  const hasName = !!selectedAlt?.first_name;

  // Load alts + teams when dialog opens
  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    async function loadData() {
      setIsLoadingData(true);

      const [altsResult, registrationResult] = await Promise.all([
        getCurrentUserAltsAction(),
        isEditMode
          ? getRegistrationDetailsAction(tournamentId)
          : Promise.resolve(null),
      ]);

      if (cancelled) return;

      if (altsResult.success) {
        setAlts(altsResult.data);
        // Auto-select first alt if only one
        if (altsResult.data.length === 1 && altsResult.data[0]) {
          form.setValue("altId", altsResult.data[0].id.toString());
        }
      }

      // Pre-fill form with existing registration data in edit mode
      if (
        isEditMode &&
        registrationResult &&
        registrationResult.success &&
        registrationResult.data
      ) {
        const reg = registrationResult.data;
        form.setValue("altId", reg.alt_id.toString());
        if (reg.in_game_name) form.setValue("inGameName", reg.in_game_name);
        if (reg.display_name_option) {
          form.setValue(
            "displayNameOption",
            reg.display_name_option as "username" | "shortened" | "full"
          );
        }
        if (reg.show_country_flag !== null) {
          form.setValue("showCountryFlag", reg.show_country_flag);
        }
      }

      setIsLoadingData(false);
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [open, form, isEditMode, tournamentId]);

  // Redirect unauthenticated users to sign-in when modal opens
  useEffect(() => {
    if (open && !isAuthenticated) {
      onOpenChange(false);
      router.push(`/sign-in?redirect=/tournaments/${tournamentSlug}`);
    }
  }, [open, isAuthenticated, onOpenChange, router, tournamentSlug]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      form.reset();
      setError(null);
      setAlts([]);
      setRegistrationSuccess(null);
    }
  }, [open, form]);

  // --------------------------------------------------------------------------
  // Submit
  // --------------------------------------------------------------------------

  async function onSubmit(data: RegistrationFormData) {
    setError(null);

    if (isEditMode) {
      // Update existing registration preferences
      const result = await updateRegistrationAction(tournamentId, {
        inGameName: data.inGameName || undefined,
        displayNameOption: data.displayNameOption,
        showCountryFlag: data.showCountryFlag,
      });

      if (result.success) {
        onOpenChange(false);
        onSuccess?.();
      } else {
        setError(result.error);
      }
    } else {
      // New registration
      const result = await registerForTournament(tournamentId, {
        altId: data.altId ? Number(data.altId) : undefined,
        inGameName: data.inGameName || undefined,
        displayNameOption: data.displayNameOption,
        showCountryFlag: data.showCountryFlag,
      });

      if (result.success) {
        // Show success confirmation instead of closing modal
        setRegistrationSuccess({
          status: result.data.status as "registered" | "waitlist",
        });
        onSuccess?.();
      } else {
        // Redirect to login if not authenticated
        if (result.error === "Not authenticated") {
          onOpenChange(false);
          router.push(`/sign-in?redirect=/tournaments/${tournamentSlug}`);
          return;
        }
        setError(result.error);
      }
    }
  }

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditMode
              ? "Edit Registration"
              : isFull
                ? "Join Waitlist"
                : "Register for Tournament"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Update your registration preferences for"
              : isFull
                ? "Join the waitlist for"
                : "Register for"}{" "}
            <strong>{tournamentName}</strong>
          </DialogDescription>
        </DialogHeader>

        {/* Success Confirmation State */}
        {registrationSuccess ? (
          <div className="space-y-6 py-4">
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-emerald-500/20 p-2 text-emerald-600 dark:text-emerald-400">
                  <svg
                    className="size-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">
                    {registrationSuccess.status === "waitlist"
                      ? "Added to Waitlist"
                      : "You're Registered!"}
                  </h3>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {registrationSuccess.status === "waitlist"
                      ? "You've been added to the waitlist. You'll be notified if a spot opens up."
                      : `You're registered for ${tournamentName}`}
                  </p>
                </div>
              </div>
            </div>

            {/* Next Steps */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Next Steps</h4>
              <ul className="text-muted-foreground space-y-2 text-sm">
                {registrationSuccess.status === "registered" ? (
                  <>
                    <li className="flex items-start gap-2">
                      <span className="mt-0.5 text-emerald-500">•</span>
                      <span>
                        <strong className="text-foreground">
                          Submit your team
                        </strong>{" "}
                        before the tournament starts
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-0.5 text-emerald-500">•</span>
                      <span>
                        <strong className="text-foreground">Check in</strong>{" "}
                        when check-in opens (you&apos;ll be notified)
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-0.5 text-emerald-500">•</span>
                      <span>
                        Monitor the tournament page for updates and pairings
                      </span>
                    </li>
                  </>
                ) : (
                  <>
                    <li className="flex items-start gap-2">
                      <span className="mt-0.5 text-amber-500">•</span>
                      <span>
                        You&apos;ll be automatically registered if a spot opens
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-0.5 text-amber-500">•</span>
                      <span>
                        We&apos;ll notify you immediately if you move off the
                        waitlist
                      </span>
                    </li>
                  </>
                )}
              </ul>
            </div>

            <DialogFooter>
              <Button
                onClick={() => {
                  onOpenChange(false);
                  if (registrationSuccess.status === "registered") {
                    router.push(`/tournaments/${tournamentSlug}`);
                  }
                }}
                className="w-full"
              >
                {registrationSuccess.status === "registered"
                  ? "Go to Tournament"
                  : "Close"}
              </Button>
            </DialogFooter>
          </div>
        ) : isLoadingData ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : alts.length === 0 ? (
          <div className="text-muted-foreground py-8 text-center text-sm">
            <p>No player profiles found.</p>
            <p className="mt-1">
              Please contact support if you believe this is an error.
            </p>
          </div>
        ) : (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-6 py-4"
            >
              {/* Alt Selection (only show if multiple alts; disabled in edit mode) */}
              {alts.length > 1 && (
                <FormField
                  control={form.control}
                  name="altId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Register as</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={isEditMode}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select profile">
                              {selectedAlt
                                ? `${selectedAlt.username || selectedAlt.username} (@${selectedAlt.username})`
                                : "Select profile"}
                            </SelectValue>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {alts.map((alt) => (
                            <SelectItem key={alt.id} value={alt.id.toString()}>
                              {alt.username || alt.username} (@
                              {alt.username})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* In-Game Name */}
              <FormField
                control={form.control}
                name="inGameName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>In-game name</FormLabel>
                    <FormControl>
                      <Input placeholder="Switch profile name" {...field} />
                    </FormControl>
                    <FormDescription>
                      Your Nintendo Switch profile name for verification
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Display Name Options */}
              <FormField
                control={form.control}
                name="displayNameOption"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Display name</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <div className="flex items-center gap-2">
                          <RadioGroupItem
                            value="username"
                            id="display-username"
                          />
                          <FormLabel
                            htmlFor="display-username"
                            className="font-normal"
                          >
                            Username
                            {selectedAlt && (
                              <span className="text-muted-foreground ml-1">
                                ({selectedAlt.username})
                              </span>
                            )}
                          </FormLabel>
                        </div>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem
                            value="shortened"
                            id="display-shortened"
                            disabled={!hasName}
                          />
                          <FormLabel
                            htmlFor="display-shortened"
                            className={cn(
                              "font-normal",
                              !hasName && "text-muted-foreground"
                            )}
                          >
                            Shortened name
                            {selectedAlt && hasName ? (
                              <span className="text-muted-foreground ml-1">
                                ({getShortenedName(selectedAlt)})
                              </span>
                            ) : (
                              <span className="text-muted-foreground ml-1">
                                (set name in profile)
                              </span>
                            )}
                          </FormLabel>
                        </div>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem
                            value="full"
                            id="display-full"
                            disabled={!hasName}
                          />
                          <FormLabel
                            htmlFor="display-full"
                            className={cn(
                              "font-normal",
                              !hasName && "text-muted-foreground"
                            )}
                          >
                            Full name
                            {selectedAlt && hasName ? (
                              <span className="text-muted-foreground ml-1">
                                ({getFullName(selectedAlt)})
                              </span>
                            ) : (
                              <span className="text-muted-foreground ml-1">
                                (set name in profile)
                              </span>
                            )}
                          </FormLabel>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Country Flag Option */}
              <FormField
                control={form.control}
                name="showCountryFlag"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={!selectedAlt?.country}
                      />
                    </FormControl>
                    <FormLabel
                      className={cn(
                        "font-normal",
                        !selectedAlt?.country && "text-muted-foreground"
                      )}
                    >
                      Show country flag
                      {selectedAlt?.country ? (
                        <span className="ml-1">
                          {countryCodeToFlag(selectedAlt.country)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground ml-1">
                          (set country in profile)
                        </span>
                      )}
                    </FormLabel>
                  </FormItem>
                )}
              />

              {/* Bracket Preview */}
              {selectedAlt && (
                <div className="bg-muted rounded-lg p-4">
                  <p className="text-muted-foreground mb-2 text-xs">
                    Bracket Preview
                  </p>
                  <div className="space-y-0.5">
                    <p className="font-medium">
                      {getDisplayName(selectedAlt, displayNameOption)}
                      {showCountryFlag && selectedAlt.country && (
                        <span className="ml-1.5">
                          {countryCodeToFlag(selectedAlt.country)}
                        </span>
                      )}
                    </p>
                    {inGameName && (
                      <p className="text-muted-foreground text-sm">
                        {inGameName}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {error && <p className="text-destructive text-sm">{error}</p>}

              <DialogFooter>
                <DialogClose
                  render={
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                  }
                />
                <Button
                  type="submit"
                  disabled={isSubmitting || isLoadingData || !selectedAltId}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      {isEditMode
                        ? "Saving..."
                        : isFull
                          ? "Joining..."
                          : "Registering..."}
                    </>
                  ) : isEditMode ? (
                    "Save Changes"
                  ) : isFull ? (
                    "Join Waitlist"
                  ) : (
                    "Confirm Registration"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
