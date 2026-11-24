// Migrace projektu 4 → 5 (základ 9, plán stěn Z3):
// - vršek vázaný na podlaží se ukládá relativně „podlaží + N“ (místo id horního podlaží),
//   N = rozdíl pořadí podlaží v budově; horní podlaží pod spodním → pevná výška se stejným výsledkem;
// - stěna dostane horní profil „rovný“.
type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown) => (typeof v === 'number' ? v : 0);

function order(storeys: Obj): Map<string, { index: number; elevation: number }> {
  const list = Object.values(storeys).filter(isObj);
  const out = new Map<string, { index: number; elevation: number }>();
  const buildings = new Set(list.map((s) => String(s['buildingId'])));
  for (const b of buildings) {
    list
      .filter((s) => String(s['buildingId']) === b)
      .sort(
        (x, y) => num(x['elevation']) - num(y['elevation']) || (String(x['id']) < String(y['id']) ? -1 : 1),
      )
      .forEach((s, index) => out.set(String(s['id']), { index, elevation: num(s['elevation']) }));
  }
  return out;
}

function heightV5(h: unknown, levels: ReturnType<typeof order>): unknown {
  if (!isObj(h) || !isObj(h['top']) || h['top']['kind'] !== 'storey') return h;
  const top = h['top'];
  const base = levels.get(String(h['baseStoreyId']));
  const upper = levels.get(String(top['storeyId']));
  if (!base || !upper) return h;
  const n = upper.index - base.index;
  if (n >= 0) return { ...h, top: { kind: 'storey', storeys: n, offset: num(top['offset']) } };
  const bottom = base.elevation + num(h['baseOffset']);
  const value = upper.elevation + num(top['offset']) - bottom;
  return { ...h, top: { kind: 'height', value } };
}

export function projectV4toV5(data: Obj): Obj {
  const levels = order(isObj(data['storeys']) ? data['storeys'] : {});
  const elements = isObj(data['elements']) ? data['elements'] : {};
  const next = Object.entries(elements).map(([id, e]) => {
    if (!isObj(e) || e['category'] !== 'wall') return [id, e];
    return [id, { topProfile: { kind: 'flat' }, ...e, height: heightV5(e['height'], levels) }];
  });
  return { ...data, elements: Object.fromEntries(next) };
}
