"use client";

/**
 * Tests for useLocalTeamStorage hook.
 * Covers: hydration from localStorage, debounced writes, deduplication,
 * clearLocalTeamStorage, and version checking.
 */

import { act, renderHook, waitFor } from "@testing-library/react";

import type { TeamWithPokemon } from "@trainers/supabase";

import {
  useLocalTeamStorage,
  clearLocalTeamStorage,
} from "../persistence/use-local-team-storage";

// =============================================================================
// Constants (mirrored from source)
// =============================================================================

const STORAGE_KEY = "trainersgg.builder.localTeam.v1";

// =============================================================================
// Helpers
// =============================================================================

function makeTeam(overrides?: Partial<TeamWithPokemon>): TeamWithPokemon {
  return {
    id: -1,
    name: "Untitled Team",
    format: "championsvgc2026regma",
    format_legal: null,
    description: null,
    notes: null,
    tags: null,
    is_public: null,
    parent_team_id: null,
    created_by: -1,
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-01T00:00:00.000Z",
    team_pokemon: [],
    ...overrides,
  };
}

function storeTeam(team: TeamWithPokemon) {
  const data = {
    team,
    updatedAt: new Date().toISOString(),
    version: 1,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// =============================================================================
// Tests
// =============================================================================

describe("useLocalTeamStorage — initialization", () => {
  beforeEach(() => {
    localStorage.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns an empty team when localStorage is empty", () => {
    const { result } = renderHook(() => useLocalTeamStorage());
    expect(result.current.team.name).toBe("Untitled Team");
    expect(result.current.team.team_pokemon).toHaveLength(0);
    expect(result.current.team.format).toBe("championsvgc2026regma");
  });

  it("sets hydrated to true after mount", () => {
    const { result } = renderHook(() => useLocalTeamStorage());
    expect(result.current.hydrated).toBe(true);
  });

  it("hydrates from localStorage if data exists", () => {
    const team = makeTeam({ name: "Saved Team" });
    storeTeam(team);

    const { result } = renderHook(() => useLocalTeamStorage());
    expect(result.current.team.name).toBe("Saved Team");
  });

  it("returns empty team if localStorage has invalid JSON", () => {
    localStorage.setItem(STORAGE_KEY, "not-json{{{");

    const { result } = renderHook(() => useLocalTeamStorage());
    expect(result.current.team.name).toBe("Untitled Team");
    expect(result.current.hydrated).toBe(true);
  });

  it("returns empty team if localStorage has wrong version", () => {
    const data = {
      team: makeTeam({ name: "V2 Team" }),
      updatedAt: new Date().toISOString(),
      version: 2,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

    const { result } = renderHook(() => useLocalTeamStorage());
    expect(result.current.team.name).toBe("Untitled Team");
  });
});

describe("useLocalTeamStorage — setTeam", () => {
  beforeEach(() => {
    localStorage.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("updates team state immediately with an updater function", () => {
    const { result } = renderHook(() => useLocalTeamStorage());

    act(() => {
      result.current.setTeam((prev) => ({ ...prev, name: "Updated" }));
    });

    expect(result.current.team.name).toBe("Updated");
  });

  it("updates team state immediately with a direct value", () => {
    const { result } = renderHook(() => useLocalTeamStorage());

    act(() => {
      result.current.setTeam(makeTeam({ name: "Direct Value" }));
    });

    expect(result.current.team.name).toBe("Direct Value");
  });

  it("debounces writes to localStorage", () => {
    const { result } = renderHook(() => useLocalTeamStorage());

    act(() => {
      result.current.setTeam((prev) => ({ ...prev, name: "First" }));
    });

    // Should not have written yet
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();

    // Advance timers past the debounce
    act(() => {
      jest.advanceTimersByTime(400);
    });

    // Now it should be written
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored.team.name).toBe("First");
  });

  it("only writes once if setTeam is called multiple times within debounce window", () => {
    const { result } = renderHook(() => useLocalTeamStorage());
    const spy = jest.spyOn(Storage.prototype, "setItem");

    act(() => {
      result.current.setTeam((prev) => ({ ...prev, name: "A" }));
    });
    act(() => {
      result.current.setTeam((prev) => ({ ...prev, name: "B" }));
    });
    act(() => {
      result.current.setTeam((prev) => ({ ...prev, name: "C" }));
    });

    act(() => {
      jest.advanceTimersByTime(400);
    });

    // Only the last value should be stored (one write after debounce)
    const storedCalls = spy.mock.calls.filter(([key]) => key === STORAGE_KEY);
    expect(storedCalls).toHaveLength(1);
    const stored = JSON.parse(storedCalls[0]![1] as string);
    expect(stored.team.name).toBe("C");

    spy.mockRestore();
  });
});

describe("useLocalTeamStorage — deduplication", () => {
  beforeEach(() => {
    localStorage.clear();
    // Ensure real timers — other tests may have set fake timers
    jest.useRealTimers();
  });

  it("deduplicates team_pokemon by pokemon_id on hydration", async () => {
    const team = makeTeam({
      team_pokemon: [
        {
          id: -1,
          pokemon_id: -1,
          team_position: 0,
          pokemon: {
            id: -1,
            species: "Pikachu",
            ability: "Static",
            move1: "Thunderbolt",
            move2: null,
            move3: null,
            move4: null,
            nature: "Timid",
            nickname: null,
            notes: null,
            held_item: null,
            tera_type: null,
            gender: null,
            is_shiny: false,
            level: 50,
            format_legal: null,
            created_at: "2024-01-01T00:00:00.000Z",
            ev_hp: 0,
            ev_attack: 0,
            ev_defense: 0,
            ev_special_attack: 252,
            ev_special_defense: 4,
            ev_speed: 252,
            iv_hp: 31,
            iv_attack: 31,
            iv_defense: 31,
            iv_special_attack: 31,
            iv_special_defense: 31,
            iv_speed: 31,
          },
        },
        // Duplicate entry with same pokemon_id at different position
        {
          id: -1,
          pokemon_id: -1,
          team_position: 3,
          pokemon: {
            id: -1,
            species: "Pikachu",
            ability: "Static",
            move1: "Thunderbolt",
            move2: null,
            move3: null,
            move4: null,
            nature: "Timid",
            nickname: null,
            notes: null,
            held_item: null,
            tera_type: null,
            gender: null,
            is_shiny: false,
            level: 50,
            format_legal: null,
            created_at: "2024-01-01T00:00:00.000Z",
            ev_hp: 0,
            ev_attack: 0,
            ev_defense: 0,
            ev_special_attack: 252,
            ev_special_defense: 4,
            ev_speed: 252,
            iv_hp: 31,
            iv_attack: 31,
            iv_defense: 31,
            iv_special_attack: 31,
            iv_special_defense: 31,
            iv_speed: 31,
          },
        },
      ],
    });
    storeTeam(team);

    const { result } = renderHook(() => useLocalTeamStorage());

    // The useEffect hydration runs asynchronously — wait for it
    await waitFor(() => {
      expect(result.current.team.team_pokemon).toHaveLength(1);
    });
    expect(result.current.team.team_pokemon[0]!.team_position).toBe(3);
  });
});

describe("clearLocalTeamStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("removes the storage key from localStorage and returns true", () => {
    localStorage.setItem(STORAGE_KEY, "something");
    const result = clearLocalTeamStorage();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(result).toBe(true);
  });

  it("returns true if storage key does not exist", () => {
    const result = clearLocalTeamStorage();
    expect(result).toBe(true);
  });
});
