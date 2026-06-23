import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { type TeamWithPokemon } from "@trainers/supabase";
import {
  LOCAL_DRAFTS_STORAGE_KEY,
  LEGACY_LOCAL_TEAM_KEY,
  generateLocalDraftId,
  listLocalDrafts,
  getLocalDraft,
  createLocalDraft,
  saveLocalDraftTeam,
  deleteLocalDraft,
} from "../local-drafts-store";
import { type LocalDraftRecord, type LocalDraftStoreV2 } from "../local-drafts-types";
import { type LocalTeamData } from "../types";

// =============================================================================
// localStorage mock (matches use-local-team-storage.test.ts pattern)
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

function makeTeam(overrides: Partial<TeamWithPokemon> = {}): TeamWithPokemon {
  return {
    id: -1,
    name: "Untitled Team",
    format: "gen9championsvgc2026regma",
    format_legal: null,
    description: null,
    notes: null,
    tags: null,
    is_public: null,
    parent_team_id: null,
    created_by: -1,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    team_pokemon: [],
    ...overrides,
  };
}

function writeLegacyV1(payload: LocalTeamData): void {
  localStorageMock.setItem(LEGACY_LOCAL_TEAM_KEY, JSON.stringify(payload));
}

function writeV2Store(store: LocalDraftStoreV2): void {
  localStorageMock.setItem(LOCAL_DRAFTS_STORAGE_KEY, JSON.stringify(store));
}

function readV2Store(): LocalDraftStoreV2 | null {
  const raw = localStorageMock._store[LOCAL_DRAFTS_STORAGE_KEY];
  if (!raw) return null;
  return JSON.parse(raw) as LocalDraftStoreV2;
}

// =============================================================================
// Setup
// =============================================================================

beforeEach(() => {
  localStorageMock.clear();
  jest.clearAllMocks();
});

// =============================================================================
// generateLocalDraftId
// =============================================================================

describe("generateLocalDraftId", () => {
  it("returns a string matching local-{4 chars}", () => {
    const id = generateLocalDraftId();
    expect(id).toMatch(/^local-[0-9a-z]{4}$/);
  });

  it("regenerates on collision with existingIds", () => {
    // Exhaust all possibilities except one by using a spy
    const mathSpy = jest.spyOn(Math, "random");
    // First call collides, second call does not
    mathSpy.mockReturnValueOnce(0.123456789); // produces deterministic suffix
    const firstId = generateLocalDraftId();

    mathSpy.mockReturnValueOnce(0.123456789); // same suffix → collision
    mathSpy.mockReturnValueOnce(0.987654321); // different suffix → ok
    const secondId = generateLocalDraftId([firstId]);

    expect(secondId).not.toBe(firstId);
    expect(secondId).toMatch(/^local-[0-9a-z]{4}$/);
    mathSpy.mockRestore();
  });
});

// =============================================================================
// Migration: legacy v1 → v2
// =============================================================================

describe("migration: legacy v1 → v2", () => {
  it("migrates a valid v1 payload to a single v2 draft on first listLocalDrafts()", () => {
    const team = makeTeam({ name: "Legacy Team" });
    writeLegacyV1({ team, updatedAt: "2025-06-01T00:00:00Z", version: 1 });

    const drafts = listLocalDrafts();

    expect(drafts).toHaveLength(1);
    expect(drafts[0]!.team.name).toBe("Legacy Team");
    expect(drafts[0]!.id).toMatch(/^local-[0-9a-z]{4}$/);
  });

  it("removes the legacy key after migration", () => {
    const team = makeTeam();
    writeLegacyV1({ team, updatedAt: "2025-06-01T00:00:00Z", version: 1 });

    listLocalDrafts();

    expect(localStorageMock._store[LEGACY_LOCAL_TEAM_KEY]).toBeUndefined();
  });

  it("writes the v2 store key after migration", () => {
    const team = makeTeam();
    writeLegacyV1({ team, updatedAt: "2025-06-01T00:00:00Z", version: 1 });

    listLocalDrafts();

    expect(localStorageMock._store[LOCAL_DRAFTS_STORAGE_KEY]).toBeDefined();
  });

  it("does NOT migrate again once the v2 key exists (idempotent)", () => {
    // Set up both keys: v2 already has one draft, legacy has different data
    const existingDraft: LocalDraftRecord = {
      id: "local-ex01",
      team: makeTeam({ name: "Existing Draft" }),
      createdAt: "2025-01-01T00:00:00Z",
      updatedAt: "2025-06-01T00:00:00Z",
    };
    writeV2Store({ version: 2, drafts: [existingDraft] });
    writeLegacyV1({
      team: makeTeam({ name: "Should Not Appear" }),
      updatedAt: "2025-06-01T00:00:00Z",
      version: 1,
    });

    const drafts = listLocalDrafts();

    expect(drafts).toHaveLength(1);
    expect(drafts[0]!.team.name).toBe("Existing Draft");
    // Legacy key should remain untouched (migration never ran)
    expect(localStorageMock._store[LEGACY_LOCAL_TEAM_KEY]).toBeDefined();
  });

  it("skips migration silently when legacy payload is corrupt", () => {
    localStorageMock.setItem(LEGACY_LOCAL_TEAM_KEY, "not-json-{{{");

    const drafts = listLocalDrafts();

    expect(drafts).toHaveLength(0);
    // v2 key should NOT be written (there was nothing to migrate)
    expect(localStorageMock._store[LOCAL_DRAFTS_STORAGE_KEY]).toBeUndefined();
  });

  it("skips migration when legacy key is absent", () => {
    const drafts = listLocalDrafts();
    expect(drafts).toHaveLength(0);
  });

  it("uses legacy updatedAt as the migrated draft updatedAt", () => {
    const team = makeTeam();
    writeLegacyV1({ team, updatedAt: "2025-03-15T12:00:00Z", version: 1 });

    const drafts = listLocalDrafts();

    expect(drafts[0]!.updatedAt).toBe("2025-03-15T12:00:00Z");
  });
});

