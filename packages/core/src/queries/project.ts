// Dotaz: přehled projektu pro AI – podlaží, typy stěn, pohledy, styly a počty prvků.
import { S } from '../commands/schema.ts';
import { bandAt, bandThickness, DEFAULT_CUT_HEIGHT } from '../wall/layers.ts';
import { allWalls } from '../wall/queries.ts';
import { storeysOf } from '../model/storeys.ts';
import { defineQuery } from './types.ts';

export const projectInfo = defineQuery<Record<string, never>, unknown>({
  name: 'project.info',
  label: 'Přehled projektu',
  description:
    'Vrátí přehled projektu: název, podlaží odspodu (id, název, úroveň nad ±0 a konstrukční výška v mm), typy stěn ' +
    '(id, název, tloušťka v mm), pohledy (id, název, podlaží, styl, měřítko), styly zobrazení a počty ' +
    'stěn a kót. Začni tímto dotazem, abys znal id pro další příkazy.',
  group: 'Projekt',
  params: S.object({}, []),
  run(m) {
    return {
      name: m.project.name,
      schemaVersion: m.schemaVersion,
      storeys: Object.values(m.buildings)
        .flatMap((b) => storeysOf(m, b.id))
        .map((s) => ({
          id: s.id,
          name: s.name,
          elevation: s.elevation,
          height: s.height,
        })),
      wallTypes: Object.values(m.wallTypes).map((t) => ({
        id: t.id,
        name: t.name,
        thickness: bandThickness(bandAt(t, DEFAULT_CUT_HEIGHT)),
      })),
      views: Object.values(m.views).map((v) => ({
        id: v.id,
        name: v.name,
        storeyId: v.storeyId,
        styleId: v.styleId,
        scale: v.scale,
        saved: v.saved,
      })),
      styles: Object.values(m.display.styles).map((s) => ({ id: s.id, name: s.name, detail: s.detail })),
      counts: { walls: allWalls(m).length, dimensions: Object.keys(m.dimensions).length },
    };
  },
});
