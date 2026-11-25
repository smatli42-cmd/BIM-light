// Nástroj Oblouková stěna (plán stěn Z5): 1) začátek, konec a bod na oblouku (výchozí), 2) tečně na
// předchozí stěnu (M přepíná způsob). Tracker: u konce Tětiva a Úhel směru, u oblouku Poloměr a
// středový Úhel (Tab přepíná, Enter potvrdí). Tloušťka jde doleva od směru kreslení jako u přímé stěny;
// po potvrzení řetěz pokračuje z konce oblouku. Logika tvaru je v jádře (arcThrough / arcTangent).
import {
  arcThrough,
  arcTangent,
  arcWithRadius,
  dist,
  parseNumber,
  rotate,
  tangentAt,
  trackerPoint,
  type Id,
  type Path,
  type SnapResult,
  type Vec2,
} from '@bim-light/core';
import type { Session } from '../../session/session.ts';
import { clearTyped, editTyped } from '../../session/ui-state.ts';
import type { KeyInfo, Overlay, PointerInfo, Tool, TrackerField } from '../types.ts';
import { arcGhost, sideOf } from './arc-ghost.ts';
import { connectionAt } from './wall-links.ts';
import { snapLabel } from './wall-tool.ts';

type Mode = 'three' | 'tangent';

/** Napsané kladné číslo, jinak null (prázdné = podle myši). */
function positive(text: string): number | null {
  const n = parseNumber(text);
  return Number.isFinite(n) && n > 0 ? n : null;
}

interface State {
  start: Vec2;
  /** Konec oblouku (3 body, po druhém kliku). */
  end: Vec2 | null;
  /** Tečna na konci předchozí stěny řetězu. */
  tangent: Vec2 | null;
  lastWallId: Id | null;
}

export class ArcWallTool implements Tool {
  readonly id = 'arc';
  private mode: Mode = 'three';
  private st: State | null = null;
  private snapRes: SnapResult | null = null;
  private cursor: Vec2 | null = null;
  private path: Path | null = null;
  private last: PointerInfo | null = null;

  constructor(private readonly s: Session) {}

  private get bending(): boolean {
    const st = this.st;
    return !!st && (st.end !== null || (this.mode === 'tangent' && st.tangent !== null));
  }

  hint(): string {
    const way = this.mode === 'three' ? 'třemi body' : 'tečně';
    if (!this.st) return `Oblouk ${way} (M = způsob): klikni začátek. Mezerník = strana.`;
    if (!this.bending) return 'Klikni konec oblouku, nebo napiš tětivu (Tab = úhel) a Enter.';
    return 'Klikni bod oblouku, nebo napiš poloměr (Tab = středový úhel) a Enter. Esc končí.';
  }

  move(p: PointerInfo) {
    this.last = p;
    const st = this.st;
    const s = this.s;
    // Úhlové kroky a zaokrouhlení délky platí jen pro konec oblouku (tětiva), ne pro bod oblouku.
    const from = st && !this.bending ? st.start : null;
    this.snapRes = s.snap(p.world, { from, orthoOnly: p.shift, alt: p.alt });
    let q = this.snapRes.point;
    if (st && !this.bending) {
      const tr = trackerPoint(st.start, q, null, { length: s.typed.len, angle: s.typed.ang });
      q = tr.point;
      if (tr.typed) this.snapRes = { ...this.snapRes, snap: null, guides: [] };
    }
    this.cursor = q;
    this.path = this.shapeAt(q);
  }

  /** Tvar oblouku pro kurzor `q` (a napsaná čísla). */
  private shapeAt(q: Vec2): Path | null {
    const st = this.st;
    if (!st) return null;
    if (!this.bending) return { kind: 'line', start: st.start, end: q };
    const r = positive(this.s.typed.len);
    const deg = positive(this.s.typed.ang);
    if (this.mode === 'tangent' && st.tangent && !st.end) {
      if (r === null && deg === null) return arcTangent(st.start, st.tangent, q);
      const side = sideOf(st.start, st.tangent, q);
      const rr = r ?? dist(st.start, q);
      const sweep = ((deg ?? 90) * Math.PI) / 180;
      const c = { x: st.start.x - st.tangent.y * rr * side, y: st.start.y + st.tangent.x * rr * side };
      return arcTangent(st.start, st.tangent, rotate(st.start, c, sweep * side));
    }
    const end = st.end as Vec2;
    const side = sideOf(st.start, { x: end.x - st.start.x, y: end.y - st.start.y }, q);
    if (r !== null) return arcWithRadius(st.start, end, -side * r);
    if (deg !== null) {
      const half = dist(st.start, end) / 2 / Math.sin((deg * Math.PI) / 180 / 2);
      return arcWithRadius(st.start, end, -side * half);
    }
    return arcThrough(st.start, q, end);
  }

