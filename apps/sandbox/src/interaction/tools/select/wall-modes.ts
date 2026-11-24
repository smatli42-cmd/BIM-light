// Přímá úprava vybrané stěny (katalog kreslení, část 5): uzel se posouvá klikem nebo tažením,
// tažení líce stěnu odsadí (tloušťka zůstává), „Přidat bod“ ji rozdělí.
import {
  add,
  allWallGeometry,
  dist,
  dot,
  endPoint,
  leftNormal,
  mul,
  nearestOnPath,
  parseNumber,
  roundTo,
  sub,
  tangentAt,
  type Id,
  type PathEnd,
  type Vec2,
  type WallFace,
} from '@bim-light/core';
import type { Session } from '../../../session/session.ts';
import { clearTyped, editTyped } from '../../../session/ui-state.ts';
import { DRAG_PX, type Mode } from '../../mode.ts';
import type { KeyInfo, Overlay, PointerInfo, TrackerField } from '../../types.ts';

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

abstract class ClickOrDrag implements Mode {
  active = true;
  protected moved = false;
  protected last: PointerInfo;
  private readonly startScreen: Vec2;

  constructor(
    protected readonly s: Session,
    start: PointerInfo,
    protected dragging: boolean,
  ) {
    this.last = start;
    this.startScreen = start.screen;
  }

  move(p: PointerInfo) {
    const d = Math.hypot(p.screen.x - this.startScreen.x, p.screen.y - this.startScreen.y);
    if (this.dragging && d > DRAG_PX) this.moved = true;
    this.update(p);
  }

  up(p: PointerInfo) {
    if (!this.dragging) return;
    this.dragging = false;
    if (this.moved) this.finish(p);
  }

  down(p: PointerInfo): boolean {
    if (p.button !== 0) {
      this.escape();
      return true;
    }
    this.update(p);
    this.finish(p);
    return true;
  }

  key(k: KeyInfo): boolean {
    if (k.key === 'Enter') {
      this.finish(this.last);
      return true;
    }
    if (editTyped(this.s.typed, k.key, false)) {
      this.update(this.last);
      return true;
    }
    return false;
  }

  escape() {
    this.active = false;
    clearTyped(this.s.typed);
  }

  protected done() {
    this.active = false;
    clearTyped(this.s.typed);
  }

  protected typedValue(): number | null {
    const v = parseNumber(this.s.typed.len);
    return this.s.typed.len !== '' && Number.isFinite(v) ? v : null;
  }

  protected abstract update(p: PointerInfo): void;
  protected abstract finish(p: PointerInfo): void;
  abstract overlay(): Overlay;
}

/** Posun uzlu: pohne se uchopený konec, stěny v rohu jdou s ním (základ 25). */
export class NodeMode extends ClickOrDrag {
  readonly hint = 'Klikni nebo pusť uzel na nové místo (přichytává se). U uzlu jiné stěny se konec napojí.';
  private point: Vec2;

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
    this.point = this.s.snap(p.world, { alt: p.alt, exclude: new Set([this.wallId]) }).point;
  }

  protected finish() {
    this.done();
    const target = nodeTarget(this.s, this.wallId, this.point, this.s.viewport.px(14));
    this.s.run('wall.moveEndpoint', {
      wallId: this.wallId,
      end: this.end,
      point: this.point,
      ...(target ? { connectTo: target } : {}),
    });
  }

  overlay(): Overlay {
    const w = this.s.model.elements[this.wallId];
    if (!w) return {};
    const other = endPoint(w.path, this.end === 'start' ? 'end' : 'start');
    return { lines: [[other, this.point]], markers: [this.point] };
  }
}

/** Odsazení stěny tažením líce nebo z nabídky (číslo = vzdálenost, směr podle myši). */
export class OffsetMode extends ClickOrDrag {
  readonly hint = 'Táhni nebo klikni; napiš vzdálenost a Enter. Navazující stěny se natáhnou.';
  private distance = 0;

  constructor(
    s: Session,
    private readonly wallId: Id,
    private readonly face: WallFace,
    start: PointerInfo,
    drag: boolean,
  ) {
    super(s, start, drag);
  }

  private normal(): Vec2 {
    const w = this.s.model.elements[this.wallId];
    return w ? leftNormal(tangentAt(w.path, 'start')) : { x: 0, y: 1 };
  }

  protected update(p: PointerInfo) {
    this.last = p;
    const g = allWallGeometry(this.s.model, this.s.storeyId).get(this.wallId);
    if (!g) return;
    const foot = nearestOnPath(g.faces[this.face], p.world).point;
    const d = roundTo(dot(sub(p.world, foot), this.normal()));
    const typed = this.typedValue();
    this.distance = typed !== null ? Math.sign(d || 1) * typed : d;
  }

  protected finish() {
    this.done();
    if (Math.abs(this.distance) > 0.5)
      this.s.run('wall.offset', { wallId: this.wallId, distance: this.distance });
  }

  overlay(): Overlay {
    const g = allWallGeometry(this.s.model, this.s.storeyId).get(this.wallId);
    const v = mul(this.normal(), this.distance);
    return g ? { ghosts: [g.outline.map((q) => add(q, v))] } : {};
  }

  tracker(): TrackerField[] {
    const t = this.s.typed.len;
    return [{ label: 'Odsazení', value: t !== '' ? `${t}▏` : String(Math.abs(this.distance)), active: true }];
  }
}

/** Přidat bod: rozdělí stěnu ve vzdálenosti od začátku (myš nebo číslo). */
export class AddPointMode extends ClickOrDrag {
  readonly hint = 'Klikni na místo nového bodu, nebo napiš vzdálenost od začátku stěny a Enter.';
  private at: Vec2 | null = null;

  constructor(
    s: Session,
    private readonly wallId: Id,
    start: PointerInfo,
  ) {
    super(s, start, false);
  }

  protected update(p: PointerInfo) {
    this.last = p;
    const w = this.s.model.elements[this.wallId];
    if (!w) return;
    const dir = tangentAt(w.path, 'start');
    const len = dist(w.path.start, w.path.end);
    const typed = this.typedValue();
    const t = typed ?? roundTo(dot(sub(p.world, w.path.start), dir));
    this.at = add(w.path.start, mul(dir, Math.max(0, Math.min(len, t))));
  }

  protected finish() {
    this.done();
    if (this.at) this.s.run('wall.split', { wallId: this.wallId, point: this.at });
  }

  overlay(): Overlay {
    return this.at ? { markers: [this.at] } : {};
  }

  tracker(): TrackerField[] | null {
    const w = this.s.model.elements[this.wallId];
    if (!w || !this.at) return null;
    const t = this.s.typed.len;
    return [
      {
        label: 'Od začátku',
        value: t !== '' ? `${t}▏` : String(Math.round(dist(w.path.start, this.at))),
        active: true,
      },
    ];
  }
}
