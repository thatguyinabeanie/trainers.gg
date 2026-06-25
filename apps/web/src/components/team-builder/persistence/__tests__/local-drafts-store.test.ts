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
  setDraftPinned,
  setDraftArchived,
  setDraftSortOrder,
  setDraftFolders,
  toggleDraftFolder,
} from "../local-drafts-store";
import {
  type LocalDraftRecord,
  type LocalDraftStoreV2,
  type LocalDraftStoreV3,
} from "../local-drafts-types";
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

function writeV3Store(store: LocalDraftStoreV3): void {
  localStorageMock.setItem(LOCAL_DRAFTS_STORAGE_KEY, JSON.stringify(store));
}

function readV3Store(): LocalDraftStoreV3 | null {
  const raw = localStorageMock._store[LOCAL_DRAFTS_STORAGE_KEY];
  if (!raw) return null;
  return JSON.parse(raw) as LocalDraftStoreV3;
}

/** Build a minimal v2 draft record (no Milestone-B fields). */
function makeV2Draft(
  overrides: Partial<{ id: string; name: string; createdAt: string; updatedAt: string }> = {}
): LocalDraftStoreV2["drafts"][number] {
  return {
    id: overrides.id ?? "local-ab01",
    team: makeTeam({ name: overrides.name ?? "Draft" }),
    createdAt: overrides.createdAt ?? "2025-01-01T00:00:00Z",
    updatedAt: overrides.updatedAt ?? "2025-06-01T00:00:00Z",
  };
}