  down(p: PointerInfo) {
    if (p.button === 2) return this.endChain();
    if (p.button !== 0) return;
    this.move(p);
    if (!this.cursor) return;
    this.confirm();
  }

  private confirm() {
    const q = this.cursor;
    if (!q) return;
    if (!this.st) {
      this.st = { start: q, end: null, tangent: null, lastWallId: null };
      clearTyped(this.s.typed);
      return;
    }
    if (!this.bending) {
      if (dist(q, this.st.start) < 1) return;
      this.st.end = q;
      clearTyped(this.s.typed);
      return;
    }
    if (this.path) this.create(this.path);
  }

  private create(path: Path) {
    const st = this.st;
    const s = this.s;
    if (!st || dist(path.start, path.end) < 1) return;
    const conns: { end: 'start' | 'end'; wallId: Id; at: string }[] = [];
    const startLink = st.lastWallId
      ? { wallId: st.lastWallId, at: 'ATEND' }
      : connectionAt(s, path.start, [], tangentAt(path, 'start'));
    if (startLink) conns.push({ end: 'start', ...startLink });
    const back = tangentAt(path, 'end');
    const endLink = connectionAt(s, path.end, st.lastWallId ? [st.lastWallId] : [], {
      x: -back.x,
      y: -back.y,
    });
    if (endLink) conns.push({ end: 'end', ...endLink });
    const r = s.run('wall.create', {
      storeyId: s.storeyId,
      typeId: s.wallTypeId,
      path,
      side: s.wallSide,
      referenceLine: s.wallRefLine,
      connections: conns,
      autoCross: true,
    });
    if (!r.ok) return;
    this.st = { start: path.end, end: null, tangent: back, lastWallId: r.created[0] as Id };
    clearTyped(s.typed);
  }

  up() {}

  dblclick() {
    this.endChain();
  }

  private endChain() {
    this.st = null;
    this.path = null;
    clearTyped(this.s.typed);
  }

  key(k: KeyInfo): boolean {
    const s = this.s;
    if (k.key === ' ') {
      s.wallSide = s.wallSide === 'left' ? 'right' : 'left';
      return true;
    }
    if (k.key.toLowerCase() === 'm' && !k.ctrl) {
      this.mode = this.mode === 'three' ? 'tangent' : 'three';
      s.toast(this.mode === 'three' ? 'Oblouk třemi body.' : 'Oblouk tečně na předchozí stěnu.');
      return true;
    }
    if (!this.st) return false;
    if (k.key === 'Enter') {
      this.confirm();
      return true;
    }
    if (editTyped(s.typed, k.key, true)) {
      if (this.last) this.move(this.last);
      return true;
    }
    return false;
  }

  escape(): boolean {
    if (!this.st) return false;
    this.endChain();
    return true;
  }

  overlay(): Overlay {
    const r = this.snapRes;
    const snap = r?.snap && this.cursor ? { point: this.cursor, label: snapLabel(r) } : null;
    if (!this.path) return { snap, guides: r?.guides ?? [] };
    const ghost = arcGhost(this.s, this.path);
    const markers = this.st?.end ? [this.st.start, this.st.end] : this.st ? [this.st.start] : [];
    return { snap, guides: r?.guides ?? [], ghosts: [ghost], markers };
  }

  tracker(): TrackerField[] | null {
    if (!this.st || !this.path) return null;
    const t = this.s.typed;
    const shown = (typed: string, v: string) => (typed !== '' ? `${typed}▏` : v);
    const p = this.path;
    if (!this.bending) {
      const len = Math.round(dist(p.start, p.end));
      return [
        { label: 'Tětiva', value: shown(t.len, String(len)), active: t.field === 'len' },
        { label: 'Úhel', value: shown(t.ang, ''), active: t.field === 'ang' },
      ];
    }
    const info = arcInfo(p);
    return [
      { label: 'Poloměr', value: shown(t.len, info.radius), active: t.field === 'len' },
      { label: 'Středový úhel', value: shown(t.ang, info.sweep), active: t.field === 'ang' },
      { label: 'Tětiva', value: String(Math.round(dist(p.start, p.end))), active: false },
    ];
  }
}

function arcInfo(p: Path): { radius: string; sweep: string } {
  if (p.kind !== 'arc' || Math.abs(p.bulge) < 1e-9) return { radius: '∞', sweep: '0°' };
  const sweep = Math.abs(4 * Math.atan(p.bulge));
  const radius = dist(p.start, p.end) / 2 / Math.sin(sweep / 2);
  return {
    radius: String(Math.round(radius)),
    sweep: `${String(Math.round((sweep * 1800) / Math.PI) / 10).replace('.', ',')}°`,
  };
}
