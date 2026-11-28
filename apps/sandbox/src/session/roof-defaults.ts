// Výchozí nastavení nové střechy (nástroj Střecha, S2; info box podle Arditu „Střecha“) a vybraná hrana
// hotové střechy. Stav rozhraní mimo model, jeden na session (jako stav 3D okna).
import { DEFAULT_ROOF_OVERHANG, DEFAULT_ROOF_REF, DEFAULT_ROOF_SLOPE } from '@bim-light/core';
import type { EaveCut, Id, RoofShape, Vec2 } from '@bim-light/core';
import type { Session } from './session.ts';

/** Konstrukční metoda: mnohoúhelník, obdélník, natočený obdélník (jako Deska). */
export type RoofMethod = 'polygon' | 'rect' | 'rotated';

export interface RoofDefaults {
  typeId: Id;
  method: RoofMethod;
  shape: RoofShape;
  slope: number;
  overhang: number;
  refOffset: number;
  eaveCut: EaveCut;
  /** Vybraná hrana vybrané střechy (klik na hranu nebo štítek v půdorysu) – info box ji ukáže. */
  edge: { roofId: Id; index: number } | null;
}

const states = new WeakMap<Session, RoofDefaults>();

export function roofDefaults(s: Session): RoofDefaults {
  let d = states.get(s);
  if (!d) {
    d = {
      typeId: Object.keys(s.model.roofTypes)[0] ?? '',
      method: 'rect',
      shape: 'hip',
      slope: DEFAULT_ROOF_SLOPE,
      overhang: DEFAULT_ROOF_OVERHANG,
      refOffset: DEFAULT_ROOF_REF,
      eaveCut: 'vertical',
      edge: null,
    };
    states.set(s, d);
  }
  if (!s.model.roofTypes[d.typeId]) d.typeId = Object.keys(s.model.roofTypes)[0] ?? '';
  return d;
}

/**
 * Parametry příkazu roof.create pro nakreslený obrys. Sedlová předvolba jde jen na čtyřúhelník – na jiném
 * obrysu se použije valbová (štíty pak jde přepnout po hranách).
 */
export function roofCreateParams(s: Session, outline: readonly Vec2[]) {
  const d = roofDefaults(s);
  const shape = d.shape === 'gable' && outline.length !== 4 ? 'hip' : d.shape;
  return {
    storeyId: s.storeyId,
    typeId: d.typeId,
    outline,
    shape,
    slope: d.slope,
    overhang: d.overhang,
    refOffset: d.refOffset,
    eaveCut: d.eaveCut,
    status: s.options.newStatus,
  };
}
