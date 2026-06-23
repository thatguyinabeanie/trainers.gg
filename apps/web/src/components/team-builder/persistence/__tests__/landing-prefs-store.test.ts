import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import {
  LANDING_PREFS_STORAGE_KEY,
  readLandingPrefs,
  writeLandingPrefs,
  patchLandingPrefs,
} from "../landing-prefs-store";
import {
  DEFAULT_LANDING_PREFS,
  type LandingPrefs,
} from "../landing-prefs-types";

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

/** Write a raw stored-prefs envelope to localStorage (bypasses the module). */
function writeRaw(value: unknown): void {
  localStorageMock.setItem(
    LANDING_PREFS_STORAGE_KEY,
    JSON.stringify(value)
  );
}

/** Read the raw stored value from localStorage. */
function readRaw(): unknown | null {
  const raw = localStorageMock._store[LANDING_PREFS_STORAGE_KEY];
  if (!raw) return null;
  return JSON.parse(raw) as unknown;
}

// =============================================================================
// Setup
// =============================================================================

beforeEach(() => {
  localStorageMock.clear();
  jest.clearAllMocks();
});

// =============================================================================
// readLandingPrefs — defaults
// =============================================================================

describe("readLandingPrefs — empty store", () => {
  it("returns DEFAULT_LANDING_PREFS when the key is absent", () => {
    const prefs = readLandingPrefs();
    expect(prefs).toEqual(DEFAULT_LANDING_PREFS);
  });

  it("returns a new object (not the same reference as DEFAULT_LANDING_PREFS)", () => {
    const prefs = readLandingPrefs();
    expect(prefs).not.toBe(DEFAULT_LANDING_PREFS);
  });
});

// =============================================================================
// writeLandingPrefs + readLandingPrefs — round-trip
// =============================================================================

describe("round-trip write → read", () => {
  it("persists and restores a full LandingPrefs object", () => {
    const input: LandingPrefs = {
      sort: "name",
      density: "compact",
      railCollapsed: true,
      selectedFolderId: "folder-abc",
    };

    writeLandingPrefs(input);
    const result = readLandingPrefs();

    expect(result).toEqual(input);
  });

  it("stores a versioned envelope in localStorage", () => {
    writeLandingPrefs(DEFAULT_LANDING_PREFS);
    const raw = readRaw() as { version: number; prefs: unknown };

    expect(raw).not.toBeNull();
    expect(raw.version).toBe(1);
    expect(raw.prefs).toBeDefined();
  });

  it.each<[keyof LandingPrefs, LandingPrefs[keyof LandingPrefs]]>([
    ["sort", "format"],
    ["sort", "completeness"],
    ["sort", "custom"],
    ["density", "compact"],
    ["railCollapsed", true],
    ["selectedFolderId", "my-folder"],
    ["selectedFolderId", null],
  ])("round-trips field %s = %j correctly", (field, value) => {
    const input: LandingPrefs = {
      ...DEFAULT_LANDING_PREFS,
      [field]: value,
    };
    writeLandingPrefs(input);
    const result = readLandingPrefs();
    expect(result[field]).toEqual(value);
  });
});

// =============================================================================
// readLandingPrefs — corrupt / malformed store
// =============================================================================

describe("readLandingPrefs — corrupt store recovery", () => {
  it("returns defaults when the stored value is not valid JSON", () => {
    localStorageMock.setItem(LANDING_PREFS_STORAGE_KEY, "not-json-{{{");
    const result = readLandingPrefs();
    expect(result).toEqual(DEFAULT_LANDING_PREFS);
  });

  it("removes the corrupt key from localStorage", () => {
    localStorageMock.setItem(LANDING_PREFS_STORAGE_KEY, "not-json-{{{");
    readLandingPrefs();
    expect(localStorageMock._store[LANDING_PREFS_STORAGE_KEY]).toBeUndefined();
  });

  it("returns defaults when the envelope has the wrong version", () => {
    writeRaw({ version: 99, prefs: { sort: "name" } });
    const result = readLandingPrefs();
    expect(result).toEqual(DEFAULT_LANDING_PREFS);
  });

  it("returns defaults when the envelope prefs field is null", () => {
    writeRaw({ version: 1, prefs: null });
    const result = readLandingPrefs();
    expect(result).toEqual(DEFAULT_LANDING_PREFS);
  });

  it("returns defaults when the stored value is an array (not an object)", () => {
    writeRaw([1, 2, 3]);
    const result = readLandingPrefs();
    expect(result).toEqual(DEFAULT_LANDING_PREFS);
  });
});

// =============================================================================
// readLandingPrefs — missing / extra keys (schema tolerance)
// =============================================================================

