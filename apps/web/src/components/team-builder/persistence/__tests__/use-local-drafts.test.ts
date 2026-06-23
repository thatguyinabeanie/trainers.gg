import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { renderHook, act } from "@testing-library/react";
import { type TeamWithPokemon } from "@trainers/supabase";
import { useLocalDrafts, useLocalDraft } from "../use-local-drafts";
import {
  LOCAL_DRAFTS_STORAGE_KEY,
  createLocalDraft,
} from "../local-drafts-store";
import { type LocalDraftRecord, type LocalDraftStoreV3 } from "../local-drafts-types";

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
// Setup
// =============================================================================

beforeEach(() => {
  jest.useFakeTimers();
  localStorageMock.clear();
  jest.clearAllMocks();
});

afterEach(() => {
  jest.useRealTimers();
});

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

function readV3Store(): LocalDraftStoreV3 | null {
  const raw = localStorageMock._store[LOCAL_DRAFTS_STORAGE_KEY];
  if (!raw) return null;
  return JSON.parse(raw) as LocalDraftStoreV3;
}

function seedDraft(name: string): LocalDraftRecord {
  return createLocalDraft({ name });
}

// =============================================================================
// useLocalDrafts — existing behavior
// =============================================================================

describe("useLocalDrafts", () => {
  it("starts with hydrated:false, empty drafts, then hydrates on mount", () => {
    seedDraft("Existing Draft");

    const { result } = renderHook(() => useLocalDrafts());

    // After useEffect runs (jsdom runs effects synchronously in renderHook)
    expect(result.current.hydrated).toBe(true);
    expect(result.current.drafts).toHaveLength(1);
    expect(result.current.drafts[0]!.team.name).toBe("Existing Draft");
  });

  it("returns empty drafts when localStorage is empty", () => {
    const { result } = renderHook(() => useLocalDrafts());

    expect(result.current.drafts).toEqual([]);
    expect(result.current.hydrated).toBe(true);
  });

  it("createDraft adds a new draft to the front of the list and returns it", () => {
    const { result } = renderHook(() => useLocalDrafts());

    let created: LocalDraftRecord | undefined;
    act(() => {
      created = result.current.createDraft({ name: "New Draft" });
    });

    expect(created).toBeDefined();
    expect(created!.team.name).toBe("New Draft");
    expect(result.current.drafts).toHaveLength(1);
    expect(result.current.drafts[0]!.team.name).toBe("New Draft");
  });

  it("createDraft sets Milestone-B defaults on the new draft", () => {
    const { result } = renderHook(() => useLocalDrafts());

    let created: LocalDraftRecord | undefined;
    act(() => {
      created = result.current.createDraft({ name: "With Defaults" });
    });

    expect(created!.pinned).toBe(false);
    expect(created!.archived).toBe(false);
    expect(created!.sortOrder).toBeNull();
    expect(created!.folderIds).toEqual([]);
  });

  it("createDraft prepends when drafts already exist", () => {
    seedDraft("Old");
    const { result } = renderHook(() => useLocalDrafts());

    act(() => {
      result.current.createDraft({ name: "Newer" });
    });

    expect(result.current.drafts[0]!.team.name).toBe("Newer");
    expect(result.current.drafts[1]!.team.name).toBe("Old");
  });

  it("deleteDraft removes the matching draft from state", () => {
    const draftA = seedDraft("Keep");
    const draftB = seedDraft("Delete");

    const { result } = renderHook(() => useLocalDrafts());
    expect(result.current.drafts).toHaveLength(2);

    act(() => {
      result.current.deleteDraft(draftB.id);
    });

    expect(result.current.drafts).toHaveLength(1);
    expect(result.current.drafts[0]!.id).toBe(draftA.id);
  });

  it("deleteDraft removes the draft from the store", () => {
    const draft = seedDraft("To Delete");
    const { result } = renderHook(() => useLocalDrafts());

    act(() => {
      result.current.deleteDraft(draft.id);
    });

    const stored = readV3Store();
    expect(stored?.drafts.find((d) => d.id === draft.id)).toBeUndefined();
  });

  it("deleteDraft is a no-op for an unknown id", () => {
    seedDraft("Safe");
    const { result } = renderHook(() => useLocalDrafts());

    act(() => {
      result.current.deleteDraft("local-zzzz");
    });

    expect(result.current.drafts).toHaveLength(1);
  });
});

// =============================================================================
// useLocalDrafts — Milestone-B mutators
// =============================================================================

