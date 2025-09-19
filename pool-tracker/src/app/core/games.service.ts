import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom, timer } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { Game } from './models/game';

export type EloEntry = {
  name: string;
  elo: number;
  delta: number; // change compared to last game
};

@Injectable({ providedIn: 'root' })
export class GamesService {
  private _games$ = new BehaviorSubject<Game[]>([]);
  games$ = this._games$.asObservable();

  // prod
  private GET_URL = '/api/get_games.php';
  private SAVE_URL = '/api/save_game.php';
  private DELETE_URL = '/api/delete_game.php';

  // dev
  // private GET_URL = '/data/get_games.php';
  // private SAVE_URL = '/data/save_game.php';
  // private DELETE_URL = '/data/delete_game.php';

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

  // ===== Elo system =====

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

      const changesMap = new Map<string, number>();

      // Do Elo update per winner–loser pair
      for (const w of winners) {
        for (const l of losers) {
          const rw = elos.get(w)!;
          const rl = elos.get(l)!;

          const expectedW = 1 / (1 + Math.pow(10, (rl - rw) / 400));
          const expectedL = 1 - expectedW;

          const changeW = k * (1 - expectedW);
          const changeL = k * (0 - expectedL);

          elos.set(w, rw + changeW);
          elos.set(l, rl + changeL);

          changesMap.set(w, (changesMap.get(w) ?? 0) + changeW);
          changesMap.set(l, (changesMap.get(l) ?? 0) + changeL);
        }
      }

      const changes = [...changesMap.entries()].map(([name, delta]) => ({
        name,
        delta: Math.round(delta),
      }));

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