// =============================================================================
// createLocalDraft
// =============================================================================

describe("createLocalDraft", () => {
  it("creates a draft with default name and format when no init is given", () => {
    const record = createLocalDraft();

    expect(record.id).toMatch(/^local-[0-9a-z]{4}$/);
    expect(record.team.name).toBe("Untitled Team");
    expect(record.team.format).toBe("gen9championsvgc2026regma");
    expect(record.team.team_pokemon).toEqual([]);
  });

  it("applies init.name override", () => {
    const record = createLocalDraft({ name: "My Team" });
    expect(record.team.name).toBe("My Team");
  });

  it("applies init.format override", () => {
    const record = createLocalDraft({ format: "gen9vgc2024regg" });
    expect(record.team.format).toBe("gen9vgc2024regg");
  });

  it("persists the draft to localStorage", () => {
    createLocalDraft({ name: "Persisted" });

    const stored = readV2Store();
    expect(stored?.drafts).toHaveLength(1);
    expect(stored?.drafts[0]!.team.name).toBe("Persisted");
  });

  it("prepends new drafts so the most recently created appears first", () => {
    createLocalDraft({ name: "First" });
    createLocalDraft({ name: "Second" });

    const stored = readV2Store();
    expect(stored?.drafts[0]!.team.name).toBe("Second");
    expect(stored?.drafts[1]!.team.name).toBe("First");
  });

  it("generates unique ids across multiple drafts", () => {
    const a = createLocalDraft();
    const b = createLocalDraft();
    const c = createLocalDraft();

    expect(new Set([a.id, b.id, c.id]).size).toBe(3);
  });
});

// =============================================================================
// listLocalDrafts
// =============================================================================

describe("listLocalDrafts", () => {
  it("returns an empty array when the store is empty", () => {
    expect(listLocalDrafts()).toEqual([]);
  });

  it("returns drafts sorted by updatedAt descending", () => {
    const store: LocalDraftStoreV2 = {
      version: 2,
      drafts: [
        {
          id: "local-aa01",
          team: makeTeam({ name: "Old" }),
          createdAt: "2025-01-01T00:00:00Z",
          updatedAt: "2025-01-01T00:00:00Z",
        },
        {
          id: "local-bb02",
          team: makeTeam({ name: "New" }),
          createdAt: "2025-06-01T00:00:00Z",
          updatedAt: "2025-06-01T00:00:00Z",
        },
        {
          id: "local-cc03",
          team: makeTeam({ name: "Middle" }),
          createdAt: "2025-03-01T00:00:00Z",
          updatedAt: "2025-03-01T00:00:00Z",
        },
      ],
    };
    writeV2Store(store);

    const drafts = listLocalDrafts();

    expect(drafts.map((d) => d.team.name)).toEqual(["New", "Middle", "Old"]);
  });
});

// =============================================================================
// getLocalDraft
// =============================================================================

describe("getLocalDraft", () => {
  it("returns the matching record by id", () => {
    const record = createLocalDraft({ name: "Find Me" });

    const found = getLocalDraft(record.id);

    expect(found).not.toBeNull();
    expect(found!.team.name).toBe("Find Me");
  });

  it("returns null for an unknown id", () => {
    expect(getLocalDraft("local-zzzz")).toBeNull();
  });
});

// =============================================================================
// saveLocalDraftTeam
// =============================================================================

