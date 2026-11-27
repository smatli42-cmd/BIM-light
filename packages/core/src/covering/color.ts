// Barva plochy povrchu (základ 11): vždy přes funkci grafiky – fakta úpravy (kategorie covering, typ,
// materiál, stav a varianta místnosti) → `surfaceColor` a průhlednost; null = barva materiálu typu.
import type { Model } from '../model/types.ts';
import type { Room } from '../room/types.ts';
import { variantKey, type ElementFacts } from '../style/conditions.ts';
import { resolveGraphics } from '../style/graphics.ts';
import type { GraphicView } from '../view/types.ts';
import type { CoveringType } from './types.ts';

/** Fakta úpravy povrchu pro funkci grafiky (pravidla se ptají na typ, materiál, stav…). */
export function coveringFacts(room: Room, type: CoveringType): ElementFacts {
  return {
    id: `${room.id}/${type.id}`,
    category: 'covering',
    discipline: room.discipline,
    status: room.status,
    variant: variantKey(room.variant),
    typeId: type.id,
    materialIds: type.materialId ? [type.materialId] : [],
  };
}

export interface SurfaceLook {
  readonly visible: boolean;
  /** Barva #rrggbb; null = bez úpravy (3D použije materiál stěny / desky). */
  readonly color: string | null;
  /** Průhlednost 0–100 %. */
  readonly transparency: number;
}

/** Vzhled plochy s typem úpravy v pohledu (bez pohledu = barva materiálu). */
export function surfaceLook(
  model: Model,
  room: Room,
  typeId: string | null,
  view?: GraphicView,
): SurfaceLook {
  const type = typeId ? model.coveringTypes[typeId] : undefined;
  if (!type) return { visible: true, color: null, transparency: 0 };
  const own = model.materials[type.materialId ?? '']?.color ?? '#d8d8d8';
  if (!view) return { visible: true, color: own, transparency: 0 };
  const e = resolveGraphics(model.display, view, coveringFacts(room, type)).effect;
  return { visible: e.visible, color: e.surfaceColor ?? own, transparency: e.surfaceTransparency ?? 0 };
}
