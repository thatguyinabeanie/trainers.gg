import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import {
  LOCAL_FOLDERS_STORAGE_KEY,
  SEEDED_SMART_FOLDERS,
  SEEDED_FOLDER_IDS,
  generateManualFolderId,
  generateSmartFolderId,
  listManualFolders,
  createManualFolder,
  renameManualFolder,
  deleteManualFolder,
  listSmartFolders,
  createSmartFolder,
  renameSmartFolder,
  deleteSmartFolder,
} from "../local-folders-store";
import { type LocalFoldersStoreV1 } from "../local-folders-types";

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

function writeStore(store: LocalFoldersStoreV1): void {
  localStorageMock.setItem(LOCAL_FOLDERS_STORAGE_KEY, JSON.stringify(store));
}

function readStore(): LocalFoldersStoreV1 | null {
  const raw = localStorageMock._store[LOCAL_FOLDERS_STORAGE_KEY];
  if (!raw) return null;
  return JSON.parse(raw) as LocalFoldersStoreV1;
}

// =============================================================================
// Setup
// =============================================================================

beforeEach(() => {
  localStorageMock.clear();
  jest.clearAllMocks();
});

// =============================================================================
// SEEDED_SMART_FOLDERS constant
// =============================================================================

describe("SEEDED_SMART_FOLDERS", () => {
  it("contains exactly 3 entries", () => {
    expect(SEEDED_SMART_FOLDERS).toHaveLength(3);
  });

  it("Incomplete folder has expected id and flag criteria", () => {
    const folder = SEEDED_SMART_FOLDERS.find(
      (f) => f.id === SEEDED_FOLDER_IDS.INCOMPLETE
    );
    expect(folder).toBeDefined();
    expect(folder!.name).toBe("Incomplete");
    expect(folder!.isSeeded).toBe(true);
    expect(folder!.criteria).toEqual([{ kind: "flag", flag: "incomplete" }]);
  });

  it("Illegal folder has expected id and flag criteria", () => {
    const folder = SEEDED_SMART_FOLDERS.find(
      (f) => f.id === SEEDED_FOLDER_IDS.ILLEGAL
    );
    expect(folder).toBeDefined();
    expect(folder!.name).toBe("Illegal");
    expect(folder!.isSeeded).toBe(true);
    expect(folder!.criteria).toEqual([{ kind: "flag", flag: "illegal" }]);
  });

  it("Recently edited folder has expected id and updated_within criteria", () => {
    const folder = SEEDED_SMART_FOLDERS.find(
      (f) => f.id === SEEDED_FOLDER_IDS.RECENTLY_EDITED
    );
    expect(folder).toBeDefined();
    expect(folder!.name).toBe("Recently edited");
    expect(folder!.isSeeded).toBe(true);
    expect(folder!.criteria).toEqual([{ kind: "updated_within", days: 7 }]);
  });

  it("all seeded folders have isSeeded:true", () => {
    expect(SEEDED_SMART_FOLDERS.every((f) => f.isSeeded)).toBe(true);
  });
});

// =============================================================================
// generateManualFolderId
// =============================================================================

describe("generateManualFolderId", () => {
  it("returns a string matching folder-{4 chars}", () => {
    const id = generateManualFolderId();
    expect(id).toMatch(/^folder-[0-9a-z]{4}$/);
  });

  it("regenerates on collision with existingIds", () => {
    const mathSpy = jest.spyOn(Math, "random");
    mathSpy.mockReturnValueOnce(0.123456789);
    const firstId = generateManualFolderId();

    mathSpy.mockReturnValueOnce(0.123456789); // collision
    mathSpy.mockReturnValueOnce(0.987654321); // unique
    const secondId = generateManualFolderId([firstId]);

    expect(secondId).not.toBe(firstId);
    expect(secondId).toMatch(/^folder-[0-9a-z]{4}$/);
    mathSpy.mockRestore();
  });
});

// =============================================================================
// generateSmartFolderId
// =============================================================================

describe("generateSmartFolderId", () => {
  it("returns a string matching smart-{4 chars}", () => {
    const id = generateSmartFolderId();
    expect(id).toMatch(/^smart-[0-9a-z]{4}$/);
  });

  it("regenerates on collision with existingIds", () => {
    const mathSpy = jest.spyOn(Math, "random");
    mathSpy.mockReturnValueOnce(0.123456789);
    const firstId = generateSmartFolderId();

    mathSpy.mockReturnValueOnce(0.123456789); // collision
    mathSpy.mockReturnValueOnce(0.987654321); // unique
    const secondId = generateSmartFolderId([firstId]);

    expect(secondId).not.toBe(firstId);
    expect(secondId).toMatch(/^smart-[0-9a-z]{4}$/);
    mathSpy.mockRestore();
  });
});

