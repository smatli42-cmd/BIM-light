// Uložení a načtení projektu jako JSON (základy 9, 13; rozhodnutí 17).
// Načtení projde migracemi podle SCHEMA_VERSION. Ruční uložení navíc vytvoří datovanou verzi.
import { projectV15toV16 } from '../composition/migrate-v15.ts';
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
import { projectV11toV12 } from '../view/migrate-v11.ts';
import { projectV12toV13 } from '../wall-props/migrate-v12.ts';
import { projectV13toV14 } from '../schedule/migrate-v13.ts';
import { projectV14toV15 } from '../tag/migrate-v14.ts';
import { projectV16toV17 } from '../slab/migrate-v16.ts';
import { projectV17toV18 } from '../style/migrate-v5.ts';
import { projectV18toV19 } from '../slab-opening/migrate-v18.ts';
import { projectV19toV20 } from '../style/migrate-v6.ts';
import { projectV20toV21 } from '../view-3d/migrate-v20.ts';
import { projectV21toV22 } from '../schedule/migrate-v21.ts';
import { migrate, type Migrations } from './migrate.ts';
import type { Platform } from './platform.ts';

export const PROJECT_FORMAT = 'bim-light-project';
export const PROJECT_EXTENSION = '.bim';

/**
 * Migrace projektu: klíč = verze, ze které se převádí. 1 → 2: šrafy jako knihovna (základ 34);
 * 2 → 3: prodloužení vrstev typu stěny (plán stěn Z1); 3 → 4: „nespojovat“ u napojení (Z2);
 * 4 → 5: vršek „podlaží + N“ a horní profil stěny (Z3); 5 → 6: měřítko šraf a odvozené šrafy;
 * 6 → 7: otvory a rovina řezu pohledu (Z4); 10 → 11: konce stěn a značka osy v grafice (Z6);
 * 11 → 12: filtr rekonstrukce pohledu; 12 → 13: vlastnosti typů stěn (Z7);
 * 13 → 14: značky typů a výkazy (Z8); 14 → 15: značky typu stěn v půdorysu (Z8);
 * 15 → 16: skladby; 16 → 17: typy desek (D1); 17 → 18: barva povrchu ve 3D v grafice;
 * 18 → 19: otvory v deskách (D3); 19 → 20: sytá žlutá povrchu bouraných ve 3D;
 * 20 → 21: průhlednost povrchu ve 3D a 3D pohledy.
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
  11: projectV11toV12,
  12: projectV12toV13,
  13: projectV13toV14,
  14: projectV14toV15,
  15: projectV15toV16,
  16: projectV16toV17,
  17: projectV17toV18,
  18: projectV18toV19,
  19: projectV19toV20,
  20: projectV20toV21,
  21: projectV21toV22,
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
