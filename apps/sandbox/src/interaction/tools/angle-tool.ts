// Nástroj Úhel (U, pravidla-interakce kóty 9): klik na dvě stěny vytvoří úhlovou kótu.
// Číslo se mění kliknutím (otočí se vybraná stěna, jinak druhá), zámek funguje (0,05°).
import { angleGeometry, dist, selectableWallGeometry, wallsAt, type Id } from '@bim-light/core';
import type { Session } from '../../session/session.ts';
import type { KeyInfo, Overlay, PointerInfo, Tool } from '../types.ts';

export class AngleTool implements Tool {
  readonly id = 'angle';
  private first: Id | null = null;
  private hover: Id | null = null;

  constructor(private readonly s: Session) {}

  hint(): string {
    return this.first ? 'Klikni na druhou stěnu. Úhel se zakótuje.' : 'Klikni na první stěnu úhlu.';
  }

  private wall(p: PointerInfo): Id | null {
    return (
      wallsAt(selectableWallGeometry(this.s.model, this.s.view), p.world, this.s.viewport.px(4))[0] ?? null
    );
  }

  move(p: PointerInfo) {
    this.hover = this.wall(p);
  }

  down(p: PointerInfo) {
    if (p.button !== 0) {
      this.first = null;
      return;
    }
    const id = this.wall(p);
    if (!id) return;
    if (!this.first) {
      this.first = id;
      return;
    }
    if (id === this.first) return this.s.toast('Vyber dvě různé stěny.', 'bad');
    const g = angleGeometry(this.s.model, [this.first, id]);
    if (!g) {
      this.first = null;
      return this.s.toast('Stěny jsou rovnoběžné, úhel nemají.', 'bad');
    }
    const radius = Math.max(300, Math.round(dist(g.vertex, p.world) / 10) * 10);
    this.s.run('dimension.create', {
      kind: 'angular',
      wallIds: [this.first, id],
      ownerRef: 1,
      radius,
      viewId: this.s.viewId,
    });
    this.first = null;
  }

  up() {}

  key(_k: KeyInfo): boolean {
    return false;
  }

  escape(): boolean {
    if (!this.first) return false;
    this.first = null;
    return true;
  }

  overlay(): Overlay {
    return { hover: [this.first, this.hover].filter((x): x is Id => !!x) };
  }

  tracker() {
    return null;
  }
}
