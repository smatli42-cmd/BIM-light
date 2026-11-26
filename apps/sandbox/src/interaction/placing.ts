// Kóty nesené na myši (pravidla-interakce, kóty 2, 3, 7; základ 25): hýbe se jen to, co právě
// vzniká; kóta vznikne až kliknutím; poblíž rovnoběžné kóty se čára zarovná (světle modré vodítko).
import {
  snapDimensionLine,
  withLineThrough,
  type ArcMeasure,
  type Dimension,
  type LengthMeasure,
  type FaceRef,
  type Id,
  type Vec2,
} from '@bim-light/core';
import type { Session } from '../session/session.ts';
import { FACE_PX } from '../session/session.ts';
import type { Mode } from './mode.ts';
import type { Overlay, PointerInfo } from './types.ts';

export type DraftItem =
  | { kind: 'linear'; refs: [FaceRef, FaceRef]; ownerRef: 0 | 1; arc?: ArcMeasure }
  | { kind: 'length'; ref: FaceRef; measure?: LengthMeasure };

/** Kóta, která ještě není v modelu (náhled). */
export function draftOf(item: DraftItem, i: number, storeyId: Id): Dimension {
  const base = {
    id: `draft-${i}`,
    storeyId,
    annotationLayerId: '',
    locked: false,
    value: 0,
    textOverride: null,
    alignGroupId: null,
  };
  return item.kind === 'linear'
    ? {
        ...base,
        kind: 'linear',
        refs: item.refs,
        ownerRef: item.ownerRef,
        offset: 0,
        ...(item.arc ? { arc: item.arc } : {}),
      }
    : {
        ...base,
        kind: 'length',
        ref: item.ref,
        offset: 0,
        ...(item.measure ? { measure: item.measure } : {}),
      };
}

export interface Placed {
  readonly drafts: Dimension[];
  readonly point: Vec2;
  readonly alignWith: Id | null;
  readonly guide: readonly [Vec2, Vec2] | null;
}

/** Posune všechny kóty řady na čáru přes bod; Alt zarovnání vypne. */
export function placeDrafts(s: Session, drafts: readonly Dimension[], world: Vec2, alt: boolean): Placed {
  const first = drafts[0];
  if (!first) return { drafts: [], point: world, alignWith: null, guide: null };
  const ex = new Set(drafts.map((d) => d.id));
  const others = Object.values(s.model.dimensions).filter((d) => d.storeyId === s.storeyId);
  const snap = alt
    ? { point: world, alignWith: null, guide: null }
    : snapDimensionLine(s.model, first, world, others, s.viewport.px(FACE_PX), ex);
  return {
    drafts: drafts.map((d) => withLineThrough(s.model, d, snap.point)),
    point: snap.point,
    alignWith: snap.alignWith,
    guide: snap.guide,
  };
}

/** Vytvoří řadu kót v aktivní skupině anotací pohledu (jeden krok Undo). */
export function commitDrafts(s: Session, items: readonly DraftItem[], placed: Placed): Id[] {
  const r = s.run('dimension.createSet', {
    viewId: s.viewId,
    items,
    point: placed.point,
    ...(placed.alignWith ? { alignWith: placed.alignWith } : {}),
  });
  if (!r.ok) return [];
  if (placed.alignWith)
    s.toast('Kóty se zarovnaly s vedlejší řadou. Táhnutím jedné se pohnou všechny (Alt = jen tato).');
  return [...r.created];
}

/** Nová kóta z kolečka dočasné kóty: nese se na myši, klik ji usadí, Esc ji nechá na místě. */
export class PlacingMode implements Mode {
  active = true;
  private placed: Placed;
  readonly hint =
    'Posuň kótu myší a klikni na místo. U jiné kóty se zarovná (Alt vypne). Esc ji nechá na místě.';

  constructor(
    private readonly s: Session,
    private readonly items: DraftItem[],
    at: Vec2,
  ) {
    const drafts = items.map((it, i) => draftOf(it, i, s.storeyId));
    this.placed = placeDrafts(s, drafts, at, true);
  }

  move(p: PointerInfo) {
    this.placed = placeDrafts(this.s, this.placed.drafts, p.world, p.alt);
  }

  up() {}

  down(p: PointerInfo): boolean {
    this.move(p);
    this.finish();
    return true;
  }

  escape() {
    this.finish();
  }

  private finish() {
    if (!this.active) return;
    this.active = false;
    commitDrafts(this.s, this.items, this.placed);
  }

  overlay(): Overlay {
    return { draftDims: this.placed.drafts, guides: this.placed.guide ? [this.placed.guide] : [] };
  }
}
