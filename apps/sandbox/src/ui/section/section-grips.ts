// Úchopy v okně řezu (pokyn uživatele 2026-11-27; základ 25, Revit „shape handles“, Archicad horké body):
// vybraná stěna, deska a otvor mají úchop na horní a spodní hraně. Tažení (nebo klik a druhý klik) posune jen
// uchopenou hranu; přichytí se k úrovním podlaží a hranám ostatních prvků (Alt vypne), číslo v trackeru jde
// napsat (Enter), Esc zruší. Model mění jen příkaz element.setEdgeLevel (stejně jako AI), jedno Undo.
import {
  drawSection,
  edgeMeasure,
  roundTo,
  sectionGrips,
  sectionSnapLevels,
  snapLevel,
  type Id,
  type Model,
  type Primitive,
  type SectionGrip,
  type SnapLevel,
  type Vec2,
} from '@bim-light/core';
import type { Viewport } from '../../canvas/viewport.ts';
import { isNumberKey } from '../../session/ui-state.ts';
import { AUX } from '../../render/overlay.ts';
import { drawPrimitive, type RenderContext } from '../../render/primitives.ts';
import type { Session } from '../../session/session.ts';

const GRIP_PX = 6;
const SNAP_PX = 8;
const DRAG_PX = 4;

/** Pole trackeru u kurzoru v okně řezu. */
export interface SectionTracker {
  readonly label: string;
  readonly value: string;
  readonly at: Vec2;
}

interface Active {
  readonly grip: SectionGrip;
  readonly start: Vec2;
  readonly levels: SnapLevel[];
  z: number;
  snap: SnapLevel | null;
  moved: boolean;
  /** Úchop zůstal po kliku bez tažení: další klik nebo Enter dokončí. */
  clicked: boolean;
  typed: string;
  screen: Vec2;
}

export class SectionGrips {
  private cache: { model: Model; key: string; grips: SectionGrip[] } | null = null;
  private act: Active | null = null;

  constructor(
    private readonly s: Session,
    private readonly sectionId: Id,
    private readonly v: Viewport,
  ) {}

  get active(): boolean {
    return !!this.act;
  }

  /** Úchopy vybraných prvků (stěny, desky, otvory), které řez ukazuje. */
  grips(): SectionGrip[] {
    const sec = this.s.model.sections[this.sectionId];
    const sel = this.s.selection;
    const ids = [...sel.walls, ...sel.slabs, ...sel.openings];
    if (!sec || !ids.length || ids.length > 30) return [];
    const key = ids.join();
    if (this.cache?.model !== this.s.model || this.cache.key !== key)
      this.cache = { model: this.s.model, key, grips: sectionGrips(this.s.model, sec, ids) };
    return this.cache.grips;
  }

  /** Úchop pod kurzorem (bod výkresu). */
  hit(p: Vec2): SectionGrip | null {
    const tol = this.v.px(GRIP_PX);
    return this.grips().find((g) => Math.abs(g.u - p.x) <= tol && Math.abs(g.z - p.y) <= tol) ?? null;
  }

  /** Stisk na úchopu: začne tažení. */
  press(grip: SectionGrip, screen: Vec2) {
    const sec = this.s.model.sections[this.sectionId];
    if (!sec) return;
    const levels = sectionSnapLevels(this.s.model, sec, grip.elementId);
    this.act = {
      grip,
      start: screen,
      levels,
      z: grip.z,
      snap: null,
      moved: false,
      clicked: false,
      typed: '',
      screen,
    };
  }

  move(screen: Vec2, p: Vec2, alt = false): boolean {
    const a = this.act;
    if (!a) return false;
    a.screen = screen;
    a.moved ||= Math.hypot(screen.x - a.start.x, screen.y - a.start.y) > DRAG_PX;
    if (!a.moved && !a.clicked) return true;
    a.snap = alt ? null : snapLevel(a.levels, p.y, this.v.px(SNAP_PX));
    a.z = a.snap ? a.snap.z : roundTo(p.y);
    return true;
  }

  /** Puštění tlačítka: po tažení dokončí, po kliku čeká na druhý klik nebo číslo. */
  up() {
    const a = this.act;
    if (!a) return;
    if (a.moved) this.finish();
    else a.clicked = true;
  }

