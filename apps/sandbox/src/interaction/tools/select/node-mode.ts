// Posun uzlu vybrané stěny (katalog kreslení 5): klik nebo tažení, přichytávání od pevného konce,
// náhled a dočasné kóty během tažení, napojení na volný konec jiné stěny.
import { dist, endPoint, type Id, type Model, type PathEnd, type Vec2 } from '@bim-light/core';
import type { Session } from '../../../session/session.ts';
import type { Overlay, PointerInfo } from '../../types.ts';
import { ClickOrDrag } from './click-or-drag.ts';

/** Volný konec jiné stěny pod bodem (přitažení uzlu = napojení, katalog kreslení 5). */
function nodeTarget(s: Session, wallId: Id, p: Vec2, tol: number) {
  for (const w of Object.values(s.model.elements)) {
    if (w.id === wallId || w.storeyId !== s.storeyId) continue;
    for (const end of ['start', 'end'] as const) {
      if (dist(endPoint(w.path, end), p) <= tol)
        return { wallId: w.id, at: end === 'start' ? ('ATSTART' as const) : ('ATEND' as const) };
    }
  }
  return null;
}

/** Posun uzlu: pohne se uchopený konec, stěny v rohu jdou s ním (základ 25). */
export class NodeMode extends ClickOrDrag {
  readonly hint = 'Klikni nebo pusť uzel na nové místo (přichytává se). U uzlu jiné stěny se konec napojí.';
  private point: Vec2;
  private preview: Model | null = null;

  constructor(
    s: Session,
    private readonly wallId: Id,
    private readonly end: PathEnd,
    start: PointerInfo,
    drag: boolean,
  ) {
    super(s, start, drag);
    s.lenEnd = end;
    const w = s.model.elements[wallId];
    this.point = w ? endPoint(w.path, end) : start.world;
  }

  protected update(p: PointerInfo) {
    this.last = p;
    // Jako při kreslení: od pevného konce platí úhlové kroky a délka se zaokrouhluje na 10 mm.
    const w = this.s.model.elements[this.wallId];
    const from = w ? endPoint(w.path, this.end === 'start' ? 'end' : 'start') : null;
    const opts = { alt: p.alt, orthoOnly: p.shift, from, exclude: new Set([this.wallId]) };
    this.point = this.s.snap(p.world, opts).point;
    // Náhled celé změny (navazující stěny, dočasné kóty – katalog kreslení 5.2), nic se neukládá.
    this.preview =
      this.moved || !this.dragging ? this.s.editor.preview('wall.moveEndpoint', this.params()) : null;
  }

  private params() {
    const target = nodeTarget(this.s, this.wallId, this.point, this.s.viewport.px(14));
    return {
      wallId: this.wallId,
      end: this.end,
      point: this.point,
      ...(target ? { connectTo: target } : {}),
    };
  }

  protected finish() {
    this.done();
    this.preview = null;
    this.s.run('wall.moveEndpoint', this.params());
  }

  overlay(): Overlay {
    const w = this.s.model.elements[this.wallId];
    if (!w) return {};
    const other = endPoint(w.path, this.end === 'start' ? 'end' : 'start');
    if (this.preview) return { previewModel: this.preview, markers: [this.point] };
    return { lines: [[other, this.point]], markers: [this.point] };
  }
}
