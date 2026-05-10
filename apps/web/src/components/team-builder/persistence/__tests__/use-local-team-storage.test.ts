import { renderHook, act } from "@testing-library/react";
import type { TeamWithPokemon } from "@trainers/supabase";
import { useLocalTeamStorage, clearLocalTeamStorage } from "../use-local-team-storage";

const STORAGE_KEY = "trainersgg.builder.localTeam.v1";

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
  jest.useFakeTimers();
  localStorageMock.clear();
  jest.clearAllMocks();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("useLocalTeamStorage", () => {
  it("returns empty team initially when localStorage is empty", () => {
    const { result } = renderHook(() => useLocalTeamStorage());

    expect(result.current.team.id).toBe(-1);
    expect(result.current.team.name).toBe("Untitled Team");
    expect(result.current.team.format).toBe("championsvgc2026regma");
    expect(result.current.team.team_pokemon).toEqual([]);
  });

  it("sets hydrated to true after initial effect", () => {
    const { result } = renderHook(() => useLocalTeamStorage());

    // After render + useEffect, hydrated should be true
    expect(result.current.hydrated).toBe(true);
  });

  it("hydrates from localStorage if data exists with version 1", () => {
    const storedTeam: TeamWithPokemon = {
      id: 99,
      name: "Stored Team",
      format: "gen9vgc2024regg",
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
    } as TeamWithPokemon;

    localStorageMock.setItem(
      STORAGE_KEY,
      JSON.stringify({ team: storedTeam, updatedAt: "2024-01-01T00:00:00Z", version: 1 })
    );

    const { result } = renderHook(() => useLocalTeamStorage());

    expect(result.current.team.id).toBe(99);
    expect(result.current.team.name).toBe("Stored Team");
    expect(result.current.hydrated).toBe(true);
  });

  it("setTeam updates the team state", () => {
    const { result } = renderHook(() => useLocalTeamStorage());

    act(() => {
      result.current.setTeam((prev) => ({ ...prev, name: "Updated Team" }));
    });

    expect(result.current.team.name).toBe("Updated Team");
  });

  it("setTeam writes to localStorage after debounce (300ms)", () => {
    const { result } = renderHook(() => useLocalTeamStorage());

    act(() => {
      result.current.setTeam((prev) => ({ ...prev, name: "Debounced" }));
    });

    // Not written yet
    expect(localStorageMock.setItem).not.toHaveBeenCalledWith(
      STORAGE_KEY,
      expect.any(String)
    );

    // Advance past debounce
    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      STORAGE_KEY,
      expect.stringContaining('"name":"Debounced"')
    );
  });

  it("setTeam with a direct value sets state directly", () => {
    const { result } = renderHook(() => useLocalTeamStorage());

    const newTeam = { ...result.current.team, name: "Direct Set" };

    act(() => {
      result.current.setTeam(newTeam);
    });

    expect(result.current.team.name).toBe("Direct Set");
  });

  it("clearLocalTeamStorage removes the key from localStorage and returns true", () => {
    localStorageMock.setItem(
      STORAGE_KEY,
      JSON.stringify({ team: {}, updatedAt: "2024-01-01", version: 1 })
    );
    jest.clearAllMocks();

    const result = clearLocalTeamStorage();

    expect(localStorageMock.removeItem).toHaveBeenCalledWith(STORAGE_KEY);
    expect(result).toBe(true);
  });
});
