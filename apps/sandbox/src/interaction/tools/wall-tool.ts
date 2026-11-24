// Nástroj Stěna (katalog kreslení, části 1–2): řetěz stěn s trackerem u kurzoru, Tab mezi délkou
// a úhlem, Enter potvrdí, klik na první bod obrys uzavře, Esc / dvojklik / pravé tlačítko řetěz ukončí,
// Backspace vrátí poslední stěnu, mezerník přehodí stranu. Napojení se ukládá jako vztah (základ 24).
import {
  add,
  dist,
  leftNormal,
  mul,
  norm,
  sub,
  trackerPoint,
  type Id,
  type SnapResult,
  type Vec2,
} from '@bim-light/core';
import type { Session } from '../../session/session.ts';
import { clearTyped, editTyped } from '../../session/ui-state.ts';
import type { KeyInfo, Overlay, PointerInfo, Tool, TrackerField } from '../types.ts';
import { connectionAt, typeThickness } from './wall-links.ts';

interface Chain {
  pt: Vec2;
  first: Vec2;
  prevDir: number | null;
  count: number;
  lastWallId: Id | null;
  firstWallId: Id | null;
  stack: { pt: Vec2; prevDir: number | null; lastWallId: Id | null }[];
}

export class WallTool implements Tool {
  readonly id = 'wall';
  private chain: Chain | null = null;
  private snapRes: SnapResult | null = null;
  private end: Vec2 | null = null;
  private dir = 0;
  private length = 0;
  private angle = 0;
  private last: PointerInfo | null = null;

  constructor(private readonly s: Session) {}

  hint(): string {
    if (!this.chain)
      return 'Klikni počátek stěny (přichytává se; C střídá kandidáty, Alt vypne). Mezerník = strana.';
    return 'Klikni konec, nebo napiš délku (Tab = úhel, 90° = doprava) a Enter. Klik na první bod uzavře, Esc končí.';
  }

  move(p: PointerInfo) {
    this.last = p;
    const c = this.chain;
    const s = this.s;
    this.snapRes = s.snap(p.world, {
      from: c?.pt ?? null,
      prevDir: c?.prevDir ?? null,
      orthoOnly: p.shift,
      alt: p.alt,
    });
    if (!c) {
      this.end = this.snapRes.point;
      return;
    }
    const tr = trackerPoint(c.pt, this.snapRes.point, c.prevDir, { length: s.typed.len, angle: s.typed.ang });
    let end = tr.point;
    if (!tr.typed && c.count >= 2 && dist(end, c.first) < s.viewport.px(10)) end = c.first;
    if (tr.typed) this.snapRes = { ...this.snapRes, snap: null, guides: [] };
    this.end = end;
    this.dir = tr.dir;
    this.length = tr.length;
    this.angle = tr.angleDeg;
  }

  down(p: PointerInfo) {
    if (p.button === 2) return this.endChain();
    if (p.button !== 0) return;
    this.move(p);
    if (!this.end) return;
    if (!this.chain) {
      this.chain = {
        pt: this.end,
        first: this.end,
        prevDir: null,
        count: 0,
        lastWallId: null,
        firstWallId: null,
        stack: [],
      };
      clearTyped(this.s.typed);
      return;
    }
    this.addSegment(this.end);
  }

  up() {}

  dblclick() {
    this.endChain();
  }

