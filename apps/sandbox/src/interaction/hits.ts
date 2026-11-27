// Zásahy myší do ovládacích prvků výkresu: trvalé kóty (čára, číslo, zámek), dočasné kóty,
// kolečka, trojúhelník délky a uzly vybrané stěny. Vše v px, počítá se ze stavu (ne z kreslení).
import {
  add,
  type Dimension,
  dimensionText,
  findWall,
  type Id,
  isDimensionVisible,
  layoutDimension,
  measureDimension,
  mul,
  type PathEnd,
  pointAt,
  type Vec2,
  type Wall,
  wallGeometry,
  wallOutward,
} from '@bim-light/core';
import type { Session } from '../session/session.ts';
import { inRect, near, screenText, segDist, type ScreenRect } from './screen.ts';
import { tempDimViews, type TempDimView } from './temp-layout.ts';

export interface PermDimView {
  readonly id: Id;
  readonly dim: Dimension;
  readonly segs: readonly (readonly [Vec2, Vec2])[];
  readonly textRect: ScreenRect;
  readonly lock: Vec2;
  readonly locked: boolean;
}

export interface GripView {
  readonly wallId: Id;
  /**
   * Uzel na konci, kolečko uprostřed (tažení = zakřivení, Z5), nebo dvojitá šipka překlopení (klik
   * převrátí stranu stěny kolem referenční čáry; stejné šipky později u dveří a dalších prvků).
   */
  readonly end: PathEnd | 'mid' | 'flip';
  readonly at: Vec2;
  /** Směr šipek překlopení v px (kolmo na stěnu). */
  readonly dir?: Vec2;
}

export type Hit =
  | { readonly kind: 'pin' | 'temp-text' | 'temp-line' | 'len-end'; readonly temp: TempDimView }
  | { readonly kind: 'lock' | 'dim-text' | 'dim-line'; readonly dim: PermDimView }
  | { readonly kind: 'grip'; readonly grip: GripView };

/** Rozložení trvalé kóty v px (číslo, čáry, zámek u čísla, katalog kreslení 4.5). */
export function permDimView(s: Session, d: Dimension): PermDimView | null {
  const v = s.viewport;
  const paper = s.model.display.paperSizes;
  const lay = layoutDimension(s.model, d, s.view.scale, paper);
  if (!lay) return null;
  const pts = lay.line.map((p) => v.toScreen(p));
  const segs: [Vec2, Vec2][] = [];
  for (let i = 0; i + 1 < pts.length; i++) segs.push([pts[i] as Vec2, pts[i + 1] as Vec2]);
  for (const [a, b] of lay.extensions) segs.push([v.toScreen(a), v.toScreen(b)]);
  const textPx = Math.max(9, paper.dimensionText * s.view.scale * v.s);
  const text = dimensionText(d, measureDimension(s.model, d));
  const at = v.toScreen(lay.textAt);
  const dir = { x: Math.cos(-lay.textAngle), y: Math.sin(-lay.textAngle) };
  const st = screenText(
    { x: at.x - dir.x, y: at.y - dir.y },
    { x: at.x + dir.x, y: at.y + dir.y },
    text,
    textPx,
    0,
  );
  const lock = { x: at.x + st.dir.x * (st.width / 2 + 12), y: at.y + st.dir.y * (st.width / 2 + 12) };
  return { id: d.id, dim: d, segs, textRect: st.rect, lock, locked: d.locked };
}

export function permDimViews(s: Session, hidden: readonly Id[] = []): PermDimView[] {
  const out: PermDimView[] = [];
  for (const d of Object.values(s.model.dimensions)) {
    if (hidden.includes(d.id) || !isDimensionVisible(s.model, s.view, d)) continue;
    const pv = permDimView(s, d);
    if (pv) out.push(pv);
  }
  return out;
}

/**
 * Kolečko zakřivení (Z5) 16 px za středem protilehlého líce a dvojitá šipka překlopení 18 px před
 * referenčním lícem (36 px vedle středu) – obě mimo stěnu, nepřekryjí klik do stěny ani tažení líce.
 */
function sideGrips(s: Session, w: Wall): GripView[] {
  const g = wallGeometry(s.model, w);
  const ref = s.viewport.toScreen(pointAt(g.faces.ref, 0.5));
  const opp = s.viewport.toScreen(pointAt(g.faces.opp, 0.5));
  // Směr kolmo ke stěně (od ref k opp) na obrazovce; ne spojnice středů líců – ty po napojení
  // nemusí být proti sobě (oprava 2026-11-26).
  const o = wallOutward(g);
  const ahead = s.viewport.toScreen(add(pointAt(g.faces.ref, 0.5), mul(o, -1000)));
  const d = Math.hypot(ahead.x - ref.x, ahead.y - ref.y) || 1;
  const u = { x: (ahead.x - ref.x) / d, y: (ahead.y - ref.y) / d };
  return [
    { wallId: w.id, end: 'mid', at: { x: opp.x + u.x * 16, y: opp.y + u.y * 16 } },
    // Šipka 36 px vedle středu, aby se nepotkala s dočasnou kótou uprostřed stěny.
    {
      wallId: w.id,
      end: 'flip',
      at: { x: ref.x - u.x * 18 + u.y * 36, y: ref.y - u.y * 18 - u.x * 36 },
      dir: u,
    },
  ];
}

/** Uzly (koncové čtverečky) a kolečko zakřivení jediné vybrané stěny. */
export function gripViews(s: Session): GripView[] {
  const id = s.selection.single;
  const w = findWall(s.model, id);
  if (!w || s.tool.id !== 'select') return [];
  const ends = (['start', 'end'] as const).map((end) => ({
    wallId: w.id,
    end,
    at: s.viewport.toScreen(w.path[end]),
  }));
  return [...ends, ...sideGrips(s, w)];
}

/** Co je pod kurzorem (v pořadí: kolečko, zámek, trojúhelník, uzel, čísla, čáry). */
export function hitAt(s: Session, p: Vec2, hidden: readonly Id[] = []): Hit | null {
  const temps = tempDimViews(s);
  const perms = s.tool.id === 'select' ? permDimViews(s, hidden) : [];
  for (const t of temps) if (t.pin && near(p, t.pin, 9)) return { kind: 'pin', temp: t };
  for (const d of perms)
    if (s.selection.dims.includes(d.id) && near(p, d.lock, 9)) return { kind: 'lock', dim: d };
  for (const t of temps) if (t.lenEnd && near(p, t.lenEnd, 8)) return { kind: 'len-end', temp: t };
  for (const g of gripViews(s)) if (near(p, g.at, 9)) return { kind: 'grip', grip: g };
  for (const t of temps) if (inRect(p, t.textRect)) return { kind: 'temp-text', temp: t };
  for (const d of perms) if (inRect(p, d.textRect)) return { kind: 'dim-text', dim: d };
  for (const t of temps) if (segDist(p, t.a, t.b) <= 5) return { kind: 'temp-line', temp: t };
  for (const d of perms)
    if (d.segs.some(([a, b]) => segDist(p, a, b) <= 5)) return { kind: 'dim-line', dim: d };
  return null;
}
