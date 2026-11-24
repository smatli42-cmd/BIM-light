// Přesun (M), Kopie (K), Otočit (R), Zrcadlit (F) (pravidla-interakce: Příkazy nad výběrem; základ 25:
// pohnou se vybrané stěny, navazující se natáhnou, nic dalšího se nehýbe).
import { add, angleOf, dot, mul, norm, rotate, sub, type Vec2 } from '@bim-light/core';
import type { Overlay, PointerInfo } from '../../types.ts';
import { PointCommand } from './base.ts';

const DEG = 180 / Math.PI;

export class MoveTool extends PointCommand {
  readonly id: 'move' | 'copy' = 'move';
  protected readonly steps = [
    'Klikni základní bod přesunu (přichytává se). Esc ruší.',
    'Klikni na cíl, nebo napiš vzdálenost a Enter (směr podle myši). Esc ruší.',
  ];

  protected override typedLabel() {
    return 'Vzdálenost';
  }

  protected click(p: Vec2) {
    const base = this.points[0];
    if (!base) return this.next(p);
    this.s.run('wall.move', { wallIds: this.ids, vector: sub(p, base) });
    this.s.setTool('select');
  }

  protected preview(): Overlay {
    const base = this.points[0];
    if (!base || !this.cur) return {};
    const v = sub(this.cur, base);
    return { ghosts: this.ghosts((q) => add(q, v)), lines: [[base, this.cur]] };
  }
}

export class CopyTool extends MoveTool {
  override readonly id = 'copy';
  protected override readonly steps = [
    'Klikni základní bod kopírování. Esc ruší.',
    'Klikni na cíl kopie, nebo napiš vzdálenost a Enter. Dál klikej na další kopie, Esc končí.',
  ];

  protected override click(p: Vec2) {
    const base = this.points[0];
    if (!base) return this.next(p);
    this.s.run('wall.copy', { wallIds: this.ids, transforms: [{ kind: 'translate', vector: sub(p, base) }] });
  }
}

/** Otočení: střed, výchozí směr, koncový směr (nebo napsaný úhel). Kopie = volba nebo Ctrl. */
export class RotateTool extends PointCommand {
  readonly id = 'rotate';
  protected readonly steps = [
    'Klikni střed otáčení.',
    'Klikni výchozí směr, nebo napiš úhel (kladný = proti směru hodin) a Enter.',
    'Klikni koncový směr, nebo napiš úhel a Enter. Ctrl / volba Kopie = otočit kopii.',
  ];

  protected override typedLabel() {
    return 'Úhel';
  }

  private angle(): number {
    const typed = this.typedNumber();
    if (typed !== null) return typed;
    const [c, r] = this.points;
    if (!c || !r || !this.cur) return 0;
    return Math.round((angleOf(sub(this.cur, c)) - angleOf(sub(r, c))) * DEG * 100) / 100;
  }

  protected override liveValue() {
    return `${String(this.angle()).replace('.', ',')}°`;
  }

  protected click(p: Vec2, info: PointerInfo) {
    const typed = this.typedNumber();
    if (!this.points.length) return this.next(p);
    if (this.points.length === 1 && typed === null) return this.next(p);
    this.apply(info.ctrl);
  }

  private apply(ctrl: boolean) {
    const center = this.points[0] as Vec2;
    const angleDeg = this.angle();
    if (Math.abs(angleDeg) > 1e-6) {
      if (this.s.options.copy || ctrl)
        this.s.run('wall.copy', { wallIds: this.ids, transforms: [{ kind: 'rotate', center, angleDeg }] });
      else this.s.run('wall.rotate', { wallIds: this.ids, center, angleDeg });
    }
    this.s.setTool('select');
  }

  protected preview(): Overlay {
    const c = this.points[0];
    if (!c || !this.cur) return {};
    const lines: [Vec2, Vec2][] = [[c, this.cur]];
    if (this.points[1]) lines.push([c, this.points[1]]);
    if (this.points.length < 2 && this.typedNumber() === null) return { lines };
    const a = this.angle() / DEG;
    return { lines, ghosts: this.ghosts((q) => rotate(q, c, a)) };
  }
}

/** Zrcadlení podle osy ze dvou bodů; vznikne kopie, Shift+klik původní stěny nahradí. */
export class MirrorTool extends PointCommand {
  readonly id = 'mirror';
  protected readonly steps = [
    'Klikni první bod osy zrcadlení.',
    'Klikni druhý bod osy. Vznikne zrcadlená kopie; Shift+klik původní stěny nahradí.',
  ];

  protected click(p: Vec2, info: PointerInfo) {
    const a = this.points[0];
    if (!a) return this.next(p);
    this.s.run('wall.copy', {
      wallIds: this.ids,
      transforms: [{ kind: 'mirror', a, b: p }],
      replace: info.shift,
    });
    this.s.setTool('select');
  }

  protected preview(): Overlay {
    const a = this.points[0];
    if (!a || !this.cur) return {};
    const d = norm(sub(this.cur, a));
    const m = (q: Vec2) => add(a, sub(mul(d, 2 * dot(sub(q, a), d)), sub(q, a)));
    return { lines: [[a, this.cur]], ghosts: this.ghosts(m) };
  }
}
