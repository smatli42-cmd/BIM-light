// Kategorie prvků (rozhodnutí 1): pevný seznam blízký IFC. Vrstvy se odvozují z kategorie.

export const CATEGORIES = [
  'wall',
  'column',
  'opening',
  'window',
  'door',
  'slab',
  'roof',
  'stair',
  'railing',
  'room',
  'covering',
  'curtain-wall',
  'furniture',
  'terrain',
  'earthwork',
  'symbol',
  'electrical',
  'dimension',
  'label',
  'drawing-2d',
] as const;

export type Category = (typeof CATEGORIES)[number];

/** Výchozí třída IFC pro kategorii. */
export const IFC_CLASS: Readonly<Record<Category, string>> = {
  wall: 'IfcWall',
  column: 'IfcColumn',
  opening: 'IfcOpeningElement',
  window: 'IfcWindow',
  door: 'IfcDoor',
  slab: 'IfcSlab',
  roof: 'IfcRoof',
  stair: 'IfcStair',
  railing: 'IfcRailing',
  room: 'IfcSpace',
  covering: 'IfcCovering',
  'curtain-wall': 'IfcCurtainWall',
  furniture: 'IfcFurniture',
  terrain: 'IfcGeographicElement',
  earthwork: 'IfcEarthworksElement',
  symbol: 'IfcAnnotation',
  electrical: 'IfcDistributionElement',
  dimension: 'IfcAnnotation',
  label: 'IfcAnnotation',
  'drawing-2d': 'IfcAnnotation',
};

/** Výchozí profese (rozhodnutí 1); uživatel může doplnit. */
export const DEFAULT_DISCIPLINES = ['architecture', 'structure', 'electrical', 'plumbing', 'hvac'] as const;
