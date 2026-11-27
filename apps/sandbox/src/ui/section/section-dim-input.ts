// Nástroj Kóta v okně řezu (hlášení uživatele 2026-11-27; Revit / Archicad kóta v řezu): první klik na úroveň
// (podlaží, horní / spodní hrana prvku) nebo bok prvku, druhý klik na další úroveň / bok stejného směru,
// třetí klik umístí kótovací čáru. Úroveň = svislá kóta výšek, bok = vodorovná kóta po výkrese. Přichytí se
// do 8 px. Kóta pod kurzorem jde vybrat a táhnout (posun kótovací čáry). Jen příkazy sectionDim.*.
import {
  levelTargetAt,
  levelTargets,
  sectionDimPoints,
  sideTargets,
  type Id,
  type Model,
  type Primitive,
  type SectionDimRef,
  type Vec2,
} from '@bim-light/core';
import type { Viewport } from '../../canvas/viewport.ts';
import { AUX } from '../../render/overlay.ts';
import { drawPrimitive, type RenderContext } from '../../render/primitives.ts';
import type { Session } from '../../session/session.ts';

const SNAP_PX = 8;

/** Cíl kóty: odkaz, směr kóty a souřadnice (z u úrovně, u u boku). */
interface Pick {
  readonly ref: SectionDimRef;
  readonly vertical: boolean;
  readonly at: number;
  /** Rozsah, kde cíl leží (u úrovně u, u boku z) – pro zvýraznění. */
  readonly from: number;
  readonly to: number;
}

const segDist = (p: Vec2, a: Vec2, b: Vec2) => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2));
  return Math.hypot(p.x - a.x - dx * t, p.y - a.y - dy * t);
};

export class SectionDimInput {
  private a: Pick | null = null;
  private b: Pick | null = null;
  private hover: Pick | null = null;
  private mouse: Vec2 | null = null;
  private cache: { model: Model; picks: Pick[] } | null = null;

  constructor(
    private readonly s: Session,
    private readonly sectionId: Id,
    private readonly v: Viewport,
  ) {}

  get active(): boolean {
    return this.s.tool.id === 'dimension';
  }

  private picks(): Pick[] {
    const m = this.s.model;
    const sec = m.sections[this.sectionId];
    if (!sec) return [];
    if (this.cache?.model === m) return this.cache.picks;
    const big = 1e9;
    const levels = levelTargets(m, this.sectionId).map((t) => ({
      ref: t.ref,
      vertical: true,
      at: t.z,
      from: Number.isFinite(t.u0) ? t.u0 : -big,
      to: Number.isFinite(t.u1) ? t.u1 : big,
    }));
    const sides = sideTargets(m, sec).map((t) => ({
      ref: t.ref,
      vertical: false,
      at: t.u,
      from: t.z0,
      to: t.z1,
    }));
    this.cache = { model: m, picks: [...sides, ...levels] };
    return this.cache.picks;
  }

  /** Nejbližší cíl do 8 px; po prvním kliku jen stejného směru. */
  private pickAt(p: Vec2): Pick | null {
    const tol = this.v.px(SNAP_PX);
    let best: Pick | null = null;
    let bestD = tol;
    for (const t of this.picks()) {
      if (this.a && t.vertical !== this.a.vertical) continue;
      const along = t.vertical ? p.x : p.y;
      if (along < t.from - tol || along > t.to + tol) continue;
      const d = Math.abs((t.vertical ? p.y : p.x) - t.at);
      if (d <= bestD) [best, bestD] = [t, d];
    }
    return best ?? (this.a ? null : this.levelOnly(p, tol));
  }

  /** Úroveň podlaží kdekoli na výkrese (i mimo prvky). */
  private levelOnly(p: Vec2, tol: number): Pick | null {
    const t = levelTargetAt(levelTargets(this.s.model, this.sectionId), p.x, p.y, tol);
    return t ? { ref: t.ref, vertical: true, at: t.z, from: -1e9, to: 1e9 } : null;
  }

  click(p: Vec2) {
    if (!this.a) return void (this.a = this.pickAt(p));
    if (!this.b) return void (this.b = this.pickAt(p));
    const r = this.s.run('sectionDim.create', {
      sectionId: this.sectionId,
      a: this.a.ref,
      b: this.b.ref,
      offset: this.a.vertical ? p.x : p.y,
    });
    if (r.ok) this.a = this.b = null;
  }

  move(p: Vec2) {
    this.mouse = p;
    this.hover = this.b ? null : this.pickAt(p);
  }

  escape(): boolean {
    if (this.b) this.b = null;
    else if (this.a) this.a = null;
    else return false;
    return true;
  }

  /** Kóta v řezu pod kurzorem (do 4 px od kótovací čáry). */
  hit(p: Vec2): { id: Id; vertical: boolean; offset: number } | null {
    const sec = this.s.model.sections[this.sectionId];
    if (!sec) return null;
    for (const d of Object.values(this.s.model.sectionDims)) {
      if (d.sectionId !== sec.id) continue;
      const pts = sectionDimPoints(this.s.model, sec, d);
      if (pts && segDist(p, pts[0], pts[1]) <= this.v.px(4))
        return { id: d.id, vertical: d.orientation === 'vertical', offset: d.offset };
    }
    return null;
  }

  overlay(r: RenderContext) {
    const line = (a: Vec2, b: Vec2, dashed: boolean): Primitive => ({
      kind: 'line',
      points: [a, b],
      closed: false,
      stroke: { pen: 1, color: AUX, lineType: dashed ? 'dashed' : 'solid' },
      source: { role: 'náhled' },
    });
    const mark = (t: Pick) => {
      const m = this.mouse;
      const lo = Math.max(t.from, (t.vertical ? (m?.x ?? 0) : (m?.y ?? 0)) - this.v.px(300));
      const hi = Math.min(t.to, (t.vertical ? (m?.x ?? 0) : (m?.y ?? 0)) + this.v.px(300));
      return t.vertical
        ? line({ x: lo, y: t.at }, { x: hi, y: t.at }, true)
        : line({ x: t.at, y: lo }, { x: t.at, y: hi }, true);
    };
    const prims = [this.a, this.b, this.hover].filter((t): t is Pick => !!t).map(mark);
    const m = this.mouse;
    if (this.a && this.b && m) {
      prims.push(
        this.a.vertical
          ? line({ x: m.x, y: this.a.at }, { x: m.x, y: this.b.at }, false)
          : line({ x: this.a.at, y: m.y }, { x: this.b.at, y: m.y }, false),
      );
    }
    for (const p of prims) drawPrimitive(r, p, AUX);
  }
}
