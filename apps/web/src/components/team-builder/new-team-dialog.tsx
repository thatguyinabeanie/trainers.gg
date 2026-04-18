"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { type GameFormat } from "@trainers/pokemon";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { teamKeys } from "./teams-list-client";
import { submitNewTeam } from "./new-team-submit";

// =============================================================================
// Types
// =============================================================================

interface NewTeamDialogProps {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  activeFormats: GameFormat[];
  defaultFormat?: string;
  initialMode: "empty" | "import";
  /** When present → cross-alt context: show alt selector. */
  alts?: Array<{ id: number; username: string }>;
  /** Used when `alts` is absent — single-alt context. */
  altId?: number;
  /** Used for redirect URL when `alts` is absent. */
  altUsername?: string;
}

// =============================================================================
// Component
// =============================================================================

export function NewTeamDialog({
  open,
  onOpenChange,
  activeFormats,
  defaultFormat,
  initialMode,
  alts,
  altId,
  altUsername,
}: NewTeamDialogProps): React.JSX.Element {
  // Dev-only invariant: either alts is present, or altId + altUsername are present.
  if (process.env.NODE_ENV !== "production") {
    if (!alts && (altId === undefined || altUsername === undefined)) {
      console.error(
        "[NewTeamDialog] Either `alts` or both `altId` and `altUsername` must be provided."
      );
    }
  }

  const router = useRouter();
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();

  const [selectedAltId, setSelectedAltId] = useState<number>(
    alts?.[0]?.id ?? altId ?? 0
  );
  const [name, setName] = useState("");
  const [format, setFormat] = useState(
    defaultFormat ?? activeFormats[0]?.id ?? ""
  );
  const [mode, setMode] = useState<"empty" | "import">(initialMode);
  const [paste, setPaste] = useState("");

  // Reset form state in the event handler when the dialog closes.
  // This avoids calling setState() inside an effect, which the linter forbids.
  function handleOpenChange(next: boolean) {
    if (!next) {
      setSelectedAltId(alts?.[0]?.id ?? altId ?? 0);
      setName("");
      setFormat(defaultFormat ?? activeFormats[0]?.id ?? "");
      setMode(initialMode);
      setPaste("");
    }
    onOpenChange(next);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Please enter a team name.");
      return;
    }
    if (!format) {
      toast.error("Please select a format.");
      return;
    }

    // Determine effective altId + altUsername
    const effectiveAltId = alts ? selectedAltId : altId;
    const effectiveAltUsername = alts
      ? alts.find((a) => a.id === selectedAltId)?.username
      : altUsername;

    if (!effectiveAltId || !effectiveAltUsername) {
      toast.error("Select an alt to create the team under.");
      return;
    }

    startTransition(async () => {
      const res = await submitNewTeam({
        altId: effectiveAltId,
        name: name.trim(),
        format,
        mode,
        paste,
      });

      if (res.status === "error") {
        toast.error(res.error);
        return;
      }

      switch (res.status) {
        case "empty-paste":
          toast.warning(
            "Showdown paste could not be parsed. Team created empty."
          );
          break;
        case "partial":
          toast.warning(
            `Team created, but failed to import: ${res.failedSpecies.join(", ")}`
          );
          break;
        case "ok":
          toast.success("Team created!");
          break;
      }

      void queryClient.invalidateQueries({
        queryKey: teamKeys.all(effectiveAltId),
      });
      handleOpenChange(false);
      router.push(
        `/dashboard/alts/${effectiveAltUsername}/teams/${res.teamId}`
      );
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {initialMode === "import" ? "Import team" : "New team"}
          </DialogTitle>
          <DialogDescription>
            {initialMode === "import"
              ? "Paste a Showdown export to import a full team."
              : "Create a new team to start building."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Alt selector — only when alts prop present */}
          {alts ? (
            <div className="grid gap-2">
              <Label htmlFor="new-team-alt">Alt</Label>
              <select
                id="new-team-alt"
                value={selectedAltId}
                onChange={(e) => setSelectedAltId(Number(e.target.value))}
                disabled={isPending}
                className="bg-background border-input rounded-md border px-3 py-2 text-sm"
              >
                {alts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.username}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {/* Team name */}
          <div className="grid gap-2">
            <Label htmlFor="new-team-name">Team Name</Label>
            <Input
              id="new-team-name"
              placeholder="My team..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={isPending}
              autoFocus
            />
          </div>

          {/* Format selector — horizontal pill toggle */}
          <div className="grid gap-2">
            <Label>Format</Label>
            <div className="flex flex-wrap gap-2">
              {activeFormats.map((fmt) => (
                <button
                  key={fmt.id}
                  type="button"
                  onClick={() => setFormat(fmt.id)}
                  disabled={isPending}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                    format === fmt.id
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background hover:bg-accent border-border"
                  )}
                >
                  {fmt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Mode toggle */}
          <div className="grid gap-2">
            <Label>Start from</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMode("empty")}
                disabled={isPending}
                className={cn(
                  "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                  mode === "empty"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background hover:bg-accent border-border"
                )}
              >
                Empty team
              </button>
              <button
                type="button"
                onClick={() => setMode("import")}
                disabled={isPending}
                className={cn(
                  "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                  mode === "import"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background hover:bg-accent border-border"
                )}
              >
                Import paste
              </button>
            </div>
          </div>

          {/* Paste textarea — import mode only */}
          {mode === "import" ? (
            <div className="grid gap-2">
              <Label htmlFor="new-team-paste">Showdown Paste</Label>
              <Textarea
                id="new-team-paste"
                placeholder="Paste a Showdown export here..."
                value={paste}
                onChange={(e) => setPaste(e.target.value)}
                disabled={isPending}
                className="max-h-40 resize-none overflow-y-auto font-mono text-xs"
              />
              <p className="text-muted-foreground text-xs">
                Up to 6 Pokémon will be imported.
              </p>
            </div>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              disabled={isPending}
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              {mode === "import" ? "Import & Create" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
