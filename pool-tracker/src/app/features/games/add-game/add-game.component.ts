import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, FormGroup } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { GamesService } from '../../../core/games.service';
import { Game, GameMode } from '../../../core/models/game';

function uuid() {
  return (globalThis.crypto && 'randomUUID' in globalThis.crypto)
    ? globalThis.crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

@Component({
  selector: 'app-add-game',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './add-game.component.html',
  styleUrls: ['./add-game.component.scss']
})
export class AddGameComponent {
  mode: GameMode = '1v1';
  form!: FormGroup; // <-- define now, init in constructor

  constructor(private fb: FormBuilder, private games: GamesService) {
    this.form = this.fb.group({
      dateISO: [new Date().toISOString().slice(0, 10), Validators.required],
      winner1: ['', Validators.required],
      winner2: [''],
      loser1: ['', Validators.required],
      loser2: [''],
      lostOnBlack: [false]
    });
  }

  setMode(mode: GameMode) { this.mode = mode; }

  async submit() {
    const f: any = this.form.value;
    const winners = [f.winner1, f.winner2].filter(Boolean);
    const losers  = [f.loser1,  f.loser2 ].filter(Boolean);

    if (this.mode === '1v1' && (winners.length !== 1 || losers.length !== 1)) {
      alert('1v1 needs exactly one winner and one loser.'); return;
    }
    if (this.mode === '2v2' && (winners.length !== 2 || losers.length !== 2)) {
      alert('2v2 needs exactly two winners and two losers.'); return;
    }

    const game: Game = {
      id: uuid(),
      dateISO: f.dateISO,
      mode: this.mode,
      winners,
      losers,
      lostOnBlack: !!f.lostOnBlack
    };
    await this.games.add(game);

    this.form.reset({
      dateISO: new Date().toISOString().slice(0, 10),
      lostOnBlack: false,
      winner1: '', winner2: '', loser1: '', loser2: ''
    });
  }
}
