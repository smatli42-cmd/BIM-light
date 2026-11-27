// Dotaz na místnosti pro AI (prvky stavby 9): číslo, název, plocha podle ČSN 73 4301 (m², 2 desetinná
// místa), obvod, výška, objem, obrys a ostrovy (mm), započítané výklenky a stav výpočtu.
import { S } from '../commands/schema.ts';
import type { Vec2 } from '../geometry/index.ts';
import { roomGeometry } from '../room/geometry.ts';
import { allRoomGeometry, areaM2 } from '../room/queries.ts';
import { areaSplit } from '../room/stamp.ts';
import { defineQuery } from './types.ts';

const r1 = (v: number) => Math.round(v * 10) / 10;
const pts = (ps: readonly Vec2[]) => ps.map((p) => ({ x: r1(p.x), y: r1(p.y) }));

export const roomList = defineQuery<{ storeyId?: string }, unknown>({
  name: 'room.list',
  label: 'Seznam místností',
  description:
    'Místnosti: number, name, area (m² podle ČSN 73 4301 – mezi líci stěn včetně omítek, bez sloupů a ' +
    'komínů, s výklenky ≥ 0,30 m), perimeter (mm), height (mm), volume (m³), outline a holes (mm), ' +
    'niches (id započítaných výklenků), manual (ruční obrys), state: ok / not-enclosed (neuzavřená) / ' +
    'in-wall (bod ve stěně) / redundant (nadbytečná – v prostoru je už jiná místnost); category, ' +
    'livingArea / utilityArea (m² podle druhu plochy kategorie), floorOffset (mm), color (vlastní barva), ' +
    'props (povrchy, poznámka, počet osob, teplota).',
  group: 'Místnost',
  params: S.object({ storeyId: S.id }, []),
  run: (m, p) => {
    const geo = allRoomGeometry(m, p.storeyId);
    return Object.values(m.rooms)
      .filter((r) => !p.storeyId || r.storeyId === p.storeyId)
      .map((r) => {
        const g = geo.get(r.id) ?? roomGeometry(m, r);
        return {
          id: r.id,
          storeyId: r.storeyId,
          number: r.number,
          name: r.name,
          status: r.status,
          state: g.state,
          area: areaM2(g.area),
          perimeter: r1(g.perimeter),
          height: r1(g.height),
          volume: Math.round(g.volume / 1e6) / 1000,
          seed: pts([r.seed])[0],
          stampAt: r.stampAt ? pts([r.stampAt])[0] : null,
          manual: !!r.manualOutline,
          outline: pts(g.outline),
          holes: g.holes.map(pts),
          niches: g.niches,
          categoryId: r.categoryId ?? null,
          category: m.roomCategories[r.categoryId ?? '']?.name ?? null,
          livingArea: areaM2(areaSplit(m, r, g.area).living),
          utilityArea: areaM2(areaSplit(m, r, g.area).utility),
          floorOffset: r.floorOffset ?? 0,
          color: r.graphicOverride?.fillColor ?? null,
          props: r.props ?? {},
        };
      });
  },
});

export const roomCategoryList = defineQuery<Record<string, never>, unknown>({
  name: 'roomCategory.list',
  label: 'Kategorie místností',
  description:
    'Kategorie (funkce) místností: id, name, color (výplň v půdorysu), areaKind (living = obytná plocha, ' +
    'utility = užitková) a počet místností.',
  group: 'Místnost',
  params: S.object({}, []),
  run: (m) =>
    Object.values(m.roomCategories).map((c) => ({
      ...c,
      rooms: Object.values(m.rooms).filter((r) => r.categoryId === c.id).length,
    })),
});
