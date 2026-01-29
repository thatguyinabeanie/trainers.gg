"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
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
} from "@/actions/tournaments";
import { Loader2 } from "lucide-react";

type _DisplayNameOption = "username" | "shortened" | "full";

interface Alt {
  id: number;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface QuickRegisterButtonProps {
  tournamentId: number;
  tournamentSlug: string;
  tournamentName: string;
  isFull: boolean;
  isRegistered?: boolean;
}

const registrationSchema = z.object({
  altId: z.string().optional(),
  inGameName: z.string().optional(),
  displayNameOption: z.enum(["username", "shortened", "full"]),
  showCountryFlag: z.boolean(),
});

type RegistrationFormData = z.infer<typeof registrationSchema>;

export function QuickRegisterButton({
  tournamentId,
  tournamentSlug,
  tournamentName,
  isFull,
  isRegistered = false,
}: QuickRegisterButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoadingAlts, setIsLoadingAlts] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // User's alts
  const [alts, setAlts] = useState<Alt[]>([]);

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

  // Get currently selected alt
  const selectedAlt = alts.find((a) => a.id.toString() === selectedAltId);

  const loadAlts = useCallback(async () => {
    setIsLoadingAlts(true);
    const result = await getCurrentUserAltsAction();
    if (result.success) {
      setAlts(result.data);
      // Auto-select first alt if only one
      if (result.data.length === 1 && result.data[0]) {
        form.setValue("altId", result.data[0].id.toString());
      }
    } else if (result.error === "Failed to fetch user alts") {
      // User not logged in - will redirect on submit
    }
    setIsLoadingAlts(false);
  }, [form]);

  // Load alts when dialog opens
  useEffect(() => {
    if (open && alts.length === 0) {
      loadAlts();
    }
  }, [open, alts.length, loadAlts]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      form.reset({
        altId: "",
        inGameName: "",
        displayNameOption: "username",
        showCountryFlag: true,
      });
      setError(null);
    }
  }, [open, form]);

  async function onSubmit(data: RegistrationFormData) {
    setError(null);

    const result = await registerForTournament(tournamentId, {
      altId: data.altId ? Number(data.altId) : undefined,
      inGameName: data.inGameName || undefined,
    });

    if (result.success) {
      setOpen(false);
      router.push(`/tournaments/${tournamentSlug}`);
      router.refresh();
    } else {
      // Redirect to login if not authenticated
      if (result.error === "Not authenticated") {
        setOpen(false);
        router.push(`/login?next=/tournaments/${tournamentSlug}`);
        return;
      }
      setError(result.error);
    }
  }

  // Already registered - show link to tournament
  if (isRegistered) {
    return (
      <Link
        href={`/tournaments/${tournamentSlug}`}
        className="bg-primary/10 text-primary hover:bg-primary/20 inline-flex h-7 min-w-[76px] items-center justify-center rounded-md px-3 text-xs font-medium transition-colors"
      >
        Registered
      </Link>
    );
  }

  if (isFull) {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled
        className="min-w-[76px] text-xs"
      >
        Full
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="default" size="sm" className="min-w-[76px] text-xs">
            Register
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Register for Tournament</DialogTitle>
          <DialogDescription>
            Register for <strong>{tournamentName}</strong>
          </DialogDescription>
        </DialogHeader>

        {isLoadingAlts ? (
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

              {/* Preview */}
              {selectedAlt && (
                <div className="bg-muted rounded-lg p-4">
                  <p className="text-muted-foreground mb-2 text-xs">Preview</p>
                  <div className="space-y-0.5">
                    <p className="font-medium">
                      {displayNameOption === "username"
                        ? selectedAlt.username
                        : displayNameOption === "shortened"
                          ? selectedAlt.display_name?.split(" ")[0] ||
                            selectedAlt.username
                          : selectedAlt.display_name || selectedAlt.username}
                      {showCountryFlag && <span className="ml-1.5">🇺🇸</span>}
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
                    isLoadingAlts ||
                    (alts.length > 1 && !selectedAltId)
                  }
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Registering...
                    </>
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
