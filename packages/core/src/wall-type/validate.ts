// Validace typu stěny (plán stěn Z1): kladné tloušťky, platné materiály, jedno souvislé jádro,
// správné výškové pásy. Vrací seznam chyb česky (prázdný = platný typ).
import type { Id } from '../ids/index.ts';
import { coreGroups } from './composition.ts';
import { LAYER_FUNCTIONS, type HeightBand, type WallType } from './types.ts';

function bandErrors(band: HeightBand, i: number, last: boolean, hasMaterial: (id: Id) => boolean): string[] {
  const where = `pás ${i + 1}`;
  const out: string[] = [];
  if (last && band.height !== null) out.push(`Poslední pás musí sahat až do vršku stěny (${where})`);
  if (!last && !(typeof band.height === 'number' && band.height > 0))
    out.push(`Výška pásu musí být kladná (${where})`);
  if (band.layers.length === 0) out.push(`Pás musí mít aspoň jednu vrstvu (${where})`);
  band.layers.forEach((l, j) => {
    const at = `${where}, vrstva ${j + 1}`;
    if (!(Number.isFinite(l.thickness) && l.thickness > 0))
      out.push(`Tloušťka vrstvy musí být kladná (${at})`);
    if (!hasMaterial(l.materialId)) out.push(`Materiál vrstvy neexistuje (${at})`);
    if (!LAYER_FUNCTIONS.includes(l.function)) out.push(`Neznámá funkce vrstvy (${at})`);
    if (!Number.isFinite(l.extendTop) || !Number.isFinite(l.extendBottom))
      out.push(`Prodloužení vrstvy musí být číslo (${at})`);
  });
  if (coreGroups(band.layers) > 1) out.push(`Jádro musí být jedna souvislá skupina vrstev (${where})`);
  return out;
}

export function wallTypeErrors(type: WallType, hasMaterial: (id: Id) => boolean): string[] {
  const out: string[] = [];
  if (!type.name.trim()) out.push('Typ musí mít název');
  if (type.bands.length === 0) out.push('Typ musí mít aspoň jeden výškový pás');
  type.bands.forEach((b, i) => out.push(...bandErrors(b, i, i === type.bands.length - 1, hasMaterial)));
  return out;
}
