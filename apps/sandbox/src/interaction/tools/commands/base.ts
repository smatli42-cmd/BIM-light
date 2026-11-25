// Základ příkazů, které se zadávají body (pravidla-interakce: Příkazy nad výběrem): základní bod
// se přichytává, vzdálenost / úhel lze napsat a potvrdit Enterem, Esc ruší krok.
import {
  add,
  allWallGeometry,
  len,
  mul,
  norm,
  openingOutline,
  parseNumber,
  sub,
  type Id,
  type SnapResult,
  type Vec2,
} from '@bim-light/core';
import type { Session } from '../../../session/session.ts';
import { clearTyped, editTyped } from '../../../session/ui-state.ts';
import type { KeyInfo, Overlay, PointerInfo, Tool, ToolId, TrackerField } from '../../types.ts';
import { snapLabel } from '../wall-tool.ts';

export abstract class PointCommand implements Tool {
  abstract readonly id: ToolId;
  protected points: Vec2[] = [];
  protected cur: Vec2 | null = null;
  protected snapRes: SnapResult | null = null;
  protected last: PointerInfo | null = null;
  /** Vybrané stěny v okamžiku spuštění příkazu. */
  protected readonly ids: Id[];
  /** Vybrané otvory (přesun, kopie a zrcadlení otvorů, plán stěn Z4); jen když není vybraná stěna. */
  protected readonly openingIds: Id[];

  constructor(protected readonly s: Session) {
    this.ids = [...s.selection.walls];
    this.openingIds = this.ids.length ? [] : [...s.selection.openings];
  }

  /** Nápověda pro každý krok. */
  protected abstract readonly steps: readonly string[];
  /** Zpracuje zadaný bod kroku. */
  protected abstract click(p: Vec2, info: PointerInfo): void;
  protected abstract preview(): Overlay;
  /** Popis napsaného čísla (vzdálenost, úhel…) pro tracker; null = číslo se nepíše. */
  protected typedLabel(): string | null {
    return null;
  }

  hint(): string {
    return this.steps[Math.min(this.points.length, this.steps.length - 1)] ?? '';
  }

  /** Napsaná vzdálenost (nebo null). */
  protected typedNumber(field: 'len' | 'ang' = 'len'): number | null {
    const t = this.s.typed[field];
    const v = parseNumber(t);
    return t !== '' && Number.isFinite(v) ? v : null;
  }

  move(p: PointerInfo) {
    this.last = p;
    const from = this.points.at(-1) ?? null;
    this.snapRes = this.s.snap(p.world, { from, alt: p.alt, orthoOnly: p.shift, exclude: new Set(this.ids) });
    let point = this.snapRes.point;
    const d = this.typedNumber();
    if (from && d !== null && this.typedLabel() === 'Vzdálenost') {
      const v = sub(point, from);
      point = add(from, mul(len(v) > 1e-6 ? norm(v) : { x: 1, y: 0 }, d));
    }
    this.cur = point;
  }

  down(p: PointerInfo) {
    if (p.button === 2) {
      if (!this.escape()) this.s.setTool('select');
      return;
    }
    if (p.button !== 0) return;
    this.move(p);
    if (this.cur) this.click(this.cur, p);
  }

  up() {}

  key(k: KeyInfo): boolean {
    if (k.key === 'Enter' && this.cur && this.last) {
      this.click(this.cur, this.last);
      return true;
    }
    if (this.typedLabel() !== null && editTyped(this.s.typed, k.key, this.id === 'rect')) {
      if (this.last) this.move(this.last);
      return true;
    }
    return false;
  }

  escape(): boolean {
    if (!this.points.length) return false;
    this.points = [];
    clearTyped(this.s.typed);
    return true;
  }

  protected next(p: Vec2) {
    this.points.push(p);
    clearTyped(this.s.typed);
  }

  overlay(): Overlay {
    const r = this.snapRes;
    const snap = r?.snap && this.cur ? { point: this.cur, label: snapLabel(r) } : null;
    const pre = this.preview();
    return {
      ...pre,
      snap,
      guides: [...(r?.guides ?? []), ...(pre.guides ?? [])],
      markers: [...this.points, ...(pre.markers ?? [])],
    };
  }

  tracker(): TrackerField[] | null {
    const label = this.typedLabel();
    if (!label || !this.points.length) return null;
    const t = this.s.typed.len;
    return [{ label, value: t !== '' ? `${t}▏` : this.liveValue(), active: true }];
  }

  protected liveValue(): string {
    const a = this.points.at(-1);
    return a && this.cur ? String(Math.round(len(sub(this.cur, a)))) : '';
  }

  /** Obrysy vybraných stěn po transformaci bodů (náhled). */
  protected ghosts(fn: (p: Vec2) => Vec2): Vec2[][] {
    const geoms = allWallGeometry(this.s.model, this.s.storeyId);
    const ops = this.openingIds.flatMap((id) => {
      const o = this.s.model.openings[id];
      return o ? [openingOutline(this.s.model, o).map(fn)] : [];
    });
    return [...this.ids.flatMap((id) => (geoms.get(id)?.outlines ?? []).map((l) => l.map(fn))), ...ops];
  }
}
