// Nástroj Deska (D2; Ardit „Deska“, Revit „Podlaha – hranice“) a obrys otvoru v desce (D3): mnohoúhelník,
// obdélník a natočený obdélník. Body se přichytávají jako u stěny (i k hranám a rohům desek a otvorů),
// pomocné čáry vedou i z už položených bodů. Tracker: mnohoúhelník délka / úhel, obdélník šířka / hloubka,
// natočený délka / úhel hrany a šířka (Tab, Enter). Dočasné kóty k nejbližším lícům a hranám: před prvním
// klikem od kurzoru, potom od položených bodů – klik na číslo je posune (katalog kreslení 3.3).
import {
  add,
  dist,
  outlineShift,
  rectTrackerPoint,
  rotatedWidthPoint,
  trackerPoint,
  type OutlineTempDimension,
  type SnapResult,
  type Vec2,
} from '@bim-light/core';
import type { Session } from '../../session/session.ts';
import { slabCreateParams } from '../../session/slab-defaults.ts';
import { clearTyped, editTyped } from '../../session/ui-state.ts';
import { draftOutlineViews, type TempDimView } from '../temp-layout.ts';
import type { KeyInfo, Overlay, PointerInfo, Tool, TrackerField } from '../types.ts';
import { editOutline } from '../value-edit.ts';
import { axisRect, lengthAngleFields, rectFields, rotatedRect, slabHint } from './slab-tool-parts.ts';
import { snapLabel } from './wall-chain.ts';

export { rotatedRect } from './slab-tool-parts.ts';

const inRect = (p: Vec2, r: { x: number; y: number; w: number; h: number }) =>
  p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;

export class SlabTool implements Tool {
  readonly id: 'slab' | 'opening';
  private pts: Vec2[] = [];
  private end: Vec2 | null = null;
  private snapRes: SnapResult | null = null;
  private last: PointerInfo | null = null;
  private length = 0;
  private angle = 0;
  private width = 0;

  /** `opening` = stejné kreslení obrysu pro otvor v desce (nástroj Otvor, volba „v desce“, D3). */
  constructor(
    private readonly s: Session,
    private readonly target: 'slab' | 'opening' = 'slab',
  ) {
    this.id = target;
  }

  private get method() {
    return this.target === 'slab' ? this.s.slab.method : this.s.openingDefaults.slabMethod;
  }

  hint(): string {
    const h = slabHint(this.method, this.pts.length);
    return this.target === 'slab' ? h : h.replaceAll('desky', 'otvoru v desce');
  }

  /** Obrys, který by vznikl dalším klikem (náhled). */
  private outline(): Vec2[] {
    const e = this.end;
    const [a, b] = this.pts;
    if (!e || !a) return [];
    if (this.method === 'rect') return axisRect(a, e);
    if (this.method === 'rotated') return b ? rotatedRect(a, b, e) : [a, e];
    return [...this.pts, e];
  }

  /** Směr poslední hrany (úhel v trackeru se měří od ní, jako u řetězu stěn). */
  private prevDir(): number | null {
    const [a, b] = this.pts.slice(-2);
    return a && b ? Math.atan2(b.y - a.y, b.x - a.x) : null;
  }

  /** Počítá se délka a úhel od posledního bodu (mnohoúhelník, první hrana natočeného). */
  private get chain(): boolean {
    return this.method === 'polygon' || (this.method === 'rotated' && this.pts.length === 1);
  }

  move(p: PointerInfo) {
    this.last = p;
    const n = this.pts.length;
    const from = this.chain ? (this.pts[n - 1] ?? null) : null;
    this.snapRes = this.s.snap(p.world, { from, orthoOnly: p.shift, alt: p.alt, guidePoints: this.pts });
    const typed = this.applyTyped(this.snapRes.point);
    if (typed.typed) this.snapRes = { ...this.snapRes, snap: null, guides: [] };
    this.end = typed.point;
  }

  /** Napsaná čísla trackeru (přednost před přichycením, katalog kreslení 2.5). */
  private applyTyped(mouse: Vec2): { point: Vec2; typed: boolean } {
    const t = this.s.typed;
    const [a, b] = this.pts;
    if (!a) return { point: mouse, typed: false };
    if (this.method === 'rect') return rectTrackerPoint(a, mouse, { width: t.len, depth: t.ang });
    if (this.method === 'rotated' && b) {
      const r = rotatedWidthPoint(a, b, mouse, t.len);
      this.width = r.width;
      return r;
    }
    const from = this.pts[this.pts.length - 1] as Vec2;
    const tr = trackerPoint(from, mouse, this.prevDir(), { length: t.len, angle: t.ang });
    this.length = tr.length;
    this.angle = tr.angleDeg;
    const first = this.pts[0] as Vec2;
    const close = this.method === 'polygon' && !tr.typed && this.pts.length >= 3;
    if (close && dist(tr.point, first) < this.s.viewport.px(10)) return { point: first, typed: false };
    return tr;
  }

