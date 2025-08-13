export type GameMode = '1v1' | '2v2';

export interface Game {
  id: string;          // uuid
  dateISO: string;     // "YYYY-MM-DD"
  mode: GameMode;      // '1v1' | '2v2'
  winners: string[];   // 1 or 2 names
  losers: string[];    // 1 or 2 names
  lostOnBlack: boolean;
}