  /** Klik během úchopu (režim klik – klik); true = zpracováno. */
  down(): boolean {
    if (!this.act?.clicked) return false;
    this.finish();
    return true;
  }

  /** Výška z napsaného čísla (hodnota trackeru: výška, parapet, odsazení…). */
  private target(a: Active): number {
    if (a.typed === '' || a.typed === '-') return a.z;
    const n = Number(a.typed.replace(',', '.'));
    if (!Number.isFinite(n)) return a.z;
    return edgeMeasure(this.s.model, a.grip.elementId, a.grip.edge).ref + n;
  }

  private params() {
    const a = this.act as Active;
    return { elementId: a.grip.elementId, edge: a.grip.edge, z: this.target(a) };
  }

  private finish() {
    const a = this.act;
    if (!a) return;
    const p = this.params();
    this.act = null;
    if (Math.abs(p.z - a.grip.z) > 0.5) this.s.run('element.setEdgeLevel', p);
    else this.s.changed();
  }

  /** Klávesy během tažení: číslo, Backspace, Enter, Esc. true = zpracováno. */
  key(key: string): boolean {
    const a = this.act;
    if (!a) return false;
    if (key === 'Escape') {
      this.act = null;
      return true;
    }
    if (key === 'Enter') return (this.finish(), true);
    if (isNumberKey(key)) return ((a.typed += key), true);
    if (key === 'Backspace') return ((a.typed = a.typed.slice(0, -1)), true);
    return false;
  }

  tracker(): SectionTracker | null {
    const a = this.act;
    if (!a || (!a.moved && !a.clicked && a.typed === '')) return null;
    const ms = edgeMeasure(this.s.model, a.grip.elementId, a.grip.edge);
    const value = a.typed !== '' ? `${a.typed}▏` : String(Math.round(a.z - ms.ref));
    const label = a.snap ? `${ms.label} (${a.snap.label})` : ms.label;
    return { label, value, at: a.screen };
  }

  private ghost: { z: number; model: Model; prims: Primitive[] } | null = null;

  /** Náhled taženého prvku z modelu po příkazu (preview), jen jeho čáry. */
  private preview(a: Active): Primitive[] {
    const z = this.target(a);
    if (this.ghost?.z === z && this.ghost.model === this.s.model) return this.ghost.prims;
    const m = this.s.editor.preview('element.setEdgeLevel', this.params());
    const prims = m
      ? drawSection(m, this.sectionId).primitives.filter(
          (p) => p.kind === 'line' && p.source.elementId === a.grip.elementId,
        )
      : [];
    this.ghost = { z, model: this.s.model, prims };
    return prims;
  }

  overlay(r: RenderContext) {
    const a = this.act;
    if (a && (a.moved || a.clicked || a.typed !== '')) {
      for (const p of this.preview(a)) drawPrimitive(r, p, AUX);
      if (a.snap) drawPrimitive(r, this.level(a.snap.z), AUX);
    }
    for (const g of this.grips()) if (g !== a?.grip) drawPrimitive(r, this.marker(g), AUX);
  }

  /** Čárkovaná úroveň přichycení přes celý výkres. */
  private level(z: number): Primitive {
    const x0 = this.v.toWorld({ x: 0, y: 0 }).x;
    const x1 = this.v.toWorld({ x: this.v.width, y: 0 }).x;
    const points = [
      { x: x0, y: z },
      { x: x1, y: z },
    ];
    return {
      kind: 'line',
      points,
      closed: false,
      stroke: { pen: 1, color: AUX, lineType: 'dashed' },
      source: { role: 'náhled' },
    };
  }

  /** Trojúhelník úchopu: horní hrana hrotem nahoru, spodní dolů (směr tažení). */
  private marker(g: SectionGrip): Primitive {
    const h = this.v.px(GRIP_PX);
    const dir = g.edge === 'top' ? 1 : -1;
    const polygon = [
      { x: g.u - h, y: g.z },
      { x: g.u + h, y: g.z },
      { x: g.u, y: g.z + dir * h * 1.4 },
    ];
    return {
      kind: 'fill',
      polygon,
      color: AUX,
      transparency: 0,
      source: { role: 'úchop', elementId: g.elementId },
    };
  }
}
