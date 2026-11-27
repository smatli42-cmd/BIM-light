// Přímá úprava vybrané stěny (katalog kreslení, část 5): tažení líce stěnu odsadí (tloušťka zůstává),
// „Přidat bod“ ji rozdělí. Posun uzlu je v `node-mode.ts`.
import {
  add,
  allWallGeometry,
  dist,
  dot,
  findWall,
  type Id,
  leftNormal,
  mul,
  nearestOnPath,
  roundTo,
  sub,
  tangentAt,
  type Vec2,
  type WallFace,
} from '@bim-light/core';
import { splitGap } from '../../../session/opening-defaults.ts';
import type { Session } from '../../../session/session.ts';
import type { Overlay, PointerInfo, TrackerField } from '../../types.ts';
import { ClickOrDrag } from './click-or-drag.ts';

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
    const w = findWall(this.s.model, this.wallId);
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
    return g ? { ghosts: g.outlines.map((l) => l.map((q) => add(q, v))) } : {};
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
    const w = findWall(this.s.model, this.wallId);
    if (!w) return;
    const dir = tangentAt(w.path, 'start');
    const len = dist(w.path.start, w.path.end);
    const typed = this.typedValue();
    const t = typed ?? roundTo(dot(sub(p.world, w.path.start), dir));
    this.at = add(w.path.start, mul(dir, Math.max(0, Math.min(len, t))));
  }

  protected finish() {
    this.done();
    if (this.at) this.s.run('wall.split', { wallId: this.wallId, point: this.at, ...splitGap(this.s) });
  }

  overlay(): Overlay {
    return this.at ? { markers: [this.at] } : {};
  }

  tracker(): TrackerField[] | null {
    const w = findWall(this.s.model, this.wallId);
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
