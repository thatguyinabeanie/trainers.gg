"use client";

import {
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useId,
  useEffect,
  useLayoutEffect,
  useOptimistic,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  PanelRightOpen,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import {
  type GameFormat,
  getActiveFormats,
  getMegaStoneForSpecies,
  isChampionsFormat,
} from "@trainers/pokemon";
import {
  type TeamWithPokemon,
  type Tables,
  type TablesInsert,
  type TablesUpdate,
} from "@trainers/supabase";

import type { BuilderPersistence } from "./persistence/types";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { ImportDialog } from "./import-dialog";
import { useTeamValidation, type ValidationError } from "./validation-hooks";
import { EditableName } from "./builder-topbar";
import { ValidationPopover } from "./validation/validation-popover";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalcBottomPanel } from "./calc/calc-bottom-panel";
import {
  CalcStateProvider,
  useCalcStateContext,
} from "./calc/calc-state-context";
import { Dockbar } from "./dock/dockbar";
import { SpeedTiersDialog } from "./dock/speed-tiers-dialog";
import { UNINITIALIZED_FORMAT_ID } from "./dock/speed-tiers-content";
import { getTeamFastestSpeed, SpeedTiersPanel } from "./dock/speed-tiers-panel";
import {
  type ToggleState,
  useSpeedTiersToggle,
} from "./dock/speed-tiers-state";
import { HeatmapPanel } from "./dock/heatmap-panel";
import { PokeRow } from "./poke-row";
import { warmSpeciesIndex } from "./pickers/species-picker";
import { useBuilderPreferences } from "./use-builder-preferences";
import { useBuilderState } from "./use-builder-state";
import { useTeamLayout, TeamLayoutContext } from "./use-team-layout";
import { TeamLayoutToggle } from "./team-layout-toggle";

// =============================================================================
// KO-tier semantic tokens (migrated from .builderApp's CSS-module rule).
//
// These cascade to every descendant, so move tiles, calc detail cards, etc.
// can read `var(--ko-red)` / `var(--ko-amber-bg)` without redefining the
// tokens at every consumer. Previously lived inline in globals.css.
//   • --ko-red    — OHKO indicator; reuses --destructive so the theme wins
//   • --ko-amber* — 2HKO band, with bg/fg variants for tile background vs text
//   • --ko-yellow*— 3HKO band, same bg/fg split
//   • --ko-green* — super-effective hint
//   • --ko-ne     — not-very-effective hint
// =============================================================================
const builderTokenStyle: React.CSSProperties = {
  "--ko-red": "var(--destructive)",
  "--ko-amber-bg": "oklch(0.7 0.15 80)",
  "--ko-amber-fg": "oklch(0.65 0.15 80)",
  "--ko-amber2-fg": "oklch(0.65 0.15 55)",
  "--ko-yellow-bg": "oklch(0.78 0.15 90)",
  "--ko-yellow-fg": "oklch(0.72 0.15 90)",
  "--ko-green": "oklch(0.72 0.2 145)",
  "--ko-green-fg": "oklch(0.6 0.2 145)",
  "--ko-ne": "oklch(0.55 0.15 30)",
  "--builder-shadow": "oklch(0 0 0 / 30%)",
  "--builder-backdrop": "oklch(0 0 0 / 25%)",
} as React.CSSProperties;

// =============================================================================
// Types
// =============================================================================

interface TeamWorkspaceV2Props {
  team: TeamWithPokemon;
  format: GameFormat | undefined;
  alts: Tables<"alts">[];
  /** Persistence adapter — controls how mutations are applied (API vs local). */
  persistence: BuilderPersistence;
  /** Currently selected alt for saving (local builder mode). */
  selectedAltId?: number | null;
  /** Called when user picks a different alt (local builder mode). */
  onAltSelect?: (altId: number) => void;
  /** Whether the viewer is signed in — gates account-backed builder preferences. */
  isAuthenticated: boolean;
  /**
   * Render prop for the page header/topbar. Receives workspace-internal actions
   * (import toggle, validation, jump-to-pokemon) so the parent can compose its
   * own header chrome (standalone vs dashboard PageHeader).
   */
  renderHeader: (actions: WorkspaceHeaderActions) => ReactNode;
}

/**
 * Actions exposed to the header render prop from workspace internals.
 */
export interface WorkspaceHeaderActions {
  /** Open the import dialog. */
  onOpenImport: () => void;
  /** Current validation errors for the team. */
  validationErrors: ValidationError[];
  /** Trigger a full validation pass. */
  onValidate: () => void;
  /** Jump to a pokemon slot by its ID (scrolls/activates it). */
  onJumpToPokemon: (pokemonId: number) => void;
  /** Rename the team. */
  onNameChange: (name: string) => Promise<void>;
}

// =============================================================================
// Slot computation
// =============================================================================

/**
 * Builds a stable 6-slot array from team_pokemon, indexed by team_position.
 * `slots[i]` is the pokemon at team_position `i + 1`, or null if no row exists
 * for that position. The UI's slot index → DB position mapping is 1:1, so
 * handleAdd's `position = idx + 1` always targets the slot the user clicked.
 */
