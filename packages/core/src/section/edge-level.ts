// Posun vodorovné hrany prvku na výšku z (úchopy v řezu, pokyn uživatele 2026-11-27; základy 6, 12, 25).
// Pohne se jen uchopená hrana, druhá stojí; výsledek je volání stávajícího příkazu (stejně jako AI):
// - vršek stěny: vazba zůstane, přepočítá se odsazení (Revit „Top Offset“, Archicad „odsazení vršku“);
//   nespojená stěna změní výšku;
// - spodek stěny: odsazení spodku od podlaží; vršek stojí (nespojená stěna změní výšku);
// - deska (horní i spodní líc): tloušťku dává typ (skladba), tažení posune celou desku = horní líc nad
//   podlažím (Revit „Height Offset From Level“, Archicad „odsazení od podlaží“);
// - otvor: spodní hrana = parapet (nadpraží stojí, výška se dopočte), horní hrana = výška otvoru.
import type { Id } from '../ids/index.ts';
import { resolveHeight, type HeightTop } from '../model/height.ts';
import { storeyLevel } from '../model/storeys.ts';
import type { Model } from '../model/types.ts';
import { openingLevels } from '../opening/geometry.ts';
import { slabLevels } from '../slab/geometry.ts';
import type { Slab } from '../slab/types.ts';
import { wallHeight } from '../wall-height/resolve.ts';
import type { Wall } from '../wall/types.ts';

export type Edge = 'top' | 'bottom';
export const EDGES: readonly Edge[] = ['top', 'bottom'];

/** Volání příkazu jádra, které hranu posune. */
export interface EdgeCall {
  readonly command: 'wall.setHeight' | 'slab.update' | 'opening.update';
  readonly params: Record<string, unknown>;
}

/** Číslo v trackeru: název a od čeho se měří (hodnota = z − ref). */
export interface EdgeMeasure {
  readonly label: string;
  readonly ref: number;
}

type Target =
  { kind: 'wall'; wall: Wall } | { kind: 'slab'; slab: Slab } | { kind: 'opening'; id: Id; host: Wall };

function targetOf(m: Model, id: Id): Target {
  const el = m.elements[id];
  if (el?.category === 'wall') return { kind: 'wall', wall: el };
  if (el?.category === 'slab') return { kind: 'slab', slab: el };
  const o = m.openings[id];
  const host = o ? m.elements[o.hostId] : undefined;
  if (o && host?.category === 'wall') return { kind: 'opening', id, host };
  throw new Error(`Prvek ${id} nemá vodorovné hrany (stěna, deska, otvor)`);
}

const elevation = (m: Model, storeyId: Id) => m.storeys[storeyId]?.elevation ?? 0;

/** Výška hrany nad ±0,000 tak, jak ji kreslí řez (stěna i s prodloužením k nosné desce). */
export function edgeLevel(m: Model, id: Id, edge: Edge): number {
  const t = targetOf(m, id);
  if (t.kind === 'wall') return wallHeight(m, t.wall)[edge];
  if (t.kind === 'slab') return slabLevels(m, t.slab)[edge];
  const o = m.openings[t.id];
  if (!o) throw new Error(`Otvor ${t.id} neexistuje`);
  return openingLevels(m, o, t.host)[edge];
}

/** Co znamená číslo napsané do trackeru u hrany. */
export function edgeMeasure(m: Model, id: Id, edge: Edge): EdgeMeasure {
  const t = targetOf(m, id);
  if (t.kind === 'wall')
    return edge === 'top'
      ? { label: 'Výška', ref: wallHeight(m, t.wall).bottom }
      : { label: 'Spodek', ref: elevation(m, t.wall.storeyId) };
  if (t.kind === 'slab') {
    const e = elevation(m, t.slab.storeyId);
    return edge === 'top' ? { label: 'Horní líc', ref: e } : { label: 'Spodní líc', ref: e };
  }
  if (edge === 'bottom') return { label: 'Parapet', ref: resolveHeight(m, t.host.height).bottom };
  return { label: 'Výška otvoru', ref: edgeLevel(m, id, 'bottom') };
}

/** Nový vršek vazby tak, aby vršek stěny byl ve výšce z (vazba zůstane). */
function topAt(m: Model, w: Wall, z: number, bottom: number): HeightTop {
  const top = w.height.top;
  if (top.kind === 'height') return { kind: 'height', value: z - bottom };
  if (top.kind === 'slab') {
    const slab = m.elements[top.slabId];
    if (slab?.category !== 'slab') throw new Error(`Deska ${top.slabId} neexistuje`);
    return { ...top, offset: z - slabLevels(m, slab).bottom };
  }
  const level = storeyLevel(m, w.height.baseStoreyId, top.storeys) ?? 0;
  return { ...top, offset: z - level };
}

function wallCall(m: Model, w: Wall, edge: Edge, z: number): EdgeCall {
  const r = resolveHeight(m, w.height);
  const baseOffset = edge === 'bottom' ? z - elevation(m, w.storeyId) : w.height.baseOffset;
  const bottom = edge === 'bottom' ? z : r.bottom;
  // Spodek: vršek stojí – nespojená stěna změní výšku, vázaný vršek se nemění.
  const top =
    edge === 'top'
      ? topAt(m, w, z, bottom)
      : w.height.top.kind === 'height'
        ? topAt(m, w, r.top, bottom)
        : w.height.top;
  return { command: 'wall.setHeight', params: { wallIds: [w.id], height: { baseOffset, top } } };
}

/** Volání příkazu, které posune hranu `edge` prvku `id` na výšku z (mm nad ±0,000). */
export function edgeCall(m: Model, id: Id, edge: Edge, z: number): EdgeCall {
  const t = targetOf(m, id);
  if (t.kind === 'wall') return wallCall(m, t.wall, edge, z);
  if (t.kind === 'slab') {
    const lv = slabLevels(m, t.slab);
    const top = edge === 'top' ? z : z + lv.thickness;
    return {
      command: 'slab.update',
      params: { slabIds: [id], topOffset: top - elevation(m, t.slab.storeyId) },
    };
  }
  const o = m.openings[t.id];
  if (!o) throw new Error(`Otvor ${t.id} neexistuje`);
  const lv = openingLevels(m, o, t.host);
  const base = lv.bottom - o.sill;
  const bottom = edge === 'bottom' ? z : lv.bottom;
  const top = edge === 'top' ? z : lv.top;
  return {
    command: 'opening.update',
    params: { openingIds: [id], sill: bottom - base, height: top - bottom },
  };
}
