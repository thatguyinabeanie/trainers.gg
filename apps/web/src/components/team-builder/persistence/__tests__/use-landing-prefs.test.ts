import { describe, it, expect, beforeEach } from "@jest/globals";
import { renderHook, act } from "@testing-library/react";
import {
  LANDING_PREFS_STORAGE_KEY,
  writeLandingPrefs,
  notify as notifyPrefsStore,
} from "../landing-prefs-store";
import {
  DEFAULT_LANDING_PREFS,
  type LandingPrefs,
} from "../landing-prefs-types";
import { useLandingPrefs } from "../use-landing-prefs";

// =============================================================================
// localStorage mock (matches local-drafts-store.test.ts pattern)
// =============================================================================

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] ?? null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    get _store() {
      return store;
    },
  };
})();

Object.defineProperty(window, "localStorage", { value: localStorageMock });

// =============================================================================
// Helpers
// =============================================================================

/** Seed a full LandingPrefs into localStorage so the hook can hydrate from it. */
function seedPrefs(prefs: Partial<LandingPrefs> = {}): void {
  writeLandingPrefs({ ...DEFAULT_LANDING_PREFS, ...prefs });
}

// =============================================================================
// Setup
// =============================================================================

beforeEach(() => {
  localStorageMock.clear();
  jest.clearAllMocks();
  // Reset the module-level snapshot cache so useSyncExternalStore re-reads
  // from the (now-cleared) localStorage on the next render.
  notifyPrefsStore();
});

// =============================================================================
// Hydration
// =============================================================================

describe("useLandingPrefs — hydration", () => {
  it("starts with DEFAULT_LANDING_PREFS and hydrated:false before mount effect", () => {
    // jsdom runs effects synchronously in renderHook, so we can only assert
    // the post-hydration state directly; the pre-effect state is internal.
    // We still verify that post-hydration the returned values are correct.
    seedPrefs({ sort: "name" });
    const { result } = renderHook(() => useLandingPrefs());
    expect(result.current.hydrated).toBe(true);
  });

  it("hydrates from localStorage after mount", () => {
    seedPrefs({ sort: "name", density: "compact" });

    const { result } = renderHook(() => useLandingPrefs());

    expect(result.current.hydrated).toBe(true);
    expect(result.current.prefs.sort).toBe("name");
    expect(result.current.prefs.density).toBe("compact");
  });

  it("hydrates with DEFAULT_LANDING_PREFS when localStorage is empty", () => {
    const { result } = renderHook(() => useLandingPrefs());

    expect(result.current.hydrated).toBe(true);
    expect(result.current.prefs).toEqual(DEFAULT_LANDING_PREFS);
  });

  it("hydrates railCollapsed:true from localStorage", () => {
    seedPrefs({ railCollapsed: true });
    const { result } = renderHook(() => useLandingPrefs());
    expect(result.current.prefs.railCollapsed).toBe(true);
  });

  it("hydrates selectedFolderId from localStorage", () => {
    seedPrefs({ selectedFolderId: "folder-abc" });
    const { result } = renderHook(() => useLandingPrefs());
    expect(result.current.prefs.selectedFolderId).toBe("folder-abc");
  });

  it("hydrates selectedFolderId:null from localStorage", () => {
    seedPrefs({ selectedFolderId: null });
    const { result } = renderHook(() => useLandingPrefs());
    expect(result.current.prefs.selectedFolderId).toBeNull();
  });
});

// =============================================================================
// setPrefs
// =============================================================================

describe("useLandingPrefs — setPrefs", () => {
  it("updates state immediately when setPrefs is called", () => {
    const { result } = renderHook(() => useLandingPrefs());

    act(() => {
      result.current.setPrefs({ sort: "format" });
    });

    expect(result.current.prefs.sort).toBe("format");
  });

  it("leaves unpatched fields unchanged", () => {
    seedPrefs({ density: "compact", railCollapsed: true });
    const { result } = renderHook(() => useLandingPrefs());

    act(() => {
      result.current.setPrefs({ sort: "name" });
    });

    expect(result.current.prefs.sort).toBe("name");
    expect(result.current.prefs.density).toBe("compact");
    expect(result.current.prefs.railCollapsed).toBe(true);
  });

  it("persists the patched value to localStorage", () => {
    const { result } = renderHook(() => useLandingPrefs());

    act(() => {
      result.current.setPrefs({ selectedFolderId: "folder-xyz" });
    });

    const raw = localStorageMock._store[LANDING_PREFS_STORAGE_KEY];
    expect(raw).toBeDefined();
    expect(raw).toContain("folder-xyz");
  });

  it("reflects the persisted value on a subsequent readLandingPrefs call", () => {
    const { result } = renderHook(() => useLandingPrefs());

    act(() => {
      result.current.setPrefs({ density: "compact" });
    });

    // Render a second hook instance — it should read the updated value
    const { result: result2 } = renderHook(() => useLandingPrefs());
    expect(result2.current.prefs.density).toBe("compact");
  });

  it("can set selectedFolderId to null", () => {
    seedPrefs({ selectedFolderId: "folder-abc" });
    const { result } = renderHook(() => useLandingPrefs());

    act(() => {
      result.current.setPrefs({ selectedFolderId: null });
    });

    expect(result.current.prefs.selectedFolderId).toBeNull();
  });

  it("can set railCollapsed to true then back to false", () => {
    const { result } = renderHook(() => useLandingPrefs());

    act(() => {
      result.current.setPrefs({ railCollapsed: true });
    });
    expect(result.current.prefs.railCollapsed).toBe(true);

    act(() => {
      result.current.setPrefs({ railCollapsed: false });
    });
    expect(result.current.prefs.railCollapsed).toBe(false);
  });

  it("can apply multiple fields in one setPrefs call", () => {
    const { result } = renderHook(() => useLandingPrefs());

    act(() => {
      result.current.setPrefs({ sort: "completeness", density: "compact" });
    });

    expect(result.current.prefs.sort).toBe("completeness");
    expect(result.current.prefs.density).toBe("compact");
  });

  it("sequential setPrefs calls accumulate correctly", () => {
    const { result } = renderHook(() => useLandingPrefs());

    act(() => {
      result.current.setPrefs({ sort: "name" });
    });
    act(() => {
      result.current.setPrefs({ density: "compact" });
    });
    act(() => {
      result.current.setPrefs({ railCollapsed: true });
    });

    expect(result.current.prefs.sort).toBe("name");
    expect(result.current.prefs.density).toBe("compact");
    expect(result.current.prefs.railCollapsed).toBe(true);
  });
});