  down(p: PointerInfo) {
    if (p.button === 2) return this.finishPolygon();
    if (p.button !== 0) return;
    const dim = this.dimAt(p.screen);
    if (dim) return this.editDim(dim);
    this.move(p);
    this.place();
  }

  /** Položí bod; podle metody obrys dokončí. */
  private place() {
    const e = this.end;
    if (!e) return;
    const n = this.pts.length;
    const first = this.pts[0];
    if (this.method === 'polygon' && n >= 3 && first && dist(e, first) < 1) return this.finishPolygon();
    if (n && dist(e, this.pts[n - 1] as Vec2) < 1) return;
    if ((this.method === 'rect' && n === 1) || (this.method === 'rotated' && n === 2))
      return this.create(this.outline());
    this.pts.push(e);
    clearTyped(this.s.typed);
  }

  private finishPolygon() {
    if (this.method === 'polygon' && this.pts.length >= 3) this.create(this.pts);
    else this.reset();
  }

  private create(outline: readonly Vec2[]) {
    const s = this.s;
    const r =
      this.target === 'slab'
        ? s.run('slab.create', { ...slabCreateParams(s), outline })
        : s.run('slabOpening.create', { storeyId: s.storeyId, outline, status: s.options.newStatus });
    if (r.ok) this.reset();
  }

  private reset() {
    this.pts = [];
    clearTyped(this.s.typed);
  }

  /** Dočasné kóty: od položených bodů, před prvním klikem od bodu pod kurzorem. */
  private dimViews(): TempDimView[] {
    const base = this.pts.length ? this.pts : this.end ? [this.end] : [];
    return draftOutlineViews(this.s, base);
  }

  /** Číslo kóty pod kurzorem (jen když už jsou položené body, jinak by kóta ujížděla s myší). */
  private dimAt(screen: Vec2): TempDimView | null {
    if (!this.pts.length) return null;
    return this.dimViews().find((v) => inRect(screen, v.textRect)) ?? null;
  }

  /** Nové číslo kóty posune položené body; druhý prvek stojí (základ 25). */
  private editDim(v: TempDimView) {
    editOutline(this.s, v, (value) => {
      const shift = outlineShift(v.temp as OutlineTempDimension, value);
      this.pts = this.pts.map((q) => add(q, shift));
      if (this.last) this.move(this.last);
    });
  }

  up() {}

  dblclick() {
    // Druhý stisk dvojkliku na stejném místě bod nepřidal (place ho přeskočí); obrys se uzavře.
    if (this.method === 'polygon') this.finishPolygon();
  }

  key(k: KeyInfo): boolean {
    const s = this.s;
    if (!this.pts.length) return false;
    if (k.key === 'Enter') {
      if (this.method === 'polygon' && s.typed.len === '' && s.typed.ang === '') this.finishPolygon();
      else this.place();
      return true;
    }
    if (k.key === 'Backspace' && s.typed[s.typed.field] === '') {
      this.pts.pop();
      return true;
    }
    const tab = this.method !== 'rotated' || this.pts.length === 1;
    if (!tab && s.typed.field !== 'len') s.typed.field = 'len';
    if (editTyped(s.typed, k.key, tab)) {
      if (this.last) this.move(this.last);
      return true;
    }
    return false;
  }

  escape(): boolean {
    if (!this.pts.length) return false;
    this.reset();
    return true;
  }

  overlay(): Overlay {
    const r = this.snapRes;
    const snap = r?.snap && this.end ? { point: this.end, label: snapLabel(r) } : null;
    const ghost = this.outline();
    return {
      snap,
      guides: r?.guides ?? [],
      ghosts: ghost.length >= 3 ? [ghost] : [],
      lines: ghost.length === 2 ? [[ghost[0] as Vec2, ghost[1] as Vec2]] : [],
      markers: this.pts,
      tempDims: this.s.cursor.inside || this.pts.length ? this.dimViews() : [],
    };
  }

  tracker(): TrackerField[] | null {
    const from = this.pts[this.pts.length - 1];
    const e = this.end;
    if (!from || !e) return null;
    if (!this.chain) return rectFields(this.method, this.pts, e, this.s.typed, this.width);
    return lengthAngleFields(from, e, this.s.typed, this.length, this.angle);
  }
}