describe("readLandingPrefs — partial stored prefs", () => {
  it("fills in missing keys with defaults when only some fields are stored", () => {
    writeRaw({ version: 1, prefs: { sort: "name" } });
    const result = readLandingPrefs();
    expect(result.sort).toBe("name");
    expect(result.density).toBe(DEFAULT_LANDING_PREFS.density);
    expect(result.railCollapsed).toBe(DEFAULT_LANDING_PREFS.railCollapsed);
    expect(result.selectedFolderId).toBe(DEFAULT_LANDING_PREFS.selectedFolderId);
  });

  it("ignores unknown extra keys in the stored prefs", () => {
    writeRaw({
      version: 1,
      prefs: {
        sort: "recent",
        density: "compact",
        railCollapsed: false,
        selectedFolderId: null,
        unknownFutureField: "some-value",
      },
    });
    const result = readLandingPrefs();
    // Known fields are preserved
    expect(result.density).toBe("compact");
    // Unknown keys are not present in the returned object
    expect((result as unknown as Record<string, unknown>)["unknownFutureField"]).toBeUndefined();
  });

  it("handles an empty prefs object by returning all defaults", () => {
    writeRaw({ version: 1, prefs: {} });
    const result = readLandingPrefs();
    expect(result).toEqual(DEFAULT_LANDING_PREFS);
  });
});

// =============================================================================
// patchLandingPrefs
// =============================================================================

describe("patchLandingPrefs", () => {
  it("merges a single-field patch into existing prefs", () => {
    writeLandingPrefs({
      ...DEFAULT_LANDING_PREFS,
      sort: "name",
      density: "compact",
    });

    const result = patchLandingPrefs({ railCollapsed: true });

    expect(result.sort).toBe("name");
    expect(result.density).toBe("compact");
    expect(result.railCollapsed).toBe(true);
  });

  it("returns the merged value", () => {
    writeLandingPrefs(DEFAULT_LANDING_PREFS);
    const result = patchLandingPrefs({ sort: "format" });
    expect(result.sort).toBe("format");
  });

  it("persists the merged value to localStorage", () => {
    writeLandingPrefs(DEFAULT_LANDING_PREFS);
    patchLandingPrefs({ selectedFolderId: "folder-xyz" });
    const persisted = readLandingPrefs();
    expect(persisted.selectedFolderId).toBe("folder-xyz");
  });

  it("can set selectedFolderId back to null", () => {
    writeLandingPrefs({ ...DEFAULT_LANDING_PREFS, selectedFolderId: "folder-abc" });
    patchLandingPrefs({ selectedFolderId: null });
    const persisted = readLandingPrefs();
    expect(persisted.selectedFolderId).toBeNull();
  });

  it("merges multiple fields in a single call", () => {
    writeLandingPrefs(DEFAULT_LANDING_PREFS);
    const result = patchLandingPrefs({ sort: "completeness", density: "compact" });
    expect(result.sort).toBe("completeness");
    expect(result.density).toBe("compact");
  });

  it("uses defaults as the base when the store is empty", () => {
    const result = patchLandingPrefs({ railCollapsed: true });
    expect(result.sort).toBe(DEFAULT_LANDING_PREFS.sort);
    expect(result.density).toBe(DEFAULT_LANDING_PREFS.density);
    expect(result.railCollapsed).toBe(true);
  });
});

// =============================================================================
// SSR guard
// =============================================================================

describe("SSR guard", () => {
  let originalWindow: typeof globalThis;

  beforeEach(() => {
    originalWindow = global.window as typeof globalThis;
    // @ts-expect-error -- intentionally removing window to simulate SSR
    delete global.window;
  });

  afterEach(() => {
    global.window = originalWindow;
  });

  it("readLandingPrefs returns DEFAULT_LANDING_PREFS in SSR context", () => {
    const result = readLandingPrefs();
    expect(result).toEqual(DEFAULT_LANDING_PREFS);
  });

  it("writeLandingPrefs does not throw in SSR context", () => {
    expect(() => writeLandingPrefs(DEFAULT_LANDING_PREFS)).not.toThrow();
  });

  it("patchLandingPrefs does not throw in SSR context", () => {
    expect(() => patchLandingPrefs({ sort: "name" })).not.toThrow();
  });

  it("patchLandingPrefs returns DEFAULT_LANDING_PREFS in SSR context", () => {
    const result = patchLandingPrefs({ sort: "name" });
    // In SSR: readLandingPrefs returns defaults; writeLandingPrefs is a no-op;
    // the merged result is still the defaults merged with the patch.
    expect(result.density).toBe(DEFAULT_LANDING_PREFS.density);
    expect(result.railCollapsed).toBe(DEFAULT_LANDING_PREFS.railCollapsed);
  });
});
