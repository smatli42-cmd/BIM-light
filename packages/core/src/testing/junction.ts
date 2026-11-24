// Pomocníci pro testy napojení (plán stěn Z2): kdo vlastní bod půdorysu, plochy vrstev a obrysu.
import type { Vec2 } from '../geometry/index.ts';
import type { Id } from '../ids/index.ts';
import { signedArea } from '../junction/half-plane.ts';
import { pointInPolygon } from '../selection/pick.ts';
import { allWallGeometry, type WallGeometry } from '../wall/geometry.ts';
import type { Fixture } from './fixture.ts';

export interface Owner {
  readonly wallId: Id;
  readonly layer: number;
  /** Název materiálu vrstvy (Omítka, Zdivo…). */
  readonly material: string;
}

/** Všechny vrstvy všech stěn podlaží, ve kterých bod leží (správně právě jedna, nebo žádná). */
export function owners(f: Fixture, p: Vec2): Owner[] {
  const out: Owner[] = [];
  for (const g of allWallGeometry(f.model, f.storeyId).values())
    g.layers.forEach((l, layer) => {
      if (l.polygons.some((poly) => pointInPolygon(p, poly)))
        out.push({
          wallId: g.wallId,
          layer,
          material: f.model.materials[l.span.layer.materialId]?.name ?? '',
        });
    });
  return out;
}

/** Název materiálu jediného vlastníka bodu; '' = nikdo; 'VÍC' = překryv. */
export function ownerAt(f: Fixture, p: Vec2): string {
  const o = owners(f, p);
  return o.length === 0 ? '' : o.length > 1 ? 'VÍC' : (o[0] as Owner).material;
}

/** Id stěny, která bod vlastní (nebo ''). */
export const wallAt = (f: Fixture, p: Vec2): Id => {
  const o = owners(f, p);
  return o.length === 1 ? (o[0] as Owner).wallId : '';
};

const area = (polys: readonly (readonly Vec2[])[]) => polys.reduce((s, p) => s + Math.abs(signedArea(p)), 0);

export const layersArea = (g: WallGeometry): number => g.layers.reduce((s, l) => s + area(l.polygons), 0);
export const outlineArea = (g: WallGeometry): number => area(g.outlines);

/** Součet ploch vrstev všech stěn podlaží. */
export const totalArea = (f: Fixture): number =>
  [...allWallGeometry(f.model, f.storeyId).values()].reduce((s, g) => s + layersArea(g), 0);
