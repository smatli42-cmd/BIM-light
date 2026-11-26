// Nástroj Stěna – metody jedna stěna a řetěz (katalog kreslení, části 1–2; koncepce rozhraní, část 2 D, I):
// tracker u kurzoru, Tab mezi délkou a úhlem, Enter potvrdí, klik na první bod obrys uzavře, Esc /
// dvojklik / pravé tlačítko řetěz ukončí, Backspace vrátí poslední stěnu, mezerník přehodí stranu.
// U řetězu se po prvním kliku volí druh úseku (úsečka / tečný oblouk / oblouk bodem, klávesa M).
// Napojení se ukládá jako vztah (základ 24).
import { dist, trackerPoint, type Id, type Path, type SnapResult, type Vec2 } from '@bim-light/core';
import type { Session } from '../../session/session.ts';
import { clearTyped, editTyped } from '../../session/ui-state.ts';
import { deltaFields } from '../tracker-fields.ts';
import type { KeyInfo, Overlay, PointerInfo, Tool, TrackerField } from '../types.ts';
import { arcGhost, arcInfo } from './arc-helpers.ts';
import { chainLinks, snapLabel, type Chain } from './wall-chain.ts';
import { endDirection, nextSegment, segmentPath, type Segment } from './wall-segment.ts';

export class WallTool implements Tool {
  readonly id = 'wall';
  private chain: Chain | null = null;
  private snapRes: SnapResult | null = null;
  private end: Vec2 | null = null;
  private path: Path | null = null;
  private length = 0;
  private angle = 0;
  private last: PointerInfo | null = null;
  /** Druh úseku řetězu a bod oblouku (oblouk bodem). */
  seg: Segment = 'line';
  private through: Vec2 | null = null;

  constructor(private readonly s: Session) {}

  private get single(): boolean {
    return this.s.wallMethod === 'single';
  }

  hint(): string {
    if (!this.chain)
      return 'Klikni počátek stěny (přichytává se; C střídá kandidáty, Alt vypne). Mezerník = strana.';
    if (this.seg === 'tangent') return 'Klikni konec tečného oblouku. M = druh úseku, Esc končí.';
    if (this.seg === 'arc')
      return this.through ? 'Klikni konec oblouku.' : 'Klikni bod na oblouku, pak konec. M = druh úseku.';
    return 'Klikni konec, nebo napiš délku (Tab = úhel, 90° = doprava) a Enter. Klik na první bod uzavře, Esc končí.';
  }

  /** Plovoucí nabídka druhu úseku (jen řetěz, po prvním kliku). */
  segmentMenu(): { at: Vec2; seg: Segment; tangentOk: boolean } | null {
    if (!this.chain || this.single) return null;
    return { at: this.chain.pt, seg: this.seg, tangentOk: this.chain.prevDir !== null };
  }

  setSegment(seg: Segment) {
    this.seg = seg === 'tangent' && this.chain?.prevDir === null ? 'line' : seg;
    this.through = null;
    if (this.last) this.move(this.last);
    this.s.changed();
  }

  move(p: PointerInfo) {
    this.last = p;
    const c = this.chain;
    const s = this.s;
    const line = this.seg === 'line';
    this.snapRes = s.snap(p.world, {
      from: line ? (c?.pt ?? null) : null,
      prevDir: c?.prevDir ?? null,
      orthoOnly: p.shift,
      alt: p.alt,
    });
    if (!c) {
      this.end = this.snapRes.point;
      return;
    }
    let end = this.snapRes.point;
    if (line) {
      const tr = trackerPoint(c.pt, end, c.prevDir, { length: s.typed.len, angle: s.typed.ang });
      end = tr.point;
      if (!tr.typed && c.count >= 2 && dist(end, c.first) < s.viewport.px(10)) end = c.first;
      if (tr.typed) this.snapRes = { ...this.snapRes, snap: null, guides: [] };
      this.length = tr.length;
      this.angle = tr.angleDeg;
    }
    this.end = end;
    this.path = segmentPath(this.seg, c.pt, end, c.prevDir, this.through);
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
      this.seg = 'line';
      clearTyped(this.s.typed);
      return;
    }
    if (this.seg === 'arc' && !this.through) {
      this.through = this.end;
      return;
    }
    if (this.path) this.addPath(this.path);
  }

  up() {}

  dblclick() {
    this.endChain();
  }

  private addPath(path: Path) {
    const c = this.chain;
    const s = this.s;
    if (!c || dist(path.start, path.end) < 1) return;
    const closing = c.count >= 2 && dist(path.end, c.first) < 1 && c.firstWallId !== null;
    const r = s.run('wall.create', {
      storeyId: s.storeyId,
      typeId: s.wallTypeId,
      path,
      side: s.wallSide,
      referenceLine: s.wallRefLine,
      connections: chainLinks(this.s, c, path, closing),
      autoCross: true,
    });
    if (!r.ok) return;
    const id = r.created[0] as Id;
    c.stack.push({ pt: c.pt, prevDir: c.prevDir, lastWallId: c.lastWallId });
    c.prevDir = endDirection(path);
    c.pt = path.end;
    c.count++;
    c.lastWallId = id;
    c.firstWallId ??= id;
    this.through = null;
    clearTyped(s.typed);
    if (closing) s.toast('Obrys uzavřen.');
    if (closing || this.single) this.endChain();
  }

  private endChain() {
    this.chain = null;
    this.path = null;
    this.through = null;
    this.seg = 'line';
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
    if (k.key.toLowerCase() === 'm' && !k.ctrl && !this.single) {
      this.setSegment(nextSegment(this.seg, this.chain.prevDir !== null));
      return true;
    }
    if (k.key === 'Enter') {
      if (this.path && !(this.seg === 'arc' && !this.through)) this.addPath(this.path);
      return true;
    }
    if (k.key === 'Backspace' && s.typed[s.typed.field] === '') {
      this.back();
      return true;
    }
    if (this.seg === 'line' && editTyped(s.typed, k.key, true)) {
      if (this.last) this.move(this.last);
      return true;
    }
    return false;
  }

  escape(): boolean {
    if (this.through) {
      this.through = null;
      return true;
    }
    if (!this.chain) return false;
    this.endChain();
    return true;
  }

  overlay(): Overlay {
    const r = this.snapRes;
    const snap = r?.snap && this.end ? { point: this.end, label: snapLabel(r) } : null;
    if (!this.chain || !this.path) return { snap, guides: r?.guides ?? [] };
    const markers = this.through ? [this.through] : [];
    return { snap, guides: r?.guides ?? [], ghosts: [arcGhost(this.s, this.path)], markers };
  }

  tracker(): TrackerField[] | null {
    if (!this.chain || !this.end || !this.path) return null;
    const t = this.s.typed;
    if (this.seg !== 'line') {
      const info = arcInfo(this.path);
      return [
        { label: 'Poloměr', value: info.radius, active: false },
        { label: 'Středový úhel', value: info.sweep, active: false },
      ];
    }
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
      ...deltaFields(this.path.start, this.path.end),
    ];
  }
}
