// Střecha ukázkového domu (rozhodnutí 11, S1): valbová 35° nad 2.NP, referenční čára = vnější líc obvodové
// zdi 465 ve výšce 3000 nad podlahou 2.NP (vršek zdí), přesah 500 mm.
import { vec } from '../geometry/index.ts';
import type { SampleContext } from './types.ts';

export function houseRoof(c: SampleContext, w: number, h: number) {
  const upper = Object.values(c.model.storeys).find((st) => st.name === '2.NP');
  const typeId = Object.values(c.model.roofTypes).find((t) => t.mark === 'R1')?.id;
  if (!upper || !typeId) return;
  const d = 465;
  c.run('roof.create', {
    storeyId: upper.id,
    typeId,
    rect: { a: vec(-d, -d), b: vec(w + d, h + d) },
    shape: 'hip',
    slope: 35,
    overhang: 500,
    refOffset: 3000,
  });
}
