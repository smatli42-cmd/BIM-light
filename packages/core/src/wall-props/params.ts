// Popis vlastností stěny (základ 15b): jeden záznam = popisek, skupina, schéma hodnoty a mapování na IFC.
// Z popisu vzniká panel vlastností v rozhraní, schéma příkazů pro AI i Pset_WallCommon v exportu IFC.
import type { JsonSchema } from '../commands/schema.ts';
import { WALL_FUNCTIONS, type WallFunction, type WallPropertyKey } from './types.ts';

export interface PropertyOption {
  readonly value: string;
  readonly label: string;
}

export interface WallPropertyParam {
  readonly key: WallPropertyKey;
  readonly label: string;
  readonly group: string;
  readonly description: string;
  readonly schema: JsonSchema;
  /** Popisky hodnot výčtu (pro panel). */
  readonly options?: readonly PropertyOption[];
  /** Vlastnost v Pset_WallCommon; funkce jde do PredefinedType (viz `IFC_WALL_TYPE`). */
  readonly ifc?: { readonly name: string; readonly value: 'IFCBOOLEAN' | 'IFCLABEL' };
}

export const WALL_FUNCTION_LABELS: Readonly<Record<WallFunction, string>> = {
  exterior: 'Obvodová',
  interior: 'Vnitřní',
  partition: 'Příčka',
  foundation: 'Základová',
  retaining: 'Opěrná',
};

/** IfcWallTypeEnum (IFC4) podle funkce; základová a opěrná jako USERDEFINED s názvem funkce. */
export const IFC_WALL_TYPE: Readonly<Record<WallFunction, string>> = {
  exterior: 'STANDARD',
  interior: 'STANDARD',
  partition: 'PARTITIONING',
  foundation: 'USERDEFINED',
  retaining: 'USERDEFINED',
};

const text = (description: string): JsonSchema => ({ type: 'string', description });

export const WALL_PROPERTY_PARAMS: readonly WallPropertyParam[] = [
  {
    key: 'function',
    label: 'Funkce',
    group: 'Klasifikace',
    description: 'obvodová / vnitřní / příčka / základová / opěrná',
    schema: { type: 'string', enum: WALL_FUNCTIONS, description: 'funkce stěny' },
    options: WALL_FUNCTIONS.map((v) => ({ value: v, label: WALL_FUNCTION_LABELS[v] })),
  },
  {
    key: 'loadBearing',
    label: 'Nosná',
    group: 'Klasifikace',
    description: 'nosná stěna (nese stropy nebo jiné konstrukce)',
    schema: { type: 'boolean', description: 'nosná' },
    ifc: { name: 'LoadBearing', value: 'IFCBOOLEAN' },
  },
  {
    key: 'isExternal',
    label: 'Vnější',
    group: 'Klasifikace',
    description: 'vnější stěna (odděluje vnitřek od venkovního prostředí)',
    schema: { type: 'boolean', description: 'vnější' },
    ifc: { name: 'IsExternal', value: 'IFCBOOLEAN' },
  },
  {
    key: 'fireRating',
    label: 'Požární odolnost',
    group: 'Požár a akustika',
    description: 'požární odolnost, např. „REI 60 DP1“ (prázdné = neurčeno)',
    schema: text('požární odolnost'),
    ifc: { name: 'FireRating', value: 'IFCLABEL' },
  },
  {
    key: 'acousticRating',
    label: 'Neprůzvučnost',
    group: 'Požár a akustika',
    description: "vzduchová neprůzvučnost, např. „R'w 52 dB“ (prázdné = neurčeno)",
    schema: text('neprůzvučnost'),
    ifc: { name: 'AcousticRating', value: 'IFCLABEL' },
  },
];

/** Schéma vlastností typu (všechny klíče volitelné). */
export const TYPE_PROPERTIES_SCHEMA: JsonSchema = {
  type: 'object',
  description: 'vlastnosti typu stěny',
  additionalProperties: false,
  properties: Object.fromEntries(WALL_PROPERTY_PARAMS.map((p) => [p.key, p.schema])),
};

/** Schéma přepisů instance: hodnota, nebo null = zpět podle typu. */
export const INSTANCE_PROPERTIES_SCHEMA: JsonSchema = {
  type: 'object',
  description: 'přepisy vlastností stěny; null = podle typu',
  additionalProperties: false,
  properties: Object.fromEntries(
    WALL_PROPERTY_PARAMS.map((p) => [p.key, { oneOf: [p.schema, { type: 'null' }] }]),
  ),
};