// =============================================================================
// listManualFolders
// =============================================================================

describe("listManualFolders", () => {
  it("returns an empty array when the store is empty", () => {
    expect(listManualFolders()).toEqual([]);
  });

  it("returns manual folders in insertion order", () => {
    const store: LocalFoldersStoreV1 = {
      version: 1,
      manual: [
        { id: "folder-aa01", name: "Alpha", createdAt: "2025-01-01T00:00:00Z" },
        { id: "folder-bb02", name: "Beta", createdAt: "2025-01-02T00:00:00Z" },
      ],
      smart: [],
    };
    writeStore(store);

    const folders = listManualFolders();
    expect(folders.map((f) => f.name)).toEqual(["Alpha", "Beta"]);
  });
});

// =============================================================================
// createManualFolder
// =============================================================================

describe("createManualFolder", () => {
  it("creates a folder with the given name", () => {
    const folder = createManualFolder("My Folder");
    expect(folder.name).toBe("My Folder");
  });

  it("assigns a folder-{4} id", () => {
    const folder = createManualFolder("Test");
    expect(folder.id).toMatch(/^folder-[0-9a-z]{4}$/);
  });

  it("sets createdAt to an ISO timestamp", () => {
    const folder = createManualFolder("TS Test");
    expect(folder.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("persists the folder to localStorage", () => {
    createManualFolder("Persisted");
    const stored = readStore();
    expect(stored?.manual).toHaveLength(1);
    expect(stored?.manual[0]!.name).toBe("Persisted");
  });

  it("appends successive folders (insertion order preserved)", () => {
    createManualFolder("First");
    createManualFolder("Second");
    const stored = readStore();
    expect(stored?.manual.map((f) => f.name)).toEqual(["First", "Second"]);
  });

  it("generates unique ids across multiple creates", () => {
    const a = createManualFolder("A");
    const b = createManualFolder("B");
    const c = createManualFolder("C");
    expect(new Set([a.id, b.id, c.id]).size).toBe(3);
  });
});

// =============================================================================
// renameManualFolder
// =============================================================================

describe("renameManualFolder", () => {
  it("renames an existing folder", () => {
    const folder = createManualFolder("Old Name");
    renameManualFolder(folder.id, "New Name");
    const folders = listManualFolders();
    expect(folders.find((f) => f.id === folder.id)!.name).toBe("New Name");
  });

  it("is a no-op for an unknown id (store unchanged)", () => {
    createManualFolder("Safe");
    const snapshotBefore = JSON.stringify(readStore());
    renameManualFolder("folder-zzzz", "Ghost");
    expect(JSON.stringify(readStore())).toBe(snapshotBefore);
  });

  it("persists the renamed value to localStorage", () => {
    const folder = createManualFolder("Before");
    renameManualFolder(folder.id, "After");
    const stored = readStore();
    expect(stored?.manual[0]!.name).toBe("After");
  });
});

// =============================================================================
// deleteManualFolder
// =============================================================================

describe("deleteManualFolder", () => {
  it("removes an existing folder", () => {
    const folder = createManualFolder("Delete Me");
    deleteManualFolder(folder.id);
    expect(listManualFolders().find((f) => f.id === folder.id)).toBeUndefined();
  });

  it("is a no-op for an unknown id (store unchanged)", () => {
    createManualFolder("Safe");
    const snapshotBefore = JSON.stringify(readStore());
    deleteManualFolder("folder-zzzz");
    expect(JSON.stringify(readStore())).toBe(snapshotBefore);
  });

  it("leaves other folders intact", () => {
    const a = createManualFolder("Keep");
    const b = createManualFolder("Delete");
    deleteManualFolder(b.id);
    const folders = listManualFolders();
    expect(folders.find((f) => f.id === a.id)).toBeDefined();
    expect(folders.find((f) => f.id === b.id)).toBeUndefined();
  });
});

// =============================================================================
// listSmartFolders
// =============================================================================

describe("listSmartFolders", () => {
  it("always includes all 3 seeded smart folders", () => {
    const folders = listSmartFolders();
    const seededIds = SEEDED_SMART_FOLDERS.map((f) => f.id);
    for (const id of seededIds) {
      expect(folders.find((f) => f.id === id)).toBeDefined();
    }
  });

  it("returns seeded folders first, user-created after", () => {
    createSmartFolder("My Query", [{ kind: "text", value: "tyranitar" }]);
    const folders = listSmartFolders();
    const seededCount = SEEDED_SMART_FOLDERS.length;
    // First N entries should be seeded
    for (let i = 0; i < seededCount; i++) {
      expect(folders[i]!.isSeeded).toBe(true);
    }
    // Entry after seeded should be user-created
    expect(folders[seededCount]!.name).toBe("My Query");
  });

  it("returns only seeded folders when no user folders exist", () => {
    const folders = listSmartFolders();
    expect(folders).toHaveLength(SEEDED_SMART_FOLDERS.length);
  });
});

// =============================================================================
// createSmartFolder
// =============================================================================

describe("createSmartFolder", () => {
  it("creates a smart folder with the given name and criteria", () => {
    const criteria = [{ kind: "flag" as const, flag: "incomplete" as const }];
    const folder = createSmartFolder("My Smart", criteria);
    expect(folder.name).toBe("My Smart");
    expect(folder.criteria).toEqual(criteria);
  });

  it("sets isSeeded:false on user-created folders", () => {
    const folder = createSmartFolder("User", []);
    expect(folder.isSeeded).toBe(false);
  });

  it("assigns a smart-{4} id", () => {
    const folder = createSmartFolder("Test", []);
    expect(folder.id).toMatch(/^smart-[0-9a-z]{4}$/);
  });

  it("persists the folder to localStorage", () => {
    createSmartFolder("Persisted", [{ kind: "text", value: "pikachu" }]);
    const stored = readStore();
    expect(stored?.smart).toHaveLength(1);
    expect(stored?.smart[0]!.name).toBe("Persisted");
  });

  it("appends successive smart folders in insertion order", () => {
    createSmartFolder("First", []);
    createSmartFolder("Second", []);
    const stored = readStore();
    expect(stored?.smart.map((f) => f.name)).toEqual(["First", "Second"]);
  });

  it("generates unique ids (no collision with seeded ids)", () => {
    const folder = createSmartFolder("New", []);
    const seededIds = SEEDED_SMART_FOLDERS.map((f) => f.id);
    expect(seededIds.includes(folder.id)).toBe(false);
  });
});

// =============================================================================
// renameSmartFolder
// =============================================================================

describe("renameSmartFolder", () => {
  it("renames an existing user smart folder", () => {
    const folder = createSmartFolder("Old Name", []);
    renameSmartFolder(folder.id, "New Name");
    const folders = listSmartFolders();
    expect(folders.find((f) => f.id === folder.id)!.name).toBe("New Name");
  });

  it("is a no-op for seeded folder ids (store unchanged)", () => {
    const snapshotBefore = JSON.stringify(readStore());
    renameSmartFolder(SEEDED_FOLDER_IDS.INCOMPLETE, "Renamed Seeded");
    expect(JSON.stringify(readStore())).toBe(snapshotBefore);
  });

  it("is a no-op for an unknown id (store unchanged)", () => {
    createSmartFolder("Safe", []);
    const snapshotBefore = JSON.stringify(readStore());
    renameSmartFolder("smart-zzzz", "Ghost");
    expect(JSON.stringify(readStore())).toBe(snapshotBefore);
  });

  it("persists the renamed value to localStorage", () => {
    const folder = createSmartFolder("Before", []);
    renameSmartFolder(folder.id, "After");
    const stored = readStore();
    expect(stored?.smart[0]!.name).toBe("After");
  });
});

// =============================================================================
// deleteSmartFolder
// =============================================================================

describe("deleteSmartFolder", () => {
  it("removes an existing user smart folder", () => {
    const folder = createSmartFolder("Delete Me", []);
    deleteSmartFolder(folder.id);
    const folders = listSmartFolders();
    expect(folders.find((f) => f.id === folder.id)).toBeUndefined();
  });

  it("is a no-op for seeded folder ids (seeded remain in listSmartFolders)", () => {
    deleteSmartFolder(SEEDED_FOLDER_IDS.INCOMPLETE);
    const folders = listSmartFolders();
    expect(folders.find((f) => f.id === SEEDED_FOLDER_IDS.INCOMPLETE)).toBeDefined();
  });

  it("does not write anything to localStorage when deleting a seeded id", () => {
    jest.clearAllMocks();
    deleteSmartFolder(SEEDED_FOLDER_IDS.ILLEGAL);
    // No setItem call should have been made (no-op)
    expect(localStorageMock.setItem).not.toHaveBeenCalled();
  });

  it("is a no-op for an unknown id (store unchanged)", () => {
    createSmartFolder("Safe", []);
    const snapshotBefore = JSON.stringify(readStore());
    deleteSmartFolder("smart-zzzz");
    expect(JSON.stringify(readStore())).toBe(snapshotBefore);
  });

  it("leaves other user smart folders intact", () => {
    const a = createSmartFolder("Keep", []);
    const b = createSmartFolder("Delete", []);
    deleteSmartFolder(b.id);
    const folders = listSmartFolders();
    expect(folders.find((f) => f.id === a.id)).toBeDefined();
    expect(folders.find((f) => f.id === b.id)).toBeUndefined();
  });
});

// =============================================================================
// Persistence round-trip
// =============================================================================

describe("persistence round-trip", () => {
  it("manual folder survives a read after being written", () => {
    const folder = createManualFolder("Durable");
    // Clear module-level cache by reading fresh from localStorage
    const folders = listManualFolders();
    expect(folders.find((f) => f.id === folder.id)).toBeDefined();
  });

  it("user smart folder survives a read after being written", () => {
    const criteria = [{ kind: "updated_within" as const, days: 3 }];
    const folder = createSmartFolder("Durable Smart", criteria);
    const folders = listSmartFolders();
    const found = folders.find((f) => f.id === folder.id);
    expect(found).toBeDefined();
    expect(found!.criteria).toEqual(criteria);
  });

  it("both manual and smart folders coexist in the same store", () => {
    createManualFolder("Manual");
    createSmartFolder("Smart", []);
    const stored = readStore();
    expect(stored?.manual).toHaveLength(1);
    expect(stored?.smart).toHaveLength(1);
  });
});

// =============================================================================
// Corrupt store recovery
// =============================================================================

describe("corrupt store recovery", () => {
  it("listManualFolders returns [] when store JSON is malformed", () => {
    localStorageMock.setItem(LOCAL_FOLDERS_STORAGE_KEY, "not-valid-json{{{");
    expect(listManualFolders()).toEqual([]);
  });

  it("removes the corrupt key from localStorage on read", () => {
    localStorageMock.setItem(LOCAL_FOLDERS_STORAGE_KEY, "not-valid-json{{{");
    listManualFolders();
    expect(localStorageMock._store[LOCAL_FOLDERS_STORAGE_KEY]).toBeUndefined();
  });

  it("listSmartFolders still returns seeded folders when store is corrupt", () => {
    localStorageMock.setItem(LOCAL_FOLDERS_STORAGE_KEY, "not-valid-json{{{");
    const folders = listSmartFolders();
    // Should still return all seeded folders even though localStorage is corrupt
    expect(folders).toHaveLength(SEEDED_SMART_FOLDERS.length);
  });

  it("returns empty lists when store has wrong version", () => {
    localStorageMock.setItem(
      LOCAL_FOLDERS_STORAGE_KEY,
      JSON.stringify({ version: 99, manual: [], smart: [] })
    );
    expect(listManualFolders()).toEqual([]);
  });

  it("returns empty lists when manual field is not an array", () => {
    localStorageMock.setItem(
      LOCAL_FOLDERS_STORAGE_KEY,
      JSON.stringify({ version: 1, manual: null, smart: [] })
    );
    expect(listManualFolders()).toEqual([]);
  });

  it("returns empty user smart folders when smart field is not an array", () => {
    localStorageMock.setItem(
      LOCAL_FOLDERS_STORAGE_KEY,
      JSON.stringify({ version: 1, manual: [], smart: null })
    );
    // listSmartFolders still returns seeded ones
    const folders = listSmartFolders();
    expect(folders).toHaveLength(SEEDED_SMART_FOLDERS.length);
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

  it("listManualFolders returns [] in SSR context", () => {
    expect(listManualFolders()).toEqual([]);
  });

  it("listSmartFolders returns seeded folders in SSR context", () => {
    const folders = listSmartFolders();
    expect(folders).toHaveLength(SEEDED_SMART_FOLDERS.length);
  });

  it("createManualFolder does not throw in SSR context", () => {
    expect(() => createManualFolder("SSR Test")).not.toThrow();
  });

  it("createSmartFolder does not throw in SSR context", () => {
    expect(() => createSmartFolder("SSR Smart", [])).not.toThrow();
  });

  it("renameManualFolder does not throw in SSR context", () => {
    expect(() => renameManualFolder("folder-ab12", "Renamed")).not.toThrow();
  });

  it("deleteManualFolder does not throw in SSR context", () => {
    expect(() => deleteManualFolder("folder-ab12")).not.toThrow();
  });

  it("renameSmartFolder does not throw in SSR context", () => {
    expect(() => renameSmartFolder("smart-ab12", "Renamed")).not.toThrow();
  });

  it("deleteSmartFolder does not throw in SSR context", () => {
    expect(() => deleteSmartFolder("smart-ab12")).not.toThrow();
  });
});
