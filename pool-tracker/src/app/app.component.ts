import { Component, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { GamesService } from './core/games.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="nav-wrap">
      <div class="container nav">
        <a routerLink="/games" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">
  Enter Game
</a>
<a routerLink="/games/stats" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">
  Statistics
</a>
<a routerLink="/legal" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">
  Legal
</a>

      </div>
    </div>

    <main class="container" style="margin-top: 1.25rem;">
      <router-outlet />
    </main>
  `,
  styles: [``]
})
export class AppComponent implements OnInit {
  constructor(private games: GamesService) {}
  async ngOnInit() { await this.games.init(); }
}
