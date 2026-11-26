// Dotaz pro AI: vlastnosti stěn (plán stěn Z7) – výsledná hodnota, odkud je (typ / stěna) a mapování na IFC.
import { S } from '../commands/schema.ts';
import type { Id } from '../ids/index.ts';
import { getWall } from '../wall/queries.ts';
import { IFC_WALL_TYPE, WALL_PROPERTY_PARAMS } from '../wall-props/params.ts';
import { overriddenKeys, wallProperties } from '../wall-props/resolve.ts';
import type { WallProperties, WallPropertyKey } from '../wall-props/types.ts';
import { defineQuery } from './types.ts';

export interface WallPropertiesInfo {
  readonly wallId: Id;
  readonly typeName: string;
  readonly properties: WallProperties;
  /** Klíče, které stěna přepisuje; ostatní jsou podle typu. */
  readonly overridden: readonly WallPropertyKey[];
  /** IfcWall.PredefinedType v exportu. */
  readonly ifcPredefinedType: string;
}

export const wallPropertiesQuery = defineQuery<{ wallIds: Id[] }, WallPropertiesInfo[]>({
  name: 'wall.properties',
  label: 'Vlastnosti stěn',
  description:
    'Vlastnosti stěn: ' +
    WALL_PROPERTY_PARAMS.map((p) => `${p.key} (${p.label.toLowerCase()})`).join(', ') +
    '. U každé stěny výsledné hodnoty, které klíče stěna přepisuje proti typu, a PredefinedType v IFC.',
  group: 'Stěna',
  params: S.object({ wallIds: { type: 'array', items: S.id, minItems: 1 } }, ['wallIds']),
  run(m, p) {
    return p.wallIds.map((id) => {
      const w = getWall(m, id);
      const properties = wallProperties(m, w);
      return {
        wallId: id,
        typeName: m.wallTypes[w.typeId]?.name ?? '',
        properties,
        overridden: overriddenKeys(w),
        ifcPredefinedType: IFC_WALL_TYPE[properties.function],
      };
    });
  },
});
