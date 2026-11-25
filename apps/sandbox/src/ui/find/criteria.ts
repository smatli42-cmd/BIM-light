// Stav formuláře Najít a vybrat → kritéria dotazu jádra `element.find` (koncepce rozhraní, část 2 B).
import type { FindCategory, FindCriteria, Id, Range } from '@bim-light/core';

export interface FindForm {
  categories: FindCategory[];
  allStoreys: boolean;
  wallTypeId: string;
  materialId: string;
  idContains: string;
  nameContains: string;
  curved: '' | 'yes' | 'no';
  thickness: [string, string];
  height: [string, string];
  openingWidth: [string, string];
}

export const EMPTY_FORM: FindForm = {
  categories: [],
  allStoreys: false,
  wallTypeId: '',
  materialId: '',
  idContains: '',
  nameContains: '',
  curved: '',
  thickness: ['', ''],
  height: ['', ''],
  openingWidth: ['', ''],
};

const num = (t: string): number | undefined => {
  const v = Number(t.replace(',', '.'));
  return t.trim() !== '' && Number.isFinite(v) ? v : undefined;
};

function range([a, b]: [string, string]): Range | undefined {
  const min = num(a);
  const max = num(b);
  if (min === undefined && max === undefined) return undefined;
  return { ...(min !== undefined ? { min } : {}), ...(max !== undefined ? { max } : {}) };
}

/** Kritéria pro jádro; rozsah „jen aktuální podlaží“, není-li zaškrtnuto Všechna podlaží. */
export function toCriteria(f: FindForm, storeyId: Id): FindCriteria {
  const opt = <T>(v: T | undefined | '') => (v === '' ? undefined : v);
  const all: FindCriteria = {
    categories: f.categories.length ? f.categories : undefined,
    storeyIds: f.allStoreys ? undefined : [storeyId],
    wallTypeId: opt(f.wallTypeId),
    materialId: opt(f.materialId),
    idContains: opt(f.idContains.trim()),
    nameContains: opt(f.nameContains.trim()),
    curved: f.curved === '' ? undefined : f.curved === 'yes',
    thickness: range(f.thickness),
    height: range(f.height),
    openingWidth: range(f.openingWidth),
  };
  // Popis parametrů dotazu nepřipouští prázdné klíče: vynechat, co není zadané.
  return Object.fromEntries(Object.entries(all).filter(([, v]) => v !== undefined)) as FindCriteria;
}
