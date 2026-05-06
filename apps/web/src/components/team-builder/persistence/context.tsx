"use client";

/**
 * Builder Persistence Context
 *
 * Provides the persistence adapter to all builder components via React context.
 * This allows nested components (like ImportDialog) to access the persistence
 * layer without prop drilling.
 */

import { createContext, useContext, type ReactNode } from "react";
import type { BuilderPersistence } from "./types";

const PersistenceContext = createContext<BuilderPersistence | null>(null);

// =============================================================================
// Provider
// =============================================================================

interface PersistenceProviderProps {
  persistence: BuilderPersistence;
  children: ReactNode;
}

export function PersistenceProvider({
  persistence,
  children,
}: PersistenceProviderProps) {
  return (
    <PersistenceContext.Provider value={persistence}>
      {children}
    </PersistenceContext.Provider>
  );
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Access the builder persistence adapter from context.
 * Must be used within a PersistenceProvider.
 */
export function usePersistence(): BuilderPersistence {
  const ctx = useContext(PersistenceContext);
  if (!ctx) {
    throw new Error(
      "usePersistence must be used within a PersistenceProvider. " +
        "Wrap the builder with <PersistenceProvider persistence={...}>."
    );
  }
  return ctx;
}
