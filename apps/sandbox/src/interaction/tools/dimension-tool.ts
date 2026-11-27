// Nástroj Kóta (pravidla-interakce, kóty 2, 3, 7, 11; základ 25): klikají se líce, každý jen jednou;
// od druhého líce vzniká řada kót, která se celá nese na myši. Klik do prázdna řadu usadí a ukončí,
// Shift+klik líc přeskočí úsek, Esc řadu nechá na místě. Kóty vzniknou až kliknutím (jeden krok Undo).
import {
  dimensionPair,
  type FaceHit,
  type FaceRef,
  findWall,
  pickFace,
  pickOpeningEdge,
  selectableWallGeometry,
} from '@bim-light/core';
import { FACE_PX, type Session } from '../../session/session.ts';
import { WholeWallPick } from './whole-wall-pick.ts';
import { commitDrafts, draftOf, placeDrafts, type DraftItem, type Placed } from '../placing.ts';
import type { KeyInfo, Overlay, PointerInfo, Tool, TrackerField } from '../types.ts';

/** Kótovat jde líce i čela volných konců stěn (čelo = nepřipojený konec). */
const DIM_EDGES = ['ref', 'opp', 'start', 'end'] as const;

const same = (a: FaceRef, b: FaceRef) =>
  a.wallId === b.wallId && a.face === b.face && a.openingId === b.openingId;
/** Líc obloukové stěny (ne hrana otvoru): klik do volna pak dá poloměr / průměr. */
function isArcFace(s: Session, r: FaceRef): boolean {
  const p = findWall(s.model, r.wallId)?.path;
  return (
    !r.openingId &&
    (r.face === 'ref' || r.face === 'opp') &&
    !!p &&
    p.kind === 'arc' &&
    Math.abs(p.bulge) > 1e-9
  );
}

const refOf = (f: FaceHit): FaceRef => ({
  wallId: f.wallId,
  face: f.face,
  ...(f.openingId ? { openingId: f.openingId } : {}),
});

export class DimensionTool implements Tool {
  readonly id = 'dimension';
  private prev: FaceRef | null = null;
  private used: FaceRef[] = [];
  private items: DraftItem[] = [];
  private placed: Placed | null = null;
  /** Poloměr / průměr: první klik na oblouk, druhý do volna (hlášení uživatele 2026-11-26). */
  private radial: DraftItem | null = null;
  private readonly whole: WholeWallPick;
  private hover: FaceHit | null = null;

  constructor(private readonly s: Session) {
    this.whole = new WholeWallPick(s);
  }

  /** Režim „Celou stěnu“ (volba v info boxu nástroje). */
  private get wallMode(): boolean {
    return this.s.options.dimPick === 'wall';
  }

  hint(): string {
    if (this.wallMode) return this.whole.hint();
    if (!this.prev) return 'Klikni na první líc, čelo volného konce nebo hranu otvoru (tolerance 12 px).';
    if (this.radial && !this.items.length)
      return 'Klik do volna = poloměr / průměr (volba v info boxu); druhý líc nebo hrana = vzdálenost.';
    if (!this.items.length) return 'Klikni na druhý rovnoběžný líc (u obloukové stěny hranu přes stěnu).';
    return 'Další líc přidá kótu do řady, Shift+klik úsek přeskočí. Klik do prázdna řadu usadí, Esc ji nechá na místě.';
  }

  /** Líc, čelo nebo hrana otvoru (i bouraného otvoru a niky) – nejbližší v toleranci. */
  private face(p: PointerInfo): FaceHit | null {
    const tol = this.s.viewport.px(FACE_PX);
    const wall = pickFace(selectableWallGeometry(this.s.model, this.s.view), p.world, tol, DIM_EDGES);
    const edge = pickOpeningEdge(this.s.model, this.s.view, p.world, tol);
    return edge && (!wall || edge.distance <= wall.distance) ? edge : wall;
  }

  move(p: PointerInfo) {
    if (this.wallMode) return this.whole.move(p);
    this.hover = this.face(p);
    if (this.radial && !this.items.length)
      this.placed = placeDrafts(this.s, [draftOf(this.radial, 0, this.s.storeyId)], p.world, true);
    if (this.items.length && this.placed)
      this.placed = placeDrafts(this.s, this.placed.drafts, p.world, p.alt);
  }

  down(p: PointerInfo) {
    if (this.wallMode) {
      this.whole.down(p);
      return;
    }
    const f = p.button === 0 ? this.face(p) : null;
    if (!f) {
      if (this.items.length) this.finish(p);
      else if (this.radial && this.placed) {
        commitDrafts(this.s, [this.radial], this.placed);
        this.reset();
      } else this.reset();
      return;
    }
    const ref = refOf(f);
    if (this.used.some((u) => same(u, ref)))
      return this.s.toast('Tento líc už v řadě je; každý líc jen jednou.', 'bad');
    if (!this.prev) {
      this.prev = ref;
      this.used = [ref];
      this.radial = isArcFace(this.s, ref) ? { kind: 'length', ref, measure: this.s.options.arcDim } : null;
      return;
    }
    if (p.shift && this.items.length) {
      this.prev = ref;
      this.used.push(ref);
      return;
    }
    this.add(ref, p);
  }

  private add(ref: FaceRef, p: PointerInfo) {
    const prev = this.prev as FaceRef;
    const pair = dimensionPair(this.s.model, prev, ref, p.world);
    if (!pair) {
      this.s.toast(
        'Kótovat jde rovnoběžné líce, nebo hrany přes obloukovou stěnu (délka po oblouku).',
        'bad',
      );
      return;
    }
    this.radial = null;
    this.items.push({ kind: 'linear', refs: [prev, ref], ownerRef: 1, ...pair });
    this.prev = ref;
    this.used.push(ref);
    const drafts = this.items.map((it, i) => draftOf(it, i, this.s.storeyId));
    this.placed = placeDrafts(this.s, drafts, p.world, true);
  }

  private finish(p: PointerInfo | null) {
    if (p && this.placed) this.placed = placeDrafts(this.s, this.placed.drafts, p.world, p.alt);
    if (this.placed && this.items.length) commitDrafts(this.s, this.items, this.placed);
    this.reset();
  }

  private reset() {
    this.radial = null;
    this.prev = null;
    this.used = [];
    this.items = [];
    this.placed = null;
  }

  up() {}

  key(_k: KeyInfo): boolean {
    return false;
  }

  escape(): boolean {
    if (this.wallMode) return this.whole.escape();
    if (!this.prev) return false;
    this.finish(null);
    return true;
  }

  overlay(): Overlay {
    if (this.wallMode) return this.whole.overlay();
    const faces = [...this.used];
    if (this.hover) faces.push(refOf(this.hover));
    const pl = this.placed;
    return { faces, draftDims: pl?.drafts ?? [], guides: pl?.guide ? [pl.guide] : [] };
  }

  tracker(): TrackerField[] | null {
    return null;
  }
}
