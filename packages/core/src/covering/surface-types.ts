// Spočítaná plocha povrchu (prvky stavby 9): jeden zdroj pro 3D, rozvinutý pohled i výkaz. Nic z toho se
// neukládá (základ 4); přiřazení typu je logické (místnost + stěna + strana + zóna, základ 14).
import type { Id } from '../ids/index.ts';
import type { SurfaceFrame } from './frame.ts';
import type { PlanePolygon } from './polygon.ts';
import type { FaceSide } from './types.ts';

/** Kde plocha leží: líc stěny, ostění otvoru, podlaha, strop. */
export type SurfacePlace = 'wall' | 'jamb' | 'floor' | 'ceiling';

/** Část ostění: boky, nadpraží, parapet (spodek), dno niky. */
export type JambPart = 'left' | 'right' | 'head' | 'sill' | 'back';

export interface CoveringSurface {
  /** Stabilní klíč plochy (místnost / místo / stěna:strana / úsek / zóna). */
  readonly id: string;
  readonly roomId: Id;
  readonly storeyId: Id;
  readonly place: SurfacePlace;
  readonly wallId?: Id;
  readonly side?: FaceSide;
  /** Pořadí úseku líce téže stěny a strany v místnosti. */
  readonly run?: number;
  /** Délka celého úseku líce (mm), jen u stěn. */
  readonly faceLength?: number;
  /** Index výškové zóny (stěny a ostění). */
  readonly zone?: number;
  readonly openingId?: Id;
  readonly jambPart?: JambPart;
  /** Typ úpravy; null = nepřiřazeno. */
  readonly typeId: Id | null;
  /** Obrys v rovině plochy (u, v v mm). */
  readonly polygons: readonly PlanePolygon[];
  /** Transformace z roviny do 3D. */
  readonly frame: SurfaceFrame;
  /** Plocha (mm²), otvory už odečtené. */
  readonly area: number;
  /** Délka spodní hrany bez otvorů ke spodku zóny, např. dveří (mm) – délka soklu. */
  readonly length: number;
  /** Otvory vyříznuté z této plochy a jejich plocha v ní (mm²) – pro pravidlo odečtu ve výkazu. */
  readonly openings: readonly { readonly openingId: Id; readonly area: number }[];
}
