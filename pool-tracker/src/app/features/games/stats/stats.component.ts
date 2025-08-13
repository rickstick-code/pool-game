import { Component } from '@angular/core';
import { CommonModule, AsyncPipe, NgIf } from '@angular/common';
import { Observable, map } from 'rxjs';
import { GamesService } from '../../../core/games.service';
import { Game } from '../../../core/models/game';

@Component({
  selector: 'app-stats',
  standalone: true,
  imports: [CommonModule, AsyncPipe, NgIf],
  templateUrl: './stats.component.html'
})
export class StatsComponent {
  games$!: Observable<Game[]>;
  totals$!: Observable<{ total: number; oneVone: number; twoVtwo: number; blackBallLosses: number }>;

  constructor(private gamesService: GamesService) {
    this.games$ = this.gamesService.games$;
    this.totals$ = this.games$.pipe(
      map(games => ({
        total: games.length,
        oneVone: games.filter(g => g.mode === '1v1').length,
        twoVtwo: games.filter(g => g.mode === '2v2').length,
        blackBallLosses: games.filter(g => g.lostOnBlack).length
      }))
    );
  }
}
