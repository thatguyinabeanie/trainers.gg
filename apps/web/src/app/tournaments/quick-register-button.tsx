"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import { Label } from "@/components/ui/label";
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
  registerForTournament,
  getCurrentUserAltsAction,
} from "@/actions/tournaments";
import { Loader2 } from "lucide-react";

type DisplayNameOption = "username" | "shortened" | "full";

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

export function QuickRegisterButton({
  tournamentId,
  tournamentSlug,
  tournamentName,
  isFull,
  isRegistered = false,
}: QuickRegisterButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingAlts, setIsLoadingAlts] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // User's alts
  const [alts, setAlts] = useState<Alt[]>([]);
  const [selectedAltId, setSelectedAltId] = useState<number | null>(null);

  // Registration form state
  const [inGameName, setInGameName] = useState("");
  const [displayNameOption, setDisplayNameOption] =
    useState<DisplayNameOption>("username");
  const [showCountryFlag, setShowCountryFlag] = useState(true);

  // Load alts when dialog opens
  useEffect(() => {
    if (open && alts.length === 0) {
      loadAlts();
    }
  }, [open, alts.length]);

  async function loadAlts() {
    setIsLoadingAlts(true);
    const result = await getCurrentUserAltsAction();
    if (result.success) {
      setAlts(result.data);
      // Auto-select first alt if only one
      if (result.data.length === 1 && result.data[0]) {
        setSelectedAltId(result.data[0].id);
      }
    } else if (result.error === "Failed to fetch user alts") {
      // User not logged in - will redirect on submit
    }
    setIsLoadingAlts(false);
  }

  // Get currently selected alt
  const selectedAlt = alts.find((a) => a.id === selectedAltId);

  async function handleRegister() {
    setIsLoading(true);
    setError(null);

    const result = await registerForTournament(tournamentId, {
      altId: selectedAltId ?? undefined,
      inGameName: inGameName || undefined,
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
      setIsLoading(false);
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
          <div className="space-y-6 py-4">
            {/* Alt Selection (only show if multiple alts) */}
            {alts.length > 1 && (
              <div className="space-y-2">
                <Label htmlFor="alt-select">Register as</Label>
                <Select
                  value={selectedAltId?.toString() ?? ""}
                  onValueChange={(v) => setSelectedAltId(Number(v))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select profile">
                      {selectedAlt
                        ? `${selectedAlt.display_name || selectedAlt.username} (@${selectedAlt.username})`
                        : "Select profile"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {alts.map((alt) => (
                      <SelectItem key={alt.id} value={alt.id.toString()}>
                        {alt.display_name || alt.username} (@{alt.username})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* In-Game Name */}
            <div className="space-y-2">
              <Label htmlFor="in-game-name">In-game name</Label>
              <Input
                id="in-game-name"
                placeholder="Switch profile name"
                value={inGameName}
                onChange={(e) => setInGameName(e.target.value)}
              />
              <p className="text-muted-foreground text-xs">
                Your Nintendo Switch profile name for verification
              </p>
            </div>

            {/* Display Name Options */}
            <div className="space-y-3">
              <Label>Display name</Label>
              <RadioGroup
                value={displayNameOption}
                onValueChange={(v) =>
                  setDisplayNameOption(v as DisplayNameOption)
                }
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="username" id="display-username" />
                  <Label htmlFor="display-username" className="font-normal">
                    Username
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="shortened" id="display-shortened" />
                  <Label htmlFor="display-shortened" className="font-normal">
                    Shortened name
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="full" id="display-full" />
                  <Label htmlFor="display-full" className="font-normal">
                    Full name
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Country Flag Option */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="show-flag"
                checked={showCountryFlag}
                onCheckedChange={(checked) =>
                  setShowCountryFlag(checked === true)
                }
              />
              <Label htmlFor="show-flag" className="font-normal">
                Show country flag
              </Label>
            </div>

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
          </div>
        )}

        {error && <p className="text-destructive text-sm">{error}</p>}

        <DialogFooter>
          <DialogClose
            render={
              <Button type="button" variant="outline" disabled={isLoading}>
                Cancel
              </Button>
            }
          />
          <Button
            onClick={handleRegister}
            disabled={
              isLoading || isLoadingAlts || (alts.length > 1 && !selectedAltId)
            }
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Registering...
              </>
            ) : (
              "Confirm Registration"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
