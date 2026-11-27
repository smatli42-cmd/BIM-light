// Poloha elektro prvku z hostitele (koncepce 3, základ 4): na líci stěny v místě po referenční čáře,
// osa y kolmo od líce do místnosti – při posunu, otočení nebo změně tloušťky stěny jde značka s ní.
// Volný prvek (strop, místnost) leží v bodě s natočením. Výška: instance, jinak výchozí výška typu.
import { add, mul, type Vec2 } from '../geometry/index.ts';
import type { Id } from '../ids/index.ts';
import type { Model } from '../model/types.ts';
import { stationAt } from '../opening/along.ts';
import { findWall, wallSection } from '../wall/queries.ts';
import type { BoardSize, ElectroElement, ElectroType } from './types.ts';

/** Místní soustava prvku v mm modelu: počátek (líc stěny / bod), osa po líci, osa do místnosti. */
export interface ElectroFrame {
  readonly origin: Vec2;
  readonly ex: Vec2;
  readonly ey: Vec2;
  /** Směr „odsazení podél stěny“: směr referenční čáry (u volného prvku osa x). */
  readonly along: Vec2;
}

export const electroTypeOf = (m: Model, el: ElectroElement): ElectroType | undefined =>
  m.electroTypes[el.typeId];

const unitAt = (deg: number): Vec2 => ({
  x: Math.cos((deg * Math.PI) / 180),
  y: Math.sin((deg * Math.PI) / 180),
});
/** Osa x tak, aby (ex, ey) byla pravotočivá soustava. */
const xFromY = (ey: Vec2): Vec2 => ({ x: ey.y, y: -ey.x });

/** Výška osy nad podlahou pro výpočet líce stěny (u stropních prvků 1 m, jako rovina řezu). */
const faceHeight = (el: ElectroElement, t: ElectroType | undefined) => el.height ?? t?.defaultHeight ?? 1000;

/** Soustava prvku; null = hostitelská stěna neexistuje. */
export function electroFrame(m: Model, el: ElectroElement): ElectroFrame | null {
  const h = el.host;
  if (h.kind === 'free') {
    const ex = unitAt(h.angle);
    return { origin: h.point, ex, ey: { x: -ex.y, y: ex.x }, along: ex };
  }
  const wall = findWall(m, h.wallId);
  if (!wall) return null;
  const faces = wallSection(m, wall, faceHeight(el, electroTypeOf(m, el))).faces;
  const st = stationAt(wall.path, h.offset);
  const off = faces[h.side];
  const away = Math.sign(off - faces.axis) || (h.side === 'ref' ? 1 : -1);
  const ey = mul(st.normal, away);
  return { origin: add(st.point, mul(st.normal, off)), ex: xFromY(ey), ey, along: st.tangent };
}

/**
 * Soustava značky: posun po líci a od líce (mm na papíře × měřítko) a natočení (°) z instance
 * („Značka v půdorysu“).
 */
export function symbolFrame(f: ElectroFrame, el: ElectroElement, scale: number): ElectroFrame {
  const s = el.symbol ?? {};
  const origin = add(add(f.origin, mul(f.along, (s.along ?? 0) * scale)), mul(f.ey, (s.out ?? 0) * scale));
  const r = ((s.rotation ?? 0) * Math.PI) / 180;
  if (!r) return { ...f, origin };
  const rot = (d: Vec2): Vec2 => ({
    x: d.x * Math.cos(r) - d.y * Math.sin(r),
    y: d.x * Math.sin(r) + d.y * Math.cos(r),
  });
  return { origin, ex: rot(f.ex), ey: rot(f.ey), along: f.along };
}

/** Bod místní soustavy (x po líci, y do místnosti) v mm modelu. */
export const toWorld = (f: ElectroFrame, x: number, y: number): Vec2 =>
  add(add(f.origin, mul(f.ex, x)), mul(f.ey, y));

/** Výška osy nad podlahou (mm); null = na stropě (typ bez výchozí výšky a instance bez výšky). */
export const electroHeight = (m: Model, el: ElectroElement): number | null =>
  el.height ?? electroTypeOf(m, el)?.defaultHeight ?? null;

/** Liší se výška od výchozí výšky typu? (Popisek výšky jen tehdy, koncepce 3.) */
export function heightDiffers(m: Model, el: ElectroElement): boolean {
  if (el.height === undefined) return false;
  return el.height !== electroTypeOf(m, el)?.defaultHeight;
}

/** Sloty značky: instance (rámeček), jinak typ. */
export function slotsOf(m: Model, el: ElectroElement): readonly string[] {
  const t = electroTypeOf(m, el);
  if (el.slots?.length) return el.slots;
  return t?.symbol.kind === 'glyphs' ? t.symbol.glyphs : [];
}

/** Rozměry skříně rozvaděče: typ + úpravy instance. */
export function boardOf(m: Model, el: ElectroElement): BoardSize {
  const base = electroTypeOf(m, el)?.board ?? { width: 600, height: 800, depth: 150, recess: 0 };
  return { ...base, ...el.board };
}

/** Délka liniového svítidla (mm). */
export const lengthOf = (m: Model, el: ElectroElement): number =>
  el.length ?? electroTypeOf(m, el)?.length ?? 1200;

/** Prvky elektro hostované na stěně. */
export const electroOnWall = (m: Model, wallId: Id): ElectroElement[] =>
  Object.values(m.electroElements).filter((e) => e.host.kind === 'wall' && e.host.wallId === wallId);
