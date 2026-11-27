// Zakřivení stěny tažením středu hrany (plán stěn Z5, katalog kreslení 5.5): kolečko uprostřed vybrané
// stěny se táhne, konce stojí, oblouk prochází bodem pod kurzorem (přichytává se). Klik nebo puštění
// potvrdí příkaz wall.curve; oblouk do přímky vrátí „Vyrovnat“ v nabídce stěny.
import { endPoint, findWall, type Id, type Model, type Vec2 } from '@bim-light/core';
import type { Session } from '../../../session/session.ts';
import type { Overlay, PointerInfo } from '../../types.ts';
import { ClickOrDrag } from './click-or-drag.ts';

export class CurveMode extends ClickOrDrag {
  readonly hint =
    'Táhni střed stěny: konce stojí, stěna se prohne do oblouku. Číslo = poloměr, Enter. Alt vypne přichytávání.';
  private point: Vec2;
  private preview: Model | null = null;

  constructor(
    s: Session,
    private readonly wallId: Id,
    start: PointerInfo,
    drag: boolean,
  ) {
    super(s, start, drag);
    this.point = start.world;
  }

  protected update(p: PointerInfo) {
    this.last = p;
    this.point = this.s.snap(p.world, { alt: p.alt, exclude: new Set([this.wallId]) }).point;
    this.preview = this.moved || !this.dragging ? this.s.editor.preview('wall.curve', this.params()) : null;
  }

  /** Bod oblouku, nebo napsaný poloměr (strana středu podle kurzoru). */
  private params() {
    const r = this.typedValue();
    const w = findWall(this.s.model, this.wallId);
    if (r === null || !w) return { wallId: this.wallId, through: this.point };
    const d = { x: w.path.end.x - w.path.start.x, y: w.path.end.y - w.path.start.y };
    const left = d.x * (this.point.y - w.path.start.y) - d.y * (this.point.x - w.path.start.x) >= 0;
    return { wallId: this.wallId, radius: left ? -Math.abs(r) : Math.abs(r) };
  }

  protected finish() {
    this.done();
    this.preview = null;
    this.s.run('wall.curve', this.params());
  }

  overlay(): Overlay {
    const w = findWall(this.s.model, this.wallId);
    if (!w) return {};
    if (this.preview) return { previewModel: this.preview, markers: [this.point] };
    return {
      lines: [
        [endPoint(w.path, 'start'), this.point],
        [this.point, endPoint(w.path, 'end')],
      ],
      markers: [this.point],
    };
  }
}
