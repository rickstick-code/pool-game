import { Component } from '@angular/core';
import { CommonModule, AsyncPipe, NgIf, NgFor, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BehaviorSubject, combineLatest, map, startWith, Observable } from 'rxjs';
import { GamesService } from '../../../core/games.service';
import { Game } from '../../../core/models/game';

type VM = {
  total: number;
  groups: { dateISO: string; items: Game[] }[];
};

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, AsyncPipe, NgIf, NgFor, FormsModule, DatePipe],
  templateUrl: './history.component.html',
  styleUrls: ['./history.component.scss']
})
export class HistoryComponent {
  // filters we keep
  q$    = new BehaviorSubject<string>('');
  mode$ = new BehaviorSubject<'all' | '1v1' | '2v2'>('all');

  // simple client-side password gate
  adminPw = '';
  get authed(): boolean {
    return this.adminPw === 'HoagieIstSchuld';
  }

  vm$!: Observable<VM>;

  constructor(private gamesService: GamesService) {
    this.vm$ = combineLatest([this.gamesService.games$, this.q$, this.mode$]).pipe(
      map(([games, q, mode]) => this.vm(games, q, mode)),
      startWith({ total: 0, groups: [] } as VM)
    );
  }

  private vm(games: Game[], q: string, mode: 'all'|'1v1'|'2v2'): VM {
    const norm = (s: string) => s.trim().toLowerCase();
    const term = norm(q);

    let list = [...games].sort((a, b) => b.dateISO.localeCompare(a.dateISO));
    if (mode !== 'all') list = list.filter(g => g.mode === mode);
    if (term) {
      list = list.filter(g => {
        const names = [...(g.winners||[]), ...(g.losers||[])].map(norm).join(' ');
        return names.includes(term);
      });
    }

    const byDate = new Map<string, Game[]>();
    for (const g of list) {
      if (!byDate.has(g.dateISO)) byDate.set(g.dateISO, []);
      byDate.get(g.dateISO)!.push(g);
    }

    const groups = [...byDate.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([dateISO, items]) => ({ dateISO, items }));

    return { total: list.length, groups };
  }

  // bindings
  setQ(v: string) { this.q$.next(v); }
  setMode(v: 'all'|'1v1'|'2v2') { this.mode$.next(v); }

  badgeFor(g: Game): string {
    return g.lostOnBlack ? `${g.mode} • black-ball` : g.mode;
  }

  async deleteGame(id: string) {
    const pw = prompt('Enter admin password to delete this game:');
    if (pw !== 'HoagieIstSchuld') {
      alert('Wrong password.');
      return;
    }

    const ok = confirm('Delete this game permanently?');
    if (!ok) return;

    await this.gamesService.delete(id);
  }
}