  private addSegment(end: Vec2) {
    const c = this.chain;
    const s = this.s;
    if (!c || dist(c.pt, end) < 1) return;
    const closing = c.count >= 2 && dist(end, c.first) < 1 && c.firstWallId !== null;
    const conns: { end: 'start' | 'end'; wallId: Id; at: string }[] = [];
    const startLink = c.lastWallId
      ? { wallId: c.lastWallId, at: 'ATEND' }
      : connectionAt(s, c.pt, [], sub(end, c.pt));
    if (startLink) conns.push({ end: 'start', ...startLink });
    const endLink = closing
      ? { wallId: c.firstWallId as Id, at: 'ATSTART' }
      : connectionAt(s, end, c.lastWallId ? [c.lastWallId] : [], sub(c.pt, end));
    if (endLink) conns.push({ end: 'end', ...endLink });
    const r = s.run('wall.create', {
      storeyId: s.storeyId,
      typeId: s.wallTypeId,
      path: { kind: 'line', start: c.pt, end },
      side: s.wallSide,
      referenceLine: s.wallRefLine,
      connections: conns,
    });
    if (!r.ok) return;
    const id = r.created[0] as Id;
    c.stack.push({ pt: c.pt, prevDir: c.prevDir, lastWallId: c.lastWallId });
    const v = sub(end, c.pt);
    c.prevDir = Math.atan2(v.y, v.x);
    c.pt = end;
    c.count++;
    c.lastWallId = id;
    c.firstWallId ??= id;
    clearTyped(s.typed);
    if (closing) {
      this.chain = null;
      s.toast('Obrys uzavřen.');
    }
  }

  private endChain() {
    this.chain = null;
    clearTyped(this.s.typed);
  }

  /** Backspace bez napsaného čísla vrátí poslední stěnu řetězu (katalog kreslení 1.5). */
  private back() {
    const c = this.chain;
    const prev = c?.stack.pop();
    if (!c || !prev) return;
    this.s.editor.undo();
    c.pt = prev.pt;
    c.prevDir = prev.prevDir;
    c.lastWallId = prev.lastWallId;
    c.count--;
    if (c.count === 0) c.firstWallId = null;
  }

  key(k: KeyInfo): boolean {
    const s = this.s;
    if (k.key === ' ') {
      s.wallSide = s.wallSide === 'left' ? 'right' : 'left';
      return true;
    }
    if (!this.chain) return false;
    if (k.key === 'Enter') {
      if (this.end) this.addSegment(this.end);
      return true;
    }
    if (k.key === 'Backspace' && s.typed[s.typed.field] === '') {
      this.back();
      return true;
    }
    if (editTyped(s.typed, k.key, true)) {
      if (this.last) this.move(this.last);
      return true;
    }
    return false;
  }

  escape(): boolean {
    if (!this.chain) return false;
    this.endChain();
    return true;
  }

  overlay(): Overlay {
    const r = this.snapRes;
    const snap = r?.snap && this.end ? { point: this.end, label: snapLabel(r) } : null;
    const c = this.chain;
    if (!c || !this.end) return { snap, guides: r?.guides ?? [] };
    const t = typeThickness(this.s.model, this.s.wallTypeId);
    const n = mul(leftNormal(norm(sub(this.end, c.pt))), this.s.wallSide === 'left' ? t : -t);
    // U osy leží nakreslená čára uprostřed tloušťky.
    const back = this.s.wallRefLine === 'axis' ? mul(n, -0.5) : { x: 0, y: 0 };
    const a = add(c.pt, back);
    const b = add(this.end, back);
    const ghost = [a, b, add(b, n), add(a, n)];
    return { snap, guides: r?.guides ?? [], ghosts: [ghost] };
  }

  tracker(): TrackerField[] | null {
    if (!this.chain || !this.end) return null;
    const t = this.s.typed;
    const ang = Math.round(this.angle * 10) / 10;
    return [
      {
        label: 'Délka',
        value: t.len !== '' ? `${t.len}▏` : String(Math.round(this.length)),
        active: t.field === 'len',
      },
      {
        label: 'Úhel',
        value: t.ang !== '' ? `${t.ang}▏` : `${String(ang).replace('.', ',')}°`,
        active: t.field === 'ang',
      },
    ];
  }
}

export function snapLabel(r: SnapResult): string {
  const sn = r.snap;
  if (!sn) return '';
  return sn.count > 1 ? `${sn.label} ${sn.index + 1}/${sn.count} (C = další)` : sn.label;
}
