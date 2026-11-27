import { describe, expect, it } from 'vitest';
import { electroRoom } from '../electro/room.ts';
import { ELECTRO_LIBRARY } from '../electro/library.ts';
import { sequentialIds } from '../ids/index.ts';
import { drawView } from '../view/draw-view.ts';
import { buildSample, findSample } from './index.ts';

const build = (key: string) => buildSample(findSample(key)!, sequentialIds());

describe('pokyn uživatele 2026-11-26: ukázky elektra', () => {
  it('scéna elektro: tabulka všech typů knihovny + prvky místnosti, pohled ve stylu Elektro kreslí každý prvek', () => {
    const m = build('elektro');
    const used = new Set(Object.values(m.electroElements).map((e) => e.typeId));
    expect(used.size).toBe(ELECTRO_LIBRARY.length);
    const view = Object.values(m.views)[0]!;
    expect(m.display.styles[view.styleId]?.name).toBe('Elektro');
    const drawn = new Set(drawView(m, view.id).primitives.map((p) => p.source.elementId));
    expect(Object.keys(m.electroElements).filter((id) => !drawn.has(id))).toEqual([]);
  });

  it('dům: elektro prvky 1.NP leží v místnostech (na vnitřním líci stěn), RH na příčce', () => {
    const m = build('dum');
    const els = Object.values(m.electroElements);
    expect(els.length).toBeGreaterThan(15);
    const outside = els.filter((e) => !electroRoom(m, e)).map((e) => e.mark || e.typeId);
    expect(outside).toEqual([]);
    expect(els.find((e) => e.mark === 'RH')?.typeId).toBe('et-board-main');
  });
});
