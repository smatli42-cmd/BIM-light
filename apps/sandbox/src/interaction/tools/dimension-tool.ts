// Nástroj Kóta (pravidla-interakce, kóty 2, 3, 7, 11; základ 25): klikají se líce, každý jen jednou;
// od druhého líce vzniká řada kót, která se celá nese na myši. Klik do prázdna řadu usadí a ukončí,
// Shift+klik líc přeskočí úsek, Esc řadu nechá na místě. Kóty vzniknou až kliknutím (jeden krok Undo).
import {
  cross,
  facePath,
  pickFace,
  selectableWallGeometry,
  tangentAt,
  type FaceHit,
  type FaceRef,
} from '@bim-light/core';
import { FACE_PX, type Session } from '../../session/session.ts';
import { commitDrafts, draftOf, placeDrafts, type DraftItem, type Placed } from '../placing.ts';
import type { KeyInfo, Overlay, PointerInfo, Tool, TrackerField } from '../types.ts';

/** Kótovat jde líce i čela volných konců stěn (čelo = nepřipojený konec). */
const DIM_EDGES = ['ref', 'opp', 'start', 'end'] as const;

const same = (a: FaceRef, b: FaceRef) => a.wallId === b.wallId && a.face === b.face;

export class DimensionTool implements Tool {
  readonly id = 'dimension';
  private prev: FaceRef | null = null;
  private used: FaceRef[] = [];
  private items: DraftItem[] = [];
  private placed: Placed | null = null;
  private hover: FaceHit | null = null;

  constructor(private readonly s: Session) {}

  hint(): string {
    if (!this.prev) return 'Klikni na první líc nebo čelo volného konce stěny (tolerance 12 px).';
    if (!this.items.length) return 'Klikni na druhý rovnoběžný líc.';
    return 'Další líc přidá kótu do řady, Shift+klik úsek přeskočí. Klik do prázdna řadu usadí, Esc ji nechá na místě.';
  }

  private face(p: PointerInfo): FaceHit | null {
    const geoms = selectableWallGeometry(this.s.model, this.s.view);
    return pickFace(geoms, p.world, this.s.viewport.px(FACE_PX), DIM_EDGES);
  }

  move(p: PointerInfo) {
    this.hover = this.face(p);
    if (this.items.length && this.placed)
      this.placed = placeDrafts(this.s, this.placed.drafts, p.world, p.alt);
  }

  down(p: PointerInfo) {
    const f = p.button === 0 ? this.face(p) : null;
    if (!f) {
      if (this.items.length) this.finish(p);
      else this.reset();
      return;
    }
    const ref: FaceRef = { wallId: f.wallId, face: f.face };
    if (this.used.some((u) => same(u, ref)))
      return this.s.toast('Tento líc už v řadě je; každý líc jen jednou.', 'bad');
    if (!this.prev) {
      this.prev = ref;
      this.used = [ref];
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
    const m = this.s.model;
    const prev = this.prev as FaceRef;
    const a = tangentAt(facePath(m, prev), 'start');
    const b = tangentAt(facePath(m, ref), 'start');
    if (Math.abs(cross(a, b)) > 0.01) {
      this.s.toast('Líce nejsou rovnoběžné. Kótu lze vložit jen mezi rovnoběžné líce.', 'bad');
      return;
    }
    this.items.push({ kind: 'linear', refs: [prev, ref], ownerRef: 1 });
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
    if (!this.prev) return false;
    this.finish(null);
    return true;
  }

  overlay(): Overlay {
    const faces = this.used.map((u) => ({ wallId: u.wallId, face: u.face }));
    if (this.hover) faces.push({ wallId: this.hover.wallId, face: this.hover.face });
    const pl = this.placed;
    return { faces, draftDims: pl?.drafts ?? [], guides: pl?.guide ? [pl.guide] : [] };
  }

  tracker(): TrackerField[] | null {
    return null;
  }
}
