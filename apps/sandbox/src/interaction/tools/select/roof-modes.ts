// Úchop hrany obrysu střechy (S2; základ 25 – pohne se jen uchopená hrana): kolečko uprostřed hrany ref.
// čáry vybrané střechy se táhne (nebo klik a druhý klik) – hrana se posune rovnoběžně, sousední hrany se
// prodlouží / zkrátí. Přichytává se (Alt vypne), tracker ukazuje posun a jde do něj napsat číslo (Enter),
// Esc zruší; výsledek je jeden příkaz roof.moveEdge (jedno Undo).
import { dot, findRoof, norm, sub, type Model, type Vec2 } from '@bim-light/core';
import type { SlabGripView } from '../../hits.ts';
import type { Session } from '../../../session/session.ts';
import { trackerMm } from '../../tracker-fields.ts';
import type { Mode } from '../../mode.ts';
import type { Overlay, PointerInfo, TrackerField } from '../../types.ts';
import { ClickOrDrag } from './click-or-drag.ts';
import { OutlineVertexMode } from './slab-modes.ts';

export class RoofEdgeMode extends ClickOrDrag {
  readonly hint =
    'Táhni hranu střechy (posun kolmo k hraně), nebo napiš posun a Enter; kladně ven. Esc zruší, Alt vypne přichytávání.';
  private distance = 0;
  private preview: Model | null = null;
  private readonly out: Vec2;
  private readonly from: Vec2;

  constructor(
    s: Session,
    private readonly roofId: string,
    private readonly index: number,
    start: PointerInfo,
  ) {
    super(s, start, true);
    const o = findRoof(s.model, roofId)?.outline ?? [];
    const a = o[index] ?? start.world;
    const b = o[(index + 1) % o.length] ?? start.world;
    const d = norm(sub(b, a));
    // Ven = vpravo od směru hrany (obrys je proti směru hodin).
    this.out = { x: d.y, y: -d.x };
    this.from = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }

  private params(distance: number) {
    return { roofId: this.roofId, index: this.index, distance: Math.round(distance * 10) / 10 };
  }

  protected update(p: PointerInfo) {
    this.last = p;
    const typed = this.typedValue();
    const o = findRoof(this.s.model, this.roofId)?.outline ?? [];
    const snapped = this.s.snap(p.world, {
      alt: p.alt,
      exclude: new Set([this.roofId]),
      guidePoints: o,
    }).point;
    this.distance = typed ?? dot(sub(snapped, this.from), this.out);
    this.preview =
      Math.abs(this.distance) > 0.5
        ? this.s.editor.preview('roof.moveEdge', this.params(this.distance))
        : null;
  }

  protected finish() {
    this.done();
    this.preview = null;
    if (Math.abs(this.distance) > 0.5) this.s.run('roof.moveEdge', this.params(this.distance));
  }

  tracker(): TrackerField[] {
    const t = this.s.typed.len;
    return [{ label: 'Posun', value: t !== '' ? `${t}▏` : trackerMm(this.distance), active: true }];
  }

  overlay(): Overlay {
    const to = { x: this.from.x + this.out.x * this.distance, y: this.from.y + this.out.y * this.distance };
    return { previewModel: this.preview, lines: [[this.from, to]], markers: [to] };
  }
}

/** Režim pro úchop obrysu desky / otvoru / střechy: uzel = posun bodu, kolečko hrany střechy = posun hrany. */
export function outlineGripMode(s: Session, g: SlabGripView, p: PointerInfo): Mode {
  if (g.kind === 'roof' && g.end === 'mid') return new RoofEdgeMode(s, g.id, g.index, p);
  return new OutlineVertexMode(s, g.kind, g.id, g.index, p, true);
}
