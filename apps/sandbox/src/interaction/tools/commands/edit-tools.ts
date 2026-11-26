// Zarovnat (L), Do rohu (T), Rozdělit (X), Obdélník (B), Okno přiblížení
// (pravidla-interakce: Příkazy nad výběrem a úpravy).
import {
  nearestOnPath,
  pickFace,
  selectableWallGeometry,
  wallsAt,
  type FaceRef,
  type Id,
  type Vec2,
} from '@bim-light/core';
import { splitGap } from '../../../session/opening-defaults.ts';
import { FACE_PX, type Session } from '../../../session/session.ts';
import type { Overlay } from '../../types.ts';
import { PointCommand } from './base.ts';

export class AlignTool extends PointCommand {
  readonly id = 'align';
  private ref: FaceRef | null = null;
  protected readonly steps = [
    'Klikni na líc, ke kterému se bude zarovnávat.',
    'Klikni na líc stěny, která se zarovná (posune). Další kliknutí zarovná další stěny, Esc končí.',
  ];

  override hint() {
    return this.steps[this.ref ? 1 : 0] ?? '';
  }

  protected click(p: Vec2) {
    const f = pickFace(selectableWallGeometry(this.s.model, this.s.view), p, this.s.viewport.px(FACE_PX));
    if (!f) return;
    const face = { wallId: f.wallId, face: f.face };
    if (!this.ref) this.ref = face;
    else this.s.run('wall.align', { reference: this.ref, target: face });
  }

  override escape() {
    if (!this.ref) return false;
    this.ref = null;
    return true;
  }

  protected preview(): Overlay {
    return { faces: this.ref ? [this.ref] : [] };
  }
}

/** Stěna pod bodem (pro Do rohu a Rozdělit). */
function wallAt(s: Session, p: Vec2): Id | null {
  return wallsAt(selectableWallGeometry(s.model, s.view), p, s.viewport.px(6))[0] ?? null;
}

export class TrimTool extends PointCommand {
  readonly id = 'trim';
  private firstPick: { wallId: Id; at: Vec2 } | null = null;
  protected readonly steps = [
    'Klikni na část první stěny, která zůstane.',
    'Klikni na část druhé stěny, která zůstane. Stěny se spojí v rohu. Esc končí.',
  ];

  override hint() {
    return this.steps[this.firstPick ? 1 : 0] ?? '';
  }

  protected click(_p: Vec2) {
    const raw = this.last?.world;
    const id = raw ? wallAt(this.s, raw) : null;
    if (!id || !raw) return;
    if (!this.firstPick) {
      this.firstPick = { wallId: id, at: raw };
      return;
    }
    const a = this.firstPick;
    this.firstPick = null;
    this.s.run('wall.trimToCorner', { wallA: a.wallId, keepA: a.at, wallB: id, keepB: raw });
  }

  override escape() {
    if (!this.firstPick) return false;
    this.firstPick = null;
    return true;
  }

  protected preview(): Overlay {
    return this.firstPick ? { hover: [this.firstPick.wallId] } : {};
  }
}

export class SplitTool extends PointCommand {
  readonly id = 'split';
  protected readonly steps = ['Klikni na stěnu v místě rozdělení. Esc končí.'];
  protected click(p: Vec2) {
    const raw = this.last?.world;
    const id = raw ? wallAt(this.s, raw) : null;
    const w = id ? this.s.model.elements[id] : undefined;
    if (!w) return;
    this.s.run('wall.split', { wallId: w.id, point: nearestOnPath(w.path, p).point, ...splitGap(this.s) });
  }

  protected preview(): Overlay {
    return {};
  }
}

/** Obdélník: dva rohy, nebo šířka (Tab výška) a Enter; směr podle myši. */
export class RectTool extends PointCommand {
  readonly id = 'rect';
  protected readonly steps = [
    'Klikni první roh obdélníku.',
    'Klikni protilehlý roh, nebo napiš šířku, Tab výšku, Enter.',
  ];

  protected override typedLabel() {
    return 'Šířka';
  }

  private corner(): Vec2 | null {
    const a = this.points[0];
    if (!a || !this.cur) return null;
    const w = this.typedNumber('len');
    const h = this.typedNumber('ang');
    const sx = Math.sign(this.cur.x - a.x) || 1;
    const sy = Math.sign(this.cur.y - a.y) || 1;
    return { x: w !== null ? a.x + sx * w : this.cur.x, y: h !== null ? a.y + sy * h : this.cur.y };
  }

  protected click(p: Vec2) {
    const a = this.points[0];
    if (!a) return this.next(p);
    const b = this.corner() ?? p;
    const r = this.s.run('wall.rectangle', {
      storeyId: this.s.storeyId,
      typeId: this.s.wallTypeId,
      a,
      b,
      side: this.s.wallSide,
      status: this.s.options.newStatus,
    });
    if (r.ok) this.s.selection.set(r.created);
    this.points = [];
  }

  protected preview(): Overlay {
    const a = this.points[0];
    const b = this.corner();
    if (!a || !b) return {};
    const c = [a, { x: b.x, y: a.y }, b, { x: a.x, y: b.y }];
    return { lines: c.map((q, i) => [q, c[(i + 1) % 4] as Vec2] as [Vec2, Vec2]) };
  }

  override tracker() {
    if (!this.points.length) return null;
    const t = this.s.typed;
    const a = this.points[0] as Vec2;
    const b = this.corner() ?? a;
    return [
      {
        label: 'Šířka',
        value: t.len !== '' ? `${t.len}▏` : String(Math.round(Math.abs(b.x - a.x))),
        active: t.field === 'len',
      },
      {
        label: 'Výška',
        value: t.ang !== '' ? `${t.ang}▏` : String(Math.round(Math.abs(b.y - a.y))),
        active: t.field === 'ang',
      },
    ];
  }
}

export class ZoomWindowTool extends PointCommand {
  readonly id = 'zoomwin';
  protected readonly steps = ['Klikni první roh okna přiblížení.', 'Klikni protilehlý roh.'];

  protected click(p: Vec2) {
    const a = this.points[0];
    if (!a) return this.next(p);
    this.s.viewport.zoomToBox(
      Math.min(a.x, p.x),
      Math.min(a.y, p.y),
      Math.max(a.x, p.x),
      Math.max(a.y, p.y),
      10,
    );
    this.s.setTool('select');
  }

  protected preview(): Overlay {
    const a = this.points[0];
    if (!a || !this.cur) return {};
    const v = this.s.viewport;
    return { box: { a: v.toScreen(a), b: v.toScreen(this.cur), crossing: false } };
  }
}
