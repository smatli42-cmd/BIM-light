// Balíček zobrazení = přenositelný JSON (základ 31): styly, vrstvy, pravidla, kombinace, pera.
// Neplatný soubor program nerozbije: vrátí chyby a nic nezmění. Neznámá vlastnost v pravidle
// pravidlo vypne s upozorněním. Model prvků import nikdy nemění.
import { validate, type JsonSchema } from '../commands/schema.ts';
import { CATEGORIES } from '../model/categories.ts';
import { migrate, type Migrations } from '../persistence/migrate.ts';
import { isKnownProperty } from './conditions.ts';
import {
  DISPLAY_SETTINGS_SCHEMA,
  LAYER_COMBINATION_SCHEMA,
  LAYER_SCHEMA,
  OVERRIDE_COMBINATION_SCHEMA,
  RULE_SCHEMA,
  STYLE_SCHEMA,
} from './package-schema.ts';
import { displayV1toV2 } from '../hatch/migrate-v1.ts';
import { displayV2toV3 } from '../hatch/migrate-v2.ts';
import { displayV3toV4 } from './migrate-v3.ts';
import { displayV4toV5 } from '../view/migrate-v11.ts';
import { HATCH_SCHEMA } from '../hatch/schema.ts';
import { DISPLAY_SCHEMA_VERSION } from './presets/create.ts';
import type { DisplaySettings, Rule } from './types.ts';

export const DISPLAY_PACKAGE_FORMAT = 'bim-light-display';

/**
 * Migrace balíčku zobrazení. 1 → 2: kopie šraf a id šrafy v efektech (základ 34);
 * 2 → 3: měřítko šraf ve stylu a příznak základní / odvozená u šraf.
 */
export const DISPLAY_MIGRATIONS: Migrations = {
  1: displayV1toV2,
  2: displayV2toV3,
  3: displayV3toV4,
  4: displayV4toV5,
};

export function exportDisplayPackage(display: DisplaySettings): string {
  return JSON.stringify({ format: DISPLAY_PACKAGE_FORMAT, ...display }, null, 2);
}

export type ParseResult =
  | { readonly ok: true; readonly settings: DisplaySettings; readonly warnings: readonly string[] }
  | { readonly ok: false; readonly errors: readonly string[] };

const COLLECTIONS: [keyof DisplaySettings, JsonSchema][] = [
  ['layers', LAYER_SCHEMA],
  ['layerCombinations', LAYER_COMBINATION_SCHEMA],
  ['rules', RULE_SCHEMA],
  ['overrideCombinations', OVERRIDE_COMBINATION_SCHEMA],
  ['styles', STYLE_SCHEMA],
  ['hatches', HATCH_SCHEMA],
];

function checkCollections(s: Record<string, unknown>): string[] {
  const errors: string[] = [];
  for (const [key, schema] of COLLECTIONS) {
    for (const [id, item] of Object.entries((s[key] ?? {}) as Record<string, unknown>)) {
      validate(schema, item, `${key}.${id}`, errors);
    }
  }
  return errors;
}

function checkReferences(s: DisplaySettings): string[] {
  const errors: string[] = [];
  for (const st of Object.values(s.styles)) {
    if (!s.layerCombinations[st.layerCombinationId]) errors.push(`styl ${st.name}: chybí kombinace vrstev`);
    if (!s.overrideCombinations[st.overrideCombinationId])
      errors.push(`styl ${st.name}: chybí kombinace přepisů`);
    if (s.layers[st.defaultAnnotationLayerId]?.kind !== 'annotation')
      errors.push(`styl ${st.name}: chybí skupina anotací`);
  }
  return errors;
}

/** Pravidlo s neznámou vlastností nebo kategorií se vypne (nic se nerozbije). */
function disableUnknown(rule: Rule, warnings: string[]): Rule {
  for (const c of rule.conditions) {
    const values = Array.isArray(c.value) ? c.value : [c.value];
    const badCategory =
      c.property === 'category' && values.some((v) => !(CATEGORIES as readonly unknown[]).includes(v));
    if (!isKnownProperty(c.property) || badCategory) {
      warnings.push(
        `Pravidlo „${rule.name}“ bylo vypnuto: neznámá vlastnost nebo kategorie (${c.property}).`,
      );
      return { ...rule, disabled: true };
    }
  }
  return rule;
}

/** Přečte a zkontroluje balíček zobrazení. */
export function parseDisplayPackage(text: string, migrations: Migrations = DISPLAY_MIGRATIONS): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, errors: ['Soubor není platný JSON'] };
  }
  if (
    typeof raw !== 'object' ||
    raw === null ||
    (raw as Record<string, unknown>)['format'] !== DISPLAY_PACKAGE_FORMAT
  ) {
    return { ok: false, errors: ['Soubor není balíček zobrazení BIM-light'] };
  }
  const { format: _format, ...body } = raw as Record<string, unknown>;
  const migrated = migrate(body, DISPLAY_SCHEMA_VERSION, migrations);
  if (!migrated.ok) return { ok: false, errors: [migrated.error] };
  const errors = [
    ...validate(DISPLAY_SETTINGS_SCHEMA, migrated.data, 'balíček'),
    ...checkCollections(migrated.data),
  ];
  if (errors.length) return { ok: false, errors };
  const settings = migrated.data as unknown as DisplaySettings;
  const refErrors = checkReferences(settings);
  if (refErrors.length) return { ok: false, errors: refErrors };
  const warnings: string[] = [];
  const rules = Object.fromEntries(
    Object.entries(settings.rules).map(([id, r]) => [id, disableUnknown(r, warnings)]),
  );
  return { ok: true, settings: { ...settings, rules }, warnings };
}
