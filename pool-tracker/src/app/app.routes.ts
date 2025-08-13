import { Routes } from '@angular/router';
import { AddGameComponent } from './features/games/add-game/add-game.component';
import { StatsComponent } from './features/games/stats/stats.component';
import { LegalComponent } from './features/legal/legal.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'games' },
  { path: 'games', component: AddGameComponent },
  { path: 'games/stats', component: StatsComponent },
  { path: 'legal', component: LegalComponent },
  { path: '**', redirectTo: '' }
];
