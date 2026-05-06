import { teamsApi } from "../teams-client";

const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => jest.clearAllMocks());

function mockSuccess<T>(data: T) {
  mockFetch.mockResolvedValueOnce({
    json: () => Promise.resolve({ success: true, data }),
  });
}

function mockNetworkError() {
  mockFetch.mockRejectedValueOnce(new Error("Failed to fetch"));
}

describe("teamsApi", () => {
  describe("common behavior", () => {
    it("sends credentials and content-type", async () => {
      mockSuccess({ id: 1 });
      await teamsApi.create(1, "My Team", "gen9vgc2024regg");
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/teams",
        expect.objectContaining({
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
        })
      );
    });

    it("returns network error on fetch failure", async () => {
      mockNetworkError();
      const result = await teamsApi.create(1, "Team", "format");
      expect(result).toEqual({
        success: false,
        error: "Network error — please check your connection.",
      });
    });
  });

  describe("create", () => {
    it("calls POST /api/teams with correct body", async () => {
      mockSuccess({ id: 42 });
      const result = await teamsApi.create(1, "My Team", "gen9vgc2024regg");
      expect(mockFetch).toHaveBeenCalledWith("/api/teams", {
        method: "POST",
        body: JSON.stringify({ altId: 1, name: "My Team", format: "gen9vgc2024regg" }),
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
      });
      expect(result).toEqual({ success: true, data: { id: 42 } });
    });
  });

  describe("update", () => {
    it("calls PATCH /api/teams/:teamId", async () => {
      mockSuccess(undefined);
      await teamsApi.update(5, { name: "New Name" });
      expect(mockFetch).toHaveBeenCalledWith("/api/teams/5", expect.objectContaining({ method: "PATCH" }));
    });
  });

  describe("delete", () => {
    it("calls DELETE /api/teams/:teamId", async () => {
      mockSuccess(undefined);
      await teamsApi.delete(5);
      expect(mockFetch).toHaveBeenCalledWith("/api/teams/5", expect.objectContaining({ method: "DELETE" }));
    });
  });

  describe("fork", () => {
    it("calls POST /api/teams/:teamId/fork", async () => {
      mockSuccess({ id: 99 });
      const result = await teamsApi.fork(5, 2, "Forked Team");
      expect(mockFetch).toHaveBeenCalledWith("/api/teams/5/fork", expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ targetAltId: 2, newName: "Forked Team" }),
      }));
      expect(result).toEqual({ success: true, data: { id: 99 } });
    });
  });

  describe("transfer", () => {
    it("calls POST /api/teams/:teamId/transfer", async () => {
      mockSuccess(undefined);
      await teamsApi.transfer(5, 3);
      expect(mockFetch).toHaveBeenCalledWith("/api/teams/5/transfer", expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ targetAltId: 3 }),
      }));
    });
  });

  describe("addPokemon", () => {
    it("calls POST /api/teams/:teamId/pokemon", async () => {
      mockSuccess({ pokemonId: 10 });
      const result = await teamsApi.addPokemon(5, { species: "Pikachu" }, 0);
      expect(mockFetch).toHaveBeenCalledWith("/api/teams/5/pokemon", expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ pokemon: { species: "Pikachu" }, position: 0 }),
      }));
      expect(result).toEqual({ success: true, data: { pokemonId: 10 } });
    });
  });

  describe("updatePokemon", () => {
    it("calls PATCH /api/teams/:teamId/pokemon/:pokemonId", async () => {
      mockSuccess(undefined);
      await teamsApi.updatePokemon(5, 10, { nature: "Adamant" });
      expect(mockFetch).toHaveBeenCalledWith("/api/teams/5/pokemon/10", expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ nature: "Adamant" }),
      }));
    });
  });

  describe("removePokemon", () => {
    it("calls DELETE /api/teams/:teamId/pokemon/:pokemonId", async () => {
      mockSuccess(undefined);
      await teamsApi.removePokemon(5, 10);
      expect(mockFetch).toHaveBeenCalledWith("/api/teams/5/pokemon/10", expect.objectContaining({ method: "DELETE" }));
    });
  });

  describe("reorderPokemon", () => {
    it("calls PATCH /api/teams/:teamId/pokemon/reorder", async () => {
      mockSuccess(undefined);
      const positions = [{ pokemonId: 1, position: 2 }, { pokemonId: 2, position: 1 }];
      await teamsApi.reorderPokemon(5, positions);
      expect(mockFetch).toHaveBeenCalledWith("/api/teams/5/pokemon/reorder", expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ positions }),
      }));
    });
  });

  describe("saveLocal", () => {
    it("calls POST /api/teams/save-local", async () => {
      mockSuccess({ teamId: 7, redirectUrl: "/teams/7" });
      const data = { altId: 1, name: "Team", format: "gen9vgc", pokemon: [{ species: "Pikachu" }] };
      const result = await teamsApi.saveLocal(data);
      expect(mockFetch).toHaveBeenCalledWith("/api/teams/save-local", expect.objectContaining({
        method: "POST",
        body: JSON.stringify(data),
      }));
      expect(result).toEqual({ success: true, data: { teamId: 7, redirectUrl: "/teams/7" } });
    });
  });
});
