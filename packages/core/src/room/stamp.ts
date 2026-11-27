// Obsah razítka místnosti (katalog pohledů: číslo, název, plocha). Které údaje razítko ukazuje a v jakém
// pořadí, je data stylu (`Style.roomStamp`, přenáší se s nastavením zobrazení, základy 27, 31); platí pro
// všechna razítka v pohledech se stylem. Prázdný údaj se vynechá.
import type { Model } from '../model/types.ts';
import { STATUS_LABELS } from '../schedule/source-walls.ts';
import type { Style } from '../style/types.ts';
import type { RoomGeometry } from './geometry.ts';
import { areaText } from './queries.ts';
import type { Room } from './types.ts';

export const ROOM_STAMP_FIELDS = [
  'number',
  'name',
  'area',
  'livingArea',
  'utilityArea',
  'perimeter',
  'height',
  'volume',
  'floorLevel',
  'storey',
  'category',
  'status',
  'floorFinish',
  'wallFinish',
  'ceilingFinish',
  'occupants',
  'temperature',
  'note',
] as const;
export type RoomStampField = (typeof ROOM_STAMP_FIELDS)[number];

/** Popisy údajů razítka (info box, AI). */
export const ROOM_STAMP_LABELS: Readonly<Record<RoomStampField, string>> = {
  number: 'Číslo',
  name: 'Název',
  area: 'Podlahová plocha (ČSN 73 4301)',
  livingArea: 'Plocha obytná',
  utilityArea: 'Plocha užitková',
  perimeter: 'Obvod',
  height: 'Světlá výška',
  volume: 'Objem',
  floorLevel: 'Výška podlahy (±0,000)',
  storey: 'Podlaží',
  category: 'Kategorie (funkce)',
  status: 'Stav',
  floorFinish: 'Podlaha (povrch)',
  wallFinish: 'Stěny (povrch)',
  ceilingFinish: 'Strop (povrch)',
  occupants: 'Počet osob',
  temperature: 'Výpočtová teplota',
  note: 'Poznámka',
};

/** Výchozí razítko: číslo, název, plocha. */
export const DEFAULT_ROOM_STAMP: readonly RoomStampField[] = ['number', 'name', 'area'];

const isField = (f: string): f is RoomStampField => (ROOM_STAMP_FIELDS as readonly string[]).includes(f);

/** Údaje razítka stylu v pořadí; starší styl bez seznamu bere volby `labels` (číslo, název, plocha). */
export function stampFields(style: Pick<Style, 'roomStamp' | 'labels'>): RoomStampField[] {
  if (style.roomStamp) return style.roomStamp.filter(isField);
  const on = (k: string) => style.labels?.[k] !== false;
  const map: [string, RoomStampField][] = [
    ['roomNumber', 'number'],
    ['roomName', 'name'],
    ['roomArea', 'area'],
  ];
  return map.filter(([k]) => on(k)).map(([, f]) => f);
}

const dec = (v: number, d: number) => v.toFixed(d).replace('.', ',');
/** Kóta ±0,000 (m na 3 místa). */
export const levelText = (mm: number) =>
  Math.abs(mm) < 0.5 ? '±0,000' : `${mm > 0 ? '+' : '−'}${dec(Math.abs(mm) / 1000, 3)}`;

/** Obytná a užitková plocha podle kategorie (bez kategorie = užitková). */
export function areaSplit(model: Model, r: Room, area: number) {
  const living = model.roomCategories[r.categoryId ?? '']?.areaKind === 'living';
  return { living: living ? area : 0, utility: living ? 0 : area };
}

/** Text jednoho údaje razítka; null = údaj chybí (řádek se vynechá). */
export function stampValue(model: Model, r: Room, g: RoomGeometry, f: RoomStampField): string | null {
  const p = r.props ?? {};
  const split = areaSplit(model, r, g.area);
  const level = (model.storeys[r.storeyId]?.elevation ?? 0) + (r.floorOffset ?? 0);
  const values: Record<RoomStampField, () => string | null> = {
    number: () => r.number,
    name: () => r.name || null,
    area: () => areaText(g.area),
    livingArea: () => (split.living ? `obytná ${areaText(split.living)}` : null),
    utilityArea: () => (split.utility ? `užitková ${areaText(split.utility)}` : null),
    perimeter: () => `O = ${dec(g.perimeter / 1000, 2)} m`,
    height: () => `sv. v. ${dec(g.height / 1000, 2)} m`,
    volume: () => `V = ${dec(g.volume / 1e9, 2)} m³`,
    floorLevel: () => levelText(level),
    storey: () => model.storeys[r.storeyId]?.name ?? null,
    category: () => model.roomCategories[r.categoryId ?? '']?.name ?? null,
    status: () => STATUS_LABELS[r.status],
    floorFinish: () => (p.floorFinish ? `podlaha: ${p.floorFinish}` : null),
    wallFinish: () => (p.wallFinish ? `stěny: ${p.wallFinish}` : null),
    ceilingFinish: () => (p.ceilingFinish ? `strop: ${p.ceilingFinish}` : null),
    occupants: () => (p.occupants !== undefined ? `${p.occupants} os.` : null),
    temperature: () => (p.temperature !== undefined ? `${dec(p.temperature, 0)} °C` : null),
    note: () => p.note || null,
  };
  return values[f]();
}
