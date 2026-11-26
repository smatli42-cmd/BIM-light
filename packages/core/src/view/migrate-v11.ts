// Migrace (základ 9): filtr rekonstrukce pohledu (fáze vedle grafických přepisů, vzor Arditu 2026-11-26).
// Balíček zobrazení 4 → 5: kombinace „Fáze – …“ dostanou příznak `phase`; dřívější „Fáze – nový stav“
// (jen skryté bourané) se jmenuje „Fáze – plánovaný stav“ a přibude „Fáze – nový stav“ (nové červeně).
// Projekt 11 → 12: pohled dostane `phaseFilterId`; fáze vybraná dřív v přepisech se přesune do filtru.
type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const recs = (v: unknown): Record<string, Obj> => (isObj(v) ? (v as Record<string, Obj>) : {});

const PREFIX = 'Fáze – ';
const OLD_NEW = 'Fáze – nový stav';

function plannedAndNew(combos: Record<string, Obj>, rules: Record<string, Obj>): Record<string, Obj> {
  const out = { ...combos };
  const old = Object.values(out).find(
    (c) => c['name'] === OLD_NEW && (c['ruleIds'] as unknown[])?.length === 1,
  );
  if (!old) return out;
  const id = String(old['id']);
  out[id] = { ...old, name: 'Fáze – plánovaný stav' };
  const ruleId = (name: string) => Object.values(rules).find((r) => r['name'] === name)?.['id'];
  const hide = ruleId('Skrýt bourané');
  const red = ruleId('Nové červeně');
  if (hide && red) out[`${id}-red`] = { id: `${id}-red`, name: OLD_NEW, ruleIds: [hide, red], phase: true };
  return out;
}

export function displayV4toV5(data: Obj): Obj {
  const marked = Object.fromEntries(
    Object.entries(recs(data['overrideCombinations'])).map(([k, c]) => [
      k,
      String(c['name'] ?? '').startsWith(PREFIX) ? { ...c, phase: true } : c,
    ]),
  );
  return { ...data, overrideCombinations: plannedAndNew(marked, recs(data['rules'])) };
}

export function projectV11toV12(data: Obj): Obj {
  const display = displayV4toV5(isObj(data['display']) ? data['display'] : {});
  const combos = recs(display['overrideCombinations']);
  const views = Object.fromEntries(
    Object.entries(recs(data['views'])).map(([id, v]) => {
      const local = isObj(v['local']) ? v['local'] : {};
      const combo = local['overrideCombinationId'];
      if (typeof combo === 'string' && combos[combo]?.['phase'] === true) {
        const { overrideCombinationId: _c, ...rest } = local;
        return [id, { ...v, local: rest, phaseFilterId: combo }];
      }
      return [id, { phaseFilterId: null, ...v }];
    }),
  );
  return { ...data, views, display: { ...display, schemaVersion: 5 } };
}
