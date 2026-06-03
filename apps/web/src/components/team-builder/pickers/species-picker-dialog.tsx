"use client";

import { type GameFormat } from "@trainers/pokemon";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-mobile";

import { SpeciesPicker } from "./species-picker";
import { SpeciesPickerMobile } from "./species-picker-mobile";

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
 * Shared species-picker entry point. Switches between a centered desktop
 * Dialog and a mobile-native bottom drawer based on viewport width.
 */
export function SpeciesPickerDialog(props: SpeciesPickerDialogProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <SpeciesPickerMobile {...props} />;
  }

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="ring-primary/50 flex h-[min(calc(100vh-2rem),1400px)] w-[calc(100vw-2rem)] max-w-[1600px] flex-col gap-0 overflow-hidden rounded-xl p-0 ring-2 sm:max-w-[1600px]"
      >
        <DialogTitle className="sr-only">Choose species</DialogTitle>
        <SpeciesPicker
          value={props.value}
          format={props.format}
          currentTeam={props.currentTeam}
          onPick={(species) => {
            props.onPick(species);
            props.onOpenChange(false);
          }}
          onClose={() => props.onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
