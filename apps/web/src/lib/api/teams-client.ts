/**
 * Teams API Client
 *
 * Client-side typed wrapper for the team builder REST API routes.
 * Used by the ApiPersistence adapter to call server endpoints.
 */

// Local ActionResult type (mirrors @trainers/validators but avoids server imports)
type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

// Re-export for consumers
export type { ActionResult };

// =============================================================================
// Helpers
// =============================================================================

async function apiCall<T = void>(
  url: string,
  options: RequestInit
): Promise<ActionResult<T>> {
  try {
    const response = await fetch(url, {
      ...options,
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    const json = await response.json();
    return json as ActionResult<T>;
  } catch {
    return { success: false, error: "Network error — please check your connection." };
  }
}

// =============================================================================
// Teams API
// =============================================================================

export const teamsApi = {
  /** POST /api/teams — Create a new team. */
  create(altId: number, name: string, format: string): Promise<ActionResult<{ id: number }>> {
    return apiCall<{ id: number }>("/api/teams", {
      method: "POST",
      body: JSON.stringify({ altId, name, format }),
    });
  },

  /** PATCH /api/teams/:teamId — Update team metadata. */
  update(teamId: number, data: Record<string, unknown>): Promise<ActionResult> {
    return apiCall(`/api/teams/${teamId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  /** DELETE /api/teams/:teamId — Delete a team. */
  delete(teamId: number): Promise<ActionResult> {
    return apiCall(`/api/teams/${teamId}`, {
      method: "DELETE",
    });
  },

  /** POST /api/teams/:teamId/fork — Fork a team. */
  fork(
    teamId: number,
    targetAltId: number,
    newName?: string
  ): Promise<ActionResult<{ id: number }>> {
    return apiCall<{ id: number }>(`/api/teams/${teamId}/fork`, {
      method: "POST",
      body: JSON.stringify({ targetAltId, newName }),
    });
  },

  /** POST /api/teams/:teamId/transfer — Transfer to another alt. */
  transfer(teamId: number, targetAltId: number): Promise<ActionResult> {
    return apiCall(`/api/teams/${teamId}/transfer`, {
      method: "POST",
      body: JSON.stringify({ targetAltId }),
    });
  },

  /** POST /api/teams/:teamId/pokemon — Add a pokemon. */
  addPokemon(
    teamId: number,
    pokemon: Record<string, unknown>,
    position: number
  ): Promise<ActionResult<{ pokemonId: number }>> {
    return apiCall<{ pokemonId: number }>(`/api/teams/${teamId}/pokemon`, {
      method: "POST",
      body: JSON.stringify({ pokemon, position }),
    });
  },

  /** PATCH /api/teams/:teamId/pokemon/:pokemonId — Update a pokemon. */
  updatePokemon(
    teamId: number,
    pokemonId: number,
    data: Record<string, unknown>
  ): Promise<ActionResult> {
    return apiCall(`/api/teams/${teamId}/pokemon/${pokemonId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  /** DELETE /api/teams/:teamId/pokemon/:pokemonId — Remove a pokemon. */
  removePokemon(teamId: number, pokemonId: number): Promise<ActionResult> {
    return apiCall(`/api/teams/${teamId}/pokemon/${pokemonId}`, {
      method: "DELETE",
    });
  },

  /** PATCH /api/teams/:teamId/pokemon/reorder — Reorder pokemon positions. */
  reorderPokemon(
    teamId: number,
    positions: { pokemonId: number; position: number }[]
  ): Promise<ActionResult> {
    return apiCall(`/api/teams/${teamId}/pokemon/reorder`, {
      method: "PATCH",
      body: JSON.stringify({ positions }),
    });
  },

  /** POST /api/teams/save-local — Persist a local team to the user's account. */
  saveLocal(data: {
    altId: number;
    name: string;
    format: string;
    pokemon: Record<string, unknown>[];
  }): Promise<ActionResult<{ teamId: number; redirectUrl: string }>> {
    return apiCall<{ teamId: number; redirectUrl: string }>("/api/teams/save-local", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
};
