// Pohledy (fasády) kolem budovy jedním příkazem (rozhodnutí 19; Revit 4 pohledy, Archicad Elevation).
// Opakované volání pohledy nezdvojí: pohledy s označením 1–4 dostanou nové čáry podle aktuální obálky
// (název, styl, měřítko, úpravy i kóty zůstanou), chybějící se vytvoří znovu.
import { elevationsAround, ELEVATION_MARGIN, isCompassName } from '../../section/elevations.ts';
import type { Section } from '../../section/types.ts';
import { S } from '../schema.ts';
import { defineCommand, fail } from '../types.ts';
import { putSection } from './section.ts';
import { checkSection, newSection } from './shape.ts';

export const elevationCreate = defineCommand<{ margin?: number; scale?: number }>({
  name: 'elevation.create',
  label: 'Pohledy kolem budovy',
  description:
    'Vytvoří 4 pohledy (fasády) kolem obálky stěn a desek: čáry v odstupu margin (mm, výchozí 3000), ' +
    'každý se dívá k budově, název podle světové strany fasády (Pohled jižní…), označení 1–4, hloubka ' +
    'bez omezení. scale = měřítko (výchozí 100). Když pohledy 1–4 už existují, jen jim přepočítá čáry ' +
    'podle aktuální obálky (nezdvojí je; název, styl a kóty zůstanou). Vrátí id všech 4 pohledů.',
  group: 'Řezy a pohledy',
  icon: 'elevation',
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
    const existing = Object.values(model.sections).filter((x) => x.kind === 'elevation');
    let m = model;
    const created: string[] = [];
    for (const spec of specs) {
      const scale = p.scale ? { scale: p.scale } : {};
      const old = existing.find((x) => x.mark === spec.mark);
      const s: Section = old
        ? checkSection(m, {
            ...old,
            ...scale,
            name: isCompassName(old.name) ? spec.name : old.name,
            points: [spec.start, spec.end],
            direction: spec.direction,
          })
        : newSection(m, ctx.newId(), 'elevation', { ...spec, depth: null, ...scale });
      m = putSection(m, s);
      created.push(s.id);
    }
    return { model: m, created };
  },
});
