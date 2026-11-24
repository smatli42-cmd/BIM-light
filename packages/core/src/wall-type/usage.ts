// „Použití: N stěn“ se počítá z modelu, neukládá se (plán stěn Z1).
import type { Id } from '../ids/index.ts';
import type { Model } from '../model/types.ts';

export const wallTypeUsage = (model: Model, typeId: Id): number =>
  Object.values(model.elements).filter((e) => e.category === 'wall' && e.typeId === typeId).length;

/** Typy, které nepoužívá žádná stěna (pro „Vyčistit nepoužité“). */
export const unusedWallTypes = (model: Model): Id[] =>
  Object.keys(model.wallTypes).filter((id) => wallTypeUsage(model, id) === 0);