describe("useLocalDrafts — pinDraft", () => {
  it("sets pinned to true and refreshes state", () => {
    const draft = seedDraft("Pin Me");
    const { result } = renderHook(() => useLocalDrafts());

    act(() => {
      result.current.pinDraft(draft.id, true);
    });

    const found = result.current.drafts.find((d) => d.id === draft.id);
    expect(found!.pinned).toBe(true);
  });

  it("sets pinned to false (unpin) and refreshes state", () => {
    const draft = seedDraft("Unpin Me");
    const { result } = renderHook(() => useLocalDrafts());

    // Pin first
    act(() => {
      result.current.pinDraft(draft.id, true);
    });

    // Then unpin
    act(() => {
      result.current.pinDraft(draft.id, false);
    });

    const found = result.current.drafts.find((d) => d.id === draft.id);
    expect(found!.pinned).toBe(false);
  });

  it("persists the pinned state to the store", () => {
    const draft = seedDraft("Persist Pin");
    const { result } = renderHook(() => useLocalDrafts());

    act(() => {
      result.current.pinDraft(draft.id, true);
    });

    const stored = readV3Store();
    const storedDraft = stored?.drafts.find((d) => d.id === draft.id);
    expect(storedDraft!.pinned).toBe(true);
  });
});

describe("useLocalDrafts — archiveDraft", () => {
  it("sets archived to true and refreshes state", () => {
    const draft = seedDraft("Archive Me");
    const { result } = renderHook(() => useLocalDrafts());

    act(() => {
      result.current.archiveDraft(draft.id, true);
    });

    const found = result.current.drafts.find((d) => d.id === draft.id);
    expect(found!.archived).toBe(true);
  });

  it("sets archived to false (unarchive) and refreshes state", () => {
    const draft = seedDraft("Unarchive Me");
    const { result } = renderHook(() => useLocalDrafts());

    act(() => {
      result.current.archiveDraft(draft.id, true);
    });
    act(() => {
      result.current.archiveDraft(draft.id, false);
    });

    const found = result.current.drafts.find((d) => d.id === draft.id);
    expect(found!.archived).toBe(false);
  });

  it("persists the archived state to the store", () => {
    const draft = seedDraft("Persist Archive");
    const { result } = renderHook(() => useLocalDrafts());

    act(() => {
      result.current.archiveDraft(draft.id, true);
    });

    const stored = readV3Store();
    const storedDraft = stored?.drafts.find((d) => d.id === draft.id);
    expect(storedDraft!.archived).toBe(true);
  });

  it("archived drafts are still included in the drafts list (UI filters)", () => {
    const draft = seedDraft("Archived");
    const { result } = renderHook(() => useLocalDrafts());

    act(() => {
      result.current.archiveDraft(draft.id, true);
    });

    // useLocalDrafts does NOT filter archived — UI decides
    expect(result.current.drafts.some((d) => d.id === draft.id)).toBe(true);
  });
});

describe("useLocalDrafts — setDraftSortOrder", () => {
  it("sets a numeric sort order and refreshes state", () => {
    const draft = seedDraft("Sort Me");
    const { result } = renderHook(() => useLocalDrafts());

    act(() => {
      result.current.setDraftSortOrder(draft.id, 3);
    });

    const found = result.current.drafts.find((d) => d.id === draft.id);
    expect(found!.sortOrder).toBe(3);
  });

  it("resets sort order to null and refreshes state", () => {
    const draft = seedDraft("Reset Sort");
    const { result } = renderHook(() => useLocalDrafts());

    act(() => {
      result.current.setDraftSortOrder(draft.id, 5);
    });
    act(() => {
      result.current.setDraftSortOrder(draft.id, null);
    });

    const found = result.current.drafts.find((d) => d.id === draft.id);
    expect(found!.sortOrder).toBeNull();
  });

  it("persists sortOrder to the store", () => {
    const draft = seedDraft("Persist Sort");
    const { result } = renderHook(() => useLocalDrafts());

    act(() => {
      result.current.setDraftSortOrder(draft.id, 10);
    });

    const stored = readV3Store();
    const storedDraft = stored?.drafts.find((d) => d.id === draft.id);
    expect(storedDraft!.sortOrder).toBe(10);
  });
});

describe("useLocalDrafts — toggleDraftFolder", () => {
  it("adds a folder id when not already a member and refreshes state", () => {
    const draft = seedDraft("Add Folder");
    const { result } = renderHook(() => useLocalDrafts());

    act(() => {
      result.current.toggleDraftFolder(draft.id, "folder-alpha");
    });

    const found = result.current.drafts.find((d) => d.id === draft.id);
    expect(found!.folderIds).toContain("folder-alpha");
  });

  it("removes a folder id when already a member and refreshes state", () => {
    const draft = seedDraft("Remove Folder");
    const { result } = renderHook(() => useLocalDrafts());

    // Add first
    act(() => {
      result.current.toggleDraftFolder(draft.id, "folder-beta");
    });

    // Remove
    act(() => {
      result.current.toggleDraftFolder(draft.id, "folder-beta");
    });

    const found = result.current.drafts.find((d) => d.id === draft.id);
    expect(found!.folderIds).not.toContain("folder-beta");
  });

  it("persists folder membership to the store", () => {
    const draft = seedDraft("Persist Folder");
    const { result } = renderHook(() => useLocalDrafts());

    act(() => {
      result.current.toggleDraftFolder(draft.id, "folder-gamma");
    });

    const stored = readV3Store();
    const storedDraft = stored?.drafts.find((d) => d.id === draft.id);
    expect(storedDraft!.folderIds).toContain("folder-gamma");
  });

  it("toggle add then toggle remove leaves no membership (round-trip)", () => {
    const draft = seedDraft("Round Trip");
    const { result } = renderHook(() => useLocalDrafts());

    act(() => {
      result.current.toggleDraftFolder(draft.id, "folder-delta");
    });
    act(() => {
      result.current.toggleDraftFolder(draft.id, "folder-delta");
    });

    const found = result.current.drafts.find((d) => d.id === draft.id);
    expect(found!.folderIds).toEqual([]);
  });
});

