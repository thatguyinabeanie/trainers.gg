"use client";

import { type Dispatch, type SetStateAction, useState } from "react";
import { PanelRightClose } from "lucide-react";

import { type GameFormat, isChampionsFormat } from "@trainers/pokemon";
import { type TeamWithPokemon } from "@trainers/supabase";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

import { FilterDialogShell } from "../pickers/filter-dialog-shell";
import {
  SpeedTiersFieldControls,
  SpeedTiersModifiers,
  SpeedTiersTable,
  parseExternalWeather,
} from "./speed-tiers-content";
import { type ToggleState } from "./speed-tiers-state";

interface SpeedTiersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team: TeamWithPokemon["team_pokemon"];
  format: GameFormat | undefined;
  toggle: ToggleState;
  setToggle: Dispatch<SetStateAction<ToggleState>>;
  weather?: string;
  setWeather?: (v: string) => void;
  /** Switch this session to the side pane. */
  onCollapseToSidepane: () => void;
}

/**
 * Speed-tiers dialog entry point. Switches between a centered desktop Dialog
 * (FilterDialogShell two-pane layout) and a mobile-native bottom Drawer with a
 * Tiers/Filters tab switch. Both presentations consume the same shared
 * `toggle`/`setToggle` passed by the parent, so collapse/pop-out preserve state.
 */
export function SpeedTiersDialog(props: SpeedTiersDialogProps) {
  const isMobile = useIsMobile();
  const [nameFilter, setNameFilter] = useState("");

  if (!props.format) return null;

  const isExternallyControlled = props.weather !== undefined;
  const effectiveWeather = isExternallyControlled
    ? parseExternalWeather(props.weather)
    : props.toggle.weather;
  const champions = isChampionsFormat(props.format);
  const maxEv = champions ? 32 : 252;
  const evStep = champions ? 1 : 4;
  const evLabel = champions ? "SP" : "EVs";

  const fieldControls = (
    <SpeedTiersFieldControls
      toggle={props.toggle}
      setToggle={props.setToggle}
      effectiveWeather={effectiveWeather}
      isExternallyControlled={isExternallyControlled}
      externalWeather={props.weather}
      externalSetWeather={props.setWeather}
    />
  );
  const modifiers = (
    <SpeedTiersModifiers
      toggle={props.toggle}
      setToggle={props.setToggle}
      maxEv={maxEv}
      evStep={evStep}
      evLabel={evLabel}
    />
  );
  const table = (
    <SpeedTiersTable
      team={props.team}
      format={props.format}
      toggle={props.toggle}
      setToggle={props.setToggle}
      effectiveWeather={effectiveWeather}
      nameFilter={nameFilter}
    />
  );

  if (isMobile) {
    return (
      <Drawer open={props.open} onOpenChange={props.onOpenChange}>
        <DrawerContent
          showHandle={false}
          className="h-[95dvh] overflow-hidden rounded-t-[20px] p-0 data-[vaul-drawer-direction=bottom]:max-h-[95dvh]"
        >
          <DrawerTitle className="sr-only">Speed tiers</DrawerTitle>

          {/* Drag handle */}
          <div
            aria-hidden="true"
            className="bg-muted-foreground/20 mx-auto mt-2 mb-1 h-1 w-9 shrink-0 rounded-full"
          />

          <MobileSpeedTiers
            field={fieldControls}
            modifiers={modifiers}
            table={table}
          />
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="ring-primary/50 flex h-[min(calc(100vh-2rem),1000px)] w-[calc(100vw-2rem)] max-w-[1100px] flex-col gap-0 overflow-hidden rounded-xl p-0 ring-2 sm:max-w-[1100px]"
      >
        <DialogTitle className="sr-only">Speed tiers</DialogTitle>
        <FilterDialogShell
          data-testid="speed-tiers-dialog"
          search={{
            value: nameFilter,
            onChange: setNameFilter,
            placeholder: "Filter Pokémon by name…",
            ariaLabel: "Filter Pokémon by name",
            "data-testid": "speed-tiers-name-filter",
          }}
          headerActions={
            <>
              <button
                type="button"
                onClick={props.onCollapseToSidepane}
                className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] transition-colors"
              >
                <PanelRightClose className="size-3.5" />
                Collapse to sidepane
              </button>
              <button
                type="button"
                onClick={() => props.onOpenChange(false)}
                aria-label="Close speed tiers"
                className="text-muted-foreground hover:text-foreground rounded p-1 text-lg leading-none transition-colors"
              >
                ×
              </button>
            </>
          }
          rail={
            // Own the rail scroll here — the shell intentionally doesn't impose
            // overflow (see FilterDialogShell). Field + modifiers scroll when
            // the dialog is short.
            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 py-3">
              {fieldControls}
              {modifiers}
            </div>
          }
        >
          {table}
        </FilterDialogShell>
      </DialogContent>
    </Dialog>
  );
}

function MobileSpeedTiers({
  field,
  modifiers,
  table,
}: {
  field: React.ReactNode;
  modifiers: React.ReactNode;
  table: React.ReactNode;
}) {
  const [view, setView] = useState<"tiers" | "filters">("tiers");
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 gap-1 border-b px-3 py-2">
        {(["tiers", "filters"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={cn(
              "flex-1 rounded-md px-2 py-1 text-xs font-medium capitalize transition-colors",
              view === v
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground"
            )}
          >
            {v}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {view === "tiers" ? (
          table
        ) : (
          <div className="flex flex-col gap-3 p-3">
            {field}
            {modifiers}
          </div>
        )}
      </div>
    </div>
  );
}
