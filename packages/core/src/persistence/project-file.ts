// Uložení a načtení projektu jako JSON (základy 9, 13; rozhodnutí 17).
// Načtení projde migracemi podle SCHEMA_VERSION. Ruční uložení navíc vytvoří datovanou verzi.
import { SCHEMA_VERSION, type Model } from '../model/types.ts';
import { projectV1toV2 } from '../hatch/migrate-v1.ts';
import { projectV2toV3 } from '../wall-type/migrate-v2.ts';
import { projectV3toV4 } from '../junction/migrate-v3.ts';
import { projectV4toV5 } from '../wall-height/migrate-v4.ts';
import { projectV5toV6 } from '../hatch/migrate-v2.ts';
import { projectV6toV7 } from '../opening/migrate-v6.ts';
import { projectV7toV8 } from '../dimension/migrate-v7.ts';
import { projectV8toV9 } from '../wall/migrate-v8.ts';
import { projectV9toV10 } from '../view/migrate-v9.ts';
import { projectV10toV11 } from '../style/migrate-v3.ts';
import { migrate, type Migrations } from './migrate.ts';
import type { Platform } from './platform.ts';

export const PROJECT_FORMAT = 'bim-light-project';
export const PROJECT_EXTENSION = '.bim';

/**
 * Migrace projektu: klíč = verze, ze které se převádí. 1 → 2: šrafy jako knihovna (základ 34);
 * 2 → 3: prodloužení vrstev typu stěny (plán stěn Z1); 3 → 4: „nespojovat“ u napojení (Z2);
 * 4 → 5: vršek „podlaží + N“ a horní profil stěny (Z3); 5 → 6: měřítko šraf a odvozené šrafy;
 * 6 → 7: otvory a rovina řezu pohledu (Z4); 10 → 11: konce stěn a značka osy v grafice (Z6).
 */
export const PROJECT_MIGRATIONS: Migrations = {
  1: projectV1toV2,
  2: projectV2toV3,
  3: projectV3toV4,
  4: projectV4toV5,
  5: projectV5toV6,
  6: projectV6toV7,
  7: projectV7toV8,
  8: projectV8toV9,
  9: projectV9toV10,
  10: projectV10toV11,
};

export function serializeProject(model: Model): string {
  return JSON.stringify({ format: PROJECT_FORMAT, ...model });
}

export type LoadResult =
  { readonly ok: true; readonly model: Model } | { readonly ok: false; readonly error: string };

export function parseProject(text: string, migrations: Migrations = PROJECT_MIGRATIONS): LoadResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'Soubor není platný JSON' };
  }
  if (
    typeof raw !== 'object' ||
    raw === null ||
    (raw as Record<string, unknown>)['format'] !== PROJECT_FORMAT
  ) {
    return { ok: false, error: 'Soubor není projekt BIM-light' };
  }
  const { format: _format, ...body } = raw as Record<string, unknown>;
  const result = migrate(body, SCHEMA_VERSION, migrations);
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, model: result.data as unknown as Model };
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Název datované verze, např. „Projekt_2026-11-21_0915.bim“ (jako v AutoCADu). */
export function versionedFileName(baseName: string, date: Date): string {
  const d = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return `${baseName}_${d}_${pad(date.getHours())}${pad(date.getMinutes())}${PROJECT_EXTENSION}`;
}

/** Ruční uložení: hlavní soubor + datovaná verze ve složce verzí. */
export async function saveProject(
  platform: Platform,
  model: Model,
  target: { dir: string; baseName: string; versionsDir?: string },
): Promise<{ main: string; version: string }> {
  const text = serializeProject(model);
  const main = `${target.dir}/${target.baseName}${PROJECT_EXTENSION}`;
  const version = `${target.versionsDir ?? target.dir}/${versionedFileName(target.baseName, platform.now())}`;
  await platform.writeTextAtomic(main, text);
  await platform.writeTextAtomic(version, text);
  return { main, version };
}

export async function openProject(platform: Platform, path: string): Promise<LoadResult> {
  return parseProject(await platform.readText(path));
}
