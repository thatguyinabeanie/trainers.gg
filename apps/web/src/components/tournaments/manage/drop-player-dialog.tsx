"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

// Drop reason categories
export type DropCategory = "no_show" | "conduct" | "disqualification" | "other";

interface DropPlayerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Single drop — shows player name in header */
  playerName?: string;
  /** Bulk drop — shows count in header */
  playerCount?: number;
  onConfirm: (category: DropCategory, notes?: string) => Promise<void>;
}

// Category options displayed in the radio group
const CATEGORY_OPTIONS: { value: DropCategory; label: string }[] = [
  { value: "no_show", label: "No-Show" },
  { value: "conduct", label: "Conduct" },
  { value: "disqualification", label: "Disqualification" },
  { value: "other", label: "Other" },
];

// Categories that require notes
const NOTES_REQUIRED_CATEGORIES: DropCategory[] = [
  "conduct",
  "disqualification",
  "other",
];

export function DropPlayerDialog({
  open,
  onOpenChange,
  playerName,
  playerCount,
  onConfirm,
}: DropPlayerDialogProps) {
  const [category, setCategory] = useState<DropCategory | null>(null);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Determine whether notes are required for the selected category
  const notesRequired =
    category !== null && NOTES_REQUIRED_CATEGORIES.includes(category);
  const notesEmpty = notes.trim().length === 0;

  // Show validation message when notes are required but empty
  const showNotesValidation = notesRequired && notesEmpty;

  // Form is valid when a category is selected and notes requirement is satisfied
  const isFormValid = category !== null && (!notesRequired || !notesEmpty);

  // Build the dialog title
  const title =
    playerCount !== undefined && playerCount > 1
      ? `Drop ${playerCount} Players`
      : `Drop ${playerName ?? "Player"}`;

  // Build the description
  const description =
    playerCount !== undefined && playerCount > 1
      ? "This will drop the selected players from the tournament. Choose a reason category and optionally provide notes."
      : "This will drop the player from the tournament. Choose a reason category and optionally provide notes.";

  // Reset form state when dialog closes
  useEffect(() => {
    if (!open) {
      setCategory(null);
      setNotes("");
      setIsSubmitting(false);
    }
  }, [open]);

  const handleConfirm = async () => {
    if (!isFormValid || category === null) return;

    setIsSubmitting(true);
    try {
      await onConfirm(category, notesEmpty ? undefined : notes.trim());
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {/* Category selection */}
        <div className="space-y-3">
          <Label>Reason</Label>
          <RadioGroup
            value={category ?? undefined}
            onValueChange={(value) => setCategory(value as DropCategory)}
          >
            {CATEGORY_OPTIONS.map((option) => (
              <div key={option.value} className="flex items-center gap-2">
                <RadioGroupItem
                  value={option.value}
                  id={`drop-category-${option.value}`}
                />
                <Label
                  htmlFor={`drop-category-${option.value}`}
                  className="cursor-pointer font-normal"
                >
                  {option.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="drop-notes">
            Notes
            {notesRequired && <span className="text-destructive ml-1">*</span>}
          </Label>
          <Textarea
            id="drop-notes"
            placeholder="Provide additional context..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          {showNotesValidation && (
            <p className="text-destructive text-sm">
              Notes are required for this category.
            </p>
          )}
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Cancel
          </DialogClose>
          <Button
            variant="destructive"
            disabled={!isFormValid || isSubmitting}
            onClick={handleConfirm}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm Drop
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
