// Rozložení dočasných kót vybrané stěny na obrazovce (katalog kreslení, část 3).
// Světle modré, číslo nad čarou podle ČSN; kolečko udělá trvalou kótu, trojúhelník volí konec.
import {
  edgePath,
  add,
  allWallGeometry,
  formatLength,
  mul,
  norm,
  sub,
  tangentAt,
  temporaryDimensions,
  wallOutward,
  openingEdgePath,
  openingTempDimensions,
  elementOutlineTempDimensions,
  outlineTempDimensions,
  type Opening,
  type OutlineSelf,
  type OutlineTempDimension,
  type Id,
  type Model,
  type TempDimension,
  type Vec2,
} from '@bim-light/core';
import type { Session } from '../session/session.ts';
import { screenText, type ScreenRect } from './screen.ts';

export interface TempDimView {
  readonly key: string;
  /** Kóta stěny / otvoru ve stěně, nebo obrysu desky / otvoru v desce. */
  readonly temp: TempDimension | OutlineTempDimension;
  /** Kótovací čára v px. */
  readonly a: Vec2;
  readonly b: Vec2;
  readonly ext: readonly (readonly [Vec2, Vec2])[];
  readonly text: string;
  readonly textAt: Vec2;
  readonly angle: number;
  readonly textRect: ScreenRect;
  /** Kolečko „udělat trvalou kótu“ (jen u rovnoběžných líců). */
  readonly pin: Vec2 | null;
  /** Trojúhelník u konce, který se hýbe při zadání délky. */
  readonly lenEnd: Vec2 | null;
  /** Výchozí bod a směr posunu čáry (mm) pro tažení. */
  readonly base: Vec2;
  readonly shiftDir: Vec2;
}

export const tempKey = (t: TempDimension | OutlineTempDimension) => {
  if (t.kind === 'outline') return `ol-${t.side}`;
  return t.kind === 'length' ? 'len' : `x-${t.own.openingId ? 'o-' : ''}${t.own.face}`;
};

type CrossLike = Extract<TempDimension, { kind: 'cross' }> | OutlineTempDimension;

function crossView(s: Session, t: CrossLike, face: Vec2): TempDimView {
  const key = tempKey(t);
  const off = s.tempOffsets[key] ?? 0;
  const A = add(t.from, mul(face, off));
  const B = add(t.to, mul(face, off));
  const pinned = t.parallel && (t.kind !== 'outline' || t.own !== null);
  return finish(s, key, t, A, B, [t.from, t.to], face, pinned);
}

/** Kóty obrysu: posouvají se kolmo ke směru měření (katalog kreslení 3, tažení čáry). */
const outlineViews = (s: Session, temps: readonly OutlineTempDimension[]): TempDimView[] =>
  temps.map((t) => crossView(s, t, { x: -t.dir.y, y: t.dir.x }));

/** Dočasné kóty rozpracovaného obrysu při kreslení desky / otvoru v desce (bez vlastníka). */
export const draftOutlineViews = (s: Session, points: readonly Vec2[], self: OutlineSelf | null = null) =>
  outlineViews(s, outlineTempDimensions(s.model, s.storeyId, points, self));

function lengthView(s: Session, m: Model, t: TempDimension, wallId: Id): TempDimView | null {
  const g = allWallGeometry(m, s.storeyId).get(wallId);
  if (!g || g.faces.ref.kind !== 'line') return null;
  const out = wallOutward(g);
  const off = s.tempOffsets.len ?? s.viewport.px(30);
  const f = g.faces.ref;
  const A = add(f.start, mul(out, off));
  const B = add(f.end, mul(out, off));
  return finish(s, 'len', t, A, B, [f.start, f.end], out, true);
}

function finish(
  s: Session,
  key: string,
  temp: TempDimension | OutlineTempDimension,
  A: Vec2,
  B: Vec2,
  feet: [Vec2, Vec2],
  shiftDir: Vec2,
  pinned: boolean,
): TempDimView {
  const v = s.viewport;
  const a = v.toScreen(A);
  const b = v.toScreen(B);
  const ext: [Vec2, Vec2][] = [];
  if (Math.hypot(feet[0].x - A.x, feet[0].y - A.y) > 1) ext.push([v.toScreen(feet[0]), a]);
  if (Math.hypot(feet[1].x - B.x, feet[1].y - B.y) > 1) ext.push([v.toScreen(feet[1]), b]);
  const text = formatLength(temp.value);
  const st = screenText(a, b, text, 12, 9);
  const pin = pinned ? add(st.at, mul(st.dir, st.width / 2 + 14)) : null;
  const end = s.lenEnd === 'start' ? a : b;
  const away = norm(sub(end, s.lenEnd === 'start' ? b : a));
  const lenEnd = temp.kind === 'length' ? add(end, mul(away, 12)) : null;
  return {
    key,
    temp,
    a,
    b,
    ext,
    text,
    textAt: st.at,
    angle: st.angle,
    textRect: st.rect,
    pin,
    lenEnd,
    base: feet[0],
    shiftDir,
  };
}

/** Dočasné kóty vybraného otvoru: od hran k sousedům po stěně (plán stěn Z4). */
function openingTempViews(s: Session, model: Model, id: Id): TempDimView[] {
  return openingTempDimensions(model, id, 'ref').map((t) =>
    crossView(
      s,
      t,
      tangentAt(
        openingEdgePath(model, model.openings[id] as Opening, t.own.face === 'end' ? 'end' : 'start'),
        'start',
      ),
    ),
  );
}

/**
 * Dočasné kóty pro jednu vybranou stěnu (při více vybraných se nezobrazují). `model` = náhled
 * během tažení uzlu (katalog kreslení 5.2), jinak skutečný model.
 */
export function tempDimViews(s: Session, model: Model = s.model): TempDimView[] {
  if (s.tool.id !== 'select') return [];
  const op = s.selection.singleOpening;
  if (op && model.openings[op]) return openingTempViews(s, model, op);
  const ol = s.selection.singleSlab ?? s.selection.singleSlabOpening;
  if (ol) return outlineViews(s, elementOutlineTempDimensions(model, ol));
  const id = s.selection.single;
  if (!id) return [];
  const geoms = allWallGeometry(model, s.storeyId);
  const g = geoms.get(id);
  if (!g) return [];
  const out: TempDimView[] = [];
  for (const t of temporaryDimensions(g, [...geoms.values()], s.tempMode)) {
    if (t.kind === 'cross') out.push(crossView(s, t, tangentAt(edgePath(g, t.own.face), 'start')));
    else {
      const l = lengthView(s, model, t, id);
      if (l) out.push(l);
    }
  }
  return out;
}
