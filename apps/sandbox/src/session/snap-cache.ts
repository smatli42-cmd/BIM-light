// Mezipaměť pro přichytávání (výkon při pohybu myši): geometrie stěn a obrysy desek a otvorů podlaží,
// přepočítá se jen po změně modelu, podlaží nebo vyloučených prvků.
import {
  snapGeometry,
  snapOutlines,
  type Id,
  type Model,
  type SnapOutline,
  type WallGeometry,
} from '@bim-light/core';

export interface SnapData {
  readonly geoms: WallGeometry[];
  readonly outlines: SnapOutline[];
}

export class SnapCache {
  private last: { model: Model; key: string; data: SnapData } | null = null;

  get(model: Model, storeyId: Id, exclude?: ReadonlySet<Id>): SnapData {
    const key = `${storeyId}|${exclude ? [...exclude].sort().join(',') : ''}`;
    if (!this.last || this.last.model !== model || this.last.key !== key) {
      const data = {
        geoms: snapGeometry(model, storeyId, exclude),
        outlines: snapOutlines(model, storeyId, exclude),
      };
      this.last = { model, key, data };
    }
    return this.last.data;
  }
}
