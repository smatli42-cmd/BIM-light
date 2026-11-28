// Obnovení automatických pohledů kolem budovy (rozhodnutí 19, základ 16; Revit 4 pohledy, Archicad
// Elevation). Pohledy 1–4 vznikají a přepočítávají se samy (auto.ts); tento příkaz je „vrátí generátoru“:
// smazané vytvoří znovu, ručně posunuté odemkne a přepočítá, může změnit odstup od budovy.
import type { Model } from '../../model/types.ts';
import { S } from '../schema.ts';
import { defineCommand, fail } from '../types.ts';
import { syncElevations } from './auto.ts';
import { putSection } from './section.ts';

export const elevationCreate = defineCommand<{ margin?: number; scale?: number }>({
  name: 'elevation.create',
  label: 'Obnovit pohledy kolem budovy',
  description:
    'Pohledy 1–4 kolem budovy vznikají a přepočítávají se samy (čáry v odstupu od obálky stěn a desek, ' +
    'název podle světové strany fasády: Jižní…). Tento příkaz je obnoví: smazané vytvoří znovu, ručně ' +
    'posunuté odemkne a vrátí k obálce. margin = nový odstup (mm, výchozí beze změny, v novém projektu ' +
    '3000), scale = měřítko všech čtyř. Název, styl a kóty zůstanou. Vrátí id všech 4 pohledů.',
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
    const margin = p.margin ?? model.elevationsAround.margin;
    let m: Model = { ...model, elevationsAround: { margin, removed: [] } };
    for (const s of Object.values(m.sections))
      if (s.auto) m = putSection(m, { ...s, auto: { locked: false } });
    const r = syncElevations(m, ctx.newId);
    if (!r.ids.length) fail('invalid', 'V modelu nejsou stěny ani desky – není kolem čeho dělat pohledy');
    let out = r.model;
    for (const s of r.ids.map((id) => out.sections[id]))
      if (s && p.scale) out = putSection(out, { ...s, scale: p.scale });
    return { model: out, created: r.ids };
  },
});
