import { renderHook, act } from "@testing-library/react";
import type { TeamWithPokemon } from "@trainers/supabase";
import { useLocalBackup } from "../use-local-backup";

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
  };
})();

Object.defineProperty(window, "localStorage", { value: localStorageMock });

beforeEach(() => {
  localStorageMock.clear();
  jest.clearAllMocks();
});

function makeTeam(overrides: Partial<TeamWithPokemon> = {}): TeamWithPokemon {
  return {
    id: 42,
    name: "Test Team",
    format: "gen9vgc2026regi",
    format_legal: null,
    description: null,
    notes: null,
    tags: null,
    is_public: null,
    parent_team_id: null,
    created_by: 1,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    team_pokemon: [],
    ...overrides,
  } as TeamWithPokemon;
}

function makeBackup(team: TeamWithPokemon, savedAt?: string) {
  return JSON.stringify({
    team,
    savedAt: savedAt ?? new Date().toISOString(),
    version: 1,
  });
}

const STORAGE_KEY = "trainersgg.builder.backup.42";

describe("useLocalBackup", () => {
  it("returns no pending restore when no backup exists", () => {
    const { result } = renderHook(() => useLocalBackup(makeTeam()));

    expect(result.current.hasPendingRestore).toBe(false);
    expect(result.current.backupTeam).toBeNull();
    expect(result.current.backupSavedAt).toBeNull();
  });

  it("returns no pending restore when backup matches server team", () => {
    const team = makeTeam();
    localStorageMock.setItem(STORAGE_KEY, makeBackup(team));
    jest.clearAllMocks();

    const { result } = renderHook(() => useLocalBackup(team));

    expect(result.current.hasPendingRestore).toBe(false);
    // Should clear the matching backup
    expect(localStorageMock.removeItem).toHaveBeenCalledWith(STORAGE_KEY);
  });

  it("returns pending restore when backup has different pokemon count", () => {
    const serverTeam = makeTeam();
    const backupTeam = makeTeam({
      team_pokemon: [
        { id: 1, pokemon_id: 1, team_position: 1, pokemon: { id: 1, species: "Pikachu", ability: "Static", held_item: null } },
      ] as TeamWithPokemon["team_pokemon"],
    });
    localStorageMock.setItem(STORAGE_KEY, makeBackup(backupTeam));

    const { result } = renderHook(() => useLocalBackup(serverTeam));

    expect(result.current.hasPendingRestore).toBe(true);
    expect(result.current.backupTeam).toEqual(backupTeam);
  });

  it("returns pending restore when backup has different name", () => {
    const serverTeam = makeTeam();
    const backupTeam = makeTeam({ name: "Different Name" });
    localStorageMock.setItem(STORAGE_KEY, makeBackup(backupTeam));

    const { result } = renderHook(() => useLocalBackup(serverTeam));

    expect(result.current.hasPendingRestore).toBe(true);
  });

  it("returns pending restore when backup has different format", () => {
    const serverTeam = makeTeam();
    const backupTeam = makeTeam({ format: "gen9ou" });
    localStorageMock.setItem(STORAGE_KEY, makeBackup(backupTeam));

    const { result } = renderHook(() => useLocalBackup(serverTeam));

    expect(result.current.hasPendingRestore).toBe(true);
  });

  it("clears expired backups (savedAt older than 7 days)", () => {
    const serverTeam = makeTeam();
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    const backupTeam = makeTeam({ name: "Old Backup" });
    localStorageMock.setItem(STORAGE_KEY, makeBackup(backupTeam, eightDaysAgo));
    jest.clearAllMocks();

    const { result } = renderHook(() => useLocalBackup(serverTeam));

    expect(result.current.hasPendingRestore).toBe(false);
    expect(localStorageMock.removeItem).toHaveBeenCalledWith(STORAGE_KEY);
  });

  it("snapshot writes to localStorage with correct structure", () => {
    const serverTeam = makeTeam();
    const { result } = renderHook(() => useLocalBackup(serverTeam));

    const updatedTeam = makeTeam({ name: "Snapshot Team" });

    act(() => {
      result.current.snapshot(updatedTeam);
    });

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      STORAGE_KEY,
      expect.stringContaining('"name":"Snapshot Team"')
    );
    const written = JSON.parse(
      (localStorageMock.setItem as jest.Mock).mock.calls.find(
        (c: string[]) => c[0] === STORAGE_KEY
      )![1]
    );
    expect(written.version).toBe(1);
    expect(written.savedAt).toBeDefined();
  });

  it("dismiss removes from localStorage and clears pending state", () => {
    const serverTeam = makeTeam();
    const backupTeam = makeTeam({ name: "Pending" });
    localStorageMock.setItem(STORAGE_KEY, makeBackup(backupTeam));

    const { result } = renderHook(() => useLocalBackup(serverTeam));
    expect(result.current.hasPendingRestore).toBe(true);

    act(() => {
      result.current.dismiss();
    });

    expect(result.current.hasPendingRestore).toBe(false);
    expect(localStorageMock.removeItem).toHaveBeenCalledWith(STORAGE_KEY);
  });

  it("returns no pending restore when backup has invalid version", () => {
    const serverTeam = makeTeam();
    localStorageMock.setItem(
      STORAGE_KEY,
      JSON.stringify({ team: makeTeam({ name: "v2" }), savedAt: new Date().toISOString(), version: 2 })
    );

    const { result } = renderHook(() => useLocalBackup(serverTeam));

    expect(result.current.hasPendingRestore).toBe(false);
  });
});
