import { Routes } from '@angular/router';
import { AddGameComponent } from './features/games/add-game/add-game.component';
import { EloComponent } from './features/games/elo/elo.component';
import { StatsComponent } from './features/games/stats/stats.component';
import { LegalComponent } from './features/legal/legal.component';
import { HistoryComponent } from './features/games/history/history.component'; // <-- add

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'games' },
  { path: 'games', component: AddGameComponent },
  { path: 'games/elo', component: EloComponent },
  { path: 'games/stats', component: StatsComponent },
  { path: 'games/history', component: HistoryComponent }, // <-- add
  { path: 'legal', component: LegalComponent },
  { path: '**', redirectTo: '' }
];
