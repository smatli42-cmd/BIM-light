// Nástroj Řez (rozhodnutí 19; info box podle Arditu, kreslení jako Archicad): rovný řez = dva kliky (začátek,
// konec), zalomený = kliky po úsecích (rovnoběžně s prvním a kolmo na něj, Enter / dvojklik / pravé tlačítko
// ukončí). Pak třetí klik na stranu, kam se řez dívá (šipky jdou za myší). Body se přichytávají jako u stěny.
// Esc vrátí krok. Výsledek je jeden příkaz section.create (AI udělá totéž).
import { cross, dist, dot, norm, sub, trackerPoint, type SnapResult, type Vec2 } from '@bim-light/core';
import { sectionCreateParams, sectionDefaults } from '../../session/section-defaults.ts';
import type { Session } from '../../session/session.ts';
import { clearTyped, editTyped } from '../../session/ui-state.ts';
import type { KeyInfo, Overlay, PointerInfo, Tool, TrackerField } from '../types.ts';
import { lengthAngleFields } from './slab-tool-parts.ts';
import { snapLabel } from './wall-chain.ts';

/** Délka šipek směru v náhledu (px). */
const ARROW_PX = 28;

export class SectionTool implements Tool {
  readonly id = 'section';
  private pts: Vec2[] = [];
  /** Čára je hotová, čeká se na klik strany pohledu. */
  private side = false;
  private end: Vec2 | null = null;
  private mouse: Vec2 | null = null;
  private snapRes: SnapResult | null = null;
  private last: PointerInfo | null = null;
  private length = 0;
  private angle = 0;

  constructor(private readonly s: Session) {}

  private get jogged() {
    return sectionDefaults(this.s).method === 'jogged';
  }

  hint(): string {
    if (this.side) return 'Klikni na stranu, kam se má řez dívat (šipky ukazují směr). Esc vrátí krok.';
    if (!this.pts.length) return 'Klikni na začátek čáry řezu.';
    if (!this.jogged) return 'Klikni na konec čáry řezu (Tab / čísla: délka, úhel).';
    return 'Klikej úseky zalomeného řezu (kolmo a rovnoběžně); Enter, dvojklik nebo pravé tlačítko ukončí.';
  }

  /** Směr prvního úseku (zalomení jsou na něj kolmá). */
  private firstDir(): Vec2 | null {
    const [a, b] = this.pts;
    return a && b ? norm(sub(b, a)) : null;
  }

  /** Bod zalomeného řezu: úsek se srovná rovnoběžně (sudý) nebo kolmo (lichý) na první úsek. */
  private constrain(p: Vec2): Vec2 {
    const d = this.firstDir();
    const from = this.pts[this.pts.length - 1];
    if (!this.jogged || !d || !from) return p;
    const axis = (this.pts.length - 1) % 2 === 0 ? d : { x: -d.y, y: d.x };
    const t = dot(sub(p, from), axis);
    return { x: from.x + axis.x * t, y: from.y + axis.y * t };
  }

  move(p: PointerInfo) {
    this.last = p;
    this.mouse = p.world;
    if (this.side) return;
    const from = this.pts[this.pts.length - 1] ?? null;
    this.snapRes = this.s.snap(p.world, { from, orthoOnly: p.shift, alt: p.alt, guidePoints: this.pts });
    let e = this.snapRes.point;
    if (from && this.pts.length === 1) {
      const tr = trackerPoint(from, e, null, { length: this.s.typed.len, angle: this.s.typed.ang });
      this.length = tr.length;
      this.angle = tr.angleDeg;
      e = tr.point;
    }
    this.end = this.constrain(e);
  }

  down(p: PointerInfo) {
    if (p.button === 2) return this.finishLine();
    if (p.button !== 0) return;
    this.move(p);
    if (this.side) return this.create(p.world);
    this.place();
  }

  private place() {
    const e = this.end;
    if (!e) return;
    const prev = this.pts[this.pts.length - 1];
    if (prev && dist(prev, e) < 1) return;
    this.pts.push(e);
    clearTyped(this.s.typed);
    if (!this.jogged && this.pts.length === 2) this.side = true;
  }

  /** Konec zalomené čáry: poslední úsek musí řezat (kolmé zalomení na konci se zahodí). */
  private finishLine() {
    if (this.side || !this.jogged) return;
    if (this.pts.length % 2 === 1 && this.pts.length > 2) this.pts.pop();
    if (this.pts.length >= 2) this.side = true;
  }

  dblclick() {
    this.finishLine();
  }

  /** Dívá se doleva od směru čáry, když je myš vlevo od prvního úseku. */
  private direction(at: Vec2): 'left' | 'right' {
    const [a, b] = this.pts as [Vec2, Vec2];
    return cross(sub(b, a), sub(at, a)) >= 0 ? 'left' : 'right';
  }

  private create(at: Vec2) {
    const r = this.s.run('section.create', {
      points: this.pts,
      direction: this.direction(at),
      ...sectionCreateParams(this.s),
    });
    if (r.ok) this.reset();
  }

  private reset() {
    this.pts = [];
    this.side = false;
    clearTyped(this.s.typed);
  }

  up() {}

  key(k: KeyInfo): boolean {
    if (!this.pts.length) return false;
    if (k.key === 'Enter') {
      if (this.jogged) this.finishLine();
      else this.place();
      return true;
    }
    if (this.pts.length === 1 && editTyped(this.s.typed, k.key, true)) {
      if (this.last) this.move(this.last);
      return true;
    }
    return false;
  }

  escape(): boolean {
    if (this.side) this.side = false;
    else if (this.pts.length) this.pts.pop();
    else return false;
    if (!this.jogged && this.pts.length === 2) this.pts.pop();
    return true;
  }

  /** Šipky směru pohledu na koncích čáry (náhled třetího kliku). */
  private arrows(): [Vec2, Vec2][] {
    const d = this.firstDir();
    const at = this.mouse;
    if (!this.side || !d || !at) return [];
    const n = this.direction(at) === 'left' ? { x: -d.y, y: d.x } : { x: d.y, y: -d.x };
    const k = this.s.viewport.px(ARROW_PX);
    const ends = [this.pts[0] as Vec2, this.pts[this.pts.length - 1] as Vec2];
    return ends.map((p) => [p, { x: p.x + n.x * k, y: p.y + n.y * k }]);
  }

  overlay(): Overlay {
    const r = this.snapRes;
    const line = this.side || !this.end ? this.pts : [...this.pts, this.end];
    const snap = !this.side && r?.snap && this.end ? { point: this.end, label: snapLabel(r) } : null;
    return {
      snap,
      guides: this.side ? [] : (r?.guides ?? []),
      lines: [...line.slice(1).map((b, i) => [line[i] as Vec2, b] as [Vec2, Vec2]), ...this.arrows()],
      markers: this.pts,
    };
  }

  tracker(): TrackerField[] | null {
    const from = this.pts[0];
    if (this.side || this.pts.length !== 1 || !from || !this.end) return null;
    return lengthAngleFields(from, this.end, this.s.typed, this.length, this.angle);
  }
}
