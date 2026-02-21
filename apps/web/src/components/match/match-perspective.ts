/**
 * Resolve header layout positions based on user perspective.
 *
 * Header layout: left = opponent, right = current user ("me").
 * - Player 1 sees player2 on the left and player1 on the right.
 * - Player 2 sees player1 on the left and player2 on the right.
 * - Staff (non-participant) sees player1 left, player2 right.
 *
 * The key insight: only player1 gets player1 as "me". Both player2 and
 * staff see player2 on the right side ("me" position).
 */
export function resolveHeaderPerspective<T>({
  isParticipant,
  isPlayer1,
  player1Value,
  player2Value,
}: {
  isParticipant: boolean;
  isPlayer1: boolean;
  player1Value: T;
  player2Value: T;
}): { headerOpponentValue: T; headerMyValue: T } {
  const player1IsMe = isParticipant && isPlayer1;
  return {
    headerOpponentValue: player1IsMe ? player2Value : player1Value,
    headerMyValue: player1IsMe ? player1Value : player2Value,
  };
}