describe("saveLocalDraftTeam", () => {
  it("updates the team for an existing draft", () => {
    const record = createLocalDraft({ name: "Before" });
    const newTeam = makeTeam({ name: "After" });

    saveLocalDraftTeam(record.id, newTeam);

    const found = getLocalDraft(record.id);
    expect(found!.team.name).toBe("After");
  });

  it("bumps updatedAt on save", () => {
    const before = new Date("2025-01-01T00:00:00Z");
    jest.useFakeTimers();
    jest.setSystemTime(before);

    const record = createLocalDraft();
    const originalUpdatedAt = record.updatedAt;

    // Advance time so timestamps differ
    jest.setSystemTime(new Date("2025-06-01T00:00:00Z"));
    saveLocalDraftTeam(record.id, makeTeam({ name: "Updated" }));

    const found = getLocalDraft(record.id);
    expect(found!.updatedAt).not.toBe(originalUpdatedAt);

    jest.useRealTimers();
  });

  it("is a no-op for an unknown id", () => {
    const record = createLocalDraft({ name: "Untouched" });
    const snapshotBefore = JSON.stringify(readV2Store());

    saveLocalDraftTeam("local-zzzz", makeTeam({ name: "Ghost" }));

    // Store should be unchanged
    expect(JSON.stringify(readV2Store())).toBe(snapshotBefore);
    expect(getLocalDraft(record.id)!.team.name).toBe("Untouched");
  });

  it("deduplicates team_pokemon on save (defense-in-depth)", () => {
    const record = createLocalDraft();
    const tp = {
      id: 1,
      pokemon_id: 7,
      team_id: -1,
      position: 0,
      species: "squirtle",
      nickname: null,
      ability: null,
      item: null,
      tera_type: null,
      nature: null,
      ev_hp: 0,
      ev_atk: 0,
      ev_def: 0,
      ev_spa: 0,
      ev_spd: 0,
      ev_spe: 0,
      iv_hp: 31,
      iv_atk: 31,
      iv_def: 31,
      iv_spa: 31,
      iv_spd: 31,
      iv_spe: 31,
      move_1: null,
      move_2: null,
      move_3: null,
      move_4: null,
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
    };
    const teamWithDupes = makeTeam({
      team_pokemon: [tp, { ...tp, id: 2 }], // same pokemon_id twice
    });

    saveLocalDraftTeam(record.id, teamWithDupes);

    const found = getLocalDraft(record.id);
    expect(found!.team.team_pokemon).toHaveLength(1);
  });
});

// =============================================================================
// deleteLocalDraft
// =============================================================================

describe("deleteLocalDraft", () => {
  it("removes an existing draft and returns true", () => {
    const record = createLocalDraft();

    const result = deleteLocalDraft(record.id);

    expect(result).toBe(true);
    expect(getLocalDraft(record.id)).toBeNull();
    expect(readV2Store()?.drafts).toHaveLength(0);
  });

  it("returns false for an unknown id", () => {
    const result = deleteLocalDraft("local-zzzz");
    expect(result).toBe(false);
  });

  it("leaves other drafts intact", () => {
    const a = createLocalDraft({ name: "Keep Me" });
    const b = createLocalDraft({ name: "Delete Me" });

    deleteLocalDraft(b.id);

    expect(getLocalDraft(a.id)).not.toBeNull();
    expect(getLocalDraft(b.id)).toBeNull();
  });
});

// =============================================================================
// Corrupt store recovery
// =============================================================================

describe("corrupt store recovery", () => {
  it("returns empty list when store JSON is malformed", () => {
    localStorageMock.setItem(LOCAL_DRAFTS_STORAGE_KEY, "not-valid-json{{{");

    const drafts = listLocalDrafts();

    expect(drafts).toEqual([]);
  });

  it("removes the corrupt key from localStorage", () => {
    localStorageMock.setItem(LOCAL_DRAFTS_STORAGE_KEY, "not-valid-json{{{");

    listLocalDrafts();

    expect(localStorageMock._store[LOCAL_DRAFTS_STORAGE_KEY]).toBeUndefined();
  });

  it("returns empty list when store has wrong version", () => {
    localStorageMock.setItem(
      LOCAL_DRAFTS_STORAGE_KEY,
      JSON.stringify({ version: 99, drafts: [] })
    );

    const drafts = listLocalDrafts();
    expect(drafts).toEqual([]);
  });

  it("returns empty list when drafts field is not an array", () => {
    localStorageMock.setItem(
      LOCAL_DRAFTS_STORAGE_KEY,
      JSON.stringify({ version: 2, drafts: null })
    );

    const drafts = listLocalDrafts();
    expect(drafts).toEqual([]);
  });
});

// =============================================================================
// SSR guard
// =============================================================================

describe("SSR guard", () => {
  let originalWindow: typeof globalThis;

  beforeEach(() => {
    // Simulate SSR by deleting the window global
    originalWindow = global.window as typeof globalThis;
    // @ts-expect-error -- intentionally removing window to simulate SSR
    delete global.window;
  });

  afterEach(() => {
    global.window = originalWindow;
  });

  it("listLocalDrafts returns [] in SSR context", () => {
    const drafts = listLocalDrafts();
    expect(drafts).toEqual([]);
  });

  it("getLocalDraft returns null in SSR context", () => {
    expect(getLocalDraft("local-ab12")).toBeNull();
  });

  it("createLocalDraft does not throw in SSR context", () => {
    // createLocalDraft will attempt readStore which returns empty on SSR;
    // writeStore will also no-op; the record is still returned
    expect(() => createLocalDraft()).not.toThrow();
  });

  it("saveLocalDraftTeam does not throw in SSR context", () => {
    expect(() => saveLocalDraftTeam("local-ab12", makeTeam())).not.toThrow();
  });

  it("deleteLocalDraft returns false in SSR context", () => {
    expect(deleteLocalDraft("local-ab12")).toBe(false);
  });
});
