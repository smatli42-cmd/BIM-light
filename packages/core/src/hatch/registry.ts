// Registr knihovny šraf: načte všechny skupiny, seřadí podle pořadí a zvaliduje (základ 34).
// Knihovna je otevřený seznam dat: nová šrafa = nový záznam ve skupině, kód se nemění.
import type { Hatch, HatchFamily } from './types.ts';
import { BETON } from './library/beton.ts';
import { DREVO_KOV_SKLO } from './library/drevo-kov-sklo.ts';
import { IZOLACE } from './library/izolace.ts';
import { OSTATNI } from './library/ostatni.ts';
import { ZDIVO } from './library/zdivo.ts';
import { ZEMINY } from './library/zeminy.ts';

export const HATCH_LIBRARY_ID = 'bim-light-hatches';
/** Šrafa „bez šrafy“: materiál vždy odkazuje existující šrafu, nikdy null. */
export const NO_HATCH = 'hatch.bez-srafy';

const ID = /^hatch\.[a-z0-9-]+$/;
const pos = (v: number) => Number.isFinite(v) && v > 0;

function familyErrors(f: HatchFamily, at: string): string[] {
  const out: string[] = [];
  const need = (ok: boolean, what: string) => ok || out.push(`${at}: ${what}`);
  if (f.kind === 'band') {
    need(pos(f.pitch), 'délka smyčky musí být kladná');
    need(pos(f.loop) && f.loop <= 1, 'hloubka očka musí být mezi 0 a 1');
    return out;
  }
  if (!Number.isFinite(f.angle)) out.push(`${at}: úhel není číslo`);
  if (f.kind === 'lines') {
    need(pos(f.spacing), 'rozteč musí být kladná');
    need(f.dash.every(pos), 'čárkování musí být kladná čísla');
  } else if (f.kind === 'marks') {
    need(pos(f.size) && pos(f.dx) && pos(f.dy), 'velikost a rozteče musí být kladné');
  } else if (f.kind === 'wave') {
    need(pos(f.amplitude) && pos(f.wavelength) && pos(f.spacing), 'rozměry vlny musí být kladné');
  } else if (f.kind === 'motif') {
    need(pos(f.dx) && pos(f.dy), 'rozteče motivu musí být kladné');
    need(f.curves.length > 0, 'motiv potřebuje aspoň jednu křivku');
    const ok = f.curves.every(
      (c) => c.points.length >= 2 && c.points.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y)),
    );
    need(ok, 'křivka motivu potřebuje aspoň 2 body s čísly x a y');
  } else out.push(`${at}: neznámý druh rodiny`);
  return out;
}

/** Chyby v seznamu šraf (prázdné = v pořádku). */
export function validateHatches(list: readonly Hatch[]): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const h of list) {
    if (!ID.test(h.id)) errors.push(`${h.id}: id musí být „hatch.slug“`);
    if (ids.has(h.id)) errors.push(`${h.id}: id se opakuje`);
    ids.add(h.id);
    if (!h.name.trim()) errors.push(`${h.id}: chybí název`);
    h.families.forEach((f, i) => errors.push(...familyErrors(f, `${h.id} rodina ${i + 1}`)));
  }
  for (const h of list)
    if (h.variantOf && !ids.has(h.variantOf)) errors.push(`${h.id}: varianta neexistující ${h.variantOf}`);
  return errors;
}

/** Sestaví knihovnu ze skupin (seřazenou podle pořadí); neplatná data = chyba při startu. */
export function buildHatchLibrary(groups: readonly (readonly Hatch[])[]): readonly Hatch[] {
  const list = groups.flat().sort((a, b) => a.order - b.order);
  const errors = validateHatches(list);
  if (errors.length) throw new Error(`Knihovna šraf je neplatná: ${errors.join('; ')}`);
  return list;
}

export const HATCH_GROUPS: readonly (readonly Hatch[])[] = [
  OSTATNI,
  ZEMINY,
  BETON,
  ZDIVO,
  DREVO_KOV_SKLO,
  IZOLACE,
];

/** Výchozí knihovna šraf (40 položek v pořadí jako v arditu). */
export const HATCH_LIBRARY: readonly Hatch[] = buildHatchLibrary(HATCH_GROUPS);

export const libraryHatch = (id: string): Hatch | undefined => HATCH_LIBRARY.find((h) => h.id === id);

/** Kopie šrafy z knihovny do projektu s odkazem na původ (základ 21). */
export function hatchCopy(h: Hatch): Hatch {
  return { ...h, source: { libraryId: HATCH_LIBRARY_ID, itemId: h.id, version: h.version } };
}