function buildSlots(
  teamPokemon: TeamWithPokemon["team_pokemon"]
): (Tables<"pokemon"> | null)[] {
  const slots: (Tables<"pokemon"> | null)[] = Array.from(
    { length: 6 },
    () => null
  );
  for (const entry of teamPokemon) {
    const idx = entry.team_position - 1;
    if (idx >= 0 && idx < 6) {
      slots[idx] = entry.pokemon ?? null;
    }
  }
  return slots;
}

type OptimisticAction =
  | {
      kind: "update";
      pokemonId: number;
      fields: Partial<TablesUpdate<"pokemon">>;
    }
  | {
      kind: "add";
      position: number;
      species: string;
      // Generated in the event handler so the reducer stays pure — React may
      // invoke the reducer multiple times during reconciliation, and the row
      // must keep the same React key across every call.
      tempId: number;
      heldItem?: string | null;
    }
  | { kind: "remove"; pokemonId: number };

/**
 * Build a placeholder team_pokemon entry for an optimistic add. Defaults
 * mirror addPokemonToTeamAction (ability/move1 empty, Serious nature) so
 * the optimistic row matches what the DB actually inserts.
 */
function buildOptimisticTeamPokemon(
  species: string,
  position: number,
  tempId: number,
  heldItem?: string | null
): TeamWithPokemon["team_pokemon"][number] {
  // Numeric and boolean defaults mirror pokemonPayloadSchema's `.default(...)`
  // values — the same defaults the server applies on insert. Without them the
  // optimistic row would render with null fields then visibly snap to 50/0/31
  // when router.refresh lands the canonical row.
  const pokemon: Tables<"pokemon"> = {
    id: tempId,
    species,
    ability: "",
    move1: "",
    move2: null,
    move3: null,
    move4: null,
    nature: "Serious",
    nickname: null,
    notes: null,
    held_item: heldItem ?? null,
    tera_type: null,
    gender: null,
    is_shiny: false,
    level: 50,
    format_legal: null,
    created_at: null,
    ev_hp: 0,
    ev_attack: 0,
    ev_defense: 0,
    ev_special_attack: 0,
    ev_special_defense: 0,
    ev_speed: 0,
    iv_hp: 31,
    iv_attack: 31,
    iv_defense: 31,
    iv_special_attack: 31,
    iv_special_defense: 31,
    iv_speed: 31,
  };
  return {
    id: tempId,
    pokemon_id: tempId,
    team_position: position,
    pokemon,
  };
}

// =============================================================================
// DockbarConnected
// =============================================================================

interface DockbarConnectedProps {
  onOpen: (key: "matchups" | "speed" | "calc") => void;
  sideDrawer: "speed" | null;
  rightDrawer: "calc" | null;
  bottomDrawer: "matchups" | null;
  fastest: number;
}

/**
 * Wraps Dockbar with calc state read from CalcStateContext.
 * Must be mounted inside a CalcStateProvider.
 */
function DockbarConnected({
  onOpen,
  sideDrawer,
  rightDrawer,
  bottomDrawer,
  fastest,
}: DockbarConnectedProps) {
  const calc = useCalcStateContext();

  return (
    <Dockbar
      onOpen={onOpen}
      sideDrawer={sideDrawer}
      rightDrawer={rightDrawer}
      bottomDrawer={bottomDrawer}
      fastest={fastest}
      defenderSpecies={calc.defenderSpecies}
      moveCalcOutputs={calc.moveCalcOutputs}
    />
  );
}

// =============================================================================
// SpeedTiersPanelConnected — reads weather from CalcStateContext
// =============================================================================

interface SpeedTiersPanelConnectedProps {
  team: TeamWithPokemon["team_pokemon"];
  format: GameFormat | undefined;
  toggle: ToggleState;
  setToggle: Dispatch<SetStateAction<ToggleState>>;
}

function SpeedTiersPanelConnected({
  team,
  format,
  toggle,
  setToggle,
}: SpeedTiersPanelConnectedProps) {
  const calc = useCalcStateContext();
  return (
    <SpeedTiersPanel
      team={team}
      format={format}
      toggle={toggle}
      setToggle={setToggle}
      weather={calc.weather}
      setWeather={calc.setWeather}
    />
  );
}

// =============================================================================
// SpeedTiersDialogConnected — reads calc weather for the dialog presentation
// =============================================================================

interface SpeedTiersDialogConnectedProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team: TeamWithPokemon["team_pokemon"];
  format: GameFormat | undefined;
  toggle: ToggleState;
  setToggle: Dispatch<SetStateAction<ToggleState>>;
  onCollapseToSidepane: () => void;
}

function SpeedTiersDialogConnected(props: SpeedTiersDialogConnectedProps) {
  const calc = useCalcStateContext();
  return (
    <SpeedTiersDialog
      {...props}
      weather={calc.weather}
      setWeather={calc.setWeather}
    />
  );
}

// =============================================================================
// WorkspaceMetadata — inline row above the pokemon grid
// =============================================================================

const WORKSPACE_FORMATS = getActiveFormats();

interface WorkspaceMetadataProps {
  alts: Tables<"alts">[];
  selectedAltId: number | null;
  onAltSelect?: (altId: number) => void;
  format: GameFormat | undefined;
  onFormatChange: (formatId: string) => Promise<void>;
}

