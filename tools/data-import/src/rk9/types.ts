export type RK9EventTier = "regional" | "international" | "special" | "worlds";
export type RK9Division = "masters" | "senior" | "junior";

export interface RK9Event {
  eventId: string;
  name: string;
  dateStart: string;
  dateEnd: string | null;
  locationCity: string;
  locationCountry: string;
  tier: RK9EventTier;
}

export interface RK9RosterEntry {
  playerIdMasked: string;
  firstName: string;
  lastName: string;
  country: string;
  division: RK9Division;
  trainerName: string;
  rosterEntryId: string | null;
  placement: number | null;
}

export interface RK9Pokemon {
  speciesRaw: string;
  teraType: string | null;
  ability: string;
  heldItem: string;
  moves: string[];
}

export interface PairingsEntry {
  tableNumber: number | null;
  player1: string;
  player2: string | null;
  /** true = player1 won, false = player2 won, null = bye or result not yet posted */
  player1Won: boolean | null;
}

export interface DivisionRoundPairings {
  division: RK9Division;
  rounds: Map<number, PairingsEntry[]>;
}
