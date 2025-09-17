import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom, timer } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { Game } from './models/game';

@Injectable({ providedIn: 'root' })
export class GamesService {
  private _games$ = new BehaviorSubject<Game[]>([]);
  games$ = this._games$.asObservable();

  // point to /api (works in production and with proxy in dev)
  private GET_URL = '/api/get_games.php';
  private SAVE_URL = '/api/save_game.php';
  private DELETE_URL = '/api/delete_game.php';

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
}
