// Pomůcky receptů testovacích scén a ukázkového projektu (obdélník stěn, typ podlahy s dlažbou).
import { vec } from '../geometry/index.ts';
import type { SampleContext } from './types.ts';

export const rect = (c: SampleContext, type: string, w: number, h: number, status = 'new') =>
  c.run('wall.rectangle', { storeyId: c.storeyId, typeId: c.type(type), a: vec(0, 0), b: vec(w, h), status });

/**
 * Typ podlahy „Podlaha dlažba 160“ (P3): kopie „Podlaha anhydrit 150“ s vlastní skladbou a keramickou
 * dlažbou 10 mm navrch – stejné kroky jako Duplikovat a „+ vrstva navrch“ v editoru typů. Vrátí id typu.
 */
export function tiledFloor(c: SampleContext): string {
  const [id] = c.run('slabType.duplicate', {
    typeId: c.slabType('Podlaha anhydrit 150'),
    name: 'Podlaha dlažba 160',
    ownComposition: true,
  });
  const layer = { materialId: 'mat-cov-tile-grey', thickness: 10, function: 'finish' };
  c.run('slabType.update', { typeId: id, mark: 'P3' });
  c.run('slabType.addLayer', { typeId: id, layer });
  return id ?? '';
}
