import { describe, expect, it } from 'vitest';
import { sequentialIds } from '../ids/index.ts';
import type { Model } from '../model/types.ts';
import { allRoomGeometry, areaM2 } from '../room/queries.ts';
import { buildSample } from './build.ts';
import { HOUSE } from './house.ts';
import { ROOM_SCENES } from './scenes-mistnosti.ts';
import type { Sample } from './types.ts';

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
    const a = areas(build(ROOM_SCENES[0]));
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
});
