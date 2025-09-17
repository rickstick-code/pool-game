import { Component } from '@angular/core';
import { CommonModule, AsyncPipe, NgIf, NgFor, PercentPipe } from '@angular/common';
import { Observable, map } from 'rxjs';
import { GamesService } from '../../../core/games.service';
import { Game } from '../../../core/models/game';

type PlayerRow = {
  name: string;
  wins: number;
  losses: number;
  games: number;
  ratio: number;        // overall 0..1
  last5: number;        // 0..1
  last10: number;       // 0..1
  last20: number;       // 0..1
  trend: 'up' | 'down' | 'flat';
  participation: number;
};

@Component({
  selector: 'app-stats',
  standalone: true,
  imports: [CommonModule, AsyncPipe, NgIf, NgFor, PercentPipe],
  templateUrl: './stats.component.html',
  styleUrls: ['./stats.component.scss']
})
export class StatsComponent {
  vm$!: Observable<any>;

  constructor(private gamesService: GamesService) {
    this.vm$ = this.gamesService.games$.pipe(map(games => this.buildViewModel(games)));
  }

  private buildViewModel(games: Game[]) {
    // sort by date ascending for streaks & sequences
    const sorted = [...games].sort((a, b) => a.dateISO.localeCompare(b.dateISO));

    const players = new Map<string, {
      name: string;
      wins: number; losses: number; games: number;
      series: { won: boolean; dateISO: string }[];
      maxWinStreak: number; maxLoseStreak: number;
    }>();

    const norm = (s: string) => s.trim();

    // build per-player tallies + appearance series
    for (const g of sorted) {
      const winners = (g.winners || []).map(norm);
      const losers  = (g.losers  || []).map(norm);
      for (const w of winners) {
        if (!players.has(w)) players.set(w, { name: w, wins: 0, losses: 0, games: 0, series: [], maxWinStreak: 0, maxLoseStreak: 0 });
        const p = players.get(w)!;
        p.wins++; p.games++;
        p.series.push({ won: true, dateISO: g.dateISO });
      }
      for (const l of losers) {
        if (!players.has(l)) players.set(l, { name: l, wins: 0, losses: 0, games: 0, series: [], maxWinStreak: 0, maxLoseStreak: 0 });
        const p = players.get(l)!;
        p.losses++; p.games++;
        p.series.push({ won: false, dateISO: g.dateISO });
      }
    }

    // compute per-player max win/lose streaks
    for (const p of players.values()) {
      let curW = 0, curL = 0;
      for (const item of p.series.sort((a, b) => a.dateISO.localeCompare(b.dateISO))) {
        if (item.won) { curW++; curL = 0; p.maxWinStreak = Math.max(p.maxWinStreak, curW); }
        else          { curL++; curW = 0; p.maxLoseStreak = Math.max(p.maxLoseStreak, curL); }
      }
    }

    // global totals
    const totalGames = games.length;

    // current global streak of "proper" games (no black-ball losses)
    let properStreak = 0;
    for (let i = sorted.length - 1; i >= 0; i--) {
      if (sorted[i].lostOnBlack) break;
      properStreak++;
    }

    // rows + recent windows + trend
    const rows: PlayerRow[] = [];
    for (const p of players.values()) {
      const ratio = p.games ? p.wins / p.games : 0;

      const seriesDesc = [...p.series].sort((a, b) => b.dateISO.localeCompare(a.dateISO));
      const sliceRatio = (n: number) => {
        const slice = seriesDesc.slice(0, n);
        const wins = slice.filter(s => s.won).length;
        return slice.length ? wins / slice.length : 0;
        };

      const last5  = sliceRatio(5);
      const last10 = sliceRatio(10);
      const last20 = sliceRatio(20);

      // TREND: compare last N vs previous N (N = min(5, floor(total/2)))
      let trend: PlayerRow['trend'] = 'flat';
      const total = seriesDesc.length;
      const N = Math.min(5, Math.floor(total / 2));
      if (N >= 2) {
        const recent = seriesDesc.slice(0, N);
        const prev   = seriesDesc.slice(N, 2 * N);
        const rRatio = recent.filter(s => s.won).length / N;
        const pRatio = prev.length ? prev.filter(s => s.won).length / prev.length : ratio; // fallback
        const diff = rRatio - pRatio;
        if (diff > 0.05) trend = 'up';
        else if (diff < -0.05) trend = 'down';
      }

      rows.push({
        name: p.name,
        wins: p.wins,
        losses: p.losses,
        games: p.games,
        ratio,
        last5, last10, last20,
        trend,
        participation: p.games,
      });
    }

    // best/worst by ratio (min 3 games)
    const eligible = rows.filter(r => r.games >= 3);
    const bestPlayer  = eligible.length ? [...eligible].sort((a, b) => b.ratio - a.ratio)[0] : null;
    const worstPlayer = eligible.length ? [...eligible].sort((a, b) => a.ratio - b.ratio)[0] : null;

    // top streak holders
    let topWin = { name: '—', value: 0 };
    let topLose = { name: '—', value: 0 };
    for (const p of players.values()) {
      if (p.maxWinStreak > topWin.value) topWin = { name: p.name, value: p.maxWinStreak };
      if (p.maxLoseStreak > topLose.value) topLose = { name: p.name, value: p.maxLoseStreak };
    }

    // chart helpers
    const byWins = [...rows].sort((a, b) => b.wins - a.wins);
    const byRatio = [...rows].sort((a, b) => b.ratio - a.ratio);
    const byParticipation = [...rows].sort((a, b) => b.participation - a.participation);
    const maxWins = Math.max(1, ...rows.map(r => r.wins));
    const maxPart = Math.max(1, ...rows.map(r => r.participation));

    return {
      totalGames,
      properStreak,
      rows: rows.sort((a, b) => b.ratio - a.ratio || b.wins - a.wins),
      bestPlayer,
      worstPlayer,
      topWin, topLose,
      charts: { byWins, byRatio, byParticipation, maxWins, maxPart }
    };
  }
}
