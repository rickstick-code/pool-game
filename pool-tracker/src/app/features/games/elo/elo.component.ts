import { Component } from '@angular/core';
import { CommonModule, NgFor, AsyncPipe, NgIf } from '@angular/common';
import { Observable, map } from 'rxjs';
import { GamesService, EloEntry } from '../../../core/games.service';
import { Game } from '../../../core/models/game';

type VM = {
  podium: EloEntry[];
  table: EloEntry[];
};

@Component({
  selector: 'app-elo',
  standalone: true,
  imports: [CommonModule, NgFor, AsyncPipe, NgIf],
  templateUrl: './elo.component.html',
  styleUrls: ['./elo.component.scss']
})
export class EloComponent {
  vm$!: Observable<VM>;

  constructor(private gamesService: GamesService) {
    this.vm$ = this.gamesService.games$.pipe(
      map((games: Game[]) => {
        const { standings } = this.gamesService.computeElo(games);

        // sort descending by Elo
        const sorted = [...standings].sort((a, b) => b.elo - a.elo);

        return {
          podium: sorted.slice(0, 3),
          table: sorted
        };
      })
    );
  }
}
