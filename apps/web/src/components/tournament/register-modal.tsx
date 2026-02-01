"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
  getUserTeamsAction,
} from "@/actions/tournaments";
import { Loader2 } from "lucide-react";

// --------------------------------------------------------------------------
// Types
// --------------------------------------------------------------------------

interface Alt {
  id: number;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface Team {
  id: number;
  name: string | null;
  pokemonCount: number;
}

export interface RegisterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tournamentId: number;
  tournamentSlug: string;
  tournamentName: string;
  isFull: boolean;
  onSuccess?: () => void;
}

// --------------------------------------------------------------------------
// Schema
// --------------------------------------------------------------------------

const registrationSchema = z.object({
  altId: z.string().optional(),
  inGameName: z.string().optional(),
  teamId: z.string().optional(),
  teamName: z.string().optional(),
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
  onSuccess,
}: RegisterModalProps) {
  const router = useRouter();
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alts, setAlts] = useState<Alt[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);

  const form = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      altId: "",
      inGameName: "",
      teamId: "",
      teamName: "",
      displayNameOption: "username",
      showCountryFlag: true,
    },
  });

  const { isSubmitting } = form.formState;
  const selectedAltId = form.watch("altId");
  const inGameName = form.watch("inGameName");
  const displayNameOption = form.watch("displayNameOption");
  const showCountryFlag = form.watch("showCountryFlag");
  const selectedTeamId = form.watch("teamId");

  // Derived state
  const selectedAlt = alts.find((a) => a.id.toString() === selectedAltId);

  // Load alts + teams when dialog opens
  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    async function loadData() {
      setIsLoadingData(true);

      const [altsResult, teamsResult] = await Promise.all([
        getCurrentUserAltsAction(),
        getUserTeamsAction(),
      ]);

      if (cancelled) return;

      if (altsResult.success) {
        setAlts(altsResult.data);
        // Auto-select first alt if only one
        if (altsResult.data.length === 1 && altsResult.data[0]) {
          form.setValue("altId", altsResult.data[0].id.toString());
        }
      }

      if (teamsResult.success) {
        setTeams(teamsResult.data);
      }

      setIsLoadingData(false);
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [open, form]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      form.reset();
      setError(null);
      setAlts([]);
      setTeams([]);
    }
  }, [open, form]);

  // --------------------------------------------------------------------------
  // Submit
  // --------------------------------------------------------------------------

  async function onSubmit(data: RegistrationFormData) {
    setError(null);

    const result = await registerForTournament(tournamentId, {
      altId: data.altId ? Number(data.altId) : undefined,
      inGameName: data.inGameName || undefined,
      teamName: data.teamName || undefined,
      displayNameOption: data.displayNameOption,
      showCountryFlag: data.showCountryFlag,
    });

    if (result.success) {
      onOpenChange(false);
      onSuccess?.();
    } else {
      // Redirect to login if not authenticated
      if (result.error === "Not authenticated") {
        onOpenChange(false);
        router.push(`/login?next=/tournaments/${tournamentSlug}`);
        return;
      }
      setError(result.error);
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
            {isFull ? "Join Waitlist" : "Register for Tournament"}
          </DialogTitle>
          <DialogDescription>
            {isFull ? "Join the waitlist for" : "Register for"}{" "}
            <strong>{tournamentName}</strong>
          </DialogDescription>
        </DialogHeader>

        {isLoadingData ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-6 py-4"
            >
              {/* Alt Selection (only show if multiple alts) */}
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
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select profile">
                              {selectedAlt
                                ? `${selectedAlt.display_name || selectedAlt.username} (@${selectedAlt.username})`
                                : "Select profile"}
                            </SelectValue>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {alts.map((alt) => (
                            <SelectItem key={alt.id} value={alt.id.toString()}>
                              {alt.display_name || alt.username} (@
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

              {/* Team Selection (only show if user has teams) */}
              {teams.length > 0 && (
                <FormField
                  control={form.control}
                  name="teamId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Team (Optional)</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="No team selected" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">No team selected</SelectItem>
                          {teams.map((team) => (
                            <SelectItem
                              key={team.id}
                              value={team.id.toString()}
                            >
                              {team.name || "Unnamed Team"} ({team.pokemonCount}
                              /6)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Team Name (shown when no saved team selected) */}
              {!selectedTeamId && (
                <FormField
                  control={form.control}
                  name="teamName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Team Name (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your team name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

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
                          </FormLabel>
                        </div>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem
                            value="shortened"
                            id="display-shortened"
                          />
                          <FormLabel
                            htmlFor="display-shortened"
                            className="font-normal"
                          >
                            Shortened name
                          </FormLabel>
                        </div>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="full" id="display-full" />
                          <FormLabel
                            htmlFor="display-full"
                            className="font-normal"
                          >
                            Full name
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
                      />
                    </FormControl>
                    <FormLabel className="font-normal">
                      Show country flag
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
                      {displayNameOption === "username"
                        ? selectedAlt.username
                        : displayNameOption === "shortened"
                          ? (selectedAlt.display_name?.split(" ")[0] ??
                            selectedAlt.username)
                          : (selectedAlt.display_name ?? selectedAlt.username)}
                      {showCountryFlag && (
                        <span className="ml-1.5">&#x1F1FA;&#x1F1F8;</span>
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
                  disabled={
                    isSubmitting ||
                    isLoadingData ||
                    (alts.length > 1 && !selectedAltId)
                  }
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      {isFull ? "Joining..." : "Registering..."}
                    </>
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