// =============================================================================
// useLocalDraft
// =============================================================================

describe("useLocalDraft", () => {
  it("hydrates from localStorage when draft exists", () => {
    const draft = createLocalDraft({ name: "My Team" });

    const { result } = renderHook(() => useLocalDraft(draft.id));

    expect(result.current.hydrated).toBe(true);
    expect(result.current.exists).toBe(true);
    expect(result.current.team.name).toBe("My Team");
  });

  it("sets exists:false for an unknown id", () => {
    const { result } = renderHook(() => useLocalDraft("local-zzzz"));

    expect(result.current.hydrated).toBe(true);
    expect(result.current.exists).toBe(false);
  });

  it("starts with an empty team placeholder for unknown ids", () => {
    const { result } = renderHook(() => useLocalDraft("local-zzzz"));

    expect(result.current.team.id).toBe(-1);
    expect(result.current.team.name).toBe("Untitled Team");
    expect(result.current.team.team_pokemon).toEqual([]);
  });

  it("setTeam updates the local state immediately", () => {
    const draft = createLocalDraft();
    const { result } = renderHook(() => useLocalDraft(draft.id));

    act(() => {
      result.current.setTeam((prev) => ({ ...prev, name: "Updated" }));
    });

    expect(result.current.team.name).toBe("Updated");
  });

  it("setTeam accepts a direct value (non-functional updater)", () => {
    const draft = createLocalDraft();
    const { result } = renderHook(() => useLocalDraft(draft.id));

    act(() => {
      result.current.setTeam(makeTeam({ name: "Direct" }));
    });

    expect(result.current.team.name).toBe("Direct");
  });

  it("setTeam does NOT write to localStorage before 300ms", () => {
    const draft = createLocalDraft();
    const { result } = renderHook(() => useLocalDraft(draft.id));

    act(() => {
      result.current.setTeam((prev) => ({ ...prev, name: "Pending" }));
    });

    // setItem was called during createLocalDraft setup — record the count
    const callsBefore = localStorageMock.setItem.mock.calls.length;

    // No additional write within the debounce window
    act(() => {
      jest.advanceTimersByTime(299);
    });

    expect(localStorageMock.setItem.mock.calls.length).toBe(callsBefore);
  });

  it("setTeam writes to localStorage after 300ms (debounced)", () => {
    const draft = createLocalDraft({ name: "Before" });
    jest.clearAllMocks(); // clear setItem calls from createLocalDraft

    const { result } = renderHook(() => useLocalDraft(draft.id));

    act(() => {
      result.current.setTeam((prev) => ({ ...prev, name: "AfterDebounce" }));
    });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      LOCAL_DRAFTS_STORAGE_KEY,
      expect.stringContaining('"name":"AfterDebounce"')
    );
  });

  it("rapid setTeam calls debounce and write only once", () => {
    const draft = createLocalDraft();
    jest.clearAllMocks();

    const { result } = renderHook(() => useLocalDraft(draft.id));

    act(() => {
      result.current.setTeam((prev) => ({ ...prev, name: "v1" }));
      result.current.setTeam((prev) => ({ ...prev, name: "v2" }));
      result.current.setTeam((prev) => ({ ...prev, name: "v3" }));
    });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    // Only one setItem call from the final debounce flush
    expect(localStorageMock.setItem).toHaveBeenCalledTimes(1);
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      LOCAL_DRAFTS_STORAGE_KEY,
      expect.stringContaining('"name":"v3"')
    );
  });

  it("flushes pending write immediately on unmount", () => {
    const draft = createLocalDraft({ name: "Before Unmount" });
    jest.clearAllMocks();

    const { result, unmount } = renderHook(() => useLocalDraft(draft.id));

    act(() => {
      result.current.setTeam((prev) => ({ ...prev, name: "On Unmount" }));
    });

    // Unmount before the debounce fires
    unmount();

    // Flush should have written immediately on unmount
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      LOCAL_DRAFTS_STORAGE_KEY,
      expect.stringContaining('"name":"On Unmount"')
    );
  });

  it("does NOT double-write if debounce already fired before unmount", () => {
    const draft = createLocalDraft();
    jest.clearAllMocks();

    const { result, unmount } = renderHook(() => useLocalDraft(draft.id));

    act(() => {
      result.current.setTeam((prev) => ({ ...prev, name: "After Debounce" }));
    });

    // Fire the debounce first
    act(() => {
      jest.advanceTimersByTime(300);
    });

    const callsAfterDebounce = localStorageMock.setItem.mock.calls.length;

    // Then unmount — should NOT write again (no pending timer)
    unmount();

    expect(localStorageMock.setItem.mock.calls.length).toBe(callsAfterDebounce);
  });
});
