/**
 * Regression tests for the header perspective mapping logic.
 *
 * These tests prevent a bug where headerMyAltId and headerOpponentAltId
 * were inverted, causing Won/Lost buttons to submit the wrong player
 * as the game winner.
 */
import { resolveHeaderPerspective } from "../match-perspective";

describe("resolveHeaderPerspective", () => {
  const ALT1_ID = 100;
  const ALT2_ID = 200;

  // ===========================================================================
  // Player 1 perspective (isPlayer1 = true, swapped = false)
  // ===========================================================================

  describe("player 1 perspective", () => {
    const args = {
      isParticipant: true,
      isPlayer1: true,
      player1Value: ALT1_ID,
      player2Value: ALT2_ID,
    };

    it("maps headerMyValue to player1 (self)", () => {
      const { headerMyValue } = resolveHeaderPerspective(args);
      expect(headerMyValue).toBe(ALT1_ID);
    });

    it("maps headerOpponentValue to player2 (opponent)", () => {
      const { headerOpponentValue } = resolveHeaderPerspective(args);
      expect(headerOpponentValue).toBe(ALT2_ID);
    });
  });

  // ===========================================================================
  // Player 2 perspective (isPlayer1 = false, swapped = true)
  // ===========================================================================

  describe("player 2 perspective", () => {
    const args = {
      isParticipant: true,
      isPlayer1: false,
      player1Value: ALT1_ID,
      player2Value: ALT2_ID,
    };

    it("maps headerMyValue to player2 (self)", () => {
      const { headerMyValue } = resolveHeaderPerspective(args);
      expect(headerMyValue).toBe(ALT2_ID);
    });

    it("maps headerOpponentValue to player1 (opponent)", () => {
      const { headerOpponentValue } = resolveHeaderPerspective(args);
      expect(headerOpponentValue).toBe(ALT1_ID);
    });
  });

  // ===========================================================================
  // Staff perspective (non-participant)
  // ===========================================================================

  describe("staff perspective", () => {
    it("maps headerMyValue to player2 (right side) regardless of isPlayer1", () => {
      const result1 = resolveHeaderPerspective({
        isParticipant: false,
        isPlayer1: true,
        player1Value: ALT1_ID,
        player2Value: ALT2_ID,
      });
      const result2 = resolveHeaderPerspective({
        isParticipant: false,
        isPlayer1: false,
        player1Value: ALT1_ID,
        player2Value: ALT2_ID,
      });

      // Staff always sees player1 on left (opponent), player2 on right (my)
      expect(result1.headerMyValue).toBe(ALT2_ID);
      expect(result1.headerOpponentValue).toBe(ALT1_ID);
      // isPlayer1 is irrelevant when not a participant
      expect(result2.headerMyValue).toBe(ALT2_ID);
      expect(result2.headerOpponentValue).toBe(ALT1_ID);
    });
  });

  // ===========================================================================
  // Generic type support
  // ===========================================================================

  describe("generic type support", () => {
    it("works with string values", () => {
      const { headerMyValue, headerOpponentValue } = resolveHeaderPerspective({
        isParticipant: true,
        isPlayer1: true,
        player1Value: "Alice",
        player2Value: "Bob",
      });

      expect(headerMyValue).toBe("Alice");
      expect(headerOpponentValue).toBe("Bob");
    });

    it("works with null values", () => {
      const { headerMyValue, headerOpponentValue } = resolveHeaderPerspective({
        isParticipant: true,
        isPlayer1: true,
        player1Value: null,
        player2Value: 42,
      });

      expect(headerMyValue).toBeNull();
      expect(headerOpponentValue).toBe(42);
    });

    it("works with object values", () => {
      const stats1 = { wins: 3, losses: 1 };
      const stats2 = { wins: 2, losses: 2 };

      const { headerMyValue, headerOpponentValue } = resolveHeaderPerspective({
        isParticipant: true,
        isPlayer1: false, // player 2 perspective
        player1Value: stats1,
        player2Value: stats2,
      });

      // Player 2 sees own stats as "my"
      expect(headerMyValue).toBe(stats2);
      expect(headerOpponentValue).toBe(stats1);
    });
  });
});
