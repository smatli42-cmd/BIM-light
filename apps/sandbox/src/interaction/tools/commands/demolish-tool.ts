// Vybourat úsek stěny (plán stěn Z10): první klik na stěnu = začátek úseku, druhý = konec; úsek mezi
// nimi dostane stav „bourání“ (příkaz wall.demolishPart, stejně jako AI). Body se přichytávají.
import { nearestOnPath, selectableWallGeometry, wallsAt, type Id, type Vec2 } from '@bim-light/core';
import type { Overlay } from '../../types.ts';
import { PointCommand } from './base.ts';

export class DemolishTool extends PointCommand {
  readonly id = 'demolish';
  private first: { wallId: Id; at: Vec2 } | null = null;
  protected readonly steps = [
    'Klikni na stěnu na začátku úseku, který se bude bourat.',
    'Klikni na konec úseku na téže stěně. Esc zruší.',
  ];

  override hint() {
    return this.steps[this.first ? 1 : 0] ?? '';
  }

  private wallUnder(p: Vec2): Id | null {
    const raw = this.last?.world ?? p;
    return wallsAt(selectableWallGeometry(this.s.model, this.s.view), raw, this.s.viewport.px(6))[0] ?? null;
  }

  protected click(p: Vec2) {
    const id = this.first?.wallId ?? this.wallUnder(p);
    const w = id ? this.s.model.elements[id] : undefined;
    if (!w) return;
    const at = nearestOnPath(w.path, p).point;
    if (!this.first) {
      this.first = { wallId: w.id, at };
      this.points = [at];
      return;
    }
    this.s.run('wall.demolishPart', { wallId: w.id, from: this.first.at, to: at });
    this.first = null;
    this.points = [];
  }

  override escape(): boolean {
    if (!this.first) return false;
    this.first = null;
    this.points = [];
    return true;
  }

  protected preview(): Overlay {
    if (!this.first) return {};
    const w = this.s.model.elements[this.first.wallId];
    const to = w && this.cur ? nearestOnPath(w.path, this.cur).point : null;
    return { hover: [this.first.wallId], markers: to ? [this.first.at, to] : [this.first.at] };
  }
}
