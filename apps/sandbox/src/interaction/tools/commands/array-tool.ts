// Pole (P): lineární (základní bod → poloha první kopie, nebo napsaná rozteč) nebo radiální
// (střed → výchozí směr → úhel mezi kopiemi). Počet a druh pole se nastavuje v panelu.
import { add, angleOf, mul, rotate, sub, type Vec2, type WallTransform } from '@bim-light/core';
import type { Overlay } from '../../types.ts';
import { PointCommand } from './base.ts';

const DEG = 180 / Math.PI;

export class ArrayTool extends PointCommand {
  readonly id = 'array';

  protected override get steps(): readonly string[] {
    return this.s.options.arrayRadial
      ? [
          'Radiální pole: klikni střed. Počet nastav v panelu vpravo.',
          'Klikni výchozí směr.',
          'Klikni směr první kopie, nebo napiš úhel mezi kopiemi a Enter.',
        ]
      : [
          'Klikni základní bod pole. Počet nastav v panelu vpravo.',
          'Klikni na polohu první kopie, nebo napiš rozteč a Enter.',
        ];
  }

  protected override typedLabel() {
    return this.s.options.arrayRadial ? 'Úhel' : 'Vzdálenost';
  }

  private transforms(): WallTransform[] | null {
    const n = Math.max(2, Math.round(this.s.options.arrayCount));
    const out: WallTransform[] = [];
    if (!this.s.options.arrayRadial) {
      const base = this.points[0];
      if (!base || !this.cur) return null;
      const v = sub(this.cur, base);
      for (let i = 1; i < n; i++) out.push({ kind: 'translate', vector: mul(v, i) });
      return out;
    }
    const step = this.radialStep();
    const center = this.points[0];
    if (step === null || !center) return null;
    for (let i = 1; i < n; i++) out.push({ kind: 'rotate', center, angleDeg: step * i });
    return out;
  }

  private radialStep(): number | null {
    const typed = this.typedNumber();
    if (typed !== null && this.points.length >= 1) return typed;
    const [c, r] = this.points;
    if (!c || !r || !this.cur) return null;
    return Math.round((angleOf(sub(this.cur, c)) - angleOf(sub(r, c))) * DEG * 100) / 100;
  }

  protected override liveValue() {
    if (!this.s.options.arrayRadial) return super.liveValue();
    return `${String(this.radialStep() ?? 0).replace('.', ',')}°`;
  }

  protected click(p: Vec2) {
    const need = this.s.options.arrayRadial ? 2 : 1;
    const typed = this.typedNumber() !== null;
    if (this.points.length < need && !(typed && this.points.length >= 1)) return this.next(p);
    const transforms = this.transforms();
    if (transforms?.length) this.s.run('wall.copy', { wallIds: this.ids, transforms });
    this.s.setTool('select');
  }

  protected preview(): Overlay {
    const ts =
      this.s.options.arrayRadial && this.points.length < 2 && this.typedNumber() === null
        ? null
        : this.transforms();
    if (!ts) return {};
    const ghosts = ts.flatMap((t) =>
      this.ghosts((q) =>
        t.kind === 'translate'
          ? add(q, t.vector)
          : t.kind === 'rotate'
            ? rotate(q, t.center, t.angleDeg / DEG)
            : q,
      ),
    );
    return { ghosts };
  }
}
