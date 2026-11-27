// Testovací scény 3D okna (lišta podle Ardit Designeru): ukázkový dům ve 3D pohledu nastaveném příkazy.
import { HOUSE } from './house.ts';
import type { Sample, SampleContext } from './types.ts';

/** Id typu úpravy povrchu podle názvu. */
const covering = (c: SampleContext, name: string) =>
  Object.values(c.model.coveringTypes).find((t) => t.name === name)?.id ?? null;

/** Povrchy místností domu: koupelna obklad do 1,5 m a dlažba, kuchyně béžová, ostatní bílá a vinyl. */
function finishes(c: SampleContext) {
  for (const room of Object.values(c.model.rooms)) {
    const wet = room.name === 'Koupelna';
    const roomId = room.id;
    if (wet)
      c.run('covering.setZones', {
        roomId,
        zones: [
          { typeId: covering(c, 'Obklad 300×600 bílý'), top: 1500 },
          { typeId: covering(c, 'Malba bílá'), top: null },
        ],
      });
    else {
      const paint = room.name === 'Kuchyně' ? 'Malba béžová' : 'Malba bílá';
      c.run('covering.assign', { roomId, place: 'walls', typeId: covering(c, paint) });
    }
    const floor = wet || room.name === 'Kuchyně' ? 'Dlažba 600×600 šedá' : 'Vinyl dub';
    c.run('covering.assign', { roomId, place: 'floor', typeId: covering(c, floor) });
  }
}

const first3d = (c: SampleContext) => Object.keys(c.model.views3d)[0] as string;

export const VIEW3D_SCENES: readonly Sample[] = [
  {
    key: '3d-povrchy',
    title: '3D – povrchy místností: malby, obklad, dlažba',
    kind: 'scena',
    date: '2026-11-27',
    description:
      'Ukázkový dům s úpravami povrchů: koupelna obklad do 1,5 m a dlažba, kuchyně béžová malba a dlažba, ' +
      'ostatní místnosti bílá malba a vinyl. Otevři 3D (F4), zapni Řez nebo Ořez a podívej se dovnitř; ' +
      'v režimu Bílý model a Skica barvy povrchů zmizí, v Bourací práce také.',
    build(c) {
      HOUSE.build(c);
      finishes(c);
    },
  },
  {
    key: '3d-lista',
    title: '3D – lišta podle Arditu: skica, stíny, řez',
    kind: 'scena',
    date: '2026-11-27',
    description:
      'Ukázkový dům, 3D pohled v axonometrii, režim Skica, stíny 21. 6. v 15:00 a svislý řez domem. ' +
      'Otevři 3D (F4 nebo Obsah → 3D) a zkus: Persp. / Axon., režimy zobrazení, Slunce a stíny (datum, čas), ' +
      'Řez (táhni modrý úchyt), mřížku, kartu prvku (podrž myš nad stěnou) a Procházku (Shift+F3, W A S D, Esc).',
    build(c) {
      HOUSE.build(c);
      const viewId = first3d(c);
      c.run('view3d.setProjection', { viewId, projection: 'axonometric' });
      c.run('view3d.setRenderMode', { viewId, mode: 'sketch' });
      c.run('view3d.setSun', {
        viewId,
        sun: { shadows: true, mode: 'time', date: '2026-06-21', time: '15:00' },
      });
      c.run('view3d.setCutPlane', {
        viewId,
        plane: { origin: { x: 5000, y: 3500, z: 0 }, normal: { x: 0, y: 1, z: 0 } },
      });
    },
  },
];