function WorkspaceMetadata({
  alts,
  selectedAltId,
  onAltSelect,
  format,
  onFormatChange,
}: WorkspaceMetadataProps) {
  const [altPending, setAltPending] = useState(false);
  const [formatPending, setFormatPending] = useState(false);

  const selectedAlt = alts.find((a) => a.id === selectedAltId);
  const hasMultipleAlts = alts.length > 1;

  async function handleFormatPick(formatId: string) {
    if (formatId === format?.id) return;
    setFormatPending(true);
    try {
      await onFormatChange(formatId);
    } finally {
      setFormatPending(false);
    }
  }

  // Show all active formats + current format if it's inactive
  const displayFormats =
    format && !WORKSPACE_FORMATS.find((f) => f.id === format.id)
      ? [format, ...WORKSPACE_FORMATS]
      : WORKSPACE_FORMATS;

  return (
    <div className="text-muted-foreground flex items-center gap-3 text-xs">
      {/* Alt selector */}
      {alts.length > 0 && (
        <>
          {hasMultipleAlts && onAltSelect ? (
            <select
              value={selectedAltId ?? ""}
              disabled={altPending}
              onChange={async (e) => {
                const altId = Number(e.target.value);
                if (!altId || altPending) return;
                setAltPending(true);
                try {
                  await Promise.resolve(onAltSelect(altId));
                } finally {
                  setAltPending(false);
                }
              }}
              className={cn(
                "border-input bg-background text-foreground hover:bg-accent focus:ring-ring h-7 rounded-md border px-2 text-xs font-medium shadow-xs transition-colors focus:ring-2 focus:outline-none",
                altPending && "opacity-60"
              )}
            >
              {alts.map((alt) => (
                <option key={alt.id} value={alt.id}>
                  {alt.username}
                </option>
              ))}
            </select>
          ) : (
            <span className="text-foreground font-medium">
              {selectedAlt?.username ?? alts[0]?.username}
            </span>
          )}
        </>
      )}

      {/* Format selector */}
      <select
        value={format?.id ?? ""}
        disabled={formatPending}
        onChange={(e) => {
          if (e.target.value) handleFormatPick(e.target.value);
        }}
        className={cn(
          "border-input bg-background text-foreground hover:bg-accent focus:ring-ring h-7 rounded-md border px-2 text-xs font-medium shadow-xs transition-colors focus:ring-2 focus:outline-none",
          formatPending && "opacity-60"
        )}
      >
        <option value="" disabled>
          Set format...
        </option>
        {displayFormats.map((fmt) => (
          <option key={fmt.id} value={fmt.id}>
            {fmt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// =============================================================================
// TeamWorkspaceV2
// =============================================================================

/**
 * Top-level client component for the v2 team builder workspace.
 * Owns layout orchestration: Topbar, PokeRow list, calc drawer slot.
 * Uses optimistic write path via useOptimistic + updatePokemonAction.
 * Wires useTeamValidation → per-slot error badges + lane field errors.
 */
export function TeamWorkspaceV2({
  team,
  format,
  alts,
  persistence,
  selectedAltId,
  onAltSelect,
  isAuthenticated,
  renderHeader,
}: TeamWorkspaceV2Props) {
  const router = useRouter();
  const state = useBuilderState();
  const prefs = useBuilderPreferences(isAuthenticated);

  /**
   * Shared speed-tiers toggle — lifted here so the side pane and dialog
   * presentations operate on one instance and never reset on switch.
   */
  const { toggle: speedToggle, setToggle: setSpeedToggle } =
    useSpeedTiersToggle();

  // Format-change EV clamp. Owned here because TeamWorkspaceV2 holds the speed
  // toggle — running this reset inside SpeedTiersTable's render would update a
  // component (the workspace) while rendering a different one. Different formats
  // have different max EVs (VGC 252 vs Champions 32), so a stale override would
  // otherwise pass out-of-range to calculateChampionsStat. Render-time sentinel
  // pattern per react-patterns.md; sentinel fires on first render even with
  // immediately-available data.
  const [prevFormatId, setPrevFormatId] = useState<
    string | undefined | typeof UNINITIALIZED_FORMAT_ID
  >(UNINITIALIZED_FORMAT_ID);
  const currentFormatId = format?.id;
  if (currentFormatId !== prevFormatId) {
    setPrevFormatId(currentFormatId);
    if (format) {
      const newMaxEv = isChampionsFormat(format) ? 32 : 252;
      setSpeedToggle((prev) => {
        const yoursEvs = prev.yours.evs;
        const theirsEvs = prev.theirs.evs;
        const clampedYours =
          yoursEvs != null && yoursEvs > newMaxEv ? newMaxEv : yoursEvs;
        const clampedTheirs =
          theirsEvs != null && theirsEvs > newMaxEv ? newMaxEv : theirsEvs;
        if (clampedYours === yoursEvs && clampedTheirs === theirsEvs)
          return prev;
        return {
          ...prev,
          yours: { ...prev.yours, evs: clampedYours },
          theirs: { ...prev.theirs, evs: clampedTheirs },
        };
      });
    }
  }

  // Apply the saved speed-tiers preference once after prefs resolve. Desktop
  // only — the use-builder-state mobile useLayoutEffect keeps speedView null on
  // phones. useLayoutEffect (not a render-time window read) so SSR is safe and
  // the panel is positioned before the browser paints.
  const appliedLoadPrefRef = useRef(false);
  useLayoutEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (appliedLoadPrefRef.current || prefs.loading) return;
    appliedLoadPrefRef.current = true;
    if (
      window.innerWidth >= 768 &&
      prefs.preferences.speedTiers.defaultView === "sidepane" &&
      prefs.preferences.speedTiers.openOnLoad
    ) {
      state.setSpeedView("sidepane");
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [prefs.loading]);

  /** Controls the import sheet. */
  const [importOpen, setImportOpen] = useState(false);

  /** Controls the mobile validate popover. */
  const [mobileValidateOpen, setMobileValidateOpen] = useState(false);

  /** Slot index awaiting remove confirmation. null = dialog closed. */

  /** Ref to the worklane element — used by the panel resizer to compute the
   *  pointer's offset within the lane during drag. */
  const worklaneRef = useRef<HTMLDivElement | null>(null);

  /**
   * Counter for placeholder ids on optimistic adds. Negative so they can
   * never collide with real DB ids (bigint identity columns are always
   * positive); decremented per call so multiple concurrent adds still get
   * unique React keys. Lives on a ref so it's instance-scoped — no module-
   * level shared state across tabs, tests, or HMR reloads.
   */
  const nextOptimisticIdRef = useRef(-1);

  // Eagerly warm the species search index in an idle callback so the first
  // open of the species picker is instant rather than blocking on index build.
  useEffect(() => {
    const formatId = format?.id;
    if (!formatId) return;
    // requestIdleCallback is unavailable in Safari < 16.4 — fall back to setTimeout
    if (typeof requestIdleCallback === "function") {
      const id = requestIdleCallback(() => warmSpeciesIndex(formatId));
      return () => cancelIdleCallback(id);
    }
    const id = setTimeout(() => warmSpeciesIndex(formatId), 1);
    return () => clearTimeout(id);
  }, [format?.id]);

  // ---------------------------------------------------------------------------
  // Optimistic team-pokemon state
  //
  // The reducer must stay pure — React may call it multiple times during
  // reconciliation. Side effects (e.g., generating temp ids for `add`) live
  // in the event handler and are passed in via the action payload.
  //
  // router.refresh() ends every transition — on success it lands the canonical
  // server state into the prop so useOptimistic reverts cleanly; on failure
  // it rolls the UI back to last known good. Both paths must call it.
  // ---------------------------------------------------------------------------

  const [optimisticTeamPokemon, applyOptimistic] = useOptimistic(
    team.team_pokemon,
    (current, action: OptimisticAction) => {
      switch (action.kind) {
        case "update":
          return current.map((tp) =>
            tp.pokemon_id === action.pokemonId && tp.pokemon
              ? { ...tp, pokemon: { ...tp.pokemon, ...action.fields } }
              : tp
          );
        case "remove":
          // Filter by pokemon_id (always non-null) rather than pokemon?.id —
          // the join can theoretically yield `pokemon: null` rows even though
          // pokemon_id holds the canonical FK.
          return current.filter((tp) => tp.pokemon_id !== action.pokemonId);
        case "add": {
          // Replace any existing entry at the same position with the placeholder.
          const filtered = current.filter(
            (tp) => tp.team_position !== action.position
          );
          return [
            ...filtered,
            buildOptimisticTeamPokemon(
              action.species,
              action.position,
              action.tempId,
              action.heldItem
            ),
          ];
        }
      }
    }
  );

  const [, startTransition] = useTransition();

  // ---------------------------------------------------------------------------
  // Validation — debounced reactive validation on every optimistic state change.
  // pokemonErrors: Map<pokemonId, ValidationError[]> for per-slot lookup.
  // ---------------------------------------------------------------------------

  const {
    errors: validationErrors,
    pokemonErrors,
    validate,
  } = useTeamValidation(optimisticTeamPokemon, format);

  function handlePokemonUpdate(
    pokemonId: number,
    fields: Partial<TablesUpdate<"pokemon">>
  ) {
    // Negative ids are optimistic placeholders — the row hasn't landed in
    // the DB yet, so the server can't accept an update for it.
    // (In local mode, negative IDs are valid since they're the real IDs.)
    if (persistence.mode === "api" && pokemonId < 1) {
      toast.info("Still saving the new Pokémon — try again in a moment.");
      return;
    }
    startTransition(async () => {
      applyOptimistic({ kind: "update", pokemonId, fields });
      const result = await persistence.updatePokemon(
        team.id,
        pokemonId,
        fields
      );
      if (!result.success) {
        toast.error(result.error ?? "Failed to save changes.");
      }
      persistence.onMutationSuccess();
    });
  }

  function handleAdd(idx: number, speciesId: string) {
    // Position is 1-indexed
    const position = idx + 1;
    // ability / move1 / nature are required by the DB schema. ability and
    // move1 use empty-string placeholders the user fills in via the lane
    // editors; nature defaults to the neutral "Serious" so the row
    // validates immediately. Serious is the canonical neutral nature in
    // the picker (Hardy/Docile/Bashful/Quirky are hidden as duplicates).

    // Auto-attach mega stone when adding a mega species.
    const megaStone = getMegaStoneForSpecies(speciesId);

    const pokemon: TablesInsert<"pokemon"> = {
      species: speciesId,
      ability: "",
      move1: "",
      nature: "Serious",
      ...(megaStone ? { held_item: megaStone } : {}),
    };
    // Generate the temp id here, not in the reducer — the reducer must be
    // pure across React's reconciliation re-invocations.
    const tempId = nextOptimisticIdRef.current--;

    startTransition(async () => {
      applyOptimistic({
        kind: "add",
        position,
        species: speciesId,
        tempId,
        heldItem: megaStone,
      });
      const result = await persistence.addPokemon(team.id, pokemon, position);
      if (!result.success) {
        toast.error(result.error ?? "Failed to add Pokémon.");
        persistence.onMutationSuccess();
        return;
      }
      toast.success(`${speciesId} added to slot ${position}.`);
      persistence.onMutationSuccess();
    });
  }

  /** Removes the Pokémon at the given slot index immediately. */
  function handleRequestRemove(idx: number) {
    const p = slots[idx];
    if (!p) return;
    const pokemonId = p.id;

    if (persistence.mode === "api" && pokemonId < 1) {
      toast.info("Still saving the new Pokémon — try again in a moment.");
      return;
    }

    startTransition(async () => {
      applyOptimistic({ kind: "remove", pokemonId });
      const result = await persistence.removePokemon(team.id, pokemonId);
      if (!result.success) {
        toast.error(result.error ?? "Failed to remove Pokémon.");
        persistence.onMutationSuccess();
        return;
      }
      toast.success("Pokémon removed.");
      persistence.onMutationSuccess();
    });
  }

  const isMobile = useIsMobile();
  const { mode: layoutMode } = useTeamLayout();

  // ---------------------------------------------------------------------------
  // DnD sensors
  // PointerSensor with activationConstraint.distance=8 so click events on the
  // rib's × button still fire before dragging starts.
  // KeyboardSensor for accessibility.
  // ---------------------------------------------------------------------------

  const dndId = useId();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // ---------------------------------------------------------------------------
  // Reorder override
  //
  // After a drag, we store an ordered list of pokemon IDs so the UI reflects
  // the new order optimistically while the server action runs. `null` means
  // "use the default order from buildSlots(optimisticTeamPokemon)".
  // On router.refresh() this resets naturally (the component re-renders with
  // the updated team_pokemon positions from the server).
  // ---------------------------------------------------------------------------

  const [reorderIds, setReorderIds] = useState<(number | null)[] | null>(null);

  const baseSlots = buildSlots(optimisticTeamPokemon);

  // Apply the reorder override if present, otherwise use derived order.
  const slots: (Tables<"pokemon"> | null)[] = reorderIds
    ? reorderIds.map((id) =>
        id === null ? null : (baseSlots.find((p) => p?.id === id) ?? null)
      )
    : baseSlots;

  // Calc-panel "focused attacker" row — independent of workspace activeIdx so
  // the chip strip in the calc bottom panel can target a different mon than
  // the one being edited. Falls back to activeIdx when attackerSlot is stale
  // (e.g. localStorage points at a slot that's empty on the loaded team).
  // The calc engine uses this row's pokemon for boosts/status/mega/crit
  // tweaks; every other row in the team computes against neutral baseline.
  const calcAttackerIdx =
    state.attackerSlot !== null && slots[state.attackerSlot] != null
      ? state.attackerSlot
      : state.activeIdx;

  // Stable IDs for dnd-kit: pokemon.id (as string) for filled, placeholder for empty.
  const itemIds = slots.map((p, i) =>
    p !== null ? String(p.id) : `__empty__${i}`
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Block reorder while any optimistic placeholder is pending — its negative
    // id can't be sent to reorderTeamPokemonAction (rejected by positiveIntSchema)
    // and a partial reorder would desync the UI from the server.
    if (
      persistence.mode === "api" &&
      optimisticTeamPokemon.some((tp) => tp.pokemon_id < 1)
    ) {
      toast.info("Still saving the new Pokémon — try reordering in a moment.");
      return;
    }

    const oldIndex = itemIds.indexOf(active.id as string);
    const newIndex = itemIds.indexOf(over.id as string);
    if (oldIndex < 0 || newIndex < 0) return;

    const prevSlots = slots;
    const nextSlots = arrayMove(slots, oldIndex, newIndex);

    // Optimistic update — update display immediately.
    setReorderIds(nextSlots.map((p) => p?.id ?? null));

    const positions = nextSlots
      .map((p, i) => (p !== null ? { pokemonId: p.id, position: i + 1 } : null))
      .filter((x): x is { pokemonId: number; position: number } => x !== null);

    if (positions.length === 0) return;

    const result = await persistence.reorderPokemon(team.id, positions);
    if (!result.success) {
      toast.error(result.error ?? "Failed to reorder team.");
      // Revert to previous order. Skip onMutationSuccess intentionally — the
      // local optimistic state is already rolled back and local adapters treat
      // this as a no-op (no server state changed).
      setReorderIds(prevSlots.map((p) => p?.id ?? null));
      return;
    }
    // Server confirmed — let router.refresh() restore the canonical order.
    persistence.onMutationSuccess();
    setReorderIds(null);
  }

  // Pre-compute dock-pill summaries once here so DockbarConnected never runs
  // getTeamFastestSpeed on every EV slider tick.
  const fastestSpeed = format
    ? getTeamFastestSpeed(optimisticTeamPokemon, format)
    : 0;

  // onRemove for PokeRow — accepts slot idx, opens confirmation dialog
  function handleRemoveByIdx(idx: number) {
    handleRequestRemove(idx);
  }

  /**
   * Called from the Topbar validation popover when the user clicks an error row.
   * Finds the slot index for the given pokemonId and activates it.
   */
  function handleJumpToPokemon(pokemonId: number) {
    const slotIdx = slots.findIndex((p) => p?.id === pokemonId);
    if (slotIdx !== -1) {
      state.setActiveIdx(slotIdx);
    }
  }

  return (
    <TeamLayoutContext.Provider value={layoutMode}>
      <CalcStateProvider
        selectedPokemon={slots[calcAttackerIdx] ?? null}
        format={format}
        field={state.field}
        setField={state.setField}
        calcEnabled={state.rightDrawer === "calc"}
        faintedYours={state.faintedYours}
        faintedTheirs={state.faintedTheirs}
      >
        <div
          className="flex h-full flex-col overflow-hidden"
          style={builderTokenStyle}
        >
          {renderHeader({
            onOpenImport: () => setImportOpen(true),
            validationErrors,
            onValidate: validate,
            onJumpToPokemon: handleJumpToPokemon,
            onNameChange: async (name) => {
              const result = await persistence.updateTeam(team.id, { name });
              if (!result.success) {
                toast.error(result.error ?? "Failed to rename team.");
                return;
              }
              persistence.onMutationSuccess();
            },
          })}

          <div
            className="flex min-w-0 flex-1 flex-col overflow-hidden"
            ref={worklaneRef}
          >
            {/* Horizontal split: true flex layout with ghost resize handles */}
            {!isMobile ? (
              <ResizablePanelGroup
                direction="horizontal"
                className="min-w-0 flex-1"
              >
                {/* Left panel: Speed Tiers (conditional) */}
                {state.speedView === "sidepane" && (
                  <>
                    <ResizablePanel
                      id="speed-tiers"
                      defaultSize={`${state.sideWidthPx}px`}
                      minSize="260px"
                      maxSize="500px"
                      onResize={(size) => {
                        state.setSideWidthPx(size.inPixels);
                      }}
                      className="bg-background"
                    >
                      <div className="flex h-full flex-col overflow-hidden">
                        <header className="flex items-center gap-2 px-3 py-2">
                          <span className="text-primary flex-1 text-center font-mono text-[10px] font-bold tracking-wider uppercase">
                            Speed Tiers
                          </span>
                          <button
                            type="button"
                            onClick={() => state.setSpeedView("dialog")}
                            aria-label="Open speed tiers in a dialog"
                            className="text-muted-foreground hover:text-foreground flex size-5 items-center justify-center rounded transition-colors"
                          >
                            <PanelRightOpen className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => state.setSpeedView(null)}
                            aria-label="Close speed tiers"
                            className="text-muted-foreground hover:text-foreground flex size-5 items-center justify-center rounded transition-colors"
                          >
                            ×
                          </button>
                        </header>
                        <div className="min-h-0 flex-1 overflow-hidden">
                          <SpeedTiersPanelConnected
                            team={optimisticTeamPokemon}
                            format={format}
                            toggle={speedToggle}
                            setToggle={setSpeedToggle}
                          />
                        </div>
                      </div>
                    </ResizablePanel>
                    <ResizableHandle variant="ghost" />
                  </>
                )}

                {/* Center panel: Editor (always present) */}
                <ResizablePanel id="editor" minSize="30%">
                  <div className="flex h-full flex-col items-center overflow-y-auto">
                    {/* Inline metadata: alt + format (left), layout toggle (right) */}
                    <div className="flex w-full max-w-[1800px] items-center gap-3 px-3 pt-2">
                      <WorkspaceMetadata
                        alts={alts}
                        selectedAltId={
                          selectedAltId ??
                          alts.find((a) => a.id === team.created_by)?.id ??
                          null
                        }
                        onAltSelect={
                          persistence.mode === "local"
                            ? onAltSelect
                            : persistence.transferTeam
                              ? async (altId) => {
                                  const transferTeam = persistence.transferTeam;
                                  if (!transferTeam) return;
                                  const targetAlt = alts.find(
                                    (a) => a.id === altId
                                  );
                                  if (!targetAlt) return;
                                  const result = await transferTeam(
                                    team.id,
                                    altId
                                  );
                                  if (!result.success) {
                                    toast.error(
                                      result.error ?? "Failed to transfer team."
                                    );
                                    return;
                                  }
                                  toast.success(
                                    `Team transferred to ${targetAlt.username}.`
                                  );
                                  router.push(
                                    `/dashboard/alts/${targetAlt.username}/teams/${team.id}`
                                  );
                                }
                              : undefined
                        }
                        format={format}
                        onFormatChange={async (formatId) => {
                          const result = await persistence.updateTeam(team.id, {
                            format: formatId,
                          });
                          if (!result.success) {
                            toast.error(
                              result.error ?? "Failed to update format."
                            );
                            return;
                          }
                          persistence.onMutationSuccess();
                        }}
                      />
                      <div className="ml-auto">
                        <TeamLayoutToggle />
                      </div>
                    </div>
                    {/* Section wraps pokemon rows */}
                    <section
                      className="mx-auto my-auto grid w-full max-w-[1800px] gap-2 p-3 [[data-density=compact]_&]:p-2"
                      data-calc-open={
                        state.rightDrawer === "calc" ? "true" : "false"
                      }
                      data-layout={layoutMode}
                    >
                      <div
                        className={cn(
                          "grid grid-cols-[minmax(0,1fr)] gap-2 [[data-density=compact]_&]:gap-1",
                          layoutMode === "2x3-vertical" &&
                            "grid-cols-[repeat(auto-fit,minmax(585px,1fr))] items-center justify-center"
                        )}
                      >
                        <DndContext
                          id={dndId}
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          onDragEnd={handleDragEnd}
                        >
                          <SortableContext
                            items={itemIds}
                            strategy={verticalListSortingStrategy}
                          >
                            {slots.map((p, i) => {
                              const slotPokemonId = p?.id ?? null;
                              const slotErrors =
                                slotPokemonId !== null
                                  ? (pokemonErrors.get(slotPokemonId) ?? [])
                                  : [];

                              return (
                                <PokeRow
                                  key={itemIds[i]}
                                  sortableId={itemIds[i] ?? `__empty__${i}`}
                                  idx={i}
                                  pokemon={p}
                                  isActive={state.activeIdx === i}
                                  density="comfy"
                                  expandMode="all"
                                  onActivate={state.setActiveIdx}
                                  onAdd={handleAdd}
                                  onRemove={handleRemoveByIdx}
                                  teamPokemon={optimisticTeamPokemon}
                                  format={format}
                                  onPokemonUpdate={handlePokemonUpdate}
                                  slotErrors={slotErrors}
                                />
                              );
                            })}
                          </SortableContext>
                        </DndContext>
                      </div>
                    </section>
                  </div>
                </ResizablePanel>

                {/* Right panel: Damage Calc (conditional) */}
                {state.rightDrawer === "calc" && (
                  <>
                    <ResizableHandle variant="ghost" />
                    <ResizablePanel
                      id="damage-calc"
                      defaultSize={`${state.rightWidthPx}px`}
                      minSize="280px"
                      maxSize="500px"
                      onResize={(size) => {
                        state.setRightWidthPx(size.inPixels);
                      }}
                      className="bg-background"
                    >
                      <div className="flex h-full flex-col overflow-hidden">
                        <CalcBottomPanel
                          teamSlots={slots}
                          format={format}
                          onClose={() => state.setRightDrawer(null)}
                          attackerIdx={calcAttackerIdx}
                          faintedYours={state.faintedYours}
                          setFaintedYours={state.setFaintedYours}
                          faintedTheirs={state.faintedTheirs}
                          setFaintedTheirs={state.setFaintedTheirs}
                        />
                      </div>
                    </ResizablePanel>
                  </>
                )}
              </ResizablePanelGroup>
            ) : (
              /* Mobile: no panel group, inline layout */
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <div className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto">
                  {/* Mobile: single row — name (flex-1), format, validate icon */}
                  <div className="flex w-full max-w-[1800px] items-center gap-2 px-3 py-2">
                    <EditableName
                      defaultValue={team.name}
                      onSave={async (name) => {
                        const result = await persistence.updateTeam(team.id, {
                          name,
                        });
                        if (!result.success) {
                          toast.error(
                            result.error ?? "Failed to rename team."
                          );
                          return;
                        }
                        persistence.onMutationSuccess();
                      }}
                      className="h-8 min-w-0 flex-1 text-base"
                    />
                    <WorkspaceMetadata
                      alts={alts}
                      selectedAltId={
                        selectedAltId ??
                        alts.find((a) => a.id === team.created_by)?.id ??
                        null
                      }
                      onAltSelect={
                        persistence.mode === "local"
                          ? onAltSelect
                          : persistence.transferTeam
                            ? async (altId) => {
                                const transferTeam = persistence.transferTeam;
                                if (!transferTeam) return;
                                const targetAlt = alts.find(
                                  (a) => a.id === altId
                                );
                                if (!targetAlt) return;
                                const result = await transferTeam(
                                  team.id,
                                  altId
                                );
                                if (!result.success) {
                                  toast.error(
                                    result.error ?? "Failed to transfer team."
                                  );
                                  return;
                                }
                                toast.success(
                                  `Team transferred to ${targetAlt.username}.`
                                );
                                router.push(
                                  `/dashboard/alts/${targetAlt.username}/teams/${team.id}`
                                );
                              }
                            : undefined
                      }
                      format={format}
                      onFormatChange={async (formatId) => {
                        const result = await persistence.updateTeam(team.id, {
                          format: formatId,
                        });
                        if (!result.success) {
                          toast.error(
                            result.error ?? "Failed to update format."
                          );
                          return;
                        }
                        persistence.onMutationSuccess();
                      }}
                    />
                    <Popover
                      open={mobileValidateOpen}
                      onOpenChange={(open) => {
                        if (open) validate();
                        setMobileValidateOpen(open);
                      }}
                    >
                      <PopoverTrigger
                        render={
                          <button
                            type="button"
                            aria-label={
                              validationErrors.some(
                                (e) => e.severity === "error"
                              )
                                ? "Validation errors"
                                : validationErrors.some(
                                      (e) => e.severity === "warning"
                                    )
                                  ? "Validation warnings"
                                  : "Team is valid"
                            }
                            className={cn(
                              "hover:bg-accent flex size-8 shrink-0 items-center justify-center rounded-md transition-colors",
                              validationErrors.some(
                                (e) => e.severity === "error"
                              )
                                ? "text-destructive"
                                : validationErrors.some(
                                      (e) => e.severity === "warning"
                                    )
                                  ? "text-amber-600 dark:text-amber-400"
                                  : "text-emerald-600 dark:text-emerald-400"
                            )}
                          />
                        }
                      >
                        {validationErrors.some(
                          (e) => e.severity === "error"
                        ) ? (
                          <AlertCircle className="size-5" aria-hidden="true" />
                        ) : validationErrors.some(
                            (e) => e.severity === "warning"
                          ) ? (
                          <AlertTriangle
                            className="size-5"
                            aria-hidden="true"
                          />
                        ) : (
                          <CheckCircle2
                            className="size-5"
                            aria-hidden="true"
                          />
                        )}
                      </PopoverTrigger>
                      <PopoverContent
                        side="bottom"
                        align="end"
                        className="w-auto max-w-[calc(100vw-2rem)] p-0"
                      >
                        <ValidationPopover
                          errors={validationErrors}
                          onJumpToPokemon={(id) => {
                            handleJumpToPokemon(id);
                            setMobileValidateOpen(false);
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <section
                    className="mx-auto my-auto grid w-full max-w-[1800px] gap-2 px-3 pb-3 [[data-density=compact]_&]:px-2 [[data-density=compact]_&]:pb-2"
                    data-calc-open="false"
                    data-layout={layoutMode}
                  >
                    <div
                      className={cn(
                        "grid grid-cols-[minmax(0,1fr)] gap-2 [[data-density=compact]_&]:gap-1",
                        layoutMode === "2x3-vertical" &&
                          "grid-cols-[repeat(auto-fit,minmax(585px,1fr))] items-center justify-center"
                      )}
                    >
                      {slots.map((p, i) => {
                        const slotPokemonId = p?.id ?? null;
                        const slotErrors =
                          slotPokemonId !== null
                            ? (pokemonErrors.get(slotPokemonId) ?? [])
                            : [];

                        return (
                          <PokeRow
                            key={itemIds[i]}
                            sortableId={itemIds[i] ?? `__empty__${i}`}
                            idx={i}
                            pokemon={p}
                            isActive={state.activeIdx === i}
                            density="comfy"
                            expandMode="all"
                            onActivate={state.setActiveIdx}
                            onAdd={handleAdd}
                            onRemove={handleRemoveByIdx}
                            teamPokemon={optimisticTeamPokemon}
                            format={format}
                            onPokemonUpdate={handlePokemonUpdate}
                            slotErrors={slotErrors}
                          />
                        );
                      })}
                    </div>
                  </section>
                </div>

                {state.rightDrawer === "calc" && (
                  <div className="w-full border-t p-3">
                    <CalcBottomPanel
                      teamSlots={slots}
                      format={format}
                      onClose={() => state.setRightDrawer(null)}
                      attackerIdx={calcAttackerIdx}
                      faintedYours={state.faintedYours}
                      setFaintedYours={state.setFaintedYours}
                      faintedTheirs={state.faintedTheirs}
                      setFaintedTheirs={state.setFaintedTheirs}
                    />
                  </div>
                )}
                {state.speedView === "sidepane" && (
                  <div className="w-full border-t p-3">
                    <SpeedTiersPanelConnected
                      team={optimisticTeamPokemon}
                      format={format}
                      toggle={speedToggle}
                      setToggle={setSpeedToggle}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Bottom panel — type matchups (fixed height, no resize) */}
            {state.bottomDrawer === "matchups" && (
              <div
                className="border-border bg-background min-h-0 shrink-0 overflow-auto border-t"
                style={{ maxHeight: "45%" }}
              >
                <HeatmapPanel
                  team={optimisticTeamPokemon}
                  format={format}
                  onClose={() => state.setBottomDrawer(null)}
                />
              </div>
            )}
          </div>

          <DockbarConnected
            onOpen={(key) => {
              if (key === "matchups") {
                state.setBottomDrawer(
                  state.bottomDrawer === "matchups" ? null : "matchups"
                );
              } else if (key === "calc") {
                state.setRightDrawer(
                  state.rightDrawer === "calc" ? null : "calc"
                );
              } else {
                // key === "speed" — open the user's default presentation, or
                // close if speed tiers is already open in either presentation.
                const def = prefs.preferences.speedTiers.defaultView;
                state.setSpeedView(state.speedView ? null : def);
              }
            }}
            sideDrawer={state.speedView !== null ? "speed" : null}
            rightDrawer={state.rightDrawer}
            bottomDrawer={state.bottomDrawer}
            fastest={fastestSpeed}
          />
        </div>

        {/* Import dialog — opened by topbar Import button */}
        <ImportDialog
          team={team}
          open={importOpen}
          onOpenChange={setImportOpen}
          onImportComplete={() => persistence.onMutationSuccess()}
          formatId={format?.id}
        />

        {/* Speed-tiers dialog — shares the lifted toggle so pop-out / collapse
            preserve weather + modifiers + sort across presentations. */}
        <SpeedTiersDialogConnected
          open={state.speedView === "dialog"}
          onOpenChange={(o) => state.setSpeedView(o ? "dialog" : null)}
          team={optimisticTeamPokemon}
          format={format}
          toggle={speedToggle}
          setToggle={setSpeedToggle}
          onCollapseToSidepane={() => state.setSpeedView("sidepane")}
        />

      </CalcStateProvider>
    </TeamLayoutContext.Provider>
  );
}
