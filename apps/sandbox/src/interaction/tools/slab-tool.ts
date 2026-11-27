// Nástroj Deska (D2; Ardit „Deska“, Revit „Podlaha – hranice“) a obrys otvoru v desce (D3): mnohoúhelník,
// obdélník a natočený obdélník. Body se přichytávají jako u stěny; u mnohoúhelníku tracker délky a úhlu
// (Tab, Enter), klik na první bod / dvojklik / pravé tlačítko obrys uzavře, Backspace vrátí bod.
import {
  add,
  dist,
  dot,
  leftNormal,
  mul,
  norm,
  sub,
  trackerPoint,
  type SnapResult,
  type Vec2,
} from '@bim-light/core';
import type { Session } from '../../session/session.ts';
import { slabCreateParams } from '../../session/slab-defaults.ts';
import { clearTyped, editTyped } from '../../session/ui-state.ts';
import { deltaFields, trackerMm } from '../tracker-fields.ts';
import type { KeyInfo, Overlay, PointerInfo, Tool, TrackerField } from '../types.ts';
import { snapLabel } from './wall-chain.ts';

/** Obdélník s hranou a–b a protější stranou procházející bodem c (natočený obdélník). */
export function rotatedRect(a: Vec2, b: Vec2, c: Vec2): Vec2[] {
  const n = leftNormal(norm(sub(b, a)));
  const h = mul(n, dot(sub(c, a), n));
  return [a, b, add(b, h), add(a, h)];
}

const axisRect = (a: Vec2, b: Vec2): Vec2[] => [a, { x: b.x, y: a.y }, b, { x: a.x, y: b.y }];

export class SlabTool implements Tool {
  readonly id: 'slab' | 'opening';
  private pts: Vec2[] = [];
  private end: Vec2 | null = null;
  private snapRes: SnapResult | null = null;
  private last: PointerInfo | null = null;
  private length = 0;
  private angle = 0;

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
    const h = this.rawHint();
    return this.target === 'slab' ? h : h.replaceAll('desky', 'otvoru v desce');
  }

  private rawHint(): string {
    const n = this.pts.length;
    if (this.method === 'rect')
      return n ? 'Klikni protější roh obdélníku. Esc zruší.' : 'Klikni první roh desky (přichytává se).';
    if (this.method === 'rotated')
      return (
        ['Klikni začátek první hrany desky.', 'Klikni konec první hrany.', 'Klikni šířku desky.'][n] ?? ''
      );
    if (!n) return 'Klikni první bod obrysu desky (přichytává se; Alt vypne).';
    return 'Klikni další bod, nebo napiš délku (Tab = úhel) a Enter. Klik na první bod, dvojklik nebo pravé tlačítko obrys uzavře; Backspace vrátí bod.';
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

  move(p: PointerInfo) {
    this.last = p;
    const from = this.pts[this.pts.length - 1] ?? null;
    this.snapRes = this.s.snap(p.world, { from, orthoOnly: p.shift, alt: p.alt });
    let end = this.snapRes.point;
    if (from && this.method === 'polygon') {
      const t = this.s.typed;
      const tr = trackerPoint(from, end, this.prevDir(), { length: t.len, angle: t.ang });
      end = tr.point;
      const first = this.pts[0] as Vec2;
      if (!tr.typed && this.pts.length >= 3 && dist(end, first) < this.s.viewport.px(10)) end = first;
      if (tr.typed) this.snapRes = { ...this.snapRes, snap: null, guides: [] };
      this.length = tr.length;
      this.angle = tr.angleDeg;
    }
    this.end = end;
  }

  down(p: PointerInfo) {
    if (p.button === 2) return this.finishPolygon();
    if (p.button !== 0) return;
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
    if (this.method === 'polygon' && editTyped(s.typed, k.key, true)) {
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
    };
  }

  tracker(): TrackerField[] | null {
    const from = this.pts[this.pts.length - 1];
    const e = this.end;
    if (!from || !e) return null;
    if (this.method === 'rect') {
      const a = this.pts[0] as Vec2;
      return [
        { label: 'Šířka', value: trackerMm(Math.abs(e.x - a.x)), active: false },
        { label: 'Hloubka', value: trackerMm(Math.abs(e.y - a.y)), active: false },
      ];
    }
    if (this.method !== 'polygon')
      return [{ label: 'Délka', value: trackerMm(dist(from, e)), active: false }];
    const t = this.s.typed;
    const ang = String(Math.round(this.angle * 10) / 10).replace('.', ',');
    return [
      {
        label: 'Délka',
        value: t.len !== '' ? `${t.len}▏` : trackerMm(this.length),
        active: t.field === 'len',
      },
      { label: 'Úhel', value: t.ang !== '' ? `${t.ang}▏` : `${ang}°`, active: t.field === 'ang' },
      ...deltaFields(from, e),
    ];
  }
}
