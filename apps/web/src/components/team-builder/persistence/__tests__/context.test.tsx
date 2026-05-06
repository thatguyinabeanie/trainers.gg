import { renderHook } from "@testing-library/react";
import { PersistenceProvider, usePersistence } from "../context";
import type { BuilderPersistence } from "../types";

describe("PersistenceProvider + usePersistence", () => {
  const mockPersistence: BuilderPersistence = {
    mode: "api",
    addPokemon: jest.fn(),
    updatePokemon: jest.fn(),
    removePokemon: jest.fn(),
    reorderPokemon: jest.fn(),
    updateTeam: jest.fn(),
    onMutationSuccess: jest.fn(),
  };

  it("throws when used outside PersistenceProvider", () => {
    // Suppress console.error from React for this expected error
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => usePersistence())).toThrow(
      "usePersistence must be used within a PersistenceProvider"
    );
    spy.mockRestore();
  });

  it("returns persistence value when inside PersistenceProvider", () => {
    const { result } = renderHook(() => usePersistence(), {
      wrapper: ({ children }) => (
        <PersistenceProvider persistence={mockPersistence}>
          {children}
        </PersistenceProvider>
      ),
    });
    expect(result.current).toBe(mockPersistence);
  });

  it("renders children", () => {
    const { result } = renderHook(() => usePersistence(), {
      wrapper: ({ children }) => (
        <PersistenceProvider persistence={mockPersistence}>
          {children}
        </PersistenceProvider>
      ),
    });
    expect(result.current.mode).toBe("api");
  });
});
