import { Component } from '@angular/core';
import { CommonModule, AsyncPipe, NgIf, NgFor, PercentPipe } from '@angular/common';
import { Observable, map } from 'rxjs';
import { GamesService } from '../../../core/games.service';
import { Game } from '../../../core/models/game';
import { LucideAngularModule } from 'lucide-angular';

type PlayerRow = {
  name: string;
  wins: number;
  losses: number;
  games: number;
  ratio: number;
  last5: number;
  last10: number;
  last20: number;
  trend: 'up' | 'down' | 'flat';
  participation: number;
};

@Component({
  selector: 'app-stats',
  standalone: true,
  imports: [
    CommonModule,
    AsyncPipe,
    NgIf,
    NgFor,
    PercentPipe,
    LucideAngularModule
  ],
  templateUrl: './stats.component.html',
  styleUrls: ['./stats.component.scss']
})
export class StatsComponent {
  vm$!: Observable<any>;

  constructor(private gamesService: GamesService) {
    this.vm$ = this.gamesService.games$.pipe(
      map(games => this.buildViewModel(games))
    );
  }

  private buildViewModel(games: Game[]) {
    const sorted = [...games].sort((a, b) => a.dateISO.localeCompare(b.dateISO));

    const players = new Map<string, {
      name: string;
      wins: number; losses: number; games: number;
      series: { won: boolean; dateISO: string }[];
      maxWinStreak: number; maxLoseStreak: number;
    }>();

    const norm = (s: string) => s.trim();

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

    // compute streaks
    for (const p of players.values()) {
      let curW = 0, curL = 0;
      for (const item of p.series.sort((a, b) => a.dateISO.localeCompare(b.dateISO))) {
        if (item.won) {
          curW++; curL = 0;
          if (curW > p.maxWinStreak) p.maxWinStreak = curW;
        } else {
          curL++; curW = 0;
          if (curL > p.maxLoseStreak) p.maxLoseStreak = curL;
        }
      }
    }

    const totalGames = games.length;

    // proper streak (no black-ball losses, count backwards)
    let properStreak = 0;
    for (let i = sorted.length - 1; i >= 0; i--) {
      if (sorted[i].lostOnBlack) break;
      properStreak++;
    }

    // black-ball ratio
    const blackBallGames = games.filter(g => g.lostOnBlack).length;
    const blackBallRatio = totalGames ? blackBallGames / totalGames : 0;

    // weekday frequency
    const weekdays = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const weekdayCounts: Record<string, number> = {};
    for (const g of games) {
      const d = new Date(g.dateISO);
      const w = weekdays[d.getDay()];
      weekdayCounts[w] = (weekdayCounts[w] ?? 0) + 1;
    }
    const topWeekday = Object.entries(weekdayCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';

    // build rows
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

      let trend: PlayerRow['trend'] = 'flat';
      const diff = last10 - ratio;
      if (diff > 0.02) trend = 'up';
      else if (diff < -0.02) trend = 'down';

      rows.push({
        name: p.name,
        wins: p.wins,
        losses: p.losses,
        games: p.games,
        ratio,
        last5,
        last10,
        last20,
        trend,
        participation: p.games,
      });
    }

    const eligible = rows.filter(r => r.games >= 3);
    const bestPlayers = eligible.length
      ? rows.filter(r => r.ratio === Math.max(...eligible.map(e => e.ratio)))
      : [];
    const worstPlayers = eligible.length
      ? rows.filter(r => r.ratio === Math.min(...eligible.map(e => e.ratio)))
      : [];

    let topWin = { name: '—', value: 0 };
    let topLose = { name: '—', value: 0 };
    for (const p of players.values()) {
      if (p.maxWinStreak > topWin.value) topWin = { name: p.name, value: p.maxWinStreak };
      if (p.maxLoseStreak > topLose.value) topLose = { name: p.name, value: p.maxLoseStreak };
    }

    const byWins = [...rows].sort((a, b) => b.wins - a.wins);
    const byRatio = [...rows].sort((a, b) => b.ratio - a.ratio);
    const byParticipation = [...rows].sort((a, b) => b.participation - a.participation);

    const maxWins = Math.max(1, ...rows.map(r => r.wins));
    const maxPart = Math.max(1, ...rows.map(r => r.participation));

    return {
      totalGames,
      properStreak,
      blackBallRatio,
      mostCommonWeekday: topWeekday,
      rows: rows.sort((a, b) => b.ratio - a.ratio || b.wins - a.wins),
      bestPlayers,
      worstPlayers,
      topWin, topLose,
      charts: {
        byWins, byRatio, byParticipation, maxWins, maxPart
      }
    };
  }
}
