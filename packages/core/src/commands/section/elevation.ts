// Pohledy (fasády) kolem budovy jedním příkazem (rozhodnutí 19; Revit 4 pohledy, Archicad Elevation).
import { elevationsAround, ELEVATION_MARGIN } from '../../section/elevations.ts';
import { S } from '../schema.ts';
import { defineCommand, fail } from '../types.ts';
import { newSection, putSection } from './section.ts';

export const elevationCreate = defineCommand<{ margin?: number; scale?: number }>({
  name: 'elevation.create',
  label: 'Pohledy kolem budovy',
  description:
    'Vytvoří 4 pohledy (fasády) kolem obálky stěn a desek: čáry v odstupu margin (mm, výchozí 3000), ' +
    'každý se dívá k budově, název podle světové strany fasády (Pohled jižní…), označení 1–4, hloubka ' +
    'bez omezení. scale = měřítko (výchozí 100).',
  group: 'Řezy a pohledy',
  params: S.object(
    {
      margin: S.number('odstup čar od obálky budovy (mm)', { minimum: 0 }),
      scale: S.number('měřítko (jmenovatel)', { exclusiveMinimum: 0 }),
    },
    [],
  ),
  run(model, p, ctx) {
    const specs = elevationsAround(model, p.margin ?? ELEVATION_MARGIN);
    if (!specs.length) fail('invalid', 'V modelu nejsou stěny ani desky – není kolem čeho dělat pohledy');
    let m = model;
    const created: string[] = [];
    for (const spec of specs) {
      const scale = p.scale ? { scale: p.scale } : {};
      const s = newSection(m, ctx.newId(), 'elevation', { ...spec, depth: null, ...scale });
      m = putSection(m, s);
      created.push(s.id);
    }
    return { model: m, created };
  },
});
