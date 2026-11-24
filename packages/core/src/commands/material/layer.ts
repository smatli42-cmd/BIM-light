// Příkaz: materiál vrstvy ve skladbě typu stěny (vybraná stěna → okamžitý vzhled šrafy v řezu).
// Mění typ, takže se projeví u všech stěn tohoto typu (jako v Revitu / Archicadu).
import { putWallType } from '../../model/update.ts';
import { wallTypeOf } from '../lookup.ts';
import { S } from '../schema.ts';
import { defineCommand, fail } from '../types.ts';
import { materialOf } from './shared.ts';

export interface SetLayerMaterialParams {
  typeId: string;
  layerIndex: number;
  bandIndex?: number;
  materialId: string;
}

export const wallTypeSetLayerMaterial = defineCommand<SetLayerMaterialParams>({
  name: 'wallType.setLayerMaterial',
  label: 'Materiál vrstvy',
  description:
    'Nastaví materiál jedné vrstvy ve skladbě typu stěny (pás bandIndex, výchozí 0; vrstva layerIndex ' +
    'od strany tloušťky). Změna platí pro všechny stěny tohoto typu.',
  group: 'Stěna',
  params: S.object(
    {
      typeId: S.id,
      layerIndex: { type: 'integer', minimum: 0, description: 'pořadí vrstvy (0 = první)' },
      bandIndex: { type: 'integer', minimum: 0, description: 'výškový pás (0 = první)' },
      materialId: S.id,
    },
    ['typeId', 'layerIndex', 'materialId'],
  ),
  run(model, p) {
    const t = wallTypeOf(model, p.typeId);
    materialOf(model, p.materialId);
    const bi = p.bandIndex ?? 0;
    const band = t.bands[bi] ?? fail('not-found', `Typ ${t.name} nemá pás ${bi}`);
    if (!band.layers[p.layerIndex]) fail('not-found', `Pás nemá vrstvu ${p.layerIndex}`);
    const layers = band.layers.map((l, i) => (i === p.layerIndex ? { ...l, materialId: p.materialId } : l));
    const bands = t.bands.map((b, i) => (i === bi ? { ...b, layers } : b));
    return { model: putWallType(model, { ...t, bands }) };
  },
});
