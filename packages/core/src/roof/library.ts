// Výchozí knihovna typů střech (vymyšlená data): materiály střech a skladby odspodu nahoru. Nosná vrstva
// (funkce core) = krokve s izolací mezi nimi; její spodní líc je referenční rovina. Projekt dostane kopie
// s odkazem na původ (základ 21); id jsou stabilní kvůli migraci a scénám. Materiál, který projekt už má
// stejného jména (Dřevo, Sádrokarton), se použije a nový se nezakládá.
import type { Composition } from '../composition/types.ts';
import type { Id } from '../ids/index.ts';
import type { Material, MaterialCategory } from '../material/types.ts';
import type { LayerFunction, WallLayer } from '../wall-type/types.ts';
import type { RoofType } from './types.ts';

export const ROOF_LIBRARY_ID = 'bim-light-roofs';

const mat = (id: Id, name: string, category: MaterialCategory, color: string, hatchId: string): Material => ({
  id,
  name,
  category,
  color,
  hatchId,
  hatchPen: 1,
  lineColor: null,
  fillColor: null,
  transparent3D: false,
  joinLevelId: null,
  note: '',
  source: { libraryId: ROOF_LIBRARY_ID, itemId: id, version: 1 },
});

/** Fólie: úroveň Hydroizolace a fólie (nad tepelnou izolací). */
const membrane = (m: Material): Material => ({ ...m, joinLevelId: 'join-membrane' });

/** Materiály střech (Dřevo a Sádrokarton se vezmou z projektu podle jména). */
export const ROOF_MATERIALS: readonly Material[] = [
  mat('mat-roof-tiles', 'Krytina pálená', 'Ostatní', '#a9533b', 'hatch.krytina'),
  mat('mat-roof-sheet', 'Krytina plechová', 'Kov', '#4f5a63', 'hatch.kovy'),
  membrane(mat('mat-roof-membrane', 'Pojistná hydroizolace', 'Izolace', '#3f6f8f', 'hatch.izolace-voda')),
  membrane(mat('mat-roof-vapour', 'Parozábrana', 'Izolace', '#8a6fa8', 'hatch.izolace-voda')),
  mat('mat-roof-rafters', 'Krokve s tepelnou izolací', 'Izolace', '#d4b85a', 'hatch.tepelna-izolace'),
  mat('mat-roof-wood', 'Dřevo', 'Dřevo', '#a8783f', 'hatch.drevo'),
  mat('mat-roof-plasterboard', 'Sádrokarton', 'Ostatní', '#cfcfc8', 'hatch.sadrokarton'),
];

interface LibraryRoofType {
  readonly key: string;
  readonly name: string;
  readonly mark: string;
  /** Vrstvy odspodu: [materiál, tloušťka, funkce]. */
  readonly layers: readonly (readonly [Id, number, LayerFunction])[];
}

export const ROOF_TYPE_LIBRARY: readonly LibraryRoofType[] = [
  {
    key: 'tiles-240',
    name: 'Šikmá střecha, pálená krytina',
    mark: 'R1',
    layers: [
      ['mat-roof-plasterboard', 13, 'finish'],
      ['mat-roof-vapour', 1, 'insulation'],
      ['mat-roof-rafters', 200, 'core'],
      ['mat-roof-membrane', 1, 'insulation'],
      ['mat-roof-wood', 40, 'finish'],
      ['mat-roof-wood', 40, 'finish'],
      ['mat-roof-tiles', 30, 'finish'],
    ],
  },
  {
    key: 'sheet-180',
    name: 'Šikmá střecha, plechová krytina',
    mark: 'R2',
    layers: [
      ['mat-roof-plasterboard', 13, 'finish'],
      ['mat-roof-vapour', 1, 'insulation'],
      ['mat-roof-rafters', 180, 'core'],
      ['mat-roof-membrane', 1, 'insulation'],
      ['mat-roof-wood', 40, 'finish'],
      ['mat-roof-wood', 25, 'finish'],
      ['mat-roof-sheet', 2, 'finish'],
    ],
  },
  {
    key: 'cold-160',
    name: 'Studená střecha bez podkroví',
    mark: 'R3',
    layers: [
      ['mat-roof-wood', 160, 'core'],
      ['mat-roof-membrane', 1, 'insulation'],
      ['mat-roof-wood', 40, 'finish'],
      ['mat-roof-wood', 40, 'finish'],
      ['mat-roof-tiles', 30, 'finish'],
    ],
  },
];

/**
 * Doplní do materiálů projektu chybějící materiály střech a vrátí typy střech a jejich skladby
 * („použít pro střechu“) s odkazem na materiál projektu (stejné jméno = stejný materiál).
 */
export function roofLibraryFor(materials: Readonly<Record<Id, Material>>) {
  const out: Record<Id, Material> = { ...materials };
  const idOf = new Map<Id, Id>();
  for (const m of ROOF_MATERIALS) {
    const same = Object.values(out).find((o) => o.name === m.name);
    if (!same) out[m.id] = m;
    idOf.set(m.id, same?.id ?? m.id);
  }
  const roofTypes: Record<Id, RoofType> = {};
  const compositions: Record<Id, Composition> = {};
  for (const t of ROOF_TYPE_LIBRARY) {
    const compositionId = `roof-${t.key}`;
    const layers: WallLayer[] = t.layers.map(([m, thickness, fn]) => ({
      materialId: idOf.get(m) ?? m,
      thickness,
      function: fn,
      extendTop: 0,
      extendBottom: 0,
    }));
    compositions[compositionId] = {
      id: compositionId,
      name: t.name,
      layers,
      use: { wall: false, slab: false, roof: true },
    };
    const id = `roof-type-${t.key}`;
    roofTypes[id] = {
      id,
      name: t.name,
      mark: t.mark,
      compositionId,
      source: { libraryId: ROOF_LIBRARY_ID, itemId: t.key, version: 1 },
    };
  }
  return { materials: out, roofTypes, compositions };
}
