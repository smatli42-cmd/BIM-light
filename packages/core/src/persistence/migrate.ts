// Migrace dat mezi verzemi schématu (základ 9). Každý krok převede verzi N na N+1.
// Stejný mechanismus pro projekt i balíček zobrazení (základ 31).

/** Krok migrace: dostane data ve verzi `from`, vrátí data ve verzi `from + 1`. */
export type MigrationStep = (data: Record<string, unknown>) => Record<string, unknown>;
export type Migrations = Readonly<Record<number, MigrationStep>>;

export type MigrateResult =
  | { readonly ok: true; readonly data: Record<string, unknown>; readonly applied: readonly number[] }
  | { readonly ok: false; readonly error: string };

export function migrate(
  data: Record<string, unknown>,
  target: number,
  steps: Migrations,
  versionKey = 'schemaVersion',
): MigrateResult {
  const from = data[versionKey];
  if (typeof from !== 'number' || !Number.isInteger(from) || from < 0) {
    return { ok: false, error: 'Soubor nemá platnou verzi schématu' };
  }
  if (from > target) {
    return { ok: false, error: `Soubor je z novější verze programu (schéma ${from}, umím ${target})` };
  }
  let current = data;
  const applied: number[] = [];
  for (let v = from; v < target; v++) {
    const step = steps[v];
    if (!step) return { ok: false, error: `Chybí migrace ze schématu ${v}` };
    current = { ...step(current), [versionKey]: v + 1 };
    applied.push(v);
  }
  return { ok: true, data: current, applied };
}
