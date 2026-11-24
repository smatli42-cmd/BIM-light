// Vztahy jako samostatné uložené objekty (základ 1).
// Napojení stěn (základ 24): IFC IfcRelConnectsPathElements s typem ATSTART / ATEND / ATPATH.
import type { Id } from '../ids/index.ts';

/** Místo napojení na stěně: začátek, konec, nebo kdekoli po délce (hostitel u T napojení). */
export type ConnectionType = 'ATSTART' | 'ATEND' | 'ATPATH';

export interface ConnectionSide {
  readonly wallId: Id;
  readonly at: ConnectionType;
}

/**
 * Napojení dvou stěn. Roh: ATEND–ATSTART (nebo jiná dvojice konců).
 * T napojení: `relating` je hostitel s ATPATH, `related` je stěna, jejíž konec na něm leží.
 */
export interface WallConnection {
  readonly id: Id;
  readonly kind: 'wall-connection';
  readonly relating: ConnectionSide;
  readonly related: ConnectionSide;
}

/** Všechny druhy vztahů (přibudou otvor–stěna, výplň–otvor, prvek–hostitel…). */
export type Relation = WallConnection;
