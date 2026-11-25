// Najít a vybrat (koncepce rozhraní, část 2 B; vzor: Archicad Find & Select): prvky podle kritérií.
// Prázdné kritérium = jakékoli. Výsledek je jen seznam id (výběr drží rozhraní, model se nemění).
import { arcData, type Path } from '../geometry/index.ts';
import type { Id } from '../ids/index.ts';
import type { Model } from '../model/types.ts';
import { openingsOf } from '../opening/geometry.ts';
import type { Opening } from '../opening/types.ts';
import { wallHeight } from '../wall-height/resolve.ts';
import { bandAt, bandThickness, DEFAULT_CUT_HEIGHT } from '../wall/layers.ts';
import { allWalls } from '../wall/queries.ts';
import type { Wall } from '../wall/types.ts';

export type FindCategory = 'wall' | 'opening' | 'dimension';

/** Rozsah čísla (mm); chybějící mez = bez omezení. */
export interface Range {
  readonly min?: number | undefined;
  readonly max?: number | undefined;
}

export interface FindCriteria {
  /** Druhy prvků; prázdné = všechny. */
  readonly categories?: readonly FindCategory[] | undefined;
  /** Podlaží; prázdné = všechna. */
  readonly storeyIds?: readonly Id[] | undefined;
  readonly wallTypeId?: Id | undefined;
  /** Materiál, který je ve skladbě stěny. */
  readonly materialId?: Id | undefined;
  /** Část GlobalId. */
  readonly idContains?: string | undefined;
  /** Část názvu typu stěny. */
  readonly nameContains?: string | undefined;
  /** Jen obloukové (true), nebo jen přímé (false) stěny. */
  readonly curved?: boolean | undefined;
  readonly thickness?: Range | undefined;
  /** Výška prvku (stěna: od spodku po vršek, otvor: výška otvoru). */
  readonly height?: Range | undefined;
  readonly openingWidth?: Range | undefined;
}

export interface FindResult {
  readonly walls: readonly Id[];
  readonly openings: readonly Id[];
  readonly dimensions: readonly Id[];
}

const inRange = (v: number, r?: Range) =>
  !r || ((r.min ?? -Infinity) <= v + 1e-6 && v - 1e-6 <= (r.max ?? Infinity));
const has = (text: string, part?: string) => !part || text.toLowerCase().includes(part.toLowerCase());
const isArc = (p: Path) => p.kind === 'arc' && Math.abs(p.bulge) > 1e-9 && arcData(p).radius > 0;
const wants = (c: FindCriteria, k: FindCategory) => !c.categories?.length || c.categories.includes(k);
const onStorey = (c: FindCriteria, storeyId: Id) => !c.storeyIds?.length || c.storeyIds.includes(storeyId);

function wallMatches(m: Model, w: Wall, c: FindCriteria): boolean {
  const type = m.wallTypes[w.typeId];
  if (!onStorey(c, w.storeyId) || !has(w.id, c.idContains) || !has(type?.name ?? '', c.nameContains))
    return false;
  if (c.wallTypeId && w.typeId !== c.wallTypeId) return false;
  if (c.curved !== undefined && isArc(w.path) !== c.curved) return false;
  const band = type ? bandAt(type, DEFAULT_CUT_HEIGHT) : undefined;
  if (c.materialId && !type?.bands.some((b) => b.layers.some((l) => l.materialId === c.materialId)))
    return false;
  if (c.thickness && !(band && inRange(bandThickness(band), c.thickness))) return false;
  return inRange(wallHeight(m, w).height, c.height);
}

function openingMatches(m: Model, o: Opening, c: FindCriteria): boolean {
  if (!onStorey(c, o.storeyId) || !has(o.id, c.idContains)) return false;
  if (c.wallTypeId || c.materialId || c.nameContains || c.curved !== undefined || c.thickness) return false;
  return inRange(o.width, c.openingWidth) && inRange(o.height, c.height);
}

/** Prvky, které splňují všechna zadaná kritéria. */
export function findElements(m: Model, c: FindCriteria): FindResult {
  const walls = wants(c, 'wall')
    ? allWalls(m)
        .filter((w) => wallMatches(m, w, c))
        .map((w) => w.id)
    : [];
  const openings = wants(c, 'opening')
    ? allWalls(m).flatMap((w) =>
        openingsOf(m, w.id)
          .filter((o) => openingMatches(m, o, c))
          .map((o) => o.id),
      )
    : [];
  // Kóty nemají typ, materiál ani rozměry: kritéria prvků je vyloučí.
  const onlyDims = !c.wallTypeId && !c.materialId && !c.thickness && !c.height && !c.openingWidth;
  const dimsOk = wants(c, 'dimension') && onlyDims && !c.nameContains && c.curved === undefined;
  const dimensions = dimsOk
    ? Object.values(m.dimensions)
        .filter((d) => onStorey(c, d.storeyId) && has(d.id, c.idContains))
        .map((d) => d.id)
    : [];
  return { walls, openings, dimensions };
}
