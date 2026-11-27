import { describe, expect, it } from 'vitest';
import { sequentialIds } from '../ids/index.ts';
import type { Model } from '../model/types.ts';
import { allRoomGeometry, areaM2 } from '../room/queries.ts';
import { buildSample } from './build.ts';
import { HOUSE } from './house.ts';
import { ROOM_SCENES } from './scenes-mistnosti.ts';
import type { Sample } from './types.ts';
import { allSurfaces } from '../covering/surfaces.ts';

const areas = (m: Model) =>
  Object.fromEntries(
    [...allRoomGeometry(m)].map(([id, g]) => [m.rooms[id]?.name ?? id, [g.state, areaM2(g.area)]]),
  );
const build = (s: Sample | undefined) => {
  if (!s) throw new Error('Chybí ukázka');
  return buildSample(s, sequentialIds());
};

describe('ukázky: místnosti (pokyn uživatele 2026-11-26)', () => {
  it('prvky stavby 9: scéna „mistnosti“ – sloup odečten, výklenek započten, všechny uzavřené', () => {
    const a = areas(build(ROOM_SCENES.find((x) => x.key === 'mistnosti')));
    expect(a).toEqual({
      'Obývací pokoj': ['ok', 19.9],
      Ložnice: ['ok', 10.1],
      Koupelna: ['ok', 10.1],
    });
  });

  it('prvky stavby 9: ukázkový dům má místnosti v obou podlažích, všechny uzavřené', () => {
    const m = build(HOUSE);
    const all = [...allRoomGeometry(m).values()];
    expect(all).toHaveLength(9);
    expect(all.map((g) => g.state).every((s) => s === 'ok')).toBe(true);
  });

  it('prvky stavby 9: scéna „povrchy“ – obklad, vlastní zóny stěny s oknem, dlažba, sokl, výkaz', () => {
    const m = build(ROOM_SCENES.find((x) => x.key === 'povrchy'));
    expect(Object.values(areas(m)).every(([s]) => s === 'ok')).toBe(true);
    const s = allSurfaces(m);
    const types = new Set(s.map((x) => x.typeId));
    for (const t of ['cov-tiling-300x600', 'cov-floor-tiles-600', 'cov-skirting-tiles', 'cov-vinyl-oak'])
      expect(types.has(t)).toBe(true);
    expect(s.some((x) => x.place === 'jamb')).toBe(true);
  });

  it('prvky stavby 9: ukázkový dům má povrchy ve všech místnostech', () => {
    const m = build(HOUSE);
    const s = allSurfaces(m);
    const floors = s.filter((x) => x.place === 'floor' && x.typeId);
    expect(floors).toHaveLength(9);
  });
});
