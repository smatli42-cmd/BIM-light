// Výchozí knihovna úprav povrchů (vymyšlená data): materiály povrchů a typy úprav. Projekt dostane kopie
// s odkazem na původ (základ 21); id jsou stabilní kvůli migraci a scénám. Materiál, který projekt už má
// stejného jména (Omítka, Sádrokarton), se použije a nový se nezakládá.
import type { Id } from '../ids/index.ts';
import { DEFAULT_PRIORITY, type Material } from '../material/types.ts';
import type { CoveringType } from './types.ts';

export const COVERING_LIBRARY_ID = 'bim-light-coverings';

const mat = (id: Id, name: string, color: string, hatchId = 'hatch.omitky'): Material => ({
  id,
  name,
  category: 'Omítky',
  color,
  hatchId,
  hatchPen: 1,
  lineColor: null,
  fillColor: null,
  transparent3D: false,
  joinPriority: DEFAULT_PRIORITY['Omítky'],
  note: '',
  source: { libraryId: COVERING_LIBRARY_ID, itemId: id, version: 1 },
});

/** Materiály povrchových úprav (jen pro úpravy, ne pro vrstvy stěn). */
export const COVERING_MATERIALS: readonly Material[] = [
  mat('mat-cov-paint-white', 'Malba bílá', '#f3f1ea'),
  mat('mat-cov-paint-beige', 'Malba béžová', '#e9dcc3'),
  mat('mat-cov-plaster', 'Omítka', '#d8cfc0'),
  mat('mat-cov-tile-white', 'Obklad keramický bílý', '#e6edf0', 'hatch.bez-srafy'),
  mat('mat-cov-tile-grey', 'Dlažba keramická šedá', '#9b9890', 'hatch.bez-srafy'),
  mat('mat-cov-vinyl-oak', 'Vinyl dub', '#b8946a', 'hatch.bez-srafy'),
  mat('mat-cov-plasterboard', 'Sádrokarton', '#cfcfc8', 'hatch.sadrokarton'),
];

const t = (
  id: Id,
  name: string,
  kind: CoveringType['kind'],
  materialId: Id,
  tile?: CoveringType['tile'],
): CoveringType => ({
  id,
  name,
  kind,
  materialId,
  ...(tile && { tile }),
  source: { libraryId: COVERING_LIBRARY_ID, itemId: id, version: 1 },
});

/** Výchozí typy úprav (materialId = id z COVERING_MATERIALS; při kopii se přemapuje podle jména). */
export const COVERING_TYPE_LIBRARY: readonly CoveringType[] = [
  t('cov-paint-white', 'Malba bílá', 'paint', 'mat-cov-paint-white'),
  t('cov-paint-beige', 'Malba béžová', 'paint', 'mat-cov-paint-beige'),
  t('cov-plaster', 'Omítka štuková', 'plaster', 'mat-cov-plaster'),
  t('cov-tiling-300x600', 'Obklad 300×600 bílý', 'tiling', 'mat-cov-tile-white', {
    width: 300,
    height: 600,
    joint: 2,
    jointColor: '#c8c8c8',
    align: 'corner',
  }),
  t('cov-floor-tiles-600', 'Dlažba 600×600 šedá', 'floor-tiles', 'mat-cov-tile-grey', {
    width: 600,
    height: 600,
    joint: 3,
    jointColor: '#7a7a7a',
    align: 'center',
  }),
  t('cov-vinyl-oak', 'Vinyl dub', 'flooring', 'mat-cov-vinyl-oak'),
  t('cov-ceiling-sdk', 'Podhled SDK', 'ceiling', 'mat-cov-plasterboard'),
  t('cov-skirting-tiles', 'Sokl z dlažby', 'skirting', 'mat-cov-tile-grey', {
    width: 600,
    height: 80,
    joint: 3,
    jointColor: '#7a7a7a',
    align: 'corner',
  }),
];

/**
 * Doplní do materiálů projektu chybějící materiály úprav a vrátí typy úprav s odkazem na materiál
 * projektu (stejné jméno = stejný materiál).
 */
export function coveringLibraryFor(materials: Readonly<Record<Id, Material>>): {
  materials: Record<Id, Material>;
  types: Record<Id, CoveringType>;
} {
  const out: Record<Id, Material> = { ...materials };
  const idOf = new Map<Id, Id>();
  for (const m of COVERING_MATERIALS) {
    const same = Object.values(out).find((o) => o.name === m.name);
    if (!same) out[m.id] = m;
    idOf.set(m.id, same?.id ?? m.id);
  }
  const types = COVERING_TYPE_LIBRARY.map((c) => ({
    ...c,
    materialId: idOf.get(c.materialId ?? '') ?? null,
  }));
  return { materials: out, types: Object.fromEntries(types.map((c) => [c.id, c])) };
}
