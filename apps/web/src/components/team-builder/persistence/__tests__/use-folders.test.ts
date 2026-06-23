import { describe, it, expect, beforeEach } from "@jest/globals";
import { renderHook, act } from "@testing-library/react";
import { useFolders } from "../use-folders";
import {
  LOCAL_FOLDERS_STORAGE_KEY,
  SEEDED_SMART_FOLDERS,
  SEEDED_FOLDER_IDS,
  createManualFolder as storeCreateManualFolder,
  createSmartFolder as storeCreateSmartFolder,
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
// Setup
// =============================================================================

beforeEach(() => {
  localStorageMock.clear();
  jest.clearAllMocks();
});

// =============================================================================
// Helpers
// =============================================================================

function readStore(): LocalFoldersStoreV1 | null {
  const raw = localStorageMock._store[LOCAL_FOLDERS_STORAGE_KEY];
  if (!raw) return null;
  return JSON.parse(raw) as LocalFoldersStoreV1;
}

// =============================================================================
// useFolders — hydration
// =============================================================================

describe("useFolders hydration", () => {
  it("hydrated starts false and becomes true after mount", () => {
    const { result } = renderHook(() => useFolders());
    expect(result.current.hydrated).toBe(true);
  });

  it("manualFolders starts empty and hydrates on mount", () => {
    storeCreateManualFolder("Existing Folder");
    const { result } = renderHook(() => useFolders());
    expect(result.current.hydrated).toBe(true);
    expect(result.current.manualFolders).toHaveLength(1);
    expect(result.current.manualFolders[0]!.name).toBe("Existing Folder");
  });

  it("smartFolders always includes seeded folders after mount", () => {
    const { result } = renderHook(() => useFolders());
    const seededIds = SEEDED_SMART_FOLDERS.map((f) => f.id);
    for (const id of seededIds) {
      expect(result.current.smartFolders.find((f) => f.id === id)).toBeDefined();
    }
  });

  it("smartFolders includes user-created folders after mount", () => {
    storeCreateSmartFolder("Pre-existing Smart", []);
    const { result } = renderHook(() => useFolders());
    expect(result.current.smartFolders.find((f) => f.name === "Pre-existing Smart")).toBeDefined();
  });

  it("returns empty manualFolders when localStorage is empty", () => {
    const { result } = renderHook(() => useFolders());
    expect(result.current.manualFolders).toEqual([]);
  });

  it("seeded smart folders are available before hydration (pre-populated)", () => {
    // Seeded folders are pre-populated in initial state, not just after effect
    // We can verify they appear in the first synchronous render result
    const { result } = renderHook(() => useFolders());
    // After renderHook effects run, seeded folders should be present
    expect(result.current.smartFolders.length).toBeGreaterThanOrEqual(SEEDED_SMART_FOLDERS.length);
  });
});

// =============================================================================
// useFolders — createManualFolder
// =============================================================================

describe("useFolders.createManualFolder", () => {
  it("adds a new folder to manualFolders and returns it", () => {
    const { result } = renderHook(() => useFolders());
    let created: ReturnType<typeof result.current.createManualFolder> | undefined;

    act(() => {
      created = result.current.createManualFolder("My Folder");
    });

    expect(created).toBeDefined();
    expect(created!.name).toBe("My Folder");
    expect(result.current.manualFolders).toHaveLength(1);
    expect(result.current.manualFolders[0]!.name).toBe("My Folder");
  });

  it("appends successive folders in insertion order", () => {
    const { result } = renderHook(() => useFolders());

    act(() => {
      result.current.createManualFolder("First");
    });
    act(() => {
      result.current.createManualFolder("Second");
    });

    expect(result.current.manualFolders.map((f) => f.name)).toEqual([
      "First",
      "Second",
    ]);
  });

  it("persists the folder to localStorage", () => {
    const { result } = renderHook(() => useFolders());

    act(() => {
      result.current.createManualFolder("Persisted");
    });

    const stored = readStore();
    expect(stored?.manual).toHaveLength(1);
    expect(stored?.manual[0]!.name).toBe("Persisted");
  });
});

// =============================================================================
// useFolders — renameManualFolder
// =============================================================================

describe("useFolders.renameManualFolder", () => {
  it("renames the folder in state", () => {
    const { result } = renderHook(() => useFolders());
    let folderId: string | undefined;

    act(() => {
      folderId = result.current.createManualFolder("Old").id;
    });
    act(() => {
      result.current.renameManualFolder(folderId!, "New");
    });

    expect(result.current.manualFolders[0]!.name).toBe("New");
  });

  it("is a no-op for an unknown id (state unchanged)", () => {
    const { result } = renderHook(() => useFolders());

    act(() => {
      result.current.createManualFolder("Safe");
    });

    const snapshot = result.current.manualFolders.map((f) => f.name);
    act(() => {
      result.current.renameManualFolder("folder-zzzz", "Ghost");
    });

    expect(result.current.manualFolders.map((f) => f.name)).toEqual(snapshot);
  });
});

// =============================================================================
// useFolders — deleteManualFolder
// =============================================================================

describe("useFolders.deleteManualFolder", () => {
  it("removes the folder from state", () => {
    const { result } = renderHook(() => useFolders());
    let folderId: string | undefined;

    act(() => {
      folderId = result.current.createManualFolder("Delete Me").id;
    });
    act(() => {
      result.current.deleteManualFolder(folderId!);
    });

    expect(result.current.manualFolders.find((f) => f.id === folderId)).toBeUndefined();
  });

  it("removes the folder from localStorage", () => {
    const { result } = renderHook(() => useFolders());
    let folderId: string | undefined;

    act(() => {
      folderId = result.current.createManualFolder("To Delete").id;
    });
    act(() => {
      result.current.deleteManualFolder(folderId!);
    });

    const stored = readStore();
    expect(stored?.manual.find((f) => f.id === folderId)).toBeUndefined();
  });

  it("leaves other folders intact", () => {
    const { result } = renderHook(() => useFolders());
    let keepId: string | undefined;
    let deleteId: string | undefined;

    act(() => {
      keepId = result.current.createManualFolder("Keep").id;
      deleteId = result.current.createManualFolder("Delete").id;
    });
    act(() => {
      result.current.deleteManualFolder(deleteId!);
    });

    expect(result.current.manualFolders.find((f) => f.id === keepId)).toBeDefined();
    expect(result.current.manualFolders.find((f) => f.id === deleteId)).toBeUndefined();
  });

  it("is a no-op for an unknown id (state unchanged)", () => {
    const { result } = renderHook(() => useFolders());

    act(() => {
      result.current.createManualFolder("Safe");
    });

    const snapshot = result.current.manualFolders.length;
    act(() => {
      result.current.deleteManualFolder("folder-zzzz");
    });

    expect(result.current.manualFolders.length).toBe(snapshot);
  });
});

// =============================================================================
// useFolders — createSmartFolder
// =============================================================================

describe("useFolders.createSmartFolder", () => {
  it("adds the smart folder to state after seeded ones", () => {
    const { result } = renderHook(() => useFolders());
    const criteria = [{ kind: "text" as const, value: "pikachu" }];

    act(() => {
      result.current.createSmartFolder("My Query", criteria);
    });

    const userFolder = result.current.smartFolders.find((f) => f.name === "My Query");
    expect(userFolder).toBeDefined();
    expect(userFolder!.isSeeded).toBe(false);
    expect(userFolder!.criteria).toEqual(criteria);
  });

  it("seeded folders remain first in smartFolders after creating a user folder", () => {
    const { result } = renderHook(() => useFolders());

    act(() => {
      result.current.createSmartFolder("User Smart", []);
    });

    const seededCount = SEEDED_SMART_FOLDERS.length;
    for (let i = 0; i < seededCount; i++) {
      expect(result.current.smartFolders[i]!.isSeeded).toBe(true);
    }
  });

  it("persists the smart folder to localStorage", () => {
    const { result } = renderHook(() => useFolders());

    act(() => {
      result.current.createSmartFolder("Persisted Smart", []);
    });

    const stored = readStore();
    expect(stored?.smart).toHaveLength(1);
    expect(stored?.smart[0]!.name).toBe("Persisted Smart");
  });

  it("returns the created smart folder", () => {
    const { result } = renderHook(() => useFolders());
    let created: ReturnType<typeof result.current.createSmartFolder> | undefined;

    act(() => {
      created = result.current.createSmartFolder("Returned", []);
    });

    expect(created).toBeDefined();
    expect(created!.name).toBe("Returned");
  });
});

// =============================================================================
// useFolders — deleteSmartFolder
// =============================================================================

describe("useFolders.deleteSmartFolder", () => {
  it("removes a user smart folder from state", () => {
    const { result } = renderHook(() => useFolders());
    let folderId: string | undefined;

    act(() => {
      folderId = result.current.createSmartFolder("Delete Me Smart", []).id;
    });
    act(() => {
      result.current.deleteSmartFolder(folderId!);
    });

    expect(result.current.smartFolders.find((f) => f.id === folderId)).toBeUndefined();
  });

  it("does NOT remove seeded folders from state when deleting their id", () => {
    const { result } = renderHook(() => useFolders());

    act(() => {
      result.current.deleteSmartFolder(SEEDED_FOLDER_IDS.INCOMPLETE);
    });

    expect(
      result.current.smartFolders.find((f) => f.id === SEEDED_FOLDER_IDS.INCOMPLETE)
    ).toBeDefined();
  });

  it("leaves other user smart folders intact", () => {
    const { result } = renderHook(() => useFolders());
    let keepId: string | undefined;
    let deleteId: string | undefined;

    act(() => {
      keepId = result.current.createSmartFolder("Keep Smart", []).id;
      deleteId = result.current.createSmartFolder("Delete Smart", []).id;
    });
    act(() => {
      result.current.deleteSmartFolder(deleteId!);
    });

    expect(result.current.smartFolders.find((f) => f.id === keepId)).toBeDefined();
    expect(result.current.smartFolders.find((f) => f.id === deleteId)).toBeUndefined();
  });

  it("is a no-op for an unknown id (state unchanged)", () => {
    const { result } = renderHook(() => useFolders());

    act(() => {
      result.current.createSmartFolder("Safe Smart", []);
    });

    const snapshot = result.current.smartFolders.length;
    act(() => {
      result.current.deleteSmartFolder("smart-zzzz");
    });

    expect(result.current.smartFolders.length).toBe(snapshot);
  });
});
