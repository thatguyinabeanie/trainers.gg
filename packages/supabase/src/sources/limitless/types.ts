export interface LimitlessTournament {
  id: string;
  game: string;
  format: string;
  name: string;
  date: string;
  players: number;
}

export interface LimitlessTournamentDetails extends LimitlessTournament {
  organizer?: { id: number; name: string };
  platform?: string;
  decklists?: boolean;
  isPublic?: boolean;
  isOnline?: boolean;
  phases?: Array<{
    phase: number;
    type: string;
    rounds: number;
    mode: string;
  }>;
}

export interface LimitlessStanding {
  player: string;
  name: string;
  country?: string;
  placing: number;
  record?: { wins: number; losses: number; ties: number };
  drop?: number | null;
  decklist?: Array<{
    id: string;
    name: string;
    item?: string;
    ability?: string;
    attacks?: string[];
    tera?: string | null;
  }> | null;
}

export interface LimitlessPairing {
  round: number;
  phase: number;
  table?: number;
  match?: string;
  player1: string;
  player2?: string | null;
  winner?: string | null;
}

export interface TournamentData {
  details: LimitlessTournamentDetails;
  standings: LimitlessStanding[];
  pairings: LimitlessPairing[];
}

export interface SyncResult {
  synced: number;
  skipped: number;
  total: number;
  mapped: number;
  unmapped: number;
  unmappedFormats: Record<string, number>;
}

export interface ImportResult {
  tournamentId: string;
  name: string;
  players: number;
  standings: number;
  pokemon: number;
  matches: number;
}
