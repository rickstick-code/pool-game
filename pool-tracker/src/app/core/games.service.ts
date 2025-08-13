import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom, timer } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { Game } from './models/game';

@Injectable({ providedIn: 'root' })
export class GamesService {
  private _games$ = new BehaviorSubject<Game[]>([]);
  games$ = this._games$.asObservable();

  // Adjust paths if your Angular app is in a subfolder
  private GET_URL = '/data/get_games.php';
  private SAVE_URL = '/data/save_game.php';

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
}
