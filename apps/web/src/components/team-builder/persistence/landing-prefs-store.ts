/**
 * landing-prefs-store.ts
 *
 * Pure, SSR-safe module for reading and writing the builder landing
 * UI-preferences from localStorage.
 *
 * Key: `trainersgg.builder.landingPrefs.v1`
 * Versioned: stored value includes a `version: 1` field so future migrations
 * can detect and upgrade stale formats.
 *
 * Corrupt-tolerant: on any parse or shape error the stored value is discarded
 * and the caller receives the defaults. Unknown extra keys in the stored object
 * are silently dropped (merge-over-defaults strategy).
 *
 * SSR-safe: all public functions are no-ops or return defaults when
 * `window` is unavailable.
 */

import { logError } from "@trainers/utils";
import {
  DEFAULT_LANDING_PREFS,
  type LandingPrefs,
} from "./landing-prefs-types";

// =============================================================================
// Subscription / snapshot (useSyncExternalStore support)
// =============================================================================

type Listener = () => void;

/** Module-level subscriber set — shared across all hook instances. */
const listeners = new Set<Listener>();

/**
 * Cached snapshot — null means dirty (needs re-read from localStorage).
 * `getPrefsSnapshot` returns the cached value when clean; sets it when dirty.
 * This guarantees referential stability between notifications so that
 * `useSyncExternalStore` does not infinite-loop.
 */
let cache: LandingPrefs | null = null;

/** Stable server-side snapshot — same object reference every call. */
const SERVER_SNAPSHOT: LandingPrefs = { ...DEFAULT_LANDING_PREFS };

/**
 * Return a referentially stable snapshot of the current landing prefs.
 * Rebuilds from localStorage only when `cache` is null (after a `notify()`).
 */
export function getPrefsSnapshot(): LandingPrefs {
  if (cache === null) cache = readLandingPrefs();
  return cache;
}

/** Server snapshot — always returns the same DEFAULT_LANDING_PREFS reference. */
export function getPrefsServerSnapshot(): LandingPrefs {
  return SERVER_SNAPSHOT;
}

/**
 * Invalidate the cache and notify all subscribers.
 * Called at the end of every write operation so React re-renders consumers.
 * Exported so tests can reset the cache after clearing localStorage.
 */
export function notify(): void {
  cache = null;
  for (const l of listeners) l();
}

/**
 * Subscribe a listener to prefs-store changes.
 * Also listens for cross-tab `storage` events on this store's key.
 * Returns an unsubscribe function (required by `useSyncExternalStore`).
 */
export function subscribePrefs(listener: Listener): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === LANDING_PREFS_STORAGE_KEY || e.key === null) notify();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

// =============================================================================
// Constants
// =============================================================================

/** localStorage key for the v1 landing-preferences store. */
export const LANDING_PREFS_STORAGE_KEY =
  "trainersgg.builder.landingPrefs.v1";

// =============================================================================
// Internal helpers
// =============================================================================

/** Versioned shape used for serialisation (keeps the stored object self-describing). */
interface StoredLandingPrefs {
  version: 1;
  prefs: Partial<LandingPrefs>;
}

/**
 * Determine whether a value looks like a valid `StoredLandingPrefs` envelope.
 * We only validate the shape we care about — extra keys are ignored.
 */
function isStoredPrefs(value: unknown): value is StoredLandingPrefs {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  return obj["version"] === 1 && typeof obj["prefs"] === "object" && obj["prefs"] !== null;
}

/**
 * Merge stored partial prefs over the defaults, tolerating unknown or
 * missing keys. Fields present in `stored` that are not known LandingPrefs
 * keys are silently dropped by only picking the known fields explicitly.
 */
function mergePrefs(stored: Partial<LandingPrefs>): LandingPrefs {
  return {
    sort:
      stored.sort !== undefined ? stored.sort : DEFAULT_LANDING_PREFS.sort,
    density:
      stored.density !== undefined
        ? stored.density
        : DEFAULT_LANDING_PREFS.density,
    railCollapsed:
      stored.railCollapsed !== undefined
        ? stored.railCollapsed
        : DEFAULT_LANDING_PREFS.railCollapsed,
    selectedFolderId:
      stored.selectedFolderId !== undefined
        ? stored.selectedFolderId
        : DEFAULT_LANDING_PREFS.selectedFolderId,
    selectedAltId:
      stored.selectedAltId !== undefined
        ? stored.selectedAltId
        : DEFAULT_LANDING_PREFS.selectedAltId,
  };
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Read landing preferences from localStorage.
 *
 * On first visit (key absent), returns `DEFAULT_LANDING_PREFS`.
 * On corrupt or malformed data, logs the error, removes the bad key,
 * and returns `DEFAULT_LANDING_PREFS`.
 * Stored values are merged over defaults so that missing keys from an older
 * schema version fall back gracefully.
 *
 * SSR-safe: returns `DEFAULT_LANDING_PREFS` when `window` is unavailable.
 *
 * @returns The current `LandingPrefs`, guaranteed non-null and complete.
 */
export function readLandingPrefs(): LandingPrefs {
  if (typeof window === "undefined") return { ...DEFAULT_LANDING_PREFS };

  const raw = localStorage.getItem(LANDING_PREFS_STORAGE_KEY);
  if (!raw) return { ...DEFAULT_LANDING_PREFS };

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isStoredPrefs(parsed)) {
      throw new Error("Malformed landing prefs envelope");
    }
    return mergePrefs(parsed.prefs);
  } catch (error) {
    logError("landingPrefsStore.read", error);
    localStorage.removeItem(LANDING_PREFS_STORAGE_KEY);
    return { ...DEFAULT_LANDING_PREFS };
  }
}

/**
 * Persist a complete `LandingPrefs` object to localStorage.
 *
 * SSR-safe: no-op when `window` is unavailable.
 *
 * @param prefs - The full `LandingPrefs` to persist.
 */
export function writeLandingPrefs(prefs: LandingPrefs): void {
  if (typeof window === "undefined") return;
  const stored: StoredLandingPrefs = { version: 1, prefs };
  try {
    localStorage.setItem(LANDING_PREFS_STORAGE_KEY, JSON.stringify(stored));
    notify();
  } catch (error) {
    logError("landingPrefsStore.write", error);
  }
}

/**
 * Merge a partial update into the current landing preferences, persist the
 * result, and return the merged value.
 *
 * SSR-safe: returns `DEFAULT_LANDING_PREFS` (without persisting) when
 * `window` is unavailable.
 *
 * @param partial - The subset of `LandingPrefs` fields to update.
 * @returns The new merged `LandingPrefs` after the patch is applied.
 */
export function patchLandingPrefs(
  partial: Partial<LandingPrefs>
): LandingPrefs {
  const current = readLandingPrefs();
  const next: LandingPrefs = { ...current, ...partial };
  writeLandingPrefs(next);
  return next;
}
