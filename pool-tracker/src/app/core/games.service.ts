import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom, timer } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { Game } from './models/game';
import { environment } from '../../environments/environment';

export type EloEntry = {
  name: string;
  elo: number;
  delta: number; // change compared to last game
};

@Injectable({ providedIn: 'root' })
export class GamesService {
  private _games$ = new BehaviorSubject<Game[]>([]);
  games$ = this._games$.asObservable();

  private GET_URL = `${environment.apiBase}/get_games.php`;
  private SAVE_URL = `${environment.apiBase}/save_game.php`;
  private DELETE_URL = `${environment.apiBase}/delete_game.php`;

  constructor(private http: HttpClient) {}

  async init(): Promise<void> {
    await this.refresh();

    // Poll every 10s so other peoples' changes appear automatically
    timer(10000, 10000).pipe(
      switchMap(() => this.http.get<Game[]>(this.GET_URL))
    ).subscribe(games => this._games$.next(games ?? []));
  }

  async refresh() {
    const games = await firstValueFrom(this.http.get<Game[]>(this.GET_URL));
    this._games$.next(games ?? []);
  }

  async add(game: Game) {
    await firstValueFrom(this.http.post(this.SAVE_URL, game));
    await this.refresh();
  }

  async delete(id: string) {
    await firstValueFrom(this.http.post(this.DELETE_URL, { id }));
    await this.refresh();
  }

  

/** Compute Elo standings and per-game Elo changes */
computeElo(games: Game[], k = 32, baseElo = 1000) {
  const elos = new Map<string, number>();
  const history: (Game & { eloChanges: { name: string; delta: number }[] })[] = [];

  // go in chronological order
  for (const g of [...games].sort((a, b) => a.dateISO.localeCompare(b.dateISO))) {
    const winners = g.winners ?? [];
    const losers = g.losers ?? [];

    if (winners.length === 0 || losers.length === 0) continue;

    // ensure all players exist
    [...winners, ...losers].forEach(p => {
      if (!elos.has(p)) elos.set(p, baseElo);
    });

    // track raw deltas from each pairing
    const rawChanges = new Map<string, number[]>();

    for (const w of winners) {
      for (const l of losers) {
        const rw = elos.get(w)!;
        const rl = elos.get(l)!;

        const expectedW = 1 / (1 + Math.pow(10, (rl - rw) / 400));
        const expectedL = 1 - expectedW;

        const changeW = k * (1 - expectedW);
        const changeL = k * (0 - expectedL);

        if (!rawChanges.has(w)) rawChanges.set(w, []);
        if (!rawChanges.has(l)) rawChanges.set(l, []);

        rawChanges.get(w)!.push(changeW);
        rawChanges.get(l)!.push(changeL);
      }
    }

    // average changes per player
    const changes: { name: string; delta: number }[] = [];
    for (const [name, deltas] of rawChanges.entries()) {
      const avgDelta = deltas.reduce((a, b) => a + b, 0) / deltas.length;
      const rounded = Math.round(avgDelta);

      elos.set(name, elos.get(name)! + avgDelta);
      changes.push({ name, delta: rounded });
    }

    history.push({ ...g, eloChanges: changes });
  }

  const standings: EloEntry[] = [...elos.entries()].map(([name, elo]) => {
    const lastChange = history
      .flatMap(h => h.eloChanges)
      .filter(c => c.name === name)
      .slice(-1)[0]?.delta ?? 0;

    return { name, elo: Math.round(elo), delta: lastChange };
  });

  return { standings, history };
}

}