/** Build a full v3 draft record with all Milestone-B defaults. */
function makeV3Draft(overrides: Partial<LocalDraftRecord> = {}): LocalDraftRecord {
  return {
    id: "local-cd02",
    team: makeTeam(),
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-06-01T00:00:00Z",
    pinned: false,
    archived: false,
    sortOrder: null,
    folderIds: [],
    ...overrides,
  };
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
// Migration: legacy v1 → v3
// =============================================================================

describe("migration: legacy v1 → v3", () => {
  it("migrates a valid v1 payload to a single v3 draft on first listLocalDrafts()", () => {
    const team = makeTeam({ name: "Legacy Team" });
    writeLegacyV1({ team, updatedAt: "2025-06-01T00:00:00Z", version: 1 });

    const drafts = listLocalDrafts();

    expect(drafts).toHaveLength(1);
    expect(drafts[0]!.team.name).toBe("Legacy Team");
    expect(drafts[0]!.id).toMatch(/^local-[0-9a-z]{4}$/);
  });

  it("adds Milestone-B attribute defaults when migrating from v1", () => {
    const team = makeTeam();
    writeLegacyV1({ team, updatedAt: "2025-06-01T00:00:00Z", version: 1 });

    const drafts = listLocalDrafts();

    expect(drafts[0]!.pinned).toBe(false);
    expect(drafts[0]!.archived).toBe(false);
    expect(drafts[0]!.sortOrder).toBeNull();
    expect(drafts[0]!.folderIds).toEqual([]);
  });

  it("removes the legacy key after migration", () => {
    const team = makeTeam();
    writeLegacyV1({ team, updatedAt: "2025-06-01T00:00:00Z", version: 1 });

    listLocalDrafts();

    expect(localStorageMock._store[LEGACY_LOCAL_TEAM_KEY]).toBeUndefined();
  });

  it("writes the v3 store key after migration", () => {
    const team = makeTeam();
    writeLegacyV1({ team, updatedAt: "2025-06-01T00:00:00Z", version: 1 });

    listLocalDrafts();

    const stored = readV3Store();
    expect(stored?.version).toBe(3);
    expect(stored?.drafts).toHaveLength(1);
  });

  it("does NOT migrate again once the store key exists (idempotent)", () => {
    // Set up v3 with one draft AND legacy v1 with a different draft
    const existingDraft = makeV3Draft({ id: "local-ex01", team: makeTeam({ name: "Existing Draft" }) });
    writeV3Store({ version: 3, drafts: [existingDraft] });
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
    // v3 key should NOT be written (there was nothing to migrate)
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
// Migration: v2 → v3
// =============================================================================

describe("migration: v2 → v3", () => {
  it("upgrades a v2 store to v3 on first read", () => {
    writeV2Store({
      version: 2,
      drafts: [makeV2Draft({ id: "local-aa01", name: "Old Draft" })],
    });

    const drafts = listLocalDrafts();

    expect(drafts).toHaveLength(1);
    expect(drafts[0]!.team.name).toBe("Old Draft");
  });

  it("writes version: 3 after upgrading from v2", () => {
    writeV2Store({ version: 2, drafts: [makeV2Draft()] });

    listLocalDrafts();

    const stored = readV3Store();
    expect(stored?.version).toBe(3);
  });

  it("defaults pinned to false for each v2 draft", () => {
    writeV2Store({ version: 2, drafts: [makeV2Draft()] });

    const drafts = listLocalDrafts();

    expect(drafts[0]!.pinned).toBe(false);
  });

  it("defaults archived to false for each v2 draft", () => {
    writeV2Store({ version: 2, drafts: [makeV2Draft()] });

    const drafts = listLocalDrafts();

    expect(drafts[0]!.archived).toBe(false);
  });

  it("defaults sortOrder to null for each v2 draft", () => {
    writeV2Store({ version: 2, drafts: [makeV2Draft()] });

    const drafts = listLocalDrafts();

    expect(drafts[0]!.sortOrder).toBeNull();
  });

  it("defaults folderIds to [] for each v2 draft", () => {
    writeV2Store({ version: 2, drafts: [makeV2Draft()] });

    const drafts = listLocalDrafts();

    expect(drafts[0]!.folderIds).toEqual([]);
  });

  it("migrates all drafts in a v2 store with multiple entries", () => {
    writeV2Store({
      version: 2,
      drafts: [
        makeV2Draft({ id: "local-aa01", name: "Draft A" }),
        makeV2Draft({ id: "local-bb02", name: "Draft B" }),
      ],
    });

    const drafts = listLocalDrafts();

    expect(drafts).toHaveLength(2);
    for (const draft of drafts) {
      expect(draft.pinned).toBe(false);
      expect(draft.archived).toBe(false);
      expect(draft.sortOrder).toBeNull();
      expect(draft.folderIds).toEqual([]);
    }
  });

  it("is idempotent — reading a v3 store again does not re-migrate or corrupt it", () => {
    const existing = makeV3Draft({ pinned: true, folderIds: ["folder-1"] });
    writeV3Store({ version: 3, drafts: [existing] });

    const first = listLocalDrafts();
    const second = listLocalDrafts();

    expect(first[0]!.pinned).toBe(true);
    expect(first[0]!.folderIds).toEqual(["folder-1"]);
    expect(second[0]!.pinned).toBe(true);
    expect(second[0]!.folderIds).toEqual(["folder-1"]);
  });
});

// =============================================================================
// createLocalDraft — v3 defaults
// =============================================================================

describe("createLocalDraft", () => {
  it("creates a draft with default name and format when no init is given", () => {
    const record = createLocalDraft();

    expect(record.id).toMatch(/^local-[0-9a-z]{4}$/);
    expect(record.team.name).toBe("Untitled Team");
    expect(record.team.format).toBe("gen9championsvgc2026regma");
    expect(record.team.team_pokemon).toEqual([]);
  });

  it("sets pinned to false on new drafts", () => {
    const record = createLocalDraft();
    expect(record.pinned).toBe(false);
  });

  it("sets archived to false on new drafts", () => {
    const record = createLocalDraft();
    expect(record.archived).toBe(false);
  });

  it("sets sortOrder to null on new drafts", () => {
    const record = createLocalDraft();
    expect(record.sortOrder).toBeNull();
  });

  it("sets folderIds to [] on new drafts", () => {
    const record = createLocalDraft();
    expect(record.folderIds).toEqual([]);
  });

  it("applies init.name override", () => {
    const record = createLocalDraft({ name: "My Team" });
    expect(record.team.name).toBe("My Team");
  });

  it("applies init.format override", () => {
    const record = createLocalDraft({ format: "gen9vgc2024regg" });
    expect(record.team.format).toBe("gen9vgc2024regg");
  });

  it("persists the draft to localStorage with version: 3", () => {
    createLocalDraft({ name: "Persisted" });

    const stored = readV3Store();
    expect(stored?.version).toBe(3);
    expect(stored?.drafts).toHaveLength(1);
    expect(stored?.drafts[0]!.team.name).toBe("Persisted");
  });

  it("prepends new drafts so the most recently created appears first", () => {
    createLocalDraft({ name: "First" });
    createLocalDraft({ name: "Second" });

    const stored = readV3Store();
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
    writeV3Store({
      version: 3,
      drafts: [
        makeV3Draft({
          id: "local-aa01",
          team: makeTeam({ name: "Old" }),
          updatedAt: "2025-01-01T00:00:00Z",
        }),
        makeV3Draft({
          id: "local-bb02",
          team: makeTeam({ name: "New" }),
          updatedAt: "2025-06-01T00:00:00Z",
        }),
        makeV3Draft({
          id: "local-cc03",
          team: makeTeam({ name: "Middle" }),
          updatedAt: "2025-03-01T00:00:00Z",
        }),
      ],
    });

    const drafts = listLocalDrafts();

    expect(drafts.map((d) => d.team.name)).toEqual(["New", "Middle", "Old"]);
  });

  it("includes archived drafts in the returned list (filtering is UI responsibility)", () => {
    writeV3Store({
      version: 3,
      drafts: [
        makeV3Draft({ id: "local-aa01", archived: false }),
        makeV3Draft({ id: "local-bb02", archived: true }),
      ],
    });

    const drafts = listLocalDrafts();

    expect(drafts).toHaveLength(2);
    expect(drafts.some((d) => d.archived)).toBe(true);
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
// saveLocalDraftTeam — preserves Milestone-B attributes
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

  it("preserves pinned flag after saving team", () => {
    const record = createLocalDraft();
    setDraftPinned(record.id, true);

    saveLocalDraftTeam(record.id, makeTeam({ name: "New Team" }));

    const found = getLocalDraft(record.id);
    expect(found!.pinned).toBe(true);
  });

  it("preserves archived flag after saving team", () => {
    const record = createLocalDraft();
    setDraftArchived(record.id, true);

    saveLocalDraftTeam(record.id, makeTeam({ name: "New Team" }));

    const found = getLocalDraft(record.id);
    expect(found!.archived).toBe(true);
  });

  it("preserves sortOrder after saving team", () => {
    const record = createLocalDraft();
    setDraftSortOrder(record.id, 5);

    saveLocalDraftTeam(record.id, makeTeam({ name: "New Team" }));

    const found = getLocalDraft(record.id);
    expect(found!.sortOrder).toBe(5);
  });

  it("preserves folderIds after saving team", () => {
    const record = createLocalDraft();
    setDraftFolders(record.id, ["folder-a", "folder-b"]);

    saveLocalDraftTeam(record.id, makeTeam({ name: "New Team" }));

    const found = getLocalDraft(record.id);
    expect(found!.folderIds).toEqual(["folder-a", "folder-b"]);
  });

  it("is a no-op for an unknown id", () => {
    const record = createLocalDraft({ name: "Untouched" });
    const snapshotBefore = JSON.stringify(readV3Store());

    saveLocalDraftTeam("local-zzzz", makeTeam({ name: "Ghost" }));

    // Store should be unchanged
    expect(JSON.stringify(readV3Store())).toBe(snapshotBefore);
    expect(getLocalDraft(record.id)!.team.name).toBe("Untouched");
  });

  it("deduplicates team_pokemon on save (defense-in-depth)", () => {
    const record = createLocalDraft();
    const tp: TeamWithPokemon["team_pokemon"][number] = {
      id: 1,
      pokemon_id: 7,
      team_position: 0,
      pokemon: {
        id: 7,
        species: "squirtle",
        ability: "",
        move1: "",
        move2: null,
        move3: null,
        move4: null,
        nature: "Serious",
        nickname: null,
        notes: null,
        held_item: null,
        tera_type: null,
        gender: null,
        is_shiny: false,
        level: 50,
        format_legal: null,
        created_at: "2025-01-01T00:00:00Z",
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
      },
    };
    const teamWithDupes = makeTeam({
      team_pokemon: [tp, { ...tp, id: 2 }], // same pokemon_id twice, different entry id
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
    expect(readV3Store()?.drafts).toHaveLength(0);
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
// setDraftPinned
// =============================================================================

describe("setDraftPinned", () => {
  it("sets pinned to true", () => {
    const record = createLocalDraft();

    setDraftPinned(record.id, true);

    expect(getLocalDraft(record.id)!.pinned).toBe(true);
  });

  it("sets pinned to false (unpin)", () => {
    const draft = makeV3Draft({ pinned: true });
    writeV3Store({ version: 3, drafts: [draft] });

    setDraftPinned(draft.id, false);

    expect(getLocalDraft(draft.id)!.pinned).toBe(false);
  });

  it("is a no-op for an unknown id", () => {
    createLocalDraft();
    const snapshotBefore = JSON.stringify(readV3Store());

    setDraftPinned("local-zzzz", true);

    expect(JSON.stringify(readV3Store())).toBe(snapshotBefore);
  });

  it("does not affect other fields when setting pinned", () => {
    const draft = makeV3Draft({
      archived: true,
      sortOrder: 3,
      folderIds: ["f1"],
    });
    writeV3Store({ version: 3, drafts: [draft] });

    setDraftPinned(draft.id, true);

    const found = getLocalDraft(draft.id)!;
    expect(found.archived).toBe(true);
    expect(found.sortOrder).toBe(3);
    expect(found.folderIds).toEqual(["f1"]);
  });
});

// =============================================================================
// setDraftArchived
// =============================================================================

describe("setDraftArchived", () => {
  it("sets archived to true", () => {
    const record = createLocalDraft();

    setDraftArchived(record.id, true);

    expect(getLocalDraft(record.id)!.archived).toBe(true);
  });

  it("sets archived to false (unarchive)", () => {
    const draft = makeV3Draft({ archived: true });
    writeV3Store({ version: 3, drafts: [draft] });

    setDraftArchived(draft.id, false);

    expect(getLocalDraft(draft.id)!.archived).toBe(false);
  });

  it("is a no-op for an unknown id", () => {
    createLocalDraft();
    const snapshotBefore = JSON.stringify(readV3Store());

    setDraftArchived("local-zzzz", true);

    expect(JSON.stringify(readV3Store())).toBe(snapshotBefore);
  });

  it("does not affect other fields when setting archived", () => {
    const draft = makeV3Draft({
      pinned: true,
      sortOrder: 7,
      folderIds: ["f2"],
    });
    writeV3Store({ version: 3, drafts: [draft] });

    setDraftArchived(draft.id, true);

    const found = getLocalDraft(draft.id)!;
    expect(found.pinned).toBe(true);
    expect(found.sortOrder).toBe(7);
    expect(found.folderIds).toEqual(["f2"]);
  });
});

// =============================================================================
// setDraftSortOrder
// =============================================================================

describe("setDraftSortOrder", () => {
  it("sets a numeric sort order", () => {
    const record = createLocalDraft();

    setDraftSortOrder(record.id, 10);

    expect(getLocalDraft(record.id)!.sortOrder).toBe(10);
  });

  it("resets sort order to null", () => {
    const draft = makeV3Draft({ sortOrder: 5 });
    writeV3Store({ version: 3, drafts: [draft] });

    setDraftSortOrder(draft.id, null);

    expect(getLocalDraft(draft.id)!.sortOrder).toBeNull();
  });

  it("is a no-op for an unknown id", () => {
    createLocalDraft();
    const snapshotBefore = JSON.stringify(readV3Store());

    setDraftSortOrder("local-zzzz", 99);

    expect(JSON.stringify(readV3Store())).toBe(snapshotBefore);
  });

  it("does not affect other fields when setting sortOrder", () => {
    const draft = makeV3Draft({
      pinned: true,
      archived: true,
      folderIds: ["f3"],
    });
    writeV3Store({ version: 3, drafts: [draft] });

    setDraftSortOrder(draft.id, 2);

    const found = getLocalDraft(draft.id)!;
    expect(found.pinned).toBe(true);
    expect(found.archived).toBe(true);
    expect(found.folderIds).toEqual(["f3"]);
  });
});

// =============================================================================
// setDraftFolders
// =============================================================================

describe("setDraftFolders", () => {
  it("sets the folderIds array", () => {
    const record = createLocalDraft();

    setDraftFolders(record.id, ["folder-x", "folder-y"]);

    expect(getLocalDraft(record.id)!.folderIds).toEqual(["folder-x", "folder-y"]);
  });

  it("replaces the existing folderIds entirely", () => {
    const draft = makeV3Draft({ folderIds: ["old-folder"] });
    writeV3Store({ version: 3, drafts: [draft] });

    setDraftFolders(draft.id, ["new-folder"]);

    expect(getLocalDraft(draft.id)!.folderIds).toEqual(["new-folder"]);
  });

  it("clears folderIds when given an empty array", () => {
    const draft = makeV3Draft({ folderIds: ["folder-a"] });
    writeV3Store({ version: 3, drafts: [draft] });

    setDraftFolders(draft.id, []);

    expect(getLocalDraft(draft.id)!.folderIds).toEqual([]);
  });

  it("is a no-op for an unknown id", () => {
    createLocalDraft();
    const snapshotBefore = JSON.stringify(readV3Store());

    setDraftFolders("local-zzzz", ["some-folder"]);

    expect(JSON.stringify(readV3Store())).toBe(snapshotBefore);
  });
});

// =============================================================================
// toggleDraftFolder
// =============================================================================

describe("toggleDraftFolder", () => {
  it("adds a folder id when not already a member", () => {
    const record = createLocalDraft();

    toggleDraftFolder(record.id, "folder-new");

    expect(getLocalDraft(record.id)!.folderIds).toContain("folder-new");
  });

  it("removes a folder id when already a member", () => {
    const draft = makeV3Draft({ folderIds: ["folder-a", "folder-b"] });
    writeV3Store({ version: 3, drafts: [draft] });

    toggleDraftFolder(draft.id, "folder-a");

    expect(getLocalDraft(draft.id)!.folderIds).toEqual(["folder-b"]);
  });

  it("adds without affecting other folder memberships", () => {
    const draft = makeV3Draft({ folderIds: ["folder-existing"] });
    writeV3Store({ version: 3, drafts: [draft] });

    toggleDraftFolder(draft.id, "folder-new");

    expect(getLocalDraft(draft.id)!.folderIds).toEqual(["folder-existing", "folder-new"]);
  });

  it("removes only the targeted folder id and leaves others", () => {
    const draft = makeV3Draft({ folderIds: ["folder-a", "folder-b", "folder-c"] });
    writeV3Store({ version: 3, drafts: [draft] });

    toggleDraftFolder(draft.id, "folder-b");

    expect(getLocalDraft(draft.id)!.folderIds).toEqual(["folder-a", "folder-c"]);
  });

  it("is a no-op for an unknown draft id", () => {
    createLocalDraft();
    const snapshotBefore = JSON.stringify(readV3Store());

    toggleDraftFolder("local-zzzz", "folder-x");

    expect(JSON.stringify(readV3Store())).toBe(snapshotBefore);
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

  it("returns empty list when store has unknown version (> 3)", () => {
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
      JSON.stringify({ version: 3, drafts: null })
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
    expect(() => createLocalDraft()).not.toThrow();
  });

  it("saveLocalDraftTeam does not throw in SSR context", () => {
    expect(() => saveLocalDraftTeam("local-ab12", makeTeam())).not.toThrow();
  });

  it("deleteLocalDraft returns false in SSR context", () => {
    expect(deleteLocalDraft("local-ab12")).toBe(false);
  });

  it("setDraftPinned does not throw in SSR context", () => {
    expect(() => setDraftPinned("local-ab12", true)).not.toThrow();
  });

  it("setDraftArchived does not throw in SSR context", () => {
    expect(() => setDraftArchived("local-ab12", true)).not.toThrow();
  });

  it("setDraftSortOrder does not throw in SSR context", () => {
    expect(() => setDraftSortOrder("local-ab12", 1)).not.toThrow();
  });

  it("setDraftFolders does not throw in SSR context", () => {
    expect(() => setDraftFolders("local-ab12", ["f"])).not.toThrow();
  });

  it("toggleDraftFolder does not throw in SSR context", () => {
    expect(() => toggleDraftFolder("local-ab12", "f")).not.toThrow();
  });
});
