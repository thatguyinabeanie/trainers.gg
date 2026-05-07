"use client";

import { type GameFormat } from "@trainers/pokemon";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

import { SpeciesPicker } from "./species-picker";

// =============================================================================
// Types
// =============================================================================

interface SpeciesPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string | null;
  format: GameFormat | undefined;
  currentTeam?: Array<{ species: string }>;
  onPick: (species: string) => void;
}

// =============================================================================
// SpeciesPickerDialog
// =============================================================================

/**
 * Shared species-picker dialog used by poke-row's empty slot and
 * identity-lane's hero mode.
 *
 * Owns the dialog chrome — sizing, sr-only title, auto-close on pick — so
 * every call site renders the picker at the same large modal dimensions
 * and behaves consistently. Consumers provide their own trigger and an
 * onPick handler that mutates their state.
 */
export function SpeciesPickerDialog({
  open,
  onOpenChange,
  value,
  format,
  currentTeam,
  onPick,
}: SpeciesPickerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="ring-primary/50 flex h-[min(calc(100vh-2rem),1400px)] w-[calc(100vw-2rem)] max-w-[1600px] flex-col gap-0 overflow-hidden rounded-xl p-0 ring-2 sm:max-w-[1600px]"
      >
        <DialogTitle className="sr-only">Choose species</DialogTitle>
        <SpeciesPicker
          value={value}
          format={format}
          currentTeam={currentTeam}
          onPick={(species) => {
            onPick(species);
            onOpenChange(false);
          }}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
