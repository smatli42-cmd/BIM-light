// Otvor v hostiteli (základ 19, plán stěn Z4): samostatný prvek, který hostitele vyřízne.
// IFC: IfcOpeningElement + IfcRelVoidsElement (vztah = uložený odkaz `hostId`, ne shoda souřadnic).
// Okna a dveře (etapa 4) budou výplní otvoru.
import type { Vec2 } from '../geometry/index.ts';
import type { Id } from '../ids/index.ts';
import type { GraphicEffect } from '../style/types.ts';
import type { Status, VariantRef } from '../model/types.ts';

/** Průchozí otvor, nebo nika (neprůchozí výklenek z jedné strany). */
export type OpeningKind = 'through' | 'niche';

/** Strana stěny, ze které je nika: referenční líc, nebo protilehlý. */
export type OpeningSide = 'ref' | 'opp';

/**
 * Obrys otvoru v pohledu na stěnu: body {x po stěně od počátku otvoru, z nad parapetem} (mm).
 * Zatím jen obdélník šířka × výška; obecný mnohoúhelník je připravený v datech.
 */
export type OpeningProfile =
  { readonly kind: 'rect' } | { readonly kind: 'polygon'; readonly points: readonly Vec2[] };

export interface Opening {
  readonly id: Id;
  readonly ifcClass: 'IfcOpeningElement';
  readonly category: 'opening';
  readonly discipline: string;
  readonly status: Status;
  readonly variant: VariantRef;
  /** Podlaží = podlaží hostitele. */
  readonly storeyId: Id;
  /** Hostitelská stěna. */
  readonly hostId: Id;
  /** Vzdálenost od začátku referenční čáry k počátku otvoru, měřeno po referenční čáře (mm). */
  readonly offset: number;
  readonly width: number;
  readonly height: number;
  /** Parapet: spodní hrana nad spodkem stěny (mm). */
  readonly sill: number;
  readonly kind: OpeningKind;
  /** Nika: hloubka od líce (mm) a strana. U průchozího otvoru se nepoužívá. */
  readonly depth: number;
  readonly side: OpeningSide;
  readonly profile: OpeningProfile;
  /** Přepis grafiky „ve všech pohledech“ (patro 5). */
  readonly graphicOverride?: GraphicEffect;
}

/** Výchozí rozměry nového otvoru (okno 1200 × 1500, parapet 900). */
export const DEFAULT_OPENING = { width: 1200, height: 1500, sill: 900, depth: 150 } as const;

/** Pilířek kratší než tato mez u napojeného konce = upozornění „těsně u rohu“ (mm). */
export const NEAR_CORNER = 100;
