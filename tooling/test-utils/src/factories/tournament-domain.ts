import { Factory } from "fishery";
import type { PlayerRecord, BracketPlayer } from "@trainers/tournaments";

export const playerRecordFactory = Factory.define<PlayerRecord>(
  ({ sequence }) => ({
    profileId: `player-${sequence}`,
    displayName: `Player ${sequence}`,
    matchPoints: 0,
    gameWins: 0,
    gameLosses: 0,
    gameWinPercentage: 0,
    opponentMatchWinPercentage: 0,
    opponentGameWinPercentage: 0,
    hasReceivedBye: false,
    isDropped: false,
    previousOpponents: [],
    roundsPlayed: 0,
  })
);

export const bracketPlayerFactory = Factory.define<BracketPlayer>(
  ({ sequence }) => ({
    id: `player-${sequence}`,
    name: `Player ${sequence}`,
    seed: sequence,
  })
);
